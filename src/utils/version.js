/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import versionApi from '../api/version';
import store from '../store/index';
import { isVersionAllowedUpdate, networkUpdate } from '../actions/index';
import { MIN_API_VERSION, FIRST_WALLET_COMPATIBLE_VERSION } from '../constants';
import helpers from './helpers';
import transaction from './transaction';

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
    const promise = new Promise((resolve, reject) => {
      versionApi.getVersion((data) => {
        // Update version allowed in redux
        store.dispatch(isVersionAllowedUpdate({allowed: helpers.isVersionAllowed(data.version, MIN_API_VERSION)}));
        // Update transaction weight constants
        transaction.updateTransactionWeightConstants(data.min_tx_weight, data.min_tx_weight_coefficient, data.min_tx_weight_k);
        // Update network in redux
        store.dispatch(networkUpdate({network: data.network}));
        resolve();
      }, (error) => {
        reject();
      });
    });
    return promise
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
    const version = localStorage.getItem('wallet:version');
    if (version !== null && helpers.isVersionAllowed(version, FIRST_WALLET_COMPATIBLE_VERSION)) {
      return true;
    } else {
      return false;
    }
  }
}

export default version;
