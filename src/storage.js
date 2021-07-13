/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import hathorLib from '@hathor/wallet-lib';

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
  constructor(prefix = "") {
    this.memStore = new hathorLib.MemoryStore();
    this.persistentStore = new LocalStorageStore();
    this.nonPrefixedKeys = new Set();
    this.nonPrefixedKeys.add('list-of-wallets');
    this.prefix = "";
  }

  getListOfWallets() {
    return this.getItem('list-of-wallets') || {};
  }

  addWallet(name, prefix) {
    const listOfWallets = this.getListOfWallets();
    if (Object.keys(listOfWallets).length == 0) {
      if (this.getItem('wallet:started') !== null) {
        listOfWallets[''] = {
          name: 'Default',
        };
      }
    }
    if (listOfWallets[prefix] !== undefined) {
      //throw "This wallet prefix has already been used."
      return;
    }
    listOfWallets[prefix] = {name};
    this.setItem('list-of-wallets', listOfWallets);
  }

  _getStore(key) {
    if (key === 'wallet:data') {
      return this.memStore;
    }
    return this.persistentStore;
  }

  _getKey(key) {
    if (this.nonPrefixedKeys.has(key)) {
      return key;
    }
    if (this.prefix && this.prefix.length > 0) {
      return this.prefix + "$" + key;
    }
    return key;
  }

  getItem(key) {
    return this._getStore(key).getItem(this._getKey(key));
  }

  setItem(key, value) {
    return this._getStore(key).setItem(this._getKey(key), value);
  }

  removeItem(key) {
    return this._getStore(key).removeItem(this._getKey(key));
  }

  clear() {
    // XXX Should we clear all keys or only the the prefixed ones?
    this.memStore.clear();
    this.persistentStore.clear();
  }
}

export { LocalStorageStore, HybridStore };
