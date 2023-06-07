/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { LevelDBStore, Storage, walletUtils } from "@hathor/wallet-lib";
import { VERSION } from "./constants";


export const WALLET_VERSION_KEY = 'localstorage:version';
// This key holds the storage version to indicate the migration strategy
export const STORE_VERSION_KEY = 'localstorage:storeversion';
export const LEDGER_APP_VERSION_KEY = 'localstorage:ledger:version';
// This marks the wallet as being manually locked
export const LOCKED_KEY = 'localstorage:lock';
// This key marks the wallet as being correctly closed
export const CLOSED_KEY = 'localstorage:closed';
// This key marks that the user has seen the welcome page and clicked on get started
export const STARTED_KEY = 'localstorage:started';
export const NETWORK_KEY = 'localstorage:network';
export const IS_HARDWARE_KEY = 'localstorage:ishardware';
export const TOKEN_SIGNATURES_KEY = 'localstorage:token:signatures';
export const IS_BACKUP_DONE_KEY = 'localstorage:backup';

export const storageKeys = [
  WALLET_VERSION_KEY,
  STORE_VERSION_KEY,
  LOCKED_KEY,
  CLOSED_KEY,
  STARTED_KEY,
  NETWORK_KEY,
  IS_HARDWARE_KEY,
  TOKEN_SIGNATURES_KEY,
  IS_BACKUP_DONE_KEY
];

export class LocalStorageStore {
  _storage = null;

  version = 1;

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

  getWalletId() {
    return this.getItem('wallet:id');
  }

  setWalletId(walletId) {
    this.setItem('wallet:id', walletId);
  }

  cleanWallet() {
    this.removeItem('wallet:id');
    this.removeItem(IS_HARDWARE_KEY);
    this.removeItem(STARTED_KEY);
    this.removeItem(LOCKED_KEY);
    this.removeItem(CLOSED_KEY);
    delete this._storage;
    this._storage = null;
  }

  resetStorage() {
    this.removeItem('wallet:id');

    for (const key of storageKeys) {
      this.removeItem(key);
    }
  }

  async initStorage(seed, password, pin) {
    this._storage = null;
    this.setHardwareWallet(false);
    const accessData = walletUtils.generateAccessDataFromSeed(
      seed,
      {
        pin,
        password,
        networkName: network,
      }
    );
    const walletId = walletUtils.getWalletIdFromXPub(accessData.xpubkey);
    this.setWalletId(walletId);
    const storage = this.getStorage();
    await storage.saveAccessData(accessData);
    this._storage = storage;
    return storage;
  }

  async initHWStorage(xpub) {
    this._storage = null;
    this.setHardwareWallet(true);
    const accessData = walletUtils.generateAccessDataFromXpub(
      xpub,
      { hardware: true }
    );
    const walletId = walletUtils.getWalletIdFromXPub(accessData.xpubkey);
    this.setWalletId(walletId);
    const storage = this.getStorage();
    await storage.saveAccessData(accessData);
    this._storage = storage;
    return storage;
  }

  /**
   * Get a Storage instance for the loaded wallet.
   * @returns {Storage|null} Storage instance if the wallet is loaded.
   */
  getStorage() {
    if (!this._storage) {
      const walletId = this.getWalletId();
      if (!walletId) {
        return null;
      }

      const store = new LevelDBStore(walletId);
      this._storage = new Storage(store);
    }
    return this._storage;
  }

  /**
   * Get access data of loaded wallet from async storage.
   *
   * @returns {Promise<IWalletAccessData|null>}
   */
  async _getAccessData() {
    const storage = this.getStorage();
    if (!storage) {
      return null;
    }
    return storage.getAccessData();
  }

  /**
   * Will attempt to load the access data from either the old or new storage.
   * This will return the access data as it was found, so the format will be different.
   * To check which format was received, use the storage version that is returned.
   *
   * @returns {Promise<{
   *  accessData: IWalletAccessData|null,
   *  version: number,
   *  }>} The access data and the storage version.
   */
  async getAvailableAccessData() {
   // First we try to fetch the old access data (if we haven't migrated yet)
   let accessData = this.getItem('wallet:accessData');
   if (!accessData) {
     // If we don't have the old access data, we try to fetch the new one
     accessData = await this._getAccessData();
   }

   return accessData;
 }

