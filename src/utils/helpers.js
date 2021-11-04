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
}

export default helpers;