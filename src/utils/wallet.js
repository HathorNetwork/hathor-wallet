/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { GAP_LIMIT, LIMIT_ADDRESS_GENERATION, HATHOR_BIP44_CODE, NETWORK, TOKEN_AUTHORITY_MASK, VERSION, HATHOR_TOKEN_INDEX, HATHOR_TOKEN_CONFIG, SENTRY_DSN, DEBUG_LOCAL_DATA_KEYS, MAX_OUTPUT_VALUE } from '../constants';
import Mnemonic from 'bitcore-mnemonic';
import { HDPublicKey, Address } from 'bitcore-lib';
import CryptoJS from 'crypto-js';
import walletApi from '../api/wallet';
import tokens from './tokens';
import helpers from './helpers';
import { OutputValueError } from './errors';
import version from './version';
import store from '../store/index';
import { historyUpdate, sharedAddressUpdate, reloadData, cleanData } from '../actions/index';
import WebSocketHandler from '../WebSocketHandler';
import dateFormatter from './date';
import _ from 'lodash';

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
    if (this.wordsValid(words).valid) {
      return this.executeGenerateWallet(words, passphrase, pin, password, loadHistory);
    } else {
      return null;
    }
  },

  /**
   * Verify if words passed to generate wallet are valid. In case of invalid, returns message
   *
   * @param {string} words Words (separated by space) to generate the HD Wallet seed
   *
   * @return {Object} {'valid': boolean, 'message': string}
   * @memberof Wallet
   * @inner
   */
  wordsValid(words) {
    if (_.isString(words)) {
      if (words.split(' ').length !== 24) {
        // Must have 24 words
        return {'valid': false, 'message': 'Must have 24 words'};
      } else if (!Mnemonic.isValid(words)) {
        // Invalid sequence of words
        return {'valid': false, 'message': 'Invalid sequence of words'};
      }
    } else {
      // Must be string
      return {'valid': false, 'message': 'Must be a string'};
    }
    return {'valid': true, 'message': ''};
  },

  /**
   * Generate HD wallet words
   *
   * @param {string|number} entropy Data to generate the HD Wallet seed - entropy (256 - to generate 24 words)
   *
   * @return {string} words generated
   * @memberof Wallet
   * @inner
   */
  generateWalletWords(entropy) {
    const code = new Mnemonic(entropy);
    return code.phrase;
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
   * @return {string} words generated
   * @memberof Wallet
   * @inner
   */
  executeGenerateWallet(words, passphrase, pin, password, loadHistory) {
    WebSocketHandler.setup();
    let code = new Mnemonic(words);
    let xpriv = code.toHDPrivateKey(passphrase, NETWORK);
    let privkey = xpriv.derive(`m/44'/${HATHOR_BIP44_CODE}'/0'/0`);

    let encryptedData = this.encryptData(privkey.xprivkey, pin)
    let encryptedDataWords = this.encryptData(words, password)

    // Save in localStorage the encrypted private key and the hash of the pin and password
    let access = {
      mainKey: encryptedData.encrypted.toString(),
      hash: encryptedData.hash.toString(),
      words: encryptedDataWords.encrypted.toString(),
      hashPasswd: encryptedDataWords.hash.toString(),
    }

    let walletData = {
      keys: {},
      xpubkey: privkey.xpubkey,
    }

    localStorage.setItem('wallet:accessData', JSON.stringify(access));
    localStorage.setItem('wallet:data', JSON.stringify(walletData));

    if (loadHistory) {
      // Load history from address
      this.loadAddressHistory(0, GAP_LIMIT);
    }
    return code.phrase;
  },

  /**
   * Get wallet last generated address index
   *
   * @return {number} Index that was last generated
   *
   * @memberof Wallet
   * @inner
   */
  getLastGeneratedIndex() {
    const raw = localStorage.getItem('wallet:lastGeneratedIndex');
    if (!raw) {
      return 0;
    }
    return parseInt(raw, 10);
  },

  /**
   * Get wallet data already parsed from JSON
   *
   * @return {Object} wallet data
   *
   * @memberof Wallet
   * @inner
   */
  getWalletData() {
    const data = localStorage.getItem('wallet:data');
    if (!data) {
      return null;
    }
    return JSON.parse(data);
  },

  /**
   * Load the history for each of the addresses of a new generated wallet
   * We always search until the GAP_LIMIT. If we have any history in the middle of the searched addresses
   * we search again until we have the GAP_LIMIT of addresses without any transactions
   * The loaded history is added to localStorage and Redux
   *
   * @param {number} startIndex Address index to start to load history
   * @param {number} count How many addresses I will load
   *
   * @return {Promise} Promise that resolves when addresses history is finished loading from server
   *
   * @memberof Wallet
   * @inner
   */
  loadAddressHistory(startIndex, count) {
    const promise = new Promise((resolve, reject) => {
      // First generate all private keys and its addresses, then get history
      let addresses = [];
      let dataJson = this.getWalletData();

      const xpub = HDPublicKey(dataJson.xpubkey);
      const stopIndex = startIndex + count;
      for (var i=startIndex; i<stopIndex; i++) {
        // Generate each key from index, encrypt and save
        let key = xpub.derive(i);
        var address = Address(key.publicKey, NETWORK);
        dataJson.keys[address.toString()] = {privkey: null, index: i};
        addresses.push(address.toString());

        // Subscribe in websocket to this address updates
        this.subscribeAddress(address.toString());

        if (localStorage.getItem('wallet:address') === null) {
          // If still don't have an address to show on the screen
          this.updateAddress(address.toString(), i, true);
        }
      }

      let lastGeneratedIndex = this.getLastGeneratedIndex();
      if (lastGeneratedIndex < stopIndex - 1) {
        localStorage.setItem('wallet:lastGeneratedIndex', stopIndex - 1);
      }
      localStorage.setItem('wallet:data', JSON.stringify(dataJson));

      walletApi.getAddressHistory(addresses, (response) => {
        // Save in redux
        store.dispatch(historyUpdate({'data': response.history, 'resolve': resolve}));
      }, (e) => {
        // Error in request
        console.log(e);
        reject(e);
      });
    });
    // Update the version of the wallet that the data was loaded
    localStorage.setItem('wallet:version', VERSION);
    // Check api version everytime we load address history
    version.checkApiVersion();
    return promise;
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
    const words = this.getWalletWords(password);
    this.cleanWallet()
    return this.generateWallet(words, passphrase, pin, password, true);
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
    localStorage.setItem('wallet:address', lastSharedAddress);
    localStorage.setItem('wallet:lastSharedIndex', lastSharedIndex);
    if (updateRedux) {
      store.dispatch(sharedAddressUpdate({lastSharedAddress, lastSharedIndex}));
    }
  },

  /**
   * Encrypt private key with pin
   *
   * @param {string} privateKey String of private key
   * @param {string} pin
   *
   * @return {Object} encrypted private key and pin hash
   *
   * @memberof Wallet
   * @inner
   */
  encryptData(privateKey, pin) {
    const encrypted = CryptoJS.AES.encrypt(privateKey, pin);
    const hash = this.hashPassword(pin);
    return {'encrypted': encrypted, 'hash': hash}
  },

  /**
   * Get the hash (sha256) of a password
   *
   * @param {string} password Password to be hashes
   *
   * @return {Object} Object with hash of password
   *
   * @memberof Wallet
   * @inner
   */
  hashPassword(password) {
    return CryptoJS.SHA256(CryptoJS.SHA256(password));
  },

  /**
   * Decrypt data with password
   *
   * @param {string} data Encrypted data
   * @param {string} password
   *
   * @return {string} string of decrypted data
   *
   * @memberof Wallet
   * @inner
   */
  decryptData(data, password) {
    let decrypted = CryptoJS.AES.decrypt(data, password);
    return decrypted.toString(CryptoJS.enc.Utf8);
  },

  /**
   * Validate if pin is correct
   *
   * @param {string} pin
   *
   * @return {boolean}
   *
   * @memberof Wallet
   * @inner
   */
  isPinCorrect(pin) {
    let data = JSON.parse(localStorage.getItem('wallet:accessData'));
    let pinHash = this.hashPassword(pin).toString();
    return pinHash === data.hash;
  },

  /**
   * Validate if password is correct
   *
   * @param {string} password
   *
   * @return {boolean}
   *
   * @memberof Wallet
   * @inner
   */
  isPasswordCorrect(password) {
    let data = JSON.parse(localStorage.getItem('wallet:accessData'));
    let passwordHash = this.hashPassword(password).toString();
    return passwordHash === data.hashPasswd;
  },

  /**
   * Checks if has more generated addresses after the last shared one
   *
   * @return {boolean}
   *
   * @memberof Wallet
   * @inner
   */
  hasNewAddress() {
    const lastGeneratedIndex = this.getLastGeneratedIndex();
    const lastSharedIndex = this.getLastSharedIndex();
    return lastGeneratedIndex > lastSharedIndex;
  },

  /**
   * Get next address after the last shared one (only if it's already generated)
   * Update the data in localStorage and Redux
   *
   * @memberof Wallet
   * @inner
   */
  getNextAddress() {
    const lastSharedIndex = this.getLastSharedIndex();
    let data = this.getWalletData();
    for (let address in data.keys) {
      if (data.keys[address].index === lastSharedIndex + 1) {
        this.updateAddress(address, lastSharedIndex + 1, true);
        break;
      }
    }
  },

  /**
   * We should generate at most GAP_LIMIT unused addresses
   * This method checks if we can generate more addresses or if we have already reached the limit
   * In the constants file we have the LIMIT_ADDRESS_GENERATION that can skip this validation
   *
   * @return {boolean}
   *
   * @memberof Wallet
   * @inner
   */
  canGenerateNewAddress() {
    const lastUsedIndex = this.getLastUsedIndex();
    let lastGeneratedIndex = this.getLastGeneratedIndex();
    if (LIMIT_ADDRESS_GENERATION) {
      if (lastUsedIndex + GAP_LIMIT > lastGeneratedIndex) {
        // Still haven't reached the limit
        return true;
      } else {
        return false;
      }
    } else {
      // Skip validation
      return true;
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
    const dataJson = this.getWalletData();
    const xpub = HDPublicKey(dataJson.xpubkey);

    // Get last shared index to discover new index
    const lastSharedIndex = this.getLastSharedIndex();
    let newIndex = lastSharedIndex + 1;

    const newKey = xpub.derive(newIndex);
    const newAddress = Address(newKey.publicKey, NETWORK);

    // Update address data and last generated indexes
    this.updateAddress(newAddress.toString(), newIndex, true);
    let lastGeneratedIndex = this.getLastGeneratedIndex();
    if (newIndex > lastGeneratedIndex) {
      localStorage.setItem('wallet:lastGeneratedIndex', newIndex);
    }

    // Save new keys to local storage
    let data = this.getWalletData();
    data.keys[newAddress.toString()] = {privkey: null, index: newIndex};
    localStorage.setItem('wallet:data', JSON.stringify(data));

    // Save in redux the new shared address
    store.dispatch(sharedAddressUpdate({lastSharedAddress: newAddress.toString(), lastSharedIndex: newIndex}));

    // Subscribe in ws to new address updates
    this.subscribeAddress(newAddress.toString());
  },

  /**
   * Get the address to be used and generate a new one
   *
   * @return {string} address
   *
   * @memberof Wallet
   * @inner
   */
  getAddressToUse() {
    const address = localStorage.getItem('wallet:address');
    // Updating address because the last one was used
    if (this.hasNewAddress()) {
      this.getNextAddress();
    } else {
      this.generateNewAddress();
    }
    return address;
  },

  /**
   * Validates if transaction is from this wallet (uses an address of this wallet)
   * and if this output/input is also from the selectedToken
   *
   * @param {Object} tx Transaction object
   * @param {string} selectedToken Token uid
   *
   * @return {boolean}
   *
   * @memberof Wallet
   * @inner
   */
  hasTokenAndAddress(tx, selectedToken) {
    const walletData = this.getWalletData();
    if (walletData === null) {
      return false;
    }

    for (let txin of tx.inputs) {
      if (txin.token === selectedToken) {
        if (this.isAddressMine(txin.decoded.address)) {
          return true;
        }
      }
    }
    for (let txout of tx.outputs) {
      if (txout.token === selectedToken) {
        if (this.isAddressMine(txout.decoded.address)) {
          return true;
        }
      }
    }
    return false;
  },

  /**
   * Filters an array of transactions to only the ones from this wallet and selectedToken
   *
   * @param {Object} historyTransactions Object of transactions indexed by tx_id
   * @param {string} selectedToken Token uid
   *
   * @return {Object} array of the filtered transactions
   *
   * @memberof Wallet
   * @inner
   */
  filterHistoryTransactions(historyTransactions, selectedToken) {
    const data = [];
    for (const tx_id in historyTransactions) {
      const tx = historyTransactions[tx_id];
      if (this.hasTokenAndAddress(tx, selectedToken)) {
        data.push(tx);
      }
    }
    data.sort((a, b) => {
      return b.timestamp - a.timestamp;
    });
    return data;
  },

  /**
   * Calculate the balance for each token (available and locked) from the historyTransactions
   *
   * @param {Object} historyTransactions Array of transactions
   * @param {string} selectedToken token uid to get the balance
   *
   * @return {Object} Object with {available: number, locked: number}
   *
   * @memberof Wallet
   * @inner
   */
  calculateBalance(historyTransactions, selectedToken) {
    let balance = {available: 0, locked: 0};
    const data = this.getWalletData();
    if (data === null) {
      return balance;
    }
    for (let tx of historyTransactions) {
      if (tx.is_voided) {
        // Ignore voided transactions.
        continue;
      }
      for (let txout of tx.outputs) {
        if (this.isAuthorityOutput(txout)) {
          // Ignore authority outputs.
          continue;
        }
        if (txout.spent_by === null && txout.token === selectedToken && this.isAddressMine(txout.decoded.address)) {
          if (this.canUseUnspentTx(txout)) {
            balance.available += txout.value;
          } else {
            balance.locked += txout.value;
          }
        }
      }
    }
    return balance;
  },

  /**
   * Check if unspentTx is locked or can be used
   *
   * @param {Object} unspentTx (needs to have decoded.timelock key)
   *
   * @return {boolean}
   *
   * @memberof Wallet
   * @inner
   */
  canUseUnspentTx(unspentTx) {
    if (unspentTx.decoded.timelock) {
      let currentTimestamp = dateFormatter.dateToTimestamp(new Date());
      return currentTimestamp > unspentTx.decoded.timelock;
    } else {
      return true;
    }
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
    let data = this.getWalletData();
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
        lastSharedAddress: localStorage.getItem('wallet:address'),
        lastSharedIndex: this.getLastSharedIndex(),
      }));
      return true;
    } else {
      return false;
    }
  },

  /**
   * Save wallet data from redux to localStorage
   *
   * @param {Object} historyTransactions
   * @param {Object} allTokens Set of all tokens added to the wallet
   *
   * @memberof Wallet
   * @inner
   */
  saveAddressHistory(historyTransactions, allTokens) {
    let data = this.getWalletData();
    data['historyTransactions'] = historyTransactions;
    data['allTokens'] = [...allTokens];
    localStorage.setItem('wallet:data', JSON.stringify(data));
  },

  /**
   * Check if wallet is already loaded
   *
   * @return {boolean}
   *
   * @memberof Wallet
   * @inner
   */
  loaded() {
    return localStorage.getItem('wallet:accessData') !== null;
  },

  /**
   * Check if wallet was already started (user clicked in 'Get started')
   *
   * @return {boolean}
   *
   * @memberof Wallet
   * @inner
   */
  started() {
    return localStorage.getItem('wallet:started') !== null;
  },

  /**
   * Save wallet as started
   *
   * @return {boolean}
   *
   * @memberof Wallet
   * @inner
   */
  markWalletAsStarted() {
    return localStorage.setItem('wallet:started', true);
  },

  /**
   * Subscribe to receive updates from an address in the websocket
   *
   * @param {string} address
   */
  subscribeAddress(address) {
    const msg = JSON.stringify({'type': 'subscribe_address', 'address': address});
    WebSocketHandler.sendMessage(msg);
  },

  /**
   * Subscribe to receive updates from all generated addresses
   *
   * @memberof Wallet
   * @inner
   */
  subscribeAllAddresses() {
    let data = this.getWalletData();
    if (data) {
      for (let address in data.keys) {
        this.subscribeAddress(address);
      }
    }
  },

  /**
   * Unsubscribe to receive updates from an address in the websocket
   *
   * @param {string} address
   * @memberof Wallet
   * @inner
   */
  unsubscribeAddress(address) {
    const msg = JSON.stringify({'type': 'unsubscribe_address', 'address': address});
    WebSocketHandler.sendMessage(msg);
  },

  /**
   * Unsubscribe to receive updates from all generated addresses
   * @memberof Wallet
   * @inner
   */
  unsubscribeAllAddresses() {
    let data = this.getWalletData();
    if (data) {
      for (let address in data.keys) {
        this.unsubscribeAddress(address);
      }
    }
  },

  /**
   * Get an address, find its index and set as last used in localStorage
   *
   * @param {string} address
   * @memberof Wallet
   * @inner
   */
  setLastUsedIndex(address) {
    let data = this.getWalletData();
    if (data) {
      let index = data.keys[address].index;
      const lastUsedIndex = this.getLastUsedIndex();
      if (lastUsedIndex === null || index > parseInt(lastUsedIndex, 10)) {
        localStorage.setItem('wallet:lastUsedAddress', address);
        localStorage.setItem('wallet:lastUsedIndex', index);
      }
    }
  },

  /*
   * Clean all data before logout wallet
   * - Clean local storage
   * - Clean redux
   * - Unsubscribe websocket connections
   *
   * @memberof Wallet
   * @inner
   */
  cleanWallet() {
    this.unsubscribeAllAddresses();
    this.cleanLocalStorage();
    store.dispatch(cleanData());
    WebSocketHandler.endConnection();
  },

  /*
   * Clean data from server
   *
   * @memberof Wallet
   * @inner
   */
  cleanServer() {
    localStorage.removeItem('wallet:server');
  },

  /*
   * Clean all data from everything
   *
   * @memberof Wallet
   * @inner
   */
  resetAllData() {
    this.cleanWallet();
    this.cleanServer();
    localStorage.removeItem('wallet:started');
    localStorage.removeItem('wallet:backup');
    localStorage.removeItem('wallet:locked');
    localStorage.removeItem('wallet:tokens');
    localStorage.removeItem('wallet:sentry');
  },

  /**
   * Remove all localStorages saved items
   * @memberof Wallet
   * @inner
   */
  cleanLocalStorage() {
    localStorage.removeItem('wallet:accessData');
    localStorage.removeItem('wallet:data');
    localStorage.removeItem('wallet:address');
    localStorage.removeItem('wallet:lastSharedIndex');
    localStorage.removeItem('wallet:lastGeneratedIndex');
    localStorage.removeItem('wallet:lastUsedIndex');
    localStorage.removeItem('wallet:lastUsedAddress');
    localStorage.removeItem('wallet:closed');
  },

  /*
   * Get inputs to be used in transaction from amount required and selectedToken
   *
   * @param {Object} historyTransactions Object of transactions indexed by tx_id
   * @param {number} amount Amount required to send transaction
   * @param {string} selectedToken UID of token that is being sent
   *
   * @return {Object} {'inputs': Array of objects {'tx_id', 'index', 'token', 'address'}, 'inputsAmount': number}
   *
   * @memberof Wallet
   * @inner
   */
  getInputsFromAmount(historyTransactions, amount, selectedToken) {
    const ret = {'inputs': [], 'inputsAmount': 0};
    const data = this.getWalletData();
    if (data === null) {
      return ret;
    }
    for (const tx_id in historyTransactions) {
      const tx = historyTransactions[tx_id];
      if (tx.is_voided) {
        // Ignore voided transactions.
        continue;
      }
      for (const [index, txout] of tx.outputs.entries()) {
        if (this.isAuthorityOutput(txout)) {
          // Ignore authority outputs.
          continue;
        }
        if (ret.inputsAmount >= amount) {
          return ret;
        }
        if (txout.spent_by === null && txout.token === selectedToken && this.isAddressMine(txout.decoded.address)) {
          if (this.canUseUnspentTx(txout)) {
            ret.inputsAmount += txout.value;
            ret.inputs.push({ tx_id: tx.tx_id, index, token: selectedToken, address: txout.decoded.address });
          }
        }
      }
    }
    return ret;
  },

  /*
   * Get output of a change of a transaction
   *
   * @param {number} value Amount of the change output
   * @param {number} tokenData Token index of the output
   *
   * @return {Object} {'address': string, 'value': number, 'tokenData': number}
   *
   * @memberof Wallet
   * @inner
   */
  getOutputChange(value, tokenData) {
    const address = this.getAddressToUse();
    return {'address': address, 'value': value, 'tokenData': tokenData};
  },

  /*
   * Verify if has unspentTxs from tx_id, index and selectedToken
   *
   * @param {Object} historyTransactions Object of transactions indexed by tx_id
   * @param {string} txId Transaction id to search
   * @param {number} index Output index to search
   * @param {string} selectedToken UID of the token to check existence
   *
   * @return {Object} {success: boolean, message: Error message in case of failure, output: output object in case of success}
   *
   * @memberof Wallet
   * @inner
   */
  checkUnspentTxExists(historyTransactions, txId, index, selectedToken) {
    const data = this.getWalletData();
    if (data === null) {
      return {exists: false, message: 'Data not loaded yet'};
    }
    for (const tx_id in historyTransactions) {
      const tx = historyTransactions[tx_id]
      if (tx.tx_id !== txId) {
        continue;
      }
      if (tx.is_voided) {
        // If tx is voided, not unspent
        return {exists: false, message: `Transaction [${txId}] is voided`};
      }
      if (tx.outputs.length - 1 < index) {
        // Output with this index does not exist
        return {exists: false, message: `Transaction [${txId}] does not have this output [index=${index}]`};
      }

      const txout = tx.outputs[index];
      if (this.isAuthorityOutput(txout)) {
        // Ignore authority outputs for now.
        return {exists: false, message: `Output [${index}] of transaction [${txId}] is an authority output`};
      }

      if (!(this.isAddressMine(txout.decoded.address))) {
        return {exists: false, message: `Output [${index}] of transaction [${txId}] is not yours`};
      }

      if (txout.token !== selectedToken) {
        return {exists: false, message: `Output [${index}] of transaction [${txId}] is not from selected token [${selectedToken}]`};
      }

      if (txout.spent_by !== null) {
        return {exists: false, message: `Output [${index}] of transaction [${txId}] is already spent`};
      }
      return {exists: true, 'output': txout};
    }
    // Requests txId does not exist in historyTransactions
    return {exists: false, message: `Transaction [${txId}] does not exist in the wallet`};
  },

  /*
   * Verify if has authority output available from tx_id, index and tokenUID
   *
   * @param {Array} key [tx_id, index]
   * @param {string} tokenUID UID of the token to check existence
   *
   * @return {boolean}
   *
   * @memberof Wallet
   * @inner
   */
  checkAuthorityExists(key, tokenUID) {
    const data = this.getWalletData();
    if (data) {
      const jsonData = JSON.parse(data);
      const authorityOutputs = jsonData.authorityOutputs;
      if (tokenUID in authorityOutputs && key in authorityOutputs[tokenUID]) {
        return true;
      } else {
        return false;
      }
    }
  },

  /*
   * Lock wallet
   *
   * @memberof Wallet
   * @inner
   */
  lock() {
    localStorage.setItem('wallet:locked', true);
  },

  /*
   * Unlock wallet
   *
   * @memberof Wallet
   * @inner
   */
  unlock() {
    localStorage.removeItem('wallet:locked');
  },

  /*
   * Return if wallet is locked
   *
   * @return {boolean} if wallet is locked
   *
   * @memberof Wallet
   * @inner
   */
  isLocked() {
    return localStorage.getItem('wallet:locked') !== null;
  },

  /*
   * Return if wallet was closed
   *
   * @return {boolean} if wallet was closed
   *
   * @memberof Wallet
   * @inner
   */
  wasClosed() {
    return localStorage.getItem('wallet:closed') !== null;
  },

  /*
   * Set in localStorage as closed
   *
   * @memberof Wallet
   * @inner
   */
  close() {
    localStorage.setItem('wallet:closed', true);
  },

  /**
   * Get words of the loaded wallet
   *
   * @param {string} password Password to decrypt the words
   *
   * @return {string} words of the wallet
   *
   * @memberof Wallet
   * @inner
   */
  getWalletWords(password) {
    const data = JSON.parse(localStorage.getItem('wallet:accessData'));
    return this.decryptData(data.words, password);
  },

  /*
   * Save backup done in localStorage
   *
   * @memberof Wallet
   * @inner
   */
  markBackupAsDone() {
    localStorage.setItem('wallet:backup', true);
  },

  /*
   * Save backup not done in localStorage
   *
   * @memberof Wallet
   * @inner
   */
  markBackupAsNotDone() {
    localStorage.removeItem('wallet:backup');
  },

  /*
   * Return if backup of wallet words is done
   *
   * @return {boolean} if wallet words are saved
   *
   * @memberof Wallet
   * @inner
   */
  isBackupDone() {
    return localStorage.getItem('wallet:backup') !== null;
  },

  /*
   * Reload data in the localStorage
   *
   * @memberof Wallet
   * @inner
   */
  reloadData() {
    // Get old access data
    const accessData = JSON.parse(localStorage.getItem('wallet:accessData'));
    const walletData = this.getWalletData();

    // Clean all data in the wallet from the old server
    this.cleanWallet();
    // Restart websocket connection
    WebSocketHandler.setup();

    // Cleaning redux and leaving only tokens data
    const dataToken = tokens.getTokens();
    store.dispatch(reloadData({
      historyTransactions: {},
      tokens: dataToken,
    }));

    const newWalletData = {
      keys: {},
      xpubkey: walletData.xpubkey,
    }

    // Prepare to save new data
    localStorage.setItem('wallet:accessData', JSON.stringify(accessData));
    localStorage.setItem('wallet:data', JSON.stringify(newWalletData));

    // Load history from new server
    return this.loadAddressHistory(0, GAP_LIMIT);
  },

  /*
   * Verifies if output is an authority one checking with authority mask
   *
   * @param {Object} output Output object with 'token_data' key
   *
   * @return {boolean} if output is authority
   *
   * @memberof Wallet
   * @inner
   */
  isAuthorityOutput(output) {
    return (output.token_data & TOKEN_AUTHORITY_MASK) > 0
  },

  /*
   * Change server in localStorage
   *
   * @param {string} newServer New server to connect
   *
   * @memberof Wallet
   * @inner
   */
  changeServer(newServer) {
    localStorage.setItem('wallet:server', newServer);
  },

  /*
   * Prepare data (inputs and outputs) to be used in the send tokens
   *
   * @param {Object} data Object with array of inputs and outputs
   * @param {Object} token Corresponding token
   * @param {boolean} chooseInputs If should choose inputs automatically
   * @param {Object} historyTransactions Object of transactions indexed by tx_id
   * @param {Object} Array with all tokens already selected in the send tokens
   *
   * @return {Object} {success: boolean, message: error message in case of failure, data: prepared data in case of success}
   *
   * @memberof Wallet
   * @inner
   */
  prepareSendTokensData(data, token, chooseInputs, historyTransactions, allTokens) {
    // Get the data and verify if we need to select the inputs or add a change output

    // First get the amount of outputs
    let outputsAmount = 0;
    for (let output of data.outputs) {
      outputsAmount += output.value;
    }

    if (outputsAmount === 0) {
      return {success: false, message:  `Token: ${token.symbol}. Total value can't be 0`};
    }

    if (chooseInputs) {
      // If no inputs selected we select our inputs and, maybe add also a change output
      let newData = this.getInputsFromAmount(historyTransactions, outputsAmount, token.uid);

      data['inputs'] = newData['inputs'];

      if (newData.inputsAmount < outputsAmount) {
        // Don't have this amount of token
        return {success: false, message:  `Token ${token.symbol}: Insufficient amount of tokens`};
      }

      if (newData.inputsAmount > outputsAmount) {
        // Need to create change output
        let outputChange = this.getOutputChange(newData.inputsAmount - outputsAmount, tokens.getTokenIndex(allTokens, token.uid));
        data['outputs'].push(outputChange);
        // Shuffle outputs, so we don't have change output always in the same index
        data['outputs'] = _.shuffle(data['outputs']);
      }

    } else {
      // Validate the inputs used and if have to create a change output
      let inputsAmount = 0;
      for (const input of data.inputs) {
        const utxo = wallet.checkUnspentTxExists(historyTransactions, input.tx_id, input.index, token.uid);
        if (!utxo.exists) {
          return {success: false, message: `Token: ${token.symbol}. ${utxo.message}`};
        }

        const output = utxo.output;
        if (this.canUseUnspentTx(output)) {
          inputsAmount += output.value;
          input.address = output.decoded.address;
        } else {
          return {success: false, message: `Token: ${token.symbol}. Output [${input.tx_id}, ${input.index}] is locked until ${dateFormatter.parseTimestamp(output.decoded.timelock)}`};
        }
      }

      if (inputsAmount < outputsAmount) {
        return {success: false, message: `Token: ${token.symbol}. Sum of outputs is larger than the sum of inputs`};
      }

      if (inputsAmount > outputsAmount) {
        // Need to create change output
        let outputChange = wallet.getOutputChange(inputsAmount - outputsAmount, tokens.getTokenIndex(allTokens, token.uid));
        data['outputs'].push(outputChange);
      }
    }
    return {success: true, data};
  },

  /**
   * Get localStorage index and, in case is not null, parse to int
   *
   * @param {string} key Index key to get in the localStorage
   *
   * @return {number} Index parsed to integer or null
   * @memberof Wallet
   * @inner
   */
  getLocalStorageIndex(key) {
    let index = localStorage.getItem(`wallet:${key}`);
    if (index !== null) {
      index = parseInt(index, 10);
    }
    return index;
  },

  /**
   * Get localStorage last used index (in case is not set return null)
   *
   * @return {number} Last used index parsed to integer or null
   * @memberof Wallet
   * @inner
   */
  getLastUsedIndex() {
    return this.getLocalStorageIndex('lastUsedIndex');
  },

  /**
   * Get localStorage last shared index (in case is not set return null)
   *
   * @return {number} Last shared index parsed to integer or null
   * @memberof Wallet
   * @inner
   */
  getLastSharedIndex() {
    return this.getLocalStorageIndex('lastSharedIndex');
  },

  /**
   * Update the historyTransactions and allTokens from a new array of history that arrived
   *
   * Check if need to call loadHistory again to get more addresses data
   *
   * @param {Object} historyTransactions Object of transactions indexed by tx_id to be added the new txs
   * @param {Set} allTokens Set of all tokens (uid) already added
   * @param {Array} newHistory Array of new data that arrived from the server to be added to local data
   * @param {function} resolve Resolve method from promise to be called after finishing handling the new history
   *
   * @throws {OutputValueError} Will throw an error if one of the output value is invalid
   *
   * @return {Object} Return an object with {newSharedAddress, newSharedIndex}
   * @memberof Wallet
   * @inner
   */
  updateHistoryData(oldHistoryTransactions, oldAllTokens, newHistory, resolve) {
    const dataJson = this.getWalletData();
    const historyTransactions = Object.assign({}, oldHistoryTransactions);
    const allTokens = new Set(oldAllTokens);

    let maxIndex = -1;
    let lastUsedAddress = null;
    for (const tx of newHistory) {
      // If one of the outputs has a value that cannot be handled by the wallet we discard it
      for (const output of tx.outputs) {
        if (output.value > MAX_OUTPUT_VALUE) {
          throw new OutputValueError(`Transaction with id ${tx.tx_id} has output value of ${helpers.prettyValue(output.value)}. Maximum value is ${helpers.prettyValue(MAX_OUTPUT_VALUE)}`);
        }
      }

      historyTransactions[tx.tx_id] = tx

      for (const txin of tx.inputs) {
        const key = dataJson.keys[txin.decoded.address];
        if (key) {
          allTokens.add(txin.token);
          if (key.index > maxIndex) {
            maxIndex = key.index;
            lastUsedAddress = txin.decoded.address
          }
        }
      }
      for (const txout of tx.outputs) {
        const key = dataJson.keys[txout.decoded.address];
        if (key) {
          allTokens.add(txout.token);
          if (key.index > maxIndex) {
            maxIndex = key.index;
            lastUsedAddress = txout.decoded.address
          }
        }
      }
    }

    let lastUsedIndex = this.getLastUsedIndex();
    if (lastUsedIndex === null) {
      lastUsedIndex = -1;
    }

    let lastSharedIndex = this.getLastSharedIndex();
    if (lastSharedIndex === null) {
      lastSharedIndex = -1;
    }

    let newSharedAddress = null;
    let newSharedIndex = -1;

    if (maxIndex > lastUsedIndex && lastUsedAddress !== null) {
      // Setting last used index and last shared index
      this.setLastUsedIndex(lastUsedAddress);
      // Setting last shared address, if necessary
      const candidateIndex = maxIndex + 1;
      if (candidateIndex > lastSharedIndex) {
        const xpub = HDPublicKey(dataJson.xpubkey);
        const key = xpub.derive(candidateIndex);
        const address = Address(key.publicKey, NETWORK).toString();
        newSharedIndex = candidateIndex;
        newSharedAddress = address;
        this.updateAddress(address, candidateIndex, false);
      }
    }

    const lastGeneratedIndex = this.getLastGeneratedIndex();
    // Just in the case where there is no element in all data
    maxIndex = Math.max(maxIndex, 0);
    if (maxIndex + GAP_LIMIT > lastGeneratedIndex) {
      const startIndex = lastGeneratedIndex + 1;
      const count = maxIndex + GAP_LIMIT - lastGeneratedIndex;
      const promise = this.loadAddressHistory(startIndex, count);
      promise.then(() => {
        if (resolve) {
          resolve();
        }
      })
    } else {
      if (resolve) {
        resolve();
      }
    }

    this.saveAddressHistory(historyTransactions, allTokens);

    return {historyTransactions, allTokens, newSharedAddress, newSharedIndex};
  },

  /**
   * Check if address is from the loaded wallet
   *
   * @param {string} address Address to check
   *
   * @return {boolean}
   * @memberof Wallet
   * @inner
   */
  isAddressMine(address) {
    const data = this.getWalletData();
    if (data && address in data.keys) {
      return true;
    }
    return false;
  },

  /**
   * Get balance of a transaction for the loaded wallet
   * For each token if the wallet sent or received amount
   *
   * @param {Object} tx Transaction with outputs, inputs and tokens
   *
   * @return {Object} Object with balance for each token {'uid': value}
   * @memberof Wallet
   * @inner
   */
  getTxBalance(tx) {
    let balance = {};

    for (const txin of tx.inputs) {
      if (this.isAuthorityOutput(txin)) {
        continue;
      }
      if (this.isAddressMine(txin.decoded.address)) {
        let tokenUID = '';
        if (txin.decoded.token_data === HATHOR_TOKEN_INDEX) {
          tokenUID = HATHOR_TOKEN_CONFIG.uid;
        } else {
          tokenUID = tx.tokens[txin.decoded.token_data - 1];
        }
        if (tokenUID in balance) {
          balance[tokenUID] -= txin.value;
        } else {
          balance[tokenUID] = -txin.value;
        }
      }
    }

    for (const txout of tx.outputs) {
      if (this.isAuthorityOutput(txout)) {
        continue;
      }
      if (this.isAddressMine(txout.decoded.address)) {
        let tokenUID = '';
        if (txout.decoded.token_data === HATHOR_TOKEN_INDEX) {
          tokenUID = HATHOR_TOKEN_CONFIG.uid;
        } else {
          tokenUID = tx.tokens[txout.decoded.token_data - 1];
        }
        if (tokenUID in balance) {
          balance[tokenUID] += txout.value;
        } else {
          balance[tokenUID] = txout.value;
        }
      }
    }
    return balance;
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
    localStorage.setItem('wallet:sentry', true);
    this.updateSentryState();
  },

  /**
   * Set in localStorage that user did not allow to send errors to sentry
   *
   * @memberof Wallet
   * @inner
   */
  disallowSentry() {
    localStorage.setItem('wallet:sentry', false);
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
    return JSON.parse(localStorage.getItem('wallet:sentry'));
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
        (key) => scope.setExtra(key, localStorage.getItem(key))
      )
      Sentry.captureException(error);
    });
  },
}

export default wallet;
