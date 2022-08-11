/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import hathorLib from '@hathor/wallet-lib';

import {
  WalletDoesNotExistError,
  WalletAlreadyExistError,
  InvalidWalletNameError,
} from './errors';
import { DEBUG_LOCAL_DATA_KEYS } from './constants';

class LocalStorageStore {
  getItem(key) {
    let item;
    try {
      item = localStorage.getItem(key);
      return JSON.parse(item);
    } catch (e) {
      // old versions of the wallet would save strings without converting
      // to JSON, so we catch this exception here and return the string directly
      // FIXME this is a temporary solution and should be fixed by versioning
      // the storage: https://github.com/HathorNetwork/hathor-wallet-lib/issues/19
      if (e instanceof SyntaxError) {
        // first save in JSON format
        this.setItem(key, item);
        // return it
        return item;
      }
      throw e;
    }
  }

  setItem(key, value) {
    localStorage.setItem(key, JSON.stringify(value));
  }

  removeItem(key) {
    localStorage.removeItem(key);
  }

  clear() {
    localStorage.clear();
  }
}

/*
 * We use this storage so 'wallet:data' is kept in memory. This information may become very large if
 * there are thousands of txs on the wallet history (we got this error with 15k txs) and the localStorage
 * does not store data after a certain limit (it fails silently).
 *
 * In theory, there shouldn't be a limit for localStorage with Electron, as it's been patched here: https://github.com/electron/electron/pull/15596.
 * However, this other comment (https://github.com/electron/electron/issues/13465#issuecomment-494983533) suggests
 * there was still a problem.
 *
 * It's not a problem if 'wallet:data' is not persisted, as this data is always loaded when we connect to the server.
 */
class HybridStore {
  static nonPrefixedKeyList = ['list-of-wallets'];

  constructor() {
    this.memStore = new hathorLib.MemoryStore();
    this.persistentStore = new LocalStorageStore();
    this.prefix = '';
    this.nonPrefixedKeys = new Set(HybridStore.nonPrefixedKeyList);
  }

  /*
   * Upgrades an old version of the storage, which did not support multiple wallets
   *
   * @param {String} walletPrefix Prefix used to identify the wallet.
   * @param {String} walletName Name used to identify the wallet.
   *
   * @memberof HybridStore
   * @inner
   */
  upgradeStorage(walletPrefix, walletName) {
    this.addWallet(walletName, walletPrefix);

    const keys = [
      ...DEBUG_LOCAL_DATA_KEYS,
      'wallet:accessData',
      'wallet:network',
      'wallet:sentry',
      'wallet:type',
      'wallet:version',
      'wallet:multisig',
    ];
    keys.forEach((key) => {
      const item = this.getPrefixedItem(null, key);
      this.setPrefixedItem(walletPrefix, key, item);
      this.removePrefixedItem(null, key);
      this.setPrefixedItem(null, 'wallet:started', true);
    })
  }

  /**
   * Get list of known wallets.
   *
   * @return {Object} Wallet list indexed by prefix.
   * @memberof HybridStore
   * @inner
   */
  getListOfWallets() {
    return this.getItem('list-of-wallets') || {};
  }

  /**
   * Set list of known wallets.
   *
   * @memberof HybridStore
   * @inner
   */
  setListOfWallets(walletList) {
    this.setItem('list-of-wallets', walletList);
  }

  /**
   * Get name of the current wallet in use.
   *
   * @return {String} current wallet name.
   * @memberof HybridStore
   * @inner
   */
  getWalletName() {
    const listOfWallets = this.getListOfWallets();
    return listOfWallets[this.prefix].name;
  }

  /**
   * Removes a wallet from the list of wallets.
   *
   * @param {String} prefix Prefix used to identify the wallet.
   *
   * @memberof HybridStore
   * @inner
   */
  removeWallet(prefix) {
    const listOfWallets = this.getListOfWallets();
    if (listOfWallets[prefix] !== undefined) {
      delete listOfWallets[prefix];
      this.setListOfWallets(listOfWallets);
    } else {
      // The wallet being deleted does not exist
      throw new WalletDoesNotExistError(prefix);
    }
  }

  /**
   * Adds a new wallet to the list of wallets.
   *
   * @param {String} name Wallet name
   * @param {String} prefix Prefix used for all keys of this wallet. Works as a namespace.
   *
   * @memberof HybridStore
   * @inner
   */
  addWallet(name, prefix) {
    if (name.length > 50) {
      throw new InvalidWalletNameError();
    }

    const listOfWallets = this.getListOfWallets();
    if (listOfWallets[prefix] !== undefined) {
      throw new WalletAlreadyExistError();
    }
    listOfWallets[prefix] = {name};
    this.setListOfWallets(listOfWallets);
  }

  _getStore(key) {
    if (key === 'wallet:data') {
      return this.memStore;
    }
    return this.persistentStore;
  }

  /**
   * Get the actual key used on the storage.
   * Non-prefixed are keys where the prefix is '' or keys on the nonPrefixedKeys set
   *
   * @param {String} prefix Prefix of the wallet.
   * @param {String} key Name of the key we want to access.
   *
   * @return {String} the actual storage key.
   * @memberof HybridStore
   * @inner
   */
  _getKey(prefix, key) {
    if (this.nonPrefixedKeys.has(key)) {
      return key;
    }
    if (prefix && prefix.length > 0) {
      return prefix + "$" + key;
    }
    return key;
  }

  /**
   * Get the storage item for the prefix given.
   *
   * @param {String} prefix Prefix of the wallet.
   * @param {String} key Name of the key we want to access.
   *
   * @return {Object} the storage item or null if it doesn't exist.
   * @memberof HybridStore
   * @inner
   */
  getPrefixedItem(prefix, key) {
    return this._getStore(key).getItem(this._getKey(prefix, key));
  }

  /**
   * Set the storage item for the prefix given.
   *
   * @param {String} prefix Prefix of the wallet.
   * @param {String} key Name of the key we want to set.
   * @param {String} value Value we want to write on storage.
   *
   * @memberof HybridStore
   * @inner
   */
  setPrefixedItem(prefix, key, value) {
    return this._getStore(key).setItem(this._getKey(prefix, key), value);
  }

  /**
   * Remove the storage item for the prefix given.
   *
   * @param {String} prefix Prefix of the wallet.
   * @param {String} key Name of the key we want to remove.
   *
   * @memberof HybridStore
   * @inner
   */
  removePrefixedItem(prefix, key) {
    return this._getStore(key).removeItem(this._getKey(prefix, key));
  }

  getItem(key) {
    return this.getPrefixedItem(this.prefix, key);
  }

  setItem(key, value) {
    return this.setPrefixedItem(this.prefix, key, value);
  }

  removeItem(key) {
    return this.removePrefixedItem(this.prefix, key);
  }

  clear() {
    this.memStore.clear();
    this.persistentStore.clear();
  }
}

export { LocalStorageStore, HybridStore };
