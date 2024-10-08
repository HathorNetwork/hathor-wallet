/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import store from '../store/index';
import { isVersionAllowedUpdate } from '../actions/index';
import { FIRST_WALLET_COMPATIBLE_VERSION, LEDGER_FIRST_CUSTOM_TOKEN_COMPATIBLE_VERSION } from '../constants';
import helpers from './helpers';
import hathorLib from '@hathor/wallet-lib';
import LOCAL_STORE from '../storage';

/**
 * Methods to validate version
 *
 * @namespace Version
 */

const version = {
  /**
   * Checks if the API version of the server the wallet is connected is valid for this wallet version
   *
   * @param {HathorWallet | HathorWalletServiceWallet | undefined} wallet - Current wallet instance
   * @return {Promise} Promise that resolves after getting the version and updating Redux
   *
   * @memberof Version
   * @inner
   */
  async checkApiVersion(wallet) {
    if (!wallet) {
      return;
    }
    const data = await wallet.getVersionData();

    /**
     * Checks if the version downloaded from the backend (fullnode or wallet-service, depending on the facade)
     * is allowed by checking it against the MIN_API_VERSION constant from the library.
     */
    store.dispatch(isVersionAllowedUpdate({
      allowed: hathorLib.helpersUtils.isVersionAllowed(
        data.version,
        hathorLib.constants.MIN_API_VERSION
      ),
    }));

    // Set network in lib to use the correct address byte
    const network = hathorLib.helpersUtils.getNetworkFromFullNodeNetwork(data.network);
    helpers.updateNetwork(network);
    return {
      ...data,
      network,
    };
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
    const version = LOCAL_STORE.getWalletVersion();
    if (version === null) {
      // We do not have a version to check yet, so we will let this check pass.
      return true;
    }
    return hathorLib.helpersUtils.isVersionAllowed(version, FIRST_WALLET_COMPATIBLE_VERSION);
  },

  /**
   * Checks if custom tokens are allowed on the current Ledger device.
   *
   * @memberof Version
   * @inner
   */
  isLedgerCustomTokenAllowed() {
    const version = LOCAL_STORE.getLedgerAppVersion();
    if (version !== null) return helpers.cmpVersionString(version, LEDGER_FIRST_CUSTOM_TOKEN_COMPATIBLE_VERSION) >= 0;
    return false;
  }
}

export default version;
