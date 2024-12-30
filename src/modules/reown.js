/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Application-wide Reown client object
 * @type {Core|null}
 */
let globalReown = {
  walletKit: null,
  core: null,
};

/**
 * Sets the global Hathor Wallet
 * @param {hathorLib.HathorWallet} wallet
 */
export const setGlobalReown = ({ walletKit, core }) => {
  globalReown = {
    walletKit,
    core,
  };
};

/**
 * Retrieves the application-wide HathorWallet object
 */
export const getGlobalReown = () => globalReown;

export const clearGlobalReown = () => {
  globalReown = {
    walletKit: null,
    core: null,
  };
};
