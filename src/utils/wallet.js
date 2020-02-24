/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { SENTRY_DSN, DEBUG_LOCAL_DATA_KEYS } from '../constants';
import store from '../store/index';
import { loadingAddresses, historyUpdate, sharedAddressUpdate, reloadData, cleanData } from '../actions/index';
import hathorLib from '@hathor/wallet-lib';

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
   * @param {boolean} loadHistory if should load history from generated addresses
   *
   * @return {string} words generated (null if words are not valid)
   * @memberof Wallet
   * @inner
   */
  generateWallet(words, passphrase, pin, password, loadHistory) {
    if (hathorLib.wallet.wordsValid(words).valid) {
      return this.executeGenerateWallet(words, passphrase, pin, password, loadHistory);
    } else {
      return null;
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
   * @param {boolean} loadHistory if should load the history from the generated addresses
   *
   * @return {Promise} Promise that resolves when finishes loading address history, in case loadHistory = true, else returns null
   * @memberof Wallet
   * @inner
   */
  executeGenerateWallet(words, passphrase, pin, password, loadHistory) {
    if (loadHistory) {
      // Load history from address
      store.dispatch(loadingAddresses(true));
      const promise = hathorLib.wallet.executeGenerateWallet(words, passphrase, pin, password, loadHistory);
      promise.then(() => {
        this.afterLoadAddressHistory();
      });
      return promise;
    } else {
      return hathorLib.wallet.executeGenerateWallet(words, passphrase, pin, password, loadHistory);
    }
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
    const promise = hathorLib.wallet.startWallet(accessData, true);
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
    const walletData = hathorLib.wallet.getWalletData();
    // Update historyTransactions with new one
    const historyTransactions = 'historyTransactions' in walletData ? walletData['historyTransactions'] : {};
    const allTokens = 'allTokens' in walletData ? walletData['allTokens'] : [];
    hathorLib.wallet.updateHistoryData(historyTransactions, allTokens, [data], null, walletData);

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
    const data = hathorLib.wallet.getWalletData();
    // Update historyTransactions with new one
    const historyTransactions = 'historyTransactions' in data ? data['historyTransactions'] : {};
    const allTokens = 'allTokens' in data ? data['allTokens'] : [];
    const transactionsFound = Object.keys(historyTransactions).length;

    const address = hathorLib.storage.getItem('wallet:address');
    const lastSharedIndex = hathorLib.storage.getItem('wallet:lastSharedIndex');
    const lastGeneratedIndex = hathorLib.wallet.getLastGeneratedIndex();

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
  addPassphrase(passphrase, pin, password) {
    const words = hathorLib.wallet.getWalletWords(password);
    this.cleanWallet()
    return this.generateWallet(words, passphrase, pin, password, true);
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
    const lastSharedIndex = hathorLib.wallet.getLastSharedIndex();
    const lastSharedAddress = hathorLib.storage.getItem('wallet:address');
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
    hathorLib.wallet.updateAddress(lastSharedAddress, lastSharedIndex);
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
    const { newAddress, newIndex } = hathorLib.wallet.generateNewAddress();

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
    const result = hathorLib.wallet.getNextAddress();
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
    let data = hathorLib.wallet.getWalletData();
    if (data) {
      const dataToken = hathorLib.tokens.getTokens();
      // Saving wallet data
      store.dispatch(reloadData({
        historyTransactions: data.historyTransactions || {},
        allTokens: new Set(data.allTokens || []),
        tokens: dataToken,
      }));

      // Saving address data
      store.dispatch(sharedAddressUpdate({
        lastSharedAddress: hathorLib.storage.getItem('wallet:address'),
        lastSharedIndex: hathorLib.wallet.getLastSharedIndex(),
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
    hathorLib.wallet.cleanWallet();
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
    hathorLib.wallet.resetWalletData();
  },

  /*
   * Reload data in the localStorage
   *
   * @memberof Wallet
   * @inner
   */
  reloadData() {
    store.dispatch(loadingAddresses(true));

    this.cleanWalletRedux();

    // Cleaning redux and leaving only tokens data
    const dataToken = hathorLib.tokens.getTokens();
    store.dispatch(reloadData({
      historyTransactions: {},
      tokens: dataToken,
    }));

    // before cleaning data, check if we need to transfer xpubkey to wallet:accessData
    const accessData = hathorLib.wallet.getWalletAccessData();
    if (accessData.xpubkey === undefined) {
      // XXX from v0.12.0 to v0.13.0, xpubkey changes from wallet:data to access:data.
      // That's not a problem if wallet is being initialized. However, if it's already
      // initialized, we need to set the xpubkey in the correct place.
      const oldData = JSON.parse(localStorage.getItem('wallet:data'));
      accessData.xpubkey = oldData.xpubkey;
      hathorLib.wallet.setWalletAccessData(accessData);
      localStorage.removeItem('wallet:data');
    }

    // Load history from new server
    const promise = hathorLib.wallet.reloadData();
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
    hathorLib.storage.setItem('wallet:sentry', true);
    this.updateSentryState();
  },

  /**
   * Set in localStorage that user did not allow to send errors to sentry
   *
   * @memberof Wallet
   * @inner
   */
  disallowSentry() {
    hathorLib.storage.setItem('wallet:sentry', false);
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
    return hathorLib.storage.getItem('wallet:sentry');
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
        (key) => scope.setExtra(key, hathorLib.storage.getItem(key))
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
    return hathorLib.storage.getItem('wallet:notification') !== false;
  },

  /**
   * Turns notification on
   *
   * @memberof Wallet
   * @inner
   */
  turnNotificationOn() {
    hathorLib.storage.setItem('wallet:notification', true);
  },

  /**
   * Turns notification off
   *
   * @memberof Wallet
   * @inner
   */
  turnNotificationOff() {
    hathorLib.storage.setItem('wallet:notification', false);
  },

  /**
   * Converts a decimal value to integer. On the full node and the wallet lib, we only deal with
   * integer values for amount. So a value of 45.97 for the user is handled by them as 4597.
   *
   * @param {number} value The decimal amount
   *
   * @return {number} Value as an integer
   *
   * @memberof Wallet
   * @inner
   */
  decimalToInteger(value) {
    return parseInt(value*(10**hathorLib.constants.DECIMAL_PLACES), 10)
  },
}

export default wallet;
