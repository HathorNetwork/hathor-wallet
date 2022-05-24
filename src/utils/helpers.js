/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import store from '../store/index';
import { networkUpdate } from '../actions/index';
import hathorLib from '@hathor/wallet-lib';
import { EXPLORER_BASE_URL, TESTNET_EXPLORER_BASE_URL } from '../constants';
import path from 'path';

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
   * Reloads the page loaded on electron
   *
   * @memberof Helpers
   * @inner
   */
  reloadElectron() {
    // If we don't have window.require, we can assume the app is running on a browser, so we can just
    // use the regular window.location to reload
    if (!window.require) {
      window.location.reload();
    }

    const { getCurrentWindow } = window.require('electron').remote;
    const currentWindow = getCurrentWindow();

    currentWindow.reload();
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
    hathorLib.storage.setItem('wallet:network', network);
    hathorLib.network.setNetwork(network);
  },

  /**
   * Return the URL for the testnet or mainnet
   * depending on the one from the full node connected
   *
   * @return {String} Explorer URL
   *
   * @memberof Version
   * @inner
   */
  getExplorerURL() {
    const currentNetwork = hathorLib.storage.getItem('wallet:network') || 'mainnet';
    if (currentNetwork === 'mainnet') {
      return EXPLORER_BASE_URL;
    } else {
      return TESTNET_EXPLORER_BASE_URL;
    }
  },

  /**
   * Render value to integer or decimal
   *
   * @param {number} amount Amount to render
   * @param {boolean} isInteger If it's an integer or decimal
   *
   * @return {string} rendered value
   * @memberof Helpers
   * @inner
   */
  renderValue(amount, isInteger) {
    if (isInteger) {
      return hathorLib.helpersUtils.prettyIntegerValue(amount);
    } else {
      return hathorLib.helpersUtils.prettyValue(amount);
    }
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
  }
}

export default helpers;
