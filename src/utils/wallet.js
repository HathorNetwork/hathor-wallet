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
  WALLET_SERVICE_MAINNET_BASE_URL,
  WALLET_SERVICE_MAINNET_BASE_WS_URL,
} from '../constants';
import { FeatureFlags } from '../featureFlags';
import STORE from '../storageInstance';
import store from '../store/index';
import {
  setWallet,
  updateLoadedData,
  isOnlineUpdate,
  updateHeight,
  updateTx,
  loadingAddresses,
  loadWalletSuccess,
  historyUpdate,
  sharedAddressUpdate,
  reloadData,
  cleanData,
  changeServer,
  updateTokenHistory,
  tokenMetadataUpdated,
  metadataLoaded,
  partiallyUpdateHistoryAndBalance,
  setUseWalletService,
  lockWalletForResult,
} from '../actions/index';
import {
  helpers,
  constants as hathorConstants,
  errors as hathorErrors,
  HathorWallet,
  HathorWalletServiceWallet,
  Connection,
  Network,
  wallet as oldWalletUtil,
  walletUtils,
  storage,
  tokens,
  metadataApi,
  config,
} from '@hathor/wallet-lib';
import version from './version';
import ledger from './ledger';
import { chunk } from 'lodash';
import walletHelpers from './helpers';

