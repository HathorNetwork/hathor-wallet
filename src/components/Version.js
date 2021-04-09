/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { VERSION } from '../constants';
import hathorLib from '@hathor/wallet-lib';
import $ from 'jquery';


/**
 * Component that renders the version of the wallet
 *
 * @memberof Components
 */
class Version extends React.Component {
  /**
   * If it's software wallet show modal warning
   */
  walletTypeClicked = () => {
    // XXX We currently do not support ledger.
    // After we start supporting it we should
    // 1. Add onClick={this.walletTypeClicked} in the span below
    // 2. Add cursor: pointer in css in 'span.software'
    if (hathorLib.wallet.isSoftwareWallet()) {
      $('#softwareWalletWarningModal').modal('show');
    }
  }

  render() {
    return (
      <div className='d-flex flex-column version-wrapper align-items-center'>
        <span className={hathorLib.wallet.isSoftwareWallet() ? 'software' : 'hardware'}>
          {hathorLib.wallet.isSoftwareWallet() ? t`Software Wallet` : t`Hardware Wallet`}
        </span>
        <span>{VERSION}</span>
      </div>
    );
  }
};

export default Version;
