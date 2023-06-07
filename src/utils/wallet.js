/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import {
  SENTRY_DSN,
  WALLET_HISTORY_COUNT,
  METADATA_CONCURRENT_DOWNLOAD,
} from '../constants';
import store from '../store/index';
import {
  loadingAddresses,
  startWalletRequested,
  historyUpdate,
  reloadData,
  cleanData,
  updateTokenHistory,
  tokenMetadataUpdated,
  resetSelectedTokenIfNeeded,
} from '../actions/index';
import {
  constants as hathorConstants,
  errors as hathorErrors,
  walletUtils,
  metadataApi,
  storageUtils,
} from '@hathor/wallet-lib';
import { chunk, get } from 'lodash';
import helpers from '../utils/helpers';
import LOCAL_STORE from '../storage';

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
 * atomicProposals: string,
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
   * Validates an address
   *
   * @param {string} address Address in base58
   *
   * @return {boolean} boolean indicating if address is valid
   */
  validateAddress(address) {
    try {
      const addressObj = new hathorLib.Address(address, { network: networkObj });
      addressObj.validateAddress();
      return true;
    } catch (e) {
      return false;
    }
  },

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
   * Fetch paginated history for specific token
   *
   * @param {HathorWallet} wallet wallet instance
   * @param {string} token Token uid
   * @param {Array} history current token history array
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
   * @param {HathorWallet} wallet wallet instance
   * @param {String} uid Token uid to fetch balance
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
   *
   * @memberof Wallet
   * @inner
   **/
  async fetchTokensMetadata(tokens, network) {
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
   * @returns {Promise<{uid:string, balance:{available:number,locked:number}}[]>}
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
        if (totalBalance === 0) {
          continue;
        }
      }

      filteredTokens.push(tokenData);
    }

    return filteredTokens;
  },

  /**
   *
   * @param {HathorWallet} wallet The wallet instance
   * @param {string} pin The pin entered by the user
   * @param {any} routerHistory
   */
  async changeServer(wallet, pin, routerHistory) {
    await wallet.stop({ cleanStorage: false });

    const isHardwareWallet = await wallet.isHardwareWallet();

    // XXX: check if we would require the seed or xpriv to start the wallet
    if (!isHardwareWallet) {
      store.dispatch(startWalletRequested({
        passphrase: '',
        pin,
        password: '',
        routerHistory,
        hardware: false,
      }));
    } else {
      store.dispatch(startWalletRequested({
        passphrase: '',
        password: '',
        routerHistory,
        xpub: wallet.xpub,
        hardware: true,
      }));
    }
  },

  /**
   * After load address history we should update redux data
   *
   * @param {HathorWallet} wallet The wallet instance
   *
   * @memberof Wallet
   * @inner
   */
  async afterLoadAddressHistory(wallet) {
    // runs after load address history
    store.dispatch(loadingAddresses(false));
    // XXX: We used to get the entire history of transactions, but it was not being used.

    const allTokens = await wallet.getTokens();
    const transactionsFound = await wallet.storage.store.historyCount();
    const addressesFound = await wallet.storage.store.addressCount();

    const address = await wallet.storage.getCurrentAddress();
    const addressInfo = await wallet.storage.getAddressInfo(address);
    const lastSharedIndex = addressInfo.bip32AddressIndex;

    store.dispatch(historyUpdate({
      allTokens,
      lastSharedIndex,
      lastSharedAddress: address,
      addressesFound,
      transactionsFound,
    }));
  },

  /**
   * Add passphrase to the wallet
   *
   * @param {HathorWallet} wallet The wallet instance
   * @param {string} passphrase Passphrase to be added
   * @param {string} pin
   * @param {string} password
   *
   * @return {Promise<void>}
   * @memberof Wallet
   * @inner
   */
  async addPassphrase(wallet, passphrase, pin, password, routerHistory) {
    const words = await wallet.storage.getWalletWords(password);

    // Clean wallet data, persisted data and redux
    await this.cleanWallet(wallet);
    return this.generateWallet(words, passphrase, pin, password, routerHistory);
  },

  /*
   * Clean all data before logout wallet
   * - Clean local storage
   * - Unsubscribe websocket connections
   *
   * @param {HathorWallet} wallet The wallet instance
   * @memberof Wallet
   * @inner
   */
  async cleanWallet(wallet) {
    await wallet.storage.cleanStorage(true, true);
    LOCAL_STORE.cleanWallet();
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
   * Reload data in the localStorage
   *
   * @param {HathorWallet} wallet The wallet instance
   * @param {Object} [options={}]
   * @param {boolean} [options.endConnection=false] If should end connection with websocket
   *
   * @memberof Wallet
   * @inner
   */
  async reloadData(wallet, {endConnection = false} = {}) {
    store.dispatch(loadingAddresses(true));

    const tokens = new Set();
    for await (const token of wallet.storage.getRegisteredTokens()) {
      tokens.add(token.uid);
    }

    // Cleaning redux and leaving only tokens data
    store.dispatch(reloadData({
      tokensHistory: {},
      tokensBalance: {},
      tokens,
    }));

    // Load history from new server
    await storageUtils.reloadStorage(wallet.storage, wallet.conn);
    await afterLoadAddressHistory(wallet);
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
    localStorage.setItem(storageKeys.sentry, true);
    this.updateSentryState();
  },

  /**
   * Set in localStorage that user did not allow to send errors to sentry
   *
   * @memberof Wallet
   * @inner
   */
  disallowSentry() {
    localStorage.setItem(storageKeys.sentry, false);
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
    return localStorage.getItem(storageKeys.sentry);
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
      // TODO: Add storage snapshot to sentry
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
    return localStorage.getItem(storageKeys.notification) !== false;
  },

  /**
   * Turns notification on
   *
   * @memberof Wallet
   * @inner
   */
  turnNotificationOn() {
    localStorage.setItem(storageKeys.notification, true);
  },

  /**
   * Turns notification off
   *
   * @memberof Wallet
   * @inner
   */
  turnNotificationOff() {
    localStorage.setItem(storageKeys.notification, false);
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
    return localStorage.getItem(storageKeys.hideZeroBalanceTokens) === true;
  },

  /**
   * Turns on the hiding of zero-balance tokens
   *
   * @memberof Wallet
   * @inner
   */
  hideZeroBalanceTokens() {
    localStorage.setItem(storageKeys.hideZeroBalanceTokens, true);
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
    localStorage.setItem(storageKeys.hideZeroBalanceTokens, false);
  },

  /**
   * Defines if a token should always be shown, despite having zero balance and the "hide zero
   * balance" setting being active.
   * @param {string} tokenUid uid of the token to be updated
   * @param {boolean} newValue If true, the token will always be shown
   */
  setTokenAlwaysShow(tokenUid, newValue) {
    const alwaysShowMap = localStorage.getItem(storageKeys.alwaysShowTokens) || {};
    if (!newValue) {
      delete alwaysShowMap[tokenUid];
    } else {
      alwaysShowMap[tokenUid] = true;
    }
    localStorage.setItem(storageKeys.alwaysShowTokens, alwaysShowMap);
  },

  /**
   * Returns if a token is set to always be shown despite the "hide zero balance" setting
   * @param {string} tokenUid
   * @returns {boolean}
   */
  isTokenAlwaysShow(tokenUid) {
    const alwaysShowMap = localStorage.getItem(storageKeys.alwaysShowTokens) || {};
    return alwaysShowMap[tokenUid] || false;
  },

  /**
   * Returns an array containing the uids of the tokens set to always be shown
   *
   * We use localStorage since the wallet storage is async and may require
   * a refactor on how we load data in some components and screens.
   *
   * @returns {string[]}
   */
  listTokensAlwaysShow() {
    const alwaysShowMap = localStorage.getItem(storageKeys.alwaysShowTokens) || {};;
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

  /**
   * Returns a string map containing the identifiers for proposals currently being watched.
   * @returns {Record<string,{ id:string, password:string }>}
   */
  getListenedProposals() {
    const proposalMap = storage.getItem(storageKeys.atomicProposals);
    return proposalMap || {};
  },

  /**
   * Stores a string map containing the identifiers for proposals currently being watched.
   * @param {Record<string,{ id:string, password:string }>} proposalList
   */
  setListenedProposals(proposalList) {
    storage.setItem(storageKeys.atomicProposals, proposalList);
  },
}

export default wallet;