  /**
   * Check if the wallet is loaded.
   * Only works after preload is called and hathorMemoryStorage is populated.
   *
   * @returns {Promise<boolean>} Whether we have a loaded wallet on the storage.
   */
  async isLoaded() {
    const { accessData } = await this.getAvailableAccessData();
    return !!accessData;
  }

  /**
   * Get the storage version.
   * @returns {number|null} Storage version if it exists on AsyncStorage.
   */
  getStorageVersion() {
    return this.getItem(STORE_VERSION_KEY);
  }

  /**
   * Update the storage version to the most recent one.
   */
  updateStorageVersion() {
    this.setItem(STORE_VERSION_KEY, this.version);
  }

  getOldWalletWords(password) {
    const accessData = this.getItem('wallet:accessData');
    if (!accessData) {
      return null;
    }

    const decryptedWords = CryptoJS.AES.decrypt(accessData.words, password);
    return decryptedWords.toString(CryptoJS.enc.Utf8);
  }

  /**
   * Migrate registered tokens from the old storage into the new storage
   * The old storage holds an array of token data and the new storage expects
   * an object with the key as uid and value as token data.
   *
   * @async
   */
  async handleMigrationOldRegisteredTokens(storage) {
    const oldTokens = this.getItem('wallet:tokens');
    for (const token of oldTokens) {
      await storage.registerToken(token);
    }
  }

  /**
   * Handle data migration from old versions of the wallet to the most recent and usable
   *
   * @param {String} pin Unlock PIN written by the user
   * @async
   */
  async handleDataMigration(password, pin) {
    const storageVersion = this.getStorageVersion();
    const oldWords = this.getOldWalletWords(password);
    if (storageVersion === null && oldWords !== null) {
      // We are migrating from an version of wallet-lib prior to 1.0.0
      // This will generate the encrypted keys and other metadata
      const storage = await this.initStorage(oldWords, password, pin);
      await this.handleMigrationOldRegisteredTokens(storage);
      const isBackupDone = this.getItem('wallet:backup');
      if (isBackupDone) {
        this.markBackupDone();
      }

      // The access data is saved on the new storage, we can delete the old data.
      // This will only delete keys with the wallet prefix, so we don't delete
      // the biometry keys and new data.
      await this.clearItems(true);
    }
    // We have finished the migration so we can set the storage version to the most recent one.
    this.updateStorageVersion();
  }

  lock() {
    this.setItem(LOCKED_KEY, true);
  }

  unlock() {
    this.setItem(LOCKED_KEY, false);
  }

  isLocked() {
    return this.getItem(LOCKED_KEY) || false;
  }

  close() {
    this.setItem(CLOSED_KEY, true);
  }

  wasClosed() {
    return this.getItem(CLOSED_KEY) || false;
  }

  open() {
    this.setItem(CLOSED_KEY, false);
  }

  wasStarted() {
    return this.getItem(STARTED_KEY);
  }

  markWalletAsStarted() {
    this.setItem(STARTED_KEY, true);
  }

  getWalletVersion() {
    return this.getItem(WALLET_VERSION_KEY);
  }

  setWalletVersion() {
    this.setItem(WALLET_VERSION_KEY, VERSION);
  }

  setNetwork(networkName) {
    this.setItem(NETWORK_KEY, networkName);
    hathorLib.network.setNetwork(network);
  }

  getNetwork() {
    return this.getItem(NETWORK_KEY);
  }

  setHardwareWallet(value) {
    this.setItem(IS_HARDWARE_KEY, value);
  }

  isHardwareWallet() {
    return this.getItem(IS_HARDWARE_KEY) || false;
  }

  getTokenSignatures() {
    return this.getItem(TOKEN_SIGNATURES_KEY) || {};
  }

  setTokenSignatures(data) {
    this.setItem(TOKEN_SIGNATURES_KEY, data);
  }

  resetTokenSignatures() {
    this.removeItem(TOKEN_SIGNATURES_KEY);
  }

  markBackupDone() {
    this.setItem(IS_BACKUP_DONE_KEY, true);
  }

  markBackupAsNotDone() {
    this.removeItem(IS_BACKUP_DONE_KEY);
  }

  isBackupDone() {
    return !!this.getItem(IS_BACKUP_DONE_KEY)
  }

  saveLedgerAppVersion(version) {
    this.setItem(LEDGER_APP_VERSION_KEY, version);
  }

  getLedgerAppVersion() {
    return this.getItem(LEDGER_APP_VERSION_KEY);
  }
}

export default new LocalStorageStore();
