/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  SENTRY_DSN,
  DEBUG_LOCAL_DATA_KEYS,
  WALLET_HISTORY_COUNT,
  METADATA_CONCURRENT_DOWNLOAD,
} from '../constants';
import { FeatureFlags } from '../featureFlags';
import store from '../store/index';
import {
  loadingAddresses,
  startWalletRequested,
  historyUpdate,
  sharedAddressUpdate,
  reloadData,
  cleanData,
  updateTokenHistory,
  tokenMetadataUpdated,
  partiallyUpdateHistoryAndBalance,
  resetSelectedTokenIfNeeded,
} from '../actions/index';
import {
  constants as hathorConstants,
  errors as hathorErrors,
  HathorWallet,
  wallet as oldWalletUtil,
  walletUtils,
  storage,
  tokens,
  metadataApi,
} from '@hathor/wallet-lib';
import { chunk, get } from 'lodash';
import helpers from '../utils/helpers';

let Sentry = null;
// Need to import with window.require in electron (https://github.com/electron/electron/issues/7300)
if (window.require) {
  Sentry = window.require('@sentry/electron');
} else {
  Sentry = require('@sentry/browser');
}

/**
 * Key string constants for manipulating the storage
 * @type {{
 * lastSharedIndex: string,
 * notification: string,
 * address: string,
 * data: string,
 * hideZeroBalanceTokens: string,
 * sentry: string,
 * alwaysShowTokens: string,
 * }}
 * @readonly
 */
const storageKeys = {
  address: 'wallet:address',
  lastSharedIndex: 'wallet:lastSharedIndex',
  data: 'wallet:data',
  sentry: 'wallet:sentry',
  notification: 'wallet:notification',
  hideZeroBalanceTokens: 'wallet:hide_zero_balance_tokens',
  alwaysShowTokens: 'wallet:always_show_tokens',
  atomicProposals: 'wallet:atomic_swap_proposals',
}

/**
 * We use localStorage and Redux to save data.
 * In localStorage we have the following keys (prefixed by wallet:)
 * - data: object with data from the wallet including (all have full description in the reducers file)
 *   . historyTransactions: Object of transactions indexed by tx_id
 * - accessData: object with data to access the wallet
 *   . mainKey: string with encrypted private key
 *   . hash: string with hash of pin
 *   . words: string with encrypted words
 *   . hashPasswd: string with hash of password
 * - address: string with last shared address to show on screen
 * - lastSharedIndex: number with the index of the last shared address
 * - lastGeneratedIndex: number with the index of the last generated address
 * - lastUsedIndex: number with the index of the last used address
 * - lastUsedAddress: string the last used address
 * - server: string with server to connect and execute requests
 * - started: if wallet was already started (after welcome screen)
 * - backup: if words backup was already done
 * - locked: if wallet is locked
 * - closed: when the wallet was closed
 * - txMinWeight: minimum weight of a transaction (variable got from the backend)
 * - txWeightCoefficient: minimum weight coefficient of a transaction (variable got from the backend)
 * - tokens: array with tokens information {'name', 'symbol', 'uid'}
 * - sentry: if user allowed to send errors to sentry
 * - notification: if user allowed to send notifications
 *
 * @namespace Wallet
 */
