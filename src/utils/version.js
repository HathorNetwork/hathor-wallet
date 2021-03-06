/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import store from '../store/index';
import { isVersionAllowedUpdate } from '../actions/index';
import { FIRST_WALLET_COMPATIBLE_VERSION } from '../constants';
import helpers from './helpers';
import hathorLib from '@hathor/wallet-lib';

/**
 * Methods to validate version
 *
 * @namespace Version
 */

const version = {
  /**
   * Checks if the API version of the server the wallet is connected is valid for this wallet version
   *
   * @return {Promise} Promise that resolves after getting the version and updating Redux
   *
   * @memberof Version
   * @inner
   */
  checkApiVersion() {
    const newPromise = new Promise((resolve, reject) => {
      const libPromise = hathorLib.version.checkApiVersion();
      libPromise.then((data) => {
        // Update version allowed in redux
        store.dispatch(isVersionAllowedUpdate({allowed: hathorLib.helpers.isVersionAllowed(data.version, hathorLib.constants.MIN_API_VERSION)}));
        // Set network in lib to use the correct address byte
        let network;
        if (data.network === 'mainnet') {
          network = 'mainnet';
        } else {
          // Can we assume it will be testnet? I think it's safe
          network = 'testnet';
        }
        helpers.updateNetwork(network);
        resolve({...data, network});
      }, (error) => {
        reject();
      });
    });
    return newPromise;
  },

  /**
   * Checks if the wallet version is allowed to continue using the wallet or needs a reset
   *
   * @return {boolean}
   *
   * @memberof Version
   * @inner
   */
  checkWalletVersion() {
    const version = hathorLib.storage.getItem('wallet:version');
    if (version !== null && hathorLib.helpers.isVersionAllowed(version, FIRST_WALLET_COMPATIBLE_VERSION)) {
      return true;
    } else {
      return false;
    }
  }
}

export default version;
