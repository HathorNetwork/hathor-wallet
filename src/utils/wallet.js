import { GAP_LIMIT, LIMIT_ADDRESS_GENERATION, HATHOR_BIP44_CODE } from '../constants';
import Mnemonic from 'bitcore-mnemonic';
import { HDPrivateKey, Address } from 'bitcore-lib';
import CryptoJS from 'crypto-js';
import walletApi from '../api/wallet';
import store from '../store/index';
import { historyUpdate, sharedAddressUpdate, reloadData, voidedTx, cleanData } from '../actions/index';
import WebSocketHandler from '../WebSocketHandler';
import dateFormatter from './date';
import _ from 'lodash';

/**
 * We use localStorage and Redux to save data
 * In localStorage we have the following keys (prefixed by wallet:)
 * - walletData: object with data from the wallet including (all have full description in the reducers file)
 *   . sortedHistory: Array of history reversed sorted by timestamp
 *   . unpentTxs: Object with unspentTxs data indexed first by token_uid and then by [tx_id, index]
 *   . spentTxs: Object with spentTxs data indexed by [from_tx_id, index]
 *   . voidedUnspentTxs: Object with unspentTxs that were voided indexed only by [tx_id, index]
 *   . voidedSpentTxs: Object with spentTxs that were voided indexed by [from_tx_id, index]
 * - accessData: object with data to access the wallet
 *   . mainKey: string with encrypted private key
 *   . hash: string with hash of pin
 * - address: string with last shared address to show on screen
 * - lastSharedIndex: number with the index of the last shared address
 * - lastGeneratedIndex: number with the index of the last generated address
 * - lastUsedIndex: number with the index of the last used address
 * - lastUsedAddress: string the last used address
 *
 * @namespace Wallet
 */

