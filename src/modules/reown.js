/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { WalletKit } from '@reown/walletkit/dist/types/client';
import { Core } from '@walletconnect/core/dist/types/core';

/**
 * Application-wide Reown client object
 * @type { walletKit: WalletKit, core: Core }
 */
let globalReown = {
  walletKit: null,
  core: null,
};

/**
 * Sets the global Reown object
 * @param {{ walletKit: WalletKit, core: Core } wallet
 */
export const setGlobalReown = ({ walletKit, core }) => {
  globalReown = {
    walletKit,
    core,
  };
};

/**
 * Retrieves the application-wide Reown object
 */
export const getGlobalReown = () => globalReown;

export const clearGlobalReown = () => {
  globalReown = {
    walletKit: null,
    core: null,
  };
};
