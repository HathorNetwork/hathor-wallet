/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import store from '../store/index';
import { isVersionAllowedUpdate, networkUpdate } from '../actions/index';
import hathorLib from 'hathor-wallet-utils';

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
        // Update network in redux
        store.dispatch(networkUpdate({network: data.network}));
        resolve();
      }, (error) => {
        reject();
      });
    });
    return newPromise;
  },
}

export default version;
