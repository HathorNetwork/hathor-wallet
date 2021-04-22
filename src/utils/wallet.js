/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { SENTRY_DSN, DEBUG_LOCAL_DATA_KEYS, STORE } from '../constants';
import store from '../store/index';
import { setWallet, updateLoadedData, isOnlineUpdate, updateHeight, newTx, updateTx, loadingAddresses, loadWalletSuccess, historyUpdate, sharedAddressUpdate, reloadData, cleanData, changeServer } from '../actions/index';
import { helpers, constants as hathorConstants, errors as hathorErrors, HathorWallet, Connection, wallet as oldWalletUtil, walletUtils, storage, tokens } from '@hathor/wallet-lib';
import version from './version';

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
   *
   * @memberof Wallet
   * @inner
   */
  generateWallet(words, passphrase, pin, password, routerHistory) {
    try {
      walletUtils.wordsValid(words);
      return this.startWallet(words, passphrase, pin, password, routerHistory);
    } catch(e) {
      if (e instanceof hathorErrors.InvalidWords) {
        return null;
      } else {
        // Unhandled error
        throw e;
      }
    }
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
  startWallet(words, passphrase, pin, password, routerHistory, fromXpriv = false) {
    // Set loading addresses screen to show
    store.dispatch(loadingAddresses(true));
    // When we start a wallet from the locked screen, we need to unlock it in the storage
    oldWalletUtil.unlock();

    // This check is important to set the correct network on storage and redux
    const promise = version.checkApiVersion();
    promise.then((data) => {
      // If we've lost redux data, we could not properly stop the wallet object
      // then we don't know if we've cleaned up the wallet data in the storage
      // If it's fromXpriv, then we can't clean access data because we need that
      oldWalletUtil.cleanLoadedData({ cleanAccessData: !fromXpriv});

      const connection = new Connection({
        network: data.network,
        servers: [helpers.getServerURL()],
      });

      const beforeReloadCallback = () => {
        store.dispatch(loadingAddresses(true));
      };

      let xpriv = null;
      if (fromXpriv) {
        xpriv = oldWalletUtil.getXprivKey(pin);
      }

      const walletConfig = {
        seed: words,
        xpriv,
        store: STORE,
        passphrase,
        connection,
        password,
        pinCode: pin,
        beforeReloadCallback
      };

      const wallet = new HathorWallet(walletConfig);

      store.dispatch(setWallet(wallet));

      wallet.start().then((serverInfo) => {
        // TODO should we save server info?
        //store.dispatch(setServerInfo(serverInfo));
        wallet.on('state', (state) => {
          if (state === HathorWallet.ERROR) {
            // ERROR
            // TODO Should we show an error screen and try to restart the wallet?
          } else if (state === HathorWallet.READY) {
            // READY
            const historyTransactions = wallet.getTxHistory();
            store.dispatch(loadWalletSuccess(historyTransactions));
          }
        });

        wallet.on('new-tx', (tx) => {
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
          store.dispatch(newTx(tx));
        });

        wallet.on('update-tx', (tx) => {
          store.dispatch(updateTx(tx));
        });

        this.setConnectionEvents(connection);
      });
    });
    return promise;
  },

  setConnectionEvents(connection) {
    connection.on('best-block-update', (height) => {
      store.dispatch(updateHeight({ height }));
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

  changeServer(wallet) {
    // This call is important to update the network on storage and redux
    const promise = version.checkApiVersion();
    promise.then((data) => {
      store.dispatch(loadingAddresses(true));
      // Create new connection for the new server and update in the HathorWallet object saved in redux
      const connection = new Connection({
        network: data.network,
        servers: [helpers.getServerURL()],
      });

      this.setConnectionEvents(connection);

      wallet.changeConnection(connection);
    });

    return promise;
  },

  /*
   * Start the wallet and load its data from an xpub
   *
   * @param {String} xpub The xpub string from the wallet we're loading
   *
   * @return {Promise} Promise that resolves when finishes loading address history
   * @memberof Wallet
   * @inner
   */
  startHardwareWallet(xpub) {
    store.dispatch(loadingAddresses(true));
    const accessData = {
      xpubkey: xpub,
    }
    const promise = oldWalletUtil.startWallet(accessData, true);
    promise.then(() => {
      this.afterLoadAddressHistory();
    });
    return promise;
  },

  /*
   * Update localStorage and redux when a new tx arrive in the websocket
   *
   * @param {Object} data Object with data of the new tx
   *
   * @memberof Wallet
   * @inner
   */
  newAddressHistory(data) {
    const walletData = oldWalletUtil.getWalletData();
    // Update historyTransactions with new one
    const historyTransactions = 'historyTransactions' in walletData ? walletData['historyTransactions'] : {};
    const allTokens = 'allTokens' in walletData ? walletData['allTokens'] : [];
    oldWalletUtil.updateHistoryData(historyTransactions, allTokens, [data], null, walletData);

    this.afterLoadAddressHistory();
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
    const lastGeneratedIndex = wallet.getLastGeneratedIndex();

    store.dispatch(historyUpdate({historyTransactions, allTokens, lastSharedIndex, lastSharedAddress: address, addressesFound: lastGeneratedIndex + 1, transactionsFound}));
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

  /**
   * Update address shared in localStorage and redux
   *
   * @param {string} lastSharedAddress
   * @param {number} lastSharedIndex
   * @memberof Wallet
   * @inner
   */
  updateAddress(lastSharedAddress, lastSharedIndex, updateRedux) {
    oldWalletUtil.updateAddress(lastSharedAddress, lastSharedIndex);
    if (updateRedux) {
      this.updateSharedAddressRedux(lastSharedAddress, lastSharedIndex);
    }
  },

  /**
   * Generate a new address
   * We update the wallet data and new address shared
   *
   * @memberof Wallet
   * @inner
   */
  generateNewAddress() {
    const { newAddress, newIndex } = oldWalletUtil.generateNewAddress();

    // Save in redux the new shared address
    this.updateSharedAddressRedux(newAddress.toString(), newIndex);

    return {address: newAddress.toString(), index: newIndex};
  },

  /**
   * Get next address after the last shared one (only if it's already generated)
   * Update the data in localStorage and Redux
   *
   * @memberof Wallet
   * @inner
   */
  getNextAddress() {
    const result = oldWalletUtil.getNextAddress();
    if (result) {
      const {address, index} = result;
      this.updateSharedAddressRedux(address, index);
      return result;
    }
    return null;
  },

  /**
   * Get data from localStorage and save to redux
   *
   * @return {boolean} if was saved
   *
   * @memberof Wallet
   * @inner
   */
  localStorageToRedux() {
    let data = oldWalletUtil.getWalletData();
    if (data) {
      const dataToken = tokens.getTokens();
      // Saving wallet data
      store.dispatch(reloadData({
        historyTransactions: data.historyTransactions || {},
        allTokens: new Set(data.allTokens || []),
        tokens: dataToken,
      }));

      // Saving address data
      store.dispatch(sharedAddressUpdate({
        lastSharedAddress: storage.getItem('wallet:address'),
        lastSharedIndex: oldWalletUtil.getLastSharedIndex(),
      }));
      return true;
    } else {
      return false;
    }
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
  resetWalletData() {
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
    })
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
    return Math.round(value*(10**constants.DECIMAL_PLACES));
  },
}

export default wallet;