let Sentry = null;
// Need to import with window.require in electron (https://github.com/electron/electron/issues/7300)
if (window.require) {
  Sentry = window.require('@sentry/electron');
} else {
  Sentry = require('@sentry/browser');
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

    return this.startWallet(words, passphrase, pin, password, routerHistory);
  },

  /**
   * Map token history object to the expected object in the wallet redux data
   *
   * tx {Object} history data element
   * tokenUid {String} token uid
   */
  mapTokenHistory(tx, tokenUid) {
    return {
      tx_id: tx.txId,
      timestamp: tx.timestamp,
      tokenUid,
      balance: tx.balance,
      // in wallet service this comes as 0/1 and in the full node comes with true/false
      is_voided: Boolean(tx.voided),
      version: tx.version,
    };
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
      const balance = await wallet.getBalance(token);
      const tokenBalance = balance[0].balance;
      const authorities = balance[0].tokenAuthorities;

      let mint = false;
      let melt = false;

      if (authorities) {
        const { unlocked } = authorities;
        mint = unlocked.mint;
        melt = unlocked.melt;
      }

      tokensBalance[token] = {
        available: tokenBalance.unlocked,
        locked: tokenBalance.locked,
        mint,
        melt,
      };
      // We fetch history count of 5 pages and then we fetch a new page each 'Next' button clicked
      const history = await wallet.getTxHistory({ token_id: token, count: WALLET_HISTORY_COUNT });
      tokensHistory[token] = history.map((element) => this.mapTokenHistory(element, token));
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
    const newHistoryObjects = newHistory.map((element) => this.mapTokenHistory(element, token));

    if (newHistoryObjects.length) {
      store.dispatch(updateTokenHistory(token, newHistoryObjects));
    }

    return newHistoryObjects;
  },

  /**
   * After a new transaction arrives in the websocket we must
   * fetch the new balance for each token on it and use
   * this new data to update redux info
   *
   * wallet {HathorWallet} wallet object
   * tx {Object} full transaction object from the websocket
   */
  async fetchNewTxTokenBalance(wallet, tx) {
    if (!wallet.isReady()) {
      return null;
    }

    const updatedBalanceMap = {};
    const balances = await wallet.getTxBalance(tx, { includeAuthorities: true });

    // we now loop through all tokens present in the new tx to get the new balance
    for (const [tokenUid] of Object.entries(balances)) {
      /* eslint-disable no-await-in-loop */
      updatedBalanceMap[tokenUid] = await this.fetchTokenBalance(wallet, tokenUid);
    }
    return updatedBalanceMap;
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
   * Fetch HTR balance
   *
   * wallet {HathorWallet} wallet object
   */
  async fetchNewHTRBalance(wallet) {
    if (wallet.isReady()) {
      // Need to update tokensBalance if wallet is ready
      const { uid } = hathorConstants.HATHOR_TOKEN_CONFIG;
      return await this.fetchTokenBalance(wallet, uid);
    }
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

  async handlePartialUpdate (wallet, updatedBalanceMap) {
    const tokens = Object.keys(updatedBalanceMap);
    const tokensHistory = {};
    const tokensBalance = {};

    for (const token of tokens) {
      /* eslint-disable no-await-in-loop */
      const balance = await wallet.getBalance(token);
      const tokenBalance = balance[0].balance;
      const authorities = balance[0].tokenAuthorities;

      let mint = false;
      let melt = false;

      if (authorities) {
        const { unlocked } = authorities;
        mint = unlocked.mint;
        melt = unlocked.melt;
      }

      tokensBalance[token] = {
        available: tokenBalance.unlocked,
        locked: tokenBalance.locked,
        mint,
        melt,
      };
      const history = await wallet.getTxHistory({ token_id: token });
      tokensHistory[token] = history.map((element) => this.mapTokenHistory(element, token));
      /* eslint-enable no-await-in-loop */
    }

    store.dispatch(partiallyUpdateHistoryAndBalance({ tokensHistory, tokensBalance }));
  },

  /**
   * Start a new HD wallet with new private key
   * Encrypt this private key and save data in localStorage
   *
   * @param {string} words Words to generate the HD Wallet seed
   * @param {string} passphrase
   * @param {string} pin
   * @param {string} password
   * @param {Object} routerHistory History to push new path in case of notification click
   * @param {boolean} fromXpriv If should start the wallet from xpriv already in storage
   *
   * @memberof Wallet
   * @inner
   */
  async startWallet(words, passphrase, pin, password, routerHistory, fromXpriv = false, xpub = null) {
    // Set loading addresses screen to show
    store.dispatch(loadingAddresses(true));
    store.dispatch(metadataLoaded(false));

    // When we start a wallet from the locked screen, we need to unlock it in the storage
    oldWalletUtil.unlock();
 
    // This check is important to set the correct network on storage and redux
    const data = await version.checkApiVersion();

    // Fetch metadata of all tokens registered
    const dataToken = tokens.getTokens();

    // Before cleaning loaded data we must save in redux what we have of tokens in localStorage
    store.dispatch(reloadData({ tokens: dataToken }));

    this.fetchTokensMetadata(dataToken.map((token) => token.uid), data.network);

    const uniqueDeviceId = walletHelpers.getUniqueId();
    const featureFlags = new FeatureFlags(uniqueDeviceId, data.network);
    const hardwareWallet = !oldWalletUtil.isSoftwareWallet();

    // For now, the wallet service does not support hardware wallet, so default to the old facade
    const useWalletService = hardwareWallet ? false : await featureFlags.shouldUseWalletService();

    store.dispatch(setUseWalletService(useWalletService));

    let wallet;
    let connection;

    if (useWalletService) {
      const network = new Network(data.network);

      let xpriv = null;
      if (fromXpriv) {
        xpriv = oldWalletUtil.getAcctPathXprivKey(pin);
      }

      // Set urls for wallet service
      config.setWalletServiceBaseUrl(WALLET_SERVICE_MAINNET_BASE_URL);
      config.setWalletServiceBaseWsUrl(WALLET_SERVICE_MAINNET_BASE_WS_URL);

      const walletConfig = {
        seed: words,
        xpriv,
        xpub,
        requestPassword: async () => new Promise((resolve) => {
          /**
           * Lock screen will call `resolve` with the pin screen after validation
           */
          routerHistory.push('/locked/');
          store.dispatch(lockWalletForResult(resolve));
        }),
        passphrase,
        network,
      };

      wallet = new HathorWalletServiceWallet(walletConfig);
      connection = wallet.conn;
    } else {
      // If we've lost redux data, we could not properly stop the wallet object
      // then we don't know if we've cleaned up the wallet data in the storage
      // If it's fromXpriv, then we can't clean access data because we need that
      oldWalletUtil.cleanLoadedData({ cleanAccessData: !fromXpriv});

      let xpriv = null;

      if (fromXpriv) {
        xpriv = oldWalletUtil.getXprivKey(pin);
      }

      connection = new Connection({
        network: data.network,
        servers: [helpers.getServerURL()],
      });

      const beforeReloadCallback = () => {
        store.dispatch(loadingAddresses(true));
      };

      const walletConfig = {
        seed: words,
        xpriv,
        xpub,
        store: STORE,
        passphrase,
        connection,
        beforeReloadCallback,
      };

      wallet = new HathorWallet(walletConfig);
    }

    store.dispatch(setWallet(wallet));

    // TODO should we save server info?
    //store.dispatch(setServerInfo(serverInfo));
    wallet.on('state', async (state) => {
      if (state === HathorWallet.ERROR) {
        // ERROR
        // TODO Should we show an error screen and try to restart the wallet?
      } else if (wallet.isReady()) {
        // READY
        const { tokensHistory, tokensBalance, tokens } = await this.fetchWalletData(wallet);
        store.dispatch(loadWalletSuccess(tokensHistory, tokensBalance, tokens));
      }
    });

    wallet.on('new-tx', async (tx) => {
      let message = '';
      if (helpers.isBlock(tx)) {
        message = 'You\'ve found a new block! Click to open it.';
      } else {
        message = 'You\'ve received a new transaction! Click to open it.'
      }

      const notification = this.sendNotification(message);

      // Set the notification click, in case we have sent one
      if (notification !== undefined) {
        notification.onclick = () => {
          routerHistory.push(`/transaction/${tx.tx_id}/`);
        }
      }

      this.fetchNewTxTokenBalance(wallet, tx).then(async (updatedBalanceMap) => {
        if (updatedBalanceMap) {
          this.handlePartialUpdate(wallet, updatedBalanceMap);

          // If we are here, we have already fetched new addresses, so it's safe to
          // call getCurrentAddress to make sure we display a new address to the user
          const currentAddress = wallet.getCurrentAddress();
          this.updateSharedAddressRedux(currentAddress.address, currentAddress.index);
        }
      });
    });

    wallet.on('update-tx', async (tx) => {
      const balances = await wallet.getTxBalance(tx, { includeAuthorities: true });
      const updatedBalanceMap = await this.fetchNewTxTokenBalance(wallet, tx);
      store.dispatch(updateTx(tx, updatedBalanceMap, balances));
    });

    try {
      const serverInfo = await wallet.start({ pinCode: pin, password });

      this.setConnectionEvents(connection, wallet);
    } catch(e) {
      if (useWalletService) {
        // Wallet Service start wallet will fail if the status returned from
        // the service is 'error' or if the start wallet request failed.
        // We should fallback to the old facade by storing the flag to ignore
        // the feature flag
        await featureFlags.ignoreWalletServiceFlag();

        // Restart the page, ignoring cache to make sure events are reset
        walletHelpers.reloadElectron();
      }
    }

    featureFlags.on('wallet-service-enabled', (newUseWalletService) => {
      // We should only force reset the bundle if the user was on
      // the wallet service facade and the newflag sends him to
      // the old facade
      if (useWalletService && useWalletService !== newUseWalletService) {
        walletHelpers.reloadElectron();
      }
    });
  },

  setConnectionEvents(connection, wallet) {
    connection.on('best-block-update', (height) => {
      // HTR balance might have updated because of new height
      // and some block HTR might have unlocked
      this.fetchNewHTRBalance(wallet).then((htrUpdatedBalance) => {
        if (htrUpdatedBalance) {
          store.dispatch(updateHeight(height, htrUpdatedBalance));
        }
      });
    });

    connection.on('state', (state) => {
      let isOnline;
      if (state === Connection.CONNECTED) {
        isOnline = true;
      } else {
        isOnline = false;
      }
      store.dispatch(isOnlineUpdate({ isOnline }));
    });

    connection.on('wallet-load-partial-update', (data) => {
      const transactions = Object.keys(data.historyTransactions).length;
      const addresses = data.addressesFound;
      store.dispatch(updateLoadedData({ transactions, addresses }));
    });
  },

  async changeServer(wallet, pin, routerHistory) {
    wallet.stop({ cleanStorage: false });
    if (oldWalletUtil.isSoftwareWallet()) {
      await this.startWallet(null, '', pin, '', routerHistory, true);
    } else {
      await this.startWallet(null, '', null, '', routerHistory, false, wallet.xpub);
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

    const address = storage.getItem('wallet:address');
    const lastSharedIndex = storage.getItem('wallet:lastSharedIndex');
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

  /**
   * Update last shared address and index in redux
   *
   * @param {string} address Last shared address
   * @param {number} index Last shared index
   *
   * @memberof Wallet
   * @inner
   */
  updateSharedAddressRedux(address, index) {
    store.dispatch(sharedAddressUpdate({ lastSharedAddress: address, lastSharedIndex: index}));
  },

  /**
   * Get the shared address and index from localStorage to update Redux
   *
   * @memberof Wallet
   * @inner
   */
  updateSharedAddress() {
    const lastSharedIndex = oldWalletUtil.getLastSharedIndex();
    const lastSharedAddress = storage.getItem('wallet:address');
    this.updateSharedAddressRedux(lastSharedAddress, lastSharedIndex);
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
      const oldData = JSON.parse(localStorage.getItem('wallet:data'));
      accessData.xpubkey = oldData.xpubkey;
      oldWalletUtil.setWalletAccessData(accessData);
      localStorage.removeItem('wallet:data');
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
    storage.setItem('wallet:sentry', true);
    this.updateSentryState();
  },

  /**
   * Set in localStorage that user did not allow to send errors to sentry
   *
   * @memberof Wallet
   * @inner
   */
  disallowSentry() {
    storage.setItem('wallet:sentry', false);
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
    return storage.getItem('wallet:sentry');
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
    return storage.getItem('wallet:notification') !== false;
  },

  /**
   * Turns notification on
   *
   * @memberof Wallet
   * @inner
   */
  turnNotificationOn() {
    storage.setItem('wallet:notification', true);
  },

  /**
   * Turns notification off
   *
   * @memberof Wallet
   * @inner
   */
  turnNotificationOff() {
    storage.setItem('wallet:notification', false);
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
}

export default wallet;
