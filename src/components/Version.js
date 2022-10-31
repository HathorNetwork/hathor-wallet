/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import hathorLib from '@hathor/wallet-lib';
import $ from 'jquery';
import { VERSION, LEDGER_ENABLED } from '../constants';
import { GlobalModalContext, MODAL_TYPES } from './GlobalModal';
import SoftwareWalletWarningMessage from './SoftwareWalletWarningMessage';


/**
 * Component that renders the version of the wallet
 *
 * @memberof Components
 */
class Version extends React.Component {
  static contextType = GlobalModalContext;
  /**
   * If it's software wallet show modal warning
   */
  walletTypeClicked = () => {
    if (LEDGER_ENABLED) {
      if (hathorLib.wallet.isSoftwareWallet()) {
        $('#softwareWalletWarningModal').modal('show');
        this.context.showModal(MODAL_TYPES.ALERT, {
          body: <SoftwareWalletWarningMessage />,
          buttonName: 'Ok',
          id: 'softwareWalletWarningModal',
          title: 'Software wallet warning',
        });
      }
    }
  }

  render() {
    return (
      <div className='d-flex flex-column version-wrapper align-items-center'>
        <span className={hathorLib.wallet.isSoftwareWallet() ? 'software' : 'hardware'} onClick={this.walletTypeClicked}>
          {hathorLib.wallet.isSoftwareWallet() ? t`Software Wallet` : t`Hardware Wallet`}
        </span>
        <span>{VERSION}</span>
      </div>
    );
  }
};

export default Version;
