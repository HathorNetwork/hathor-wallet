/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import path from 'path-browserify';
import hathorLib from '@hathor/wallet-lib';
import { get } from 'lodash';
import store from '../store/index';
import { networkUpdate, networkSettingsUpdate } from '../actions/index';
import { NETWORK_SETTINGS } from '../constants';
import LOCAL_STORE from '../storage';

let shell = null;
if (window.require) {
  shell = window.require('electron').shell;
}

const helpers = {
  /**
   * Open external URL. It executes electron shell, if it's running on electron
   * and open new tab otherwise.
   *
   * @param {String} url URL to be opened
   *
   * @memberof helpers
   * @inner
   */
  openExternalURL(url) {
    // We use electron shell to open the user external default browser
    // otherwise it would open another electron window and the user wouldn't be able to copy the URL
    if (shell !== null) {
      shell.openExternal(url);
    } else {
      // In case it's running on the browser it won't have electron shell
      // This should be used only when testing
      window.open(url, '_blank');
    }
  },

  /**
   * Get the network settings from LOCAL_STORE
   * but it gets the default using the lib default network,
   * if it doesn't exist in the LOCAL_STORE
   *
   * @return {Object} networkSettings with the data
   * {string} networkSettings.node
   * {string} networkSettings.network
   * {string} networkSettings.txMining
   * {string} networkSettings.explorer
   * {string} networkSettings.explorerService
   * {string} networkSettings.walletService
   * {string} networkSettings.walletServiceWS
   *
   * @memberof helpers
   * @inner
   */
  getSafeNetworkSettings() {
    let networkSettings = LOCAL_STORE.getNetworkSettings();
    if (!networkSettings) {
      // If it doesn't exist in the store, it's a fresh install
      // or a migration from older versions, so we just use the
      // default network from the lib
      const libDefaultNetwork = hathorLib.config.getNetwork().name;
      networkSettings = NETWORK_SETTINGS[libDefaultNetwork];
    }
    return networkSettings;
  },

  /**
   * Load the network and server url from localstorage into hathorlib and redux.
   * If not configured, get the default from hathorlib.
   *
   * @memberof helpers
   * @inner
   */
  loadStorageState() {
    const networkSettings = this.getSafeNetworkSettings();
    this.updateNetworkSettings(networkSettings);
  },

  /**
   * Update network settings in the redux, storage and lib config
   *
   * @param {Object} networkSettings with the data
   * @param {string} networkSettings.node
   * @param {string} networkSettings.network
   * @param {string} networkSettings.txMining
   * @param {string} networkSettings.explorer
   * @param {string} networkSettings.explorerService
   * @param {string} networkSettings.walletService
   * @param {string} networkSettings.walletServiceWS
   *
   * @memberof helpers
   * @inner
   */
  updateNetworkSettings(networkSettings) {
    // Update the network in redux and lib
    this.updateNetwork(networkSettings.network);
    hathorLib.config.setServerUrl(networkSettings.node);
    hathorLib.config.setTxMiningUrl(networkSettings.txMining);
    hathorLib.config.setExplorerServiceBaseUrl(networkSettings.explorerService);

    if (networkSettings.walletService) {
      hathorLib.config.setWalletServiceBaseUrl(networkSettings.walletService);
    }

    const walletServiceWS = networkSettings.walletServiceWS;

    if (walletServiceWS) {
      hathorLib.config.setWalletServiceBaseWsUrl(walletServiceWS);
      const storage = LOCAL_STORE.getStorage();
      if (storage) {
        // This is a promise but we should not await it since this method has to be sync
        // There is no issue not awaiting this since we already have this configured on the config
        storage.store.setItem('wallet:wallet_service:ws_server', walletServiceWS);
      }
    }

    // Update network settings in redux
    store.dispatch(networkSettingsUpdate(networkSettings));

    LOCAL_STORE.setNetworkSettings(networkSettings);
  },

  /**
   * Update network variables in redux, storage and lib
   *
   * @params {String} network Network name
   *
   * @memberof Version
   * @inner
   */
  updateNetwork(network) {
    // Update network in redux
    store.dispatch(networkUpdate({network}));
    hathorLib.network.setNetwork(network);
  },

  /**
   * Return the URL for the connected network from network settings
   *
   * @return {String} Explorer URL
   *
   * @memberof Version
   * @inner
   */
  getExplorerURL() {
    const networkSettings = this.getSafeNetworkSettings();
    return networkSettings.explorer;
  },

  /**
   * Get file extension by name and path
   *
   * @param {string} file Full file path with name
   *
   * @return {string} file extension
   * @memberof Helpers
   * @inner
   */
  getFileExtension(file) {
    const parts = file.split('.');
    if (parts.length === 1) {
      return '';
    }
    return parts[parts.length - 1];
  },

  /**
   * If token is an NFT checking metadata
   *
   * @param {string} uid Token uid
   * @param {Object} metadataPerToken Metadatas of registered tokens
   *
   * @return {boolean} if token is an NFT
   * @memberof Helpers
   * @inner
   */
  isTokenNFT(uid, metadataPerToken) {
    return uid in metadataPerToken && metadataPerToken[uid].nft;
  },

  /**
   * Return full explorer URL joining base url and path
   *
   * @param {String} path URL path to join
   *
   * @return {String} Full explorer URL
   *
   * @memberof Helpers
   * @inner
   */
  getFullExplorerURL(urlPath) {
    return path.join(this.getExplorerURL(), urlPath);
  },

  /**
   * Compare 2 version strings with format X.X.X
   * (only numbers and length must be 3)
   * Works as a "greater than" operator
   *
   * @param {string} v1, first version string
   * @param {string} v2, second version string
   *
   * @returns {Number} 0 if equal, 1 if v1 > v2 and -1 if v2 > v1
   *
   * @memberof Helpers
   * @inner
   */
  cmpVersionString(v1, v2) {
      var pv1 = v1.split('.');
      var pv2 = v2.split('.');
      for (var i = 0; i < 3; i++) {
          var nv1 = Number(pv1[i]);
          var nv2 = Number(pv2[i]);
          if (nv1 > nv2) return 1;
          if (nv2 > nv1) return -1;
          if (!isNaN(nv1) && isNaN(nv2)) return 1;
          if (isNaN(nv1) && !isNaN(nv2)) return -1;
      }
      return 0;
  },

  /**
   * Generates a uniqueId and stores it on localStorage to be persisted
   * between reloads
   *
   * @returns {string} The generated unique identifier
   *
   * @memberof Helpers
   * @inner
   */
  getUniqueId() {
    const currentUniqueId = localStorage.getItem('app:uniqueId');

    if (currentUniqueId) {
      return currentUniqueId;
    }

    const uniqueId = Date.now().toString(36) + Math.random().toString(36).substring(2);

    localStorage.setItem('app:uniqueId', uniqueId);

    return uniqueId;
  },

  /**
   * @typedef {Object} ReduxTxHistory
   * @property {string} tx_id
   * @property {number} timestamp
   * @property {string} tokenUid
   * @property {number} balance
   * @property {boolean} is_voided
   * @property {number} version
   * @property {boolean} isAllAuthority
   */

  /**
   * @typedef {Object} LibTxHistory
   * @property {string} txId
   * @property {number} balance
   * @property {number} timestamp
   * @property {boolean} voided
   * @property {number} version
   */

  /**
   * Check if the tx has only inputs and outputs that are authorities
   *
   * @param {Object} tx Transaction data
   *
   * @return {boolean} If the tx has only authority
   */
  isAllAuthority(tx) {
    for (let txin of tx.inputs) {
      if (!hathorLib.transactionUtils.isAuthorityOutput(txin)) {
        return false;
      }
    }

    for (let txout of tx.outputs) {
      if (!hathorLib.transactionUtils.isAuthorityOutput(txout)) {
        return false;
      }
    }

    return true;
  },

  /**
   * Map tx history object to the expected object in the wallet redux data
   *
   * @param {HathorWallet} wallet - Wallet instance
   * @param {LibTxHistory} tx - tx received via getTxHistory
   * @param {string} tokenUid - token uid
   * @returns {Promise<ReduxTxHistory>}
   */
  async mapTxHistoryToRedux(wallet, tx, tokenUid) {

    let isAllAuthority = false;
    try {
      // tx comes from getTxHistory and does not have token_data
      // We need the actual history tx to access if it is an authority tx
      const histTx = await wallet.getTx(tx.txId);
      const isAllAuthority = this.isAllAuthority(histTx);
    } catch (err) {
      // wallet-service facade does not implement getTx yet
      // This will create a way to safely ignore the isAllAuthority if we cannot get the tx
      if (err.message.toLowerCase() !== 'not implemented.') {
        console.error(err);
        throw err;
      }
    }

    return {
      tx_id: tx.txId,
      timestamp: tx.timestamp,
      tokenUid,
      balance: tx.balance,
      // in wallet service this comes as 0/1 and in the full node comes with true/false
      is_voided: Boolean(tx.voided),
      version: tx.version,
      isAllAuthority,
    };
  },

  /**
   * Map token history to a list of the expected format in the wallet redux
   *
   * @param {HathorWallet} wallet - Wallet instance
   * @param {LibTxHistory[]} history - history of txs received via getTxHistory
   * @param {string} tokenUid - token uid
   * @returns {Promise<ReduxTxHistory[]>}
   */
  async mapTokenHistory(wallet, history, tokenUid) {
    const mappedHistory = [];
    for (const tx of history) {
      mappedHistory.push(await this.mapTxHistoryToRedux(wallet, tx, tokenUid));
    }
    return mappedHistory;
  },

  /**
   * Returns the current OS
   *
   * @returns {string} 'macos', 'windows', 'linux' or 'other'
   */
  getCurrentOS() {
    if (!window) {
      return 'other';
    }

    /**
     * Possible values for clientInformation['platform'] are:
     * "Win32" - indicates the browser is running on a 32-bit version of Windows.
     * "Win64" - indicates the browser is running on a 64-bit version of Windows.
     * "MacIntel" - indicates the browser is running on an Intel-based Mac.
     * "MacPPC" - indicates the browser is running on a PowerPC-based Mac.
     * "Linux i686" - indicates the browser is running on a 32-bit version of Linux.
     * "Linux x86_64" - indicates the browser is running on a 64-bit version of Linux.
     * "Android" - indicates the browser is running on an Android device.
     * "iPhone" - indicates the browser is running on an iPhone.
     * "iPad" - indicates the browser is running on an iPad.
     * "iPod" - indicates the browser is running on an iPod.
     *
     * Since the wallet-desktop only runs in desktops, we can return 'other' for any other
     * platform that is not windows, mac or linux
     */
    const platform = get(window, 'clientInformation.platform', 'other').toLowerCase();

    if (platform.includes('win')) {
      return 'windows';
    } else if (platform.includes('mac')) {
      return 'macos';
    } else if (platform.includes('linux')) {
      return 'linux';
    }

    return 'other';
  },

  /**
   * Generates a promise that resolves only after a specified time
   * @param {number} [ms=1000] Time in milliseconds
   * @return {Promise<unknown>}
   */
  async delay(ms = 1000) {
    return new Promise((resolve) => {
      setTimeout(
        () => resolve(),
        ms
      )
    })
  },

  /**
   * Return either the single or plural form depending on the quantity.
   * @param {number} qty Quantity to access
   * @param {string} singleWord word in single format
   * @param {string} pluralWord word in plural format
   * @returns {string}
   */
  plural(qty, singleWord, pluralWord) {
    return qty === 1 ? singleWord : pluralWord;
  },

  /**
   * Truncates a text by showing the first and last n characters with ellipsis in between
   * @param {string} text - The text to truncate
   * @param {number} startChars - Number of characters to show at the start
   * @param {number} endChars - Number of characters to show at the end
   * @returns {string} The truncated text
   */
  truncateText(text, startChars = 8, endChars = 4) {
    if (!text) return '';
    if (text.length <= startChars + endChars) return text;
    
    return `${text.slice(0, startChars)}...${text.slice(-endChars)}`;
  },
}


export default helpers;
