/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'

import hathorLib from '@hathor/wallet-lib';

/**
 * Component that shows the current wallet name in use
 *
 * @memberof Components
 */
function WalletStatus(props) {
  const listOfWallets = hathorLib.storage.store.getListOfWallets();
  const walletName = listOfWallets[hathorLib.storage.store.prefix].name;
  return (
    <div className="d-flex flex-column version-wrapper align-items-center">
      <span>{t`Current Wallet`}</span>
      <span>{walletName}</span>
    </div>
  );
}

export default WalletStatus;