const wallet = {
  /**
   * Validate if can generate the wallet with those parameters and then, call to generate it
   *
   * @param {string} words Words to generate the HD Wallet seed,
   * @param {string} passphrase
   * @param {string} pin
   * @param {string} password
   * @param {Object} routerHistory History to push new path in case of notification click
   *
   * @memberof Wallet
   * @inner
   */
  generateWallet(words, passphrase, pin, password, routerHistory) {
    try {
      walletUtils.wordsValid(words);
    } catch(e) {
      if (e instanceof hathorErrors.InvalidWords) {
        return null;
      } else {
        // Unhandled error
        throw e;
      }
    }

    store.dispatch(startWalletRequested({
      words,
      passphrase,
      pin,
      password,
      routerHistory,
    }))
  },

  /**
   * Get all tokens that this wallet has any transaction and fetch balance/history for each of them
   * We could do a lazy history load only when the user selects to see the token
   * but this would change the behaviour of the wallet and was not the goal of this moment
   * We should do this in the future anwyay
   *
   * wallet {HathorWallet} wallet object
   */
  async fetchWalletData(wallet) {
    // First we get the tokens in the wallet
    const tokens = await wallet.getTokens();

    const tokensHistory = {};
    const tokensBalance = {};
    // Then for each token we get the balance and history
    for (const token of tokens) {
      /* eslint-disable no-await-in-loop */
      // We fetch history count of 5 pages and then we fetch a new page each 'Next' button clicked
      const history = await wallet.getTxHistory({ token_id: token, count: 5 * WALLET_HISTORY_COUNT });
      tokensBalance[token] = await this.fetchTokenBalance(wallet, token);
      tokensHistory[token] = history.map((element) => helpers.mapTokenHistory(element, token));
      /* eslint-enable no-await-in-loop */
    }

    // Then we get from the addresses iterator all addresses
    return { tokensHistory, tokensBalance, tokens };
  },

  /**
   * Fetch paginated history for specific token
   *
   * wallet {HathorWallet} wallet object
   * token {string} Token uid
   * history {Array} current token history array
   */
  async fetchMoreHistory(wallet, token, history) {
    const newHistory = await wallet.getTxHistory({ token_id: token, skip: history.length, count: WALLET_HISTORY_COUNT });
    const newHistoryObjects = newHistory.map((element) => helpers.mapTokenHistory(element, token));

    if (newHistoryObjects.length) {
      store.dispatch(updateTokenHistory(token, newHistoryObjects));
    }

    return newHistoryObjects;
  },

  /**
   * Method that fetches the balance of a token
   * and pre process for the expected format
   *
   * wallet {HathorWallet} wallet object
   * uid {String} Token uid to fetch balance
   */
  async fetchTokenBalance(wallet, uid) {
    const balance = await wallet.getBalance(uid);
    const tokenBalance = balance[0].balance;
    const authorities = balance[0].tokenAuthorities;

    let mint = false;
    let melt = false;

    if (authorities) {
      const { unlocked } = authorities;
      mint = unlocked.mint;
      melt = unlocked.melt;
    }

    return {
      available: tokenBalance.unlocked,
      locked: tokenBalance.locked,
      mint,
      melt,
    };
  },

  /**
   * The wallet needs each token metadata to show information correctly
   * So we fetch the tokens metadata and store on redux
   *
   * @param {Array} tokens Array of token uids
   * @param {String} network Network name
   * @param {Number} downloadRetry Number of retries already done
   *
   * @memberof Wallet
   * @inner
   **/
  async fetchTokensMetadata(tokens, network, downloadRetry = 0) {
    const metadataPerToken = {};
    const errors = [];

    const tokenChunks = chunk(tokens, METADATA_CONCURRENT_DOWNLOAD);
    for (const chunk of tokenChunks) {
      await Promise.all(chunk.map(async (token) => {
        if (token === hathorConstants.HATHOR_TOKEN_CONFIG.uid) {
          return;
        }

        try {
          const data = await metadataApi.getDagMetadata(token, network);
          // When the getDagMetadata method returns null, it means that we have no metadata for this token
          if (data) {
            const tokenMeta = data[token];
            metadataPerToken[token] = tokenMeta;
          }
        } catch (e) {
          // Error downloading metadata, then we should wait a few seconds and retry if still didn't reached retry limit
          console.log('Error downloading metadata of token', token);
          errors.push(token);
        }
      }));
    }

    store.dispatch(tokenMetadataUpdated(metadataPerToken, errors));
  },

  /**
   * Updates the local database with known token metadata.
   *
   * When a token is created on the application (e.g. an NFT), we do not need to wait until the
   * metadata service validates it to have some of its information that we already know. ( e.g.:
   * hide the decimals on amount of tokens exhibition )
   *
   * @param {string} tokenUid Token hash
   * @param {Object} metadata Metadata to be inserted for this token
   */
  setLocalTokenMetadata(tokenUid, metadata) {
    const metadataPerToken = {};
    metadataPerToken[tokenUid] = metadata;

    store.dispatch(tokenMetadataUpdated(metadataPerToken, []));
  },

  /**
   * Filters only the non-registered tokens from the allTokens list.
   * Optionally filters only those with non-zero balance.
   *
   * @param {Object[]} allTokens list of all available tokens
   * @param {Object[]} registeredTokens list of registered tokens
   * @param {Object[]} tokensBalance data about token balances
   * @param {boolean} hideZeroBalance If true, omits tokens with zero balance
   * @returns {{uid:string, balance:{available:number,locked:number}}[]}
   */
  fetchUnknownTokens(allTokens, registeredTokens, tokensBalance, hideZeroBalance) {
    const alwaysShowTokensArray = this.listTokensAlwaysShow();
    const unknownTokens = [];

    // Iterating tokens to filter unregistered ones
    for (const tokenUid of allTokens) {
      // If it is already registered, skip it.
      if (registeredTokens.find((x) => x.uid === tokenUid)) {
        continue;
      }
      const balance = tokensBalance[tokenUid] || { available: 0, locked: 0 };
      const tokenData = {
        uid: tokenUid,
        balance: balance,
      };

      // If we indicated this token should always be exhibited, add it already.
      if (alwaysShowTokensArray.find(alwaysShowUid => alwaysShowUid === tokenUid)) {
        unknownTokens.push(tokenData);
        continue;
      }

      // If the "show only non-zero balance tokens" flag is active, filter here.
      if (hideZeroBalance) {
        const totalBalance = balance.available + balance.locked;

        // This token has zero balance: skip it.
        if (hideZeroBalance && totalBalance === 0) {
          continue;
        }
      }
      unknownTokens.push(tokenData);
    }

    return unknownTokens;
  },

  /**
   * Filters only the registered tokens from the allTokens list.
   * Optionally filters only those with non-zero balance.
   *
   * @param {Object[]} registeredTokens list of registered tokens
   * @param {Object[]} tokensBalance data about token balances
   * @param {boolean} hideZeroBalance If true, omits tokens with zero balance
   * @returns {object[]}
   */
  fetchRegisteredTokens(registeredTokens, tokensBalance, hideZeroBalance) {
    const alwaysShowTokensArray = this.listTokensAlwaysShow();
    const filteredTokens = [];

    // Iterating tokens to filter unregistered ones
    for (const registeredObject of registeredTokens) {
      const tokenUid = registeredObject.uid;

      // If there is no entry for this token on tokensBalance, generate an empty balance object.
      const balance = get(tokensBalance, `${tokenUid}.data`, { available: 0, locked: 0 });
      const tokenData = {
        ...registeredObject,
        balance: balance,
      };

      // If we indicated this token should always be exhibited, add it already.
      const isTokenHTR = tokenUid === hathorConstants.HATHOR_TOKEN_CONFIG.uid;
      const alwaysShowThisToken = alwaysShowTokensArray.find(alwaysShowUid => alwaysShowUid === tokenUid);

      if (isTokenHTR || alwaysShowThisToken) {
        filteredTokens.push(tokenData);
        continue;
      }

      // If the "show only non-zero balance tokens" flag is active, filter here.
      if (hideZeroBalance) {
        const totalBalance = balance.available + balance.locked;

        // This token has zero balance: skip it.
        if (hideZeroBalance && totalBalance === 0) {
          continue;
        }
      }

      filteredTokens.push(tokenData);
    }

    return filteredTokens;
  },

  async changeServer(wallet, pin, routerHistory) {
    wallet.stop({ cleanStorage: false });

    if (oldWalletUtil.isSoftwareWallet()) {
      store.dispatch(startWalletRequested({
        passphrase: '',
        pin,
        password: '',
        routerHistory,
        fromXpriv: true,
      }));
    } else {
      store.dispatch(startWalletRequested({
        passphrase: '',
        password: '',
        routerHistory,
        fromXpriv: false,
        xpub: wallet.xpub,
      }));
    }
  },

  /*
   * After load address history we should update redux data
   *
   * @memberof Wallet
   * @inner
   */
  afterLoadAddressHistory() {
    store.dispatch(loadingAddresses(false));
    const data = oldWalletUtil.getWalletData();
    // Update historyTransactions with new one
    const historyTransactions = 'historyTransactions' in data ? data['historyTransactions'] : {};
    const allTokens = 'allTokens' in data ? data['allTokens'] : [];
    const transactionsFound = Object.keys(historyTransactions).length;

    const address = storage.getItem(storageKeys.address);
    const lastSharedIndex = storage.getItem(storageKeys.lastSharedIndex);
    const lastGeneratedIndex = oldWalletUtil.getLastGeneratedIndex();

    store.dispatch(historyUpdate({
      historyTransactions,
      allTokens,
      lastSharedIndex,
      lastSharedAddress: address,
      addressesFound: lastGeneratedIndex + 1,
      transactionsFound,
    }));
  },

  /**
   * Add passphrase to the wallet
   *
   * @param {string} passphrase Passphrase to be added
   * @param {string} pin
   * @param {string} password
   *
   * @return {string} words generated (null if words are not valid)
   * @memberof Wallet
   * @inner
   */
  addPassphrase(passphrase, pin, password, routerHistory) {
    const words = oldWalletUtil.getWalletWords(password);
    this.cleanWallet()
    return this.generateWallet(words, passphrase, pin, password, routerHistory);
  },

  /*
   * Clean all data before logout wallet
   * - Clean local storage
   * - Unsubscribe websocket connections
   *
   * @memberof Wallet
   * @inner
   */
  cleanWallet() {
    oldWalletUtil.cleanWallet();
    this.cleanWalletRedux();
  },

  /*
   * Clean data from redux
   *
   * @memberof Wallet
   * @inner
   */
  cleanWalletRedux() {
    store.dispatch(cleanData());
  },

  /*
   * Clean all data from everything
   *
   * @memberof Wallet
   * @inner
   */
  async resetWalletData() {
    await FeatureFlags.clearIgnoreWalletServiceFlag();

    this.cleanWalletRedux();
    oldWalletUtil.resetWalletData();
  },

  /*
   * Reload data in the localStorage
   *
   * @memberof Wallet
   * @inner
   */
  reloadData({endConnection = false} = {}) {
    store.dispatch(loadingAddresses(true));

    const dataToken = tokens.getTokens();
    // Cleaning redux and leaving only tokens data
    store.dispatch(reloadData({
      tokensHistory: {},
      tokensBalance: {},
      tokens: dataToken,
    }));

    // before cleaning data, check if we need to transfer xpubkey to wallet:accessData
    const accessData = oldWalletUtil.getWalletAccessData();
    if (accessData.xpubkey === undefined) {
      // XXX from v0.12.0 to v0.13.0, xpubkey changes from wallet:data to access:data.
      // That's not a problem if wallet is being initialized. However, if it's already
      // initialized, we need to set the xpubkey in the correct place.
      const oldData = JSON.parse(localStorage.getItem(storageKeys.data));
      accessData.xpubkey = oldData.xpubkey;
      oldWalletUtil.setWalletAccessData(accessData);
      localStorage.removeItem(storageKeys.data);
    }

    // Load history from new server
    const promise = oldWalletUtil.reloadData({endConnection});
    promise.then(() => {
      this.afterLoadAddressHistory();
    });
    return promise;
  },

  /**
   * Verifies if user allowed to send errors to sentry
   *
   * @return {boolean}
   *
   * @memberof Wallet
   * @inner
   */
  isSentryAllowed() {
    return this.getSentryPermission() === true;
  },

  /**
   * Set in localStorage that user allowed to send errors to sentry
   *
   * @memberof Wallet
   * @inner
   */
  allowSentry() {
    storage.setItem(storageKeys.sentry, true);
    this.updateSentryState();
  },

  /**
   * Set in localStorage that user did not allow to send errors to sentry
   *
   * @memberof Wallet
   * @inner
   */
  disallowSentry() {
    storage.setItem(storageKeys.sentry, false);
    this.updateSentryState();
  },

  /**
   * Return sentry permission saved in localStorage
   *
   * @return {boolean} Sentry permission (can be null)
   *
   * @memberof Wallet
   * @inner
   */
  getSentryPermission() {
    return storage.getItem(storageKeys.sentry);
  },

  /**
   * Init Sentry with DSN passed (if Sentry is initialized with empty string will be turned off)
   *
   * @param {string} dsn Sentry connection string
   *
   * @memberof Wallet
   * @inner
   */
  initSentry(dsn) {
    Sentry.init({
      dsn: dsn,
      release: process.env.npm_package_version
    });
  },

  /**
   * Check from localStorage data and init or turn off Sentry
   *
   * @memberof Wallet
   * @inner
   */
  updateSentryState() {
    if (this.isSentryAllowed()) {
      // Init Sentry
      this.initSentry(SENTRY_DSN);
    } else {
      // Turn off Sentry
      this.initSentry('');
    }
  },

  /**
   * Add scope and extra data to sentry exception
   *
   * @param {Object} error Error stacktrace
   * @param {Object} info Extra info with context when error happened
   *
   * @memberof Wallet
   * @inner
   */
  sentryWithScope(error, info) {
    Sentry.withScope(scope => {
      Object.entries(info).forEach(
        ([key, item]) => scope.setExtra(key, item)
      );
      DEBUG_LOCAL_DATA_KEYS.forEach(
        (key) => scope.setExtra(key, storage.getItem(key))
      )
      Sentry.captureException(error);
    });
  },

  /**
   * Sending notification in case the user allowed it
   *
   * @return {Notification} Notification object, in case the user allowed it. Otherwise, returns undefined
   *
   * @memberof Wallet
   * @inner
   */
  sendNotification(message) {
    if (this.isNotificationOn()) {
      // For the native app in electron we dont need to request permission, because it's always granted
      // That's why we check only the localStorage choice of the user
      return new Notification('Hathor Wallet', {body: message, silent: false});
    }
  },

  /**
   * Checks if the notification is turned on
   *
   * @return {boolean} If the notification is turned on
   *
   * @memberof Wallet
   * @inner
   */
  isNotificationOn() {
    return storage.getItem(storageKeys.notification) !== false;
  },

  /**
   * Turns notification on
   *
   * @memberof Wallet
   * @inner
   */
  turnNotificationOn() {
    storage.setItem(storageKeys.notification, true);
  },

  /**
   * Turns notification off
   *
   * @memberof Wallet
   * @inner
   */
  turnNotificationOff() {
    storage.setItem(storageKeys.notification, false);
  },

  /**
   * Checks if the zero-balance tokens are set to be hidden
   *
   * @return {boolean} If the tokens are hidden
   *
   * @memberof Wallet
   * @inner
   */
  areZeroBalanceTokensHidden() {
    return storage.getItem(storageKeys.hideZeroBalanceTokens) === true;
  },

  /**
   * Turns on the hiding of zero-balance tokens
   *
   * @memberof Wallet
   * @inner
   */
  hideZeroBalanceTokens() {
    storage.setItem(storageKeys.hideZeroBalanceTokens, true);
    // If the token selected has been hidden, then we must select HTR
    store.dispatch(resetSelectedTokenIfNeeded());
  },

  /**
   * Turns off the hiding of zero-balance tokens
   *
   * @memberof Wallet
   * @inner
   */
  showZeroBalanceTokens() {
    storage.setItem(storageKeys.hideZeroBalanceTokens, false);
  },

  /**
   * Defines if a token should always be shown, despite having zero balance and the "hide zero
   * balance" setting being active.
   * @param {string} tokenUid uid of the token to be updated
   * @param {boolean} newValue If true, the token will always be shown
   */
  setTokenAlwaysShow(tokenUid, newValue) {
    const alwaysShowMap = storage.getItem(storageKeys.alwaysShowTokens) || {};
    if (!newValue) {
      delete alwaysShowMap[tokenUid];
    } else {
      alwaysShowMap[tokenUid] = true;
    }
    storage.setItem(storageKeys.alwaysShowTokens, alwaysShowMap);
  },

  /**
   * Returns if a token is set to always be shown despite the "hide zero balance" setting
   * @param {string} tokenUid
   * @returns {boolean}
   */
  isTokenAlwaysShow(tokenUid) {
    const alwaysShowMap = storage.getItem(storageKeys.alwaysShowTokens) || {};
    return alwaysShowMap[tokenUid] || false;
  },

  /**
   * Returns an array containing the uids of the tokens set to always be shown
   * @returns {string[]}
   */
  listTokensAlwaysShow() {
    const alwaysShowMap = storage.getItem(storageKeys.alwaysShowTokens) || {};
    return Object.keys(alwaysShowMap);
  },

  /**
   * Converts a decimal value to integer. On the full node and the wallet lib, we only deal with
   * integer values for amount. So a value of 45.97 for the user is handled by them as 4597.
   * We need the Math.round because of some precision errors in js
   * 35.05*100 = 3504.9999999999995 Precision error
   * Math.round(35.05*100) = 3505
   *
   * @param {number} value The decimal amount
   *
   * @return {number} Value as an integer
   *
   * @memberof Wallet
   * @inner
   */
  decimalToInteger(value) {
    return Math.round(value*(10**hathorConstants.DECIMAL_PLACES));
  },

  getListenedProposalList() {
    const serializedList = storage.getItem(storageKeys.atomicProposals);
    return serializedList || {};
  },

  /**
   * @param {Record<string,ReduxProposalData>} proposalList
   */
  setListenedProposalList(proposalList) {
    storage.setItem(storageKeys.atomicProposals, proposalList);
  },
}

export default wallet;