const wallet = {
  /**
   * Validate if can generate the wallet with those parameters and then, call to generate it
   *
   * @param {string|number} mnemonicData Data to generate the HD Wallet seed,
   * can be a string with words or a number with the entropy (256 - to generate 24 words)
   * @param {string} passphrase
   * @param {string} pin
   *
   * @return {string} words generated (null if words are not valid)
   * @memberof Wallet
   * @inner
   */
  generateWallet(words, passphrase, pin) {
    if (this.wordsValid(words) && Mnemonic.isValid(words)) {
      return this.executeGenerateWallet(words, passphrase, pin);
    } else {
      return null;
    }
  },

  /**
   * Verify if words passed to generate wallet are valid
   *
   * @param {string|number} words Data to generate the HD Wallet seed,
   * can be a string with words or a number with the entropy (256 - to generate 24 words)
   *
   * @return {boolean} if words are valid
   * @memberof Wallet
   * @inner
   */
  wordsValid(words) {
    if (_.isString(words)) {
      if (words.split(' ').length !== 24) {
        // Must have 24 words
        return false;
      }
    } else if (_.isNumber(words)) {
      if (words !== 256) {
        // Must generate words with 256 of entropy
        return false;
      }
    } else {
      // Must be string or number
      return false;
    }
    return true;
  },

  /**
   * Start a new HD wallet with new private key
   * Encrypt this private key and save data in localStorage
   *
   * @param {string|number} mnemonicData Data to generate the HD Wallet seed,
   * can be a string with words or a number with the entropy (256 - to generate 24 words)
   * @param {string} passphrase
   * @param {string} pin
   *
   * @return {string} words generated
   * @memberof Wallet
   * @inner
   */
  executeGenerateWallet(mnemonicData, passphrase, pin) {
    WebSocketHandler.setup();
    let code = new Mnemonic(mnemonicData);
    let xpriv = code.toHDPrivateKey(passphrase);
    let privkey = xpriv.derive(`m/44'/${HATHOR_BIP44_CODE}'/0'/0`);

    let encryptedData = this.encryptData(privkey.xprivkey, pin)

    // Save in localStorage the encrypted private key and the hash of the pin
    let access = {
      mainKey: encryptedData.encrypted.toString(),
      hash: encryptedData.pinHash.toString()
    }

    let walletData = {
      keys: {}
    }

    localStorage.setItem('wallet:accessData', JSON.stringify(access));
    localStorage.setItem('wallet:data', JSON.stringify(walletData));

    // Load history from address
    this.loadAddressHistory(0, GAP_LIMIT, privkey, pin);
    return code.phrase;
  },

  /**
   * Load the history for each of the addresses of a new generated wallet
   * We always search until the GAP_LIMIT. If we have any history in the middle of the searched addresses
   * we search again until we have the GAP_LIMIT of addresses without any transactions
   * The loaded history is added to localStorage and Redux
   *
   * @param {number} startIndex Address index to start to load history
   * @param {number} count How many addresses I will load
   * @param {HDPrivateKey} privkey
   * @param {string} pin
   * @memberof Wallet
   * @inner
   */
  loadAddressHistory(startIndex, count, privkey, pin) {
    // First generate all private keys and its addresses, then get history
    let addresses = [];
    let dataJson = JSON.parse(localStorage.getItem('wallet:data'));

    for (var i=startIndex; i<startIndex+count; i++) {
      // Generate each key from index, encrypt and save
      let key = privkey.derive(i);
      var address = Address(key.publicKey);
      let keyData = this.encryptData(key.xprivkey, pin);
      dataJson['keys'][address.toString()] = {privkey: keyData.encrypted.toString(), index: i};
      addresses.push(address.toString());

      // Subscribe in websocket to this address updates
      this.subscribeAddress(address.toString());

      if (localStorage.getItem('wallet:address') === null) {
        // If still don't have an address to show on the screen
        this.updateAddress(address.toString(), i);
      }
    }

    localStorage.setItem('wallet:lastGeneratedIndex', i - 1);
    localStorage.setItem('wallet:data', JSON.stringify(dataJson));

    walletApi.getAddressHistory(addresses, (response) => {
      // Response returns the addresses histories in the same order
      let toGenerate = 0;
      let lastSharedAddress = null;
      let lastSharedIndex = null;
      for (let [index, data] of response.history.entries()) {
        if (data.history.length > 0) {
          // If we have transaction in this address we need to generate more
          toGenerate = index + 1;
          lastSharedAddress = null;
          lastSharedIndex = null;
        } else {
          // If it's the first without history can be the address to show on the screen to be used
          if (lastSharedAddress === null) {
            lastSharedAddress = data.address;
            lastSharedIndex = startIndex + index;
          }
        }
      }

      // Save in redux
      store.dispatch(historyUpdate(response.history));

      // Updating voided tx data
      for (let responseData of response.history) {
        for (let historyData of responseData.history) {
          if (historyData.voided) {
            store.dispatch(voidedTx({'address': responseData.address, 'element': historyData}));
          }
        }
      }

      if (toGenerate > 0) {
        if (lastSharedAddress) {
          this.updateAddress(lastSharedAddress, lastSharedIndex);
        }
        // Load more addresses
        this.loadAddressHistory(i, toGenerate, privkey, pin);
      } else {
        if (count === GAP_LIMIT) {
          // This is the case when the last GAP_LIMIT addresses were all already used
          this.updateAddress(lastSharedAddress, lastSharedIndex);
        }
      }
    }, (e) => {
      // Error in request
      console.log(e);
    });
  },

  /**
   * Update address shared in localStorage and redux
   *
   * @param {string} lastSharedAddress
   * @param {number} lastSharedIndex
   * @memberof Wallet
   * @inner
   */
  updateAddress(lastSharedAddress, lastSharedIndex) {
    localStorage.setItem('wallet:address', lastSharedAddress);
    localStorage.setItem('wallet:lastSharedIndex', lastSharedIndex);
    store.dispatch(sharedAddressUpdate({lastSharedAddress, lastSharedIndex}));
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
    const pinHash = CryptoJS.SHA256(CryptoJS.SHA256(pin));
    return {'encrypted': encrypted, 'pinHash': pinHash}
  },

  /**
   * Decrypt private key with pin
   *
   * @param {string} key Encrypted private key
   * @param {string} pin
   *
   * @return {string} string of private key
   *
   * @memberof Wallet
   * @inner
   */
  decryptKey(key, pin) {
    let decrypted = CryptoJS.AES.decrypt(key, pin);
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
    let pinHash = CryptoJS.SHA256(CryptoJS.SHA256(pin)).toString();
    return pinHash === data.hash;
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
    let lastGeneratedIndex = parseInt(localStorage.getItem('wallet:lastGeneratedIndex'), 10);
    let lastSharedIndex = parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10);
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
    let lastSharedIndex = parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10);
    let data = JSON.parse(localStorage.getItem('wallet:data'));
    for (let address in data.keys) {
      if (data.keys[address].index === lastSharedIndex + 1) {
        this.updateAddress(address, lastSharedIndex + 1);
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
    let lastUsedIndex = parseInt(localStorage.getItem('wallet:lastUsedIndex'), 10);
    let lastGeneratedIndex = parseInt(localStorage.getItem('wallet:lastGeneratedIndex'), 10);
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
   * We need the pin to decrypt the private key and generate the new one
   * We update the wallet data and new address shared
   *
   * @param {string} pin
   *
   * @memberof Wallet
   * @inner
   */
  generateNewAddress(pin) {
    // Get private key
    let accessData = JSON.parse(localStorage.getItem('wallet:accessData'));
    let toDecrypt = accessData.mainKey;
    let decrypted = this.decryptKey(toDecrypt, pin);
    let privKey = HDPrivateKey(decrypted);

    // Get last shared index to discover new index
    let lastSharedIndex = parseInt(localStorage.getItem('wallet:lastSharedIndex'), 10);
    let newIndex = lastSharedIndex + 1;
    let newKey = privKey.derive(newIndex);
    let newAddress = Address(newKey.publicKey);
    let newKeyData = this.encryptData(newKey.xprivkey, pin);

    // Update address data and last generated indexes
    this.updateAddress(newAddress.toString(), newIndex);
    let lastGeneratedIndex = parseInt(localStorage.getItem('wallet:lastGeneratedIndex'), 10);
    if (newIndex > lastGeneratedIndex) {
      localStorage.setItem('wallet:lastGeneratedIndex', newIndex);
    }

    // Save new keys to local storage
    let data = JSON.parse(localStorage.getItem('wallet:data'));
    data.keys[newAddress.toString()] = {privkey: newKeyData.encrypted.toString(), index: newIndex};
    localStorage.setItem('wallet:data', JSON.stringify(data));

    // Save in redux the new shared address
    store.dispatch(sharedAddressUpdate({lastSharedAddress: newAddress.toString(), lastSharedIndex: newIndex}));

    // Subscribe in ws to new address updates
    this.subscribeAddress(newAddress.toString());
  },

  /**
   * Calculate the balance for each token (available and locked) from the unspentTxs
   *
   * @param {Object} unspentTxs
   *
   * @return {Object} Object with {available: number, locked: number} for each of the tokens
   *
   * @memberof Wallet
   * @inner
   */
  calculateBalance(unspentTxs) {
    let balance = {};
    for (let token in unspentTxs) {
      let tokenBalance = {available: 0, locked: 0};
      for (let key in unspentTxs[token]) {
        let uTx = unspentTxs[token][key];
        // Checking if unspentTx is locked
        if (this.canUseUnspentTx(uTx)) {
          tokenBalance['available'] += uTx.value;
        } else {
          tokenBalance['locked'] += uTx.value;
        }
      }
      balance[token] = tokenBalance;
    }
    return balance;
  },

  /**
   * Check if unspentTx is locked or can be used
   *
   * @param {Object} unspentTx
   *
   * @return {boolean}
   *
   * @memberof Wallet
   * @inner
   */
  canUseUnspentTx(unspentTx) {
    if (unspentTx.timelock) {
      let currentTimestamp = dateFormatter.dateToTimestamp(new Date());
      return currentTimestamp > unspentTx.timelock;
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
    let data = localStorage.getItem('wallet:data');
    if (data) {
      data = JSON.parse(data);
      // Saving wallet data
      store.dispatch(reloadData({
        sortedHistory: data.sortedHistory || [],
        unspentTxs: data.unspentTxs || {},
        spentTxs: data.spentTxs || {},
        voidedSpentTxs: data.voidedSpentTxs || {},
        voidedUnspentTxs: data.voidedUnspentTxs || {},
      }));

      // Saving address data
      store.dispatch(sharedAddressUpdate({
        lastSharedAddress: localStorage.getItem('wallet:address'),
        lastSharedIndex: localStorage.getItem('wallet:lastSharedIndex')
      }));
      return true;
    } else {
      return false;
    }
  },

  /**
   * Save wallet data from redux to localStorage
   *
   * @param {Array} sortedHistory
   * @param {Object} unspentTxs
   * @param {Object} spentTxs
   * @param {Object} voidedSpentTxs
   * @param {Object} voidedUnspentTxs
   *
   * @memberof Wallet
   * @inner
   */
  saveAddressHistory(sortedHistory, unspentTxs, spentTxs, voidedSpentTxs, voidedUnspentTxs) {
    let data = JSON.parse(localStorage.getItem('wallet:data'));
    data['sortedHistory'] = sortedHistory;
    data['unspentTxs'] = unspentTxs;
    data['spentTxs'] = spentTxs;
    data['voidedSpentTxs'] = voidedSpentTxs;
    data['voidedUnspentTxs'] = voidedUnspentTxs;
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
    let data = localStorage.getItem('wallet:data');
    if (data) {
      let parsedData = JSON.parse(data);
      for (let address in parsedData.keys) {
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
    let data = localStorage.getItem('wallet:data');
    if (data) {
      let parsedData = JSON.parse(data);
      for (let address in parsedData.keys) {
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
    let data = localStorage.getItem('wallet:data');
    if (data) {
      let parsedData = JSON.parse(data);
      let index = parsedData.keys[address].index;
      let lastUsedIndex = localStorage.getItem('wallet:lastUsedIndex');
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
  },

  /**
   * Update history data (sortedHistory, unspentTxs, spentTxs)
   *
   * @param {Array} payload Array of objects indexed by address with array of transactions for this address
   * @param {Object} unspentTxs
   * @param {Object} spentTxs
   *
   * @return {Array} history reversed sorted by timestamp
   *
   * @memberof Wallet
   * @inner
   */
  historyUpdate(payload, unspentTxs, spentTxs) {
    let newSortedHistory = [];
    for (let newHistory of payload) {
      if (newHistory.history.length > 0 ) {
        // Set this address as used
        this.setLastUsedIndex(newHistory.address);
        for (let addressHistory of newHistory.history) {
          // Adding each history in the array that will be sorted
          newSortedHistory.push(addressHistory);

          if (addressHistory.is_output) {
            // If it's output we add it in the unspentTxs only if not in the spentTxs yet
            let objectKey = [addressHistory.tx_id, addressHistory.index];
            if (!(objectKey in spentTxs)) {
              if (!(addressHistory.token_uid in unspentTxs)) {
                unspentTxs[addressHistory.token_uid] = {};
              }
              unspentTxs[addressHistory.token_uid][objectKey] = {
                address: newHistory.address,
                value: addressHistory.value,
                timestamp: addressHistory.timestamp,
                timelock: addressHistory.timelock
              };
            }
          } else {
            // If it's input we add it to the spentTxs
            // If it's in the unspentTxs we remove it from there
            let objectKey = [addressHistory.from_tx_id, addressHistory.index];
            let tokenUID = addressHistory.token_uid;
            if (tokenUID in unspentTxs && objectKey in unspentTxs[tokenUID]) {
              // Removing from unspentTxs
              delete unspentTxs[tokenUID][objectKey];
            }

            // Adding into spentTxs
            if (!(objectKey in spentTxs)) {
              spentTxs[objectKey] = []
            }
            spentTxs[objectKey].push({
              address: newHistory.address,
              value: addressHistory.value,
              tx_id: addressHistory.tx_id,
              timestamp: addressHistory.timestamp,
              timelock: addressHistory.timelock
            })
          }
        }
      }
    }

    // Sorting the newHistory array
    newSortedHistory.sort((a, b) => {
      return b.timestamp - a.timestamp;
    });

    return newSortedHistory;
  },

  /**
   * Update unspent/spent txs data when a wallet element is voided
   *
   * For outputs we have the following situations:
   *
   * . Not used yet, so it's still in the unspentTxs, we remove it from there only
   * . Already used, so it's in spentTxs, we remove from there
   * . Not found anywhere, so it was already updated in another conflict resolution
   *
   * For inputs we have the following situations:
   * . If it's in the unspentTxs, we have to do nothing
   * . If it's in the spentTxs, we remove from the array. If this was the last tx, we recreate in the unspent
   *
   * @param {Object} voidedElement Object with data of element that was voided
   * @param {string} address Address used in this voided element
   * @param {Object} unspentTxs
   * @param {Object} spentTxs
   * @param {Object} voidedUnspentTxs
   * @param {Object} voidedSpentTxs
   *
   * @memberof Wallet
   * @inner
   */
  onWalletElementVoided(voidedElement, address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs) {
    if (voidedElement.is_output) {
      // Handle output
      let objectKey = [voidedElement.tx_id, voidedElement.index];
      // If element is still in unspentTxs, remove it from there
      if (voidedElement.token_uid in unspentTxs && objectKey in unspentTxs[voidedElement.token_uid]) {
        delete unspentTxs[voidedElement.token_uid][objectKey];
      }

      // If element is in spentTxs, remove it from there
      if (objectKey in spentTxs) {
        delete spentTxs[objectKey];
      }

      // Create this element in voidedUnspentTxs if still not there
      if (!(objectKey in voidedUnspentTxs)) {
        voidedUnspentTxs[objectKey] = {
          address: address,
          value: voidedElement.value,
          timestamp: voidedElement.timestamp,
          timelock: voidedElement.timelock
        };
      }
    } else {
      // Handle input
      let objectKey = [voidedElement.from_tx_id, voidedElement.index];

      // Try to find in spentTxs
      if (objectKey in spentTxs) {
        let foundIndex = -1;
        for (let [idx, el] of spentTxs[objectKey].entries()) {
          if (el.tx_id === voidedElement.tx_id) {
            foundIndex = idx;
          }
        }

        if (foundIndex > -1) {
          // If found, remove it
          spentTxs[objectKey].splice(foundIndex, 1);
        }

        if (spentTxs[objectKey].length === 0) {
          // If it was the last element, we must recreate in unspentTxs, if it's not there already
          if (!(voidedElement.token_uid in unspentTxs)) {
            unspentTxs[voidedElement.token_uid] = {};
          }
          unspentTxs[voidedElement.token_uid][objectKey] = {
            address: address,
            value: voidedElement.value,
            timestamp: voidedElement.timestamp,
            timelock: voidedElement.timelock
          }
        }
      }
      if (!(objectKey in voidedSpentTxs)) {
        voidedSpentTxs[objectKey] = [];
      }
      // Save in voidedSpentTxs if it's not there yet
      let foundNewIndex = -1;
      for (let [idx, el] of voidedSpentTxs[objectKey].entries()) {
        if (el.tx_id === voidedElement.tx_id) {
          foundNewIndex = idx;
        }
      }

      if (foundNewIndex === -1) {
        // Not found, so create
        voidedSpentTxs[objectKey].push({
          address: address,
          value: voidedElement.value,
          tx_id: voidedElement.tx_id,
          timestamp: voidedElement.timestamp,
          timelock: voidedElement.timelock
        });
      }
    }
  },

  /**
   * Update unspent/spent txs data when a wallet element is a winner
   *
   * For outputs we have the following situations:
   *
   * . In case it's in the spent or unspent we do nothing
   * . In case is not found, it was deleted because of a previous conflict, so we recreate in the unspent
   *
   * For inputs we have the following situations:
   * . If it's in the unspent_txs, we remove from there and add in the spent_txs
   * . If it's in the spent_txs, we do nothing
   * . If it's not in both, we add in the spent_txs
   *
   * @param {Object} winnerElement Object with data of element that was winner
   * @param {string} address Address used in this winner element
   * @param {Object} unspentTxs
   * @param {Object} spentTxs
   * @param {Object} voidedUnspentTxs
   * @param {Object} voidedSpentTxs
   *
   * @memberof Wallet
   * @inner
   */
  onWalletElementWinner(winnerElement, address, unspentTxs, spentTxs, voidedUnspentTxs, voidedSpentTxs) {
    if (winnerElement.is_output) {
      // Handle output
      let objectKey = [winnerElement.tx_id, winnerElement.index];
      // If element is not in unspentTxs neither in spentTxs, we recreate it in unspentTxs
      let found = false;
      if (winnerElement.token_uid in unspentTxs && objectKey in unspentTxs[winnerElement.token_uid]) {
        found = true;
      } else {
        if (objectKey in spentTxs && spentTxs[objectKey].length > 0) {
          found = true;
        }
      }

      if (!found) {
        // Recreate element in unspentTxs
        if (!(winnerElement.token_uid in unspentTxs)) {
          unspentTxs[winnerElement.token_uid] = {}
        }
        unspentTxs[winnerElement.token_uid][objectKey] = {
          address: address,
          value: winnerElement.value,
          timestamp: winnerElement.timestamp,
          timelock: winnerElement.timelock
        };
      }

      // If found in voidedUnspentTxs, remove it from there
      if (objectKey in voidedUnspentTxs) {
        delete voidedUnspentTxs[objectKey];
      }
    } else {
      // Handle input
      let objectKey = [winnerElement.from_tx_id, winnerElement.index];

      // Remove from voidedSpentTxs if it's there
      if (objectKey in voidedSpentTxs) {
        let foundIndex = -1;
        for (let [idx, el] of voidedSpentTxs[objectKey].entries()) {
          if (el.tx_id === winnerElement.tx_id) {
            foundIndex = idx;
          }
        }

        if (foundIndex > -1) {
          voidedSpentTxs[objectKey].splice(foundIndex, 1);
        }
      }

      // Protect if does not have in spentTxs
      if (!(objectKey in spentTxs)) {
        spentTxs[objectKey] = [];
      }

      if (winnerElement.token_uid in unspentTxs && objectKey in unspentTxs[winnerElement.token_uid]) {
        // Remove from unspentTxs, if it's there
        delete unspentTxs[winnerElement.token_uid][objectKey];
        // Now recreate it in spentTxs
        spentTxs[objectKey].push({
          address: address,
          value: winnerElement.value,
          tx_id: winnerElement.tx_id,
          timestamp: winnerElement.timestamp,
          timelock: winnerElement.timelock
        });
      } else {
        // If not in unspentTxs, try to find in spentTxs
        let foundSpent = false;
        if (objectKey in spentTxs) {
          for (let el of spentTxs[objectKey]) {
            if (el.tx_id === winnerElement.tx_id) {
              foundSpent = true;
            }
          }
        }

        if (!foundSpent) {
          // If not found, create
          spentTxs[objectKey].push({
            address: address,
            value: winnerElement.value,
            tx_id: winnerElement.tx_id,
            timestamp: winnerElement.timestamp,
            timelock: winnerElement.timelock
          });
        }
      }
    }
  },

  /*
   * Get inputs to be used in transaction from amount required and tokenUID
   *
   * @param {number} amount Amount required to send transaction
   * @param {string} tokenUID UID of token that is being sent
   *
   * @return {Object} {'inputs': Array of objects {'tx_id', 'index'}, 'inputsAmount': number}
   *
   * @memberof Wallet
   * @inner
   */
  getInputsFromAmount(amount, tokenUID) {
    let data = localStorage.getItem('wallet:data');
    let inputs = [];
    let currentAmount = 0;
    if (data) {
      let jsonData = JSON.parse(data);
      let unspentTxs = jsonData.unspentTxs;

      if (!(tokenUID in unspentTxs)) {
        return {'inputs': inputs, 'inputsAmount': currentAmount}
      }

      for (let key in unspentTxs[tokenUID]) {
        if (currentAmount >= amount) {
          break;
        }

        if (this.canUseUnspentTx(unspentTxs[tokenUID][key])) {
          currentAmount += unspentTxs[tokenUID][key].value;
          let tx_id = key.split(',')[0];
          let index = key.split(',')[1];
          inputs.push({ tx_id, index });
        }
      }
    }
    return {'inputs': inputs, 'inputsAmount': currentAmount}
  },

  /*
   * Get output of a change of a transaction
   *
   * @param {number} value Amount of the change output
   *
   * @return {Object} {'address': string, 'value': number}
   *
   * @memberof Wallet
   * @inner
   */
  getOutputChange(value, pin) {
    let address = localStorage.getItem('wallet:address');
    let outputChange = {'address': address, 'value': value};
    // Updating address because the last one was used
    if (this.hasNewAddress()) {
      this.getNextAddress();
    } else {
      this.generateNewAddress(pin);
    }
    return outputChange;
  },

  /*
   * Verify if has unspentTxs from tx_id, index and tokenUID
   *
   * @param {Array} key [tx_id, index]
   * @param {string} tokenUID UID of the token to check existence
   *
   * @return {boolean}
   *
   * @memberof Wallet
   * @inner
   */
  checkUnspentTxExists(key, tokenUID) {
    let data = localStorage.getItem('wallet:data');
    if (data) {
      let jsonData = JSON.parse(data);
      let unspentTxs = jsonData.unspentTxs;
      if (tokenUID in unspentTxs && key in unspentTxs[tokenUID]) {
        return true;
      } else {
        return false;
      }
    }
  },
}

export default wallet;