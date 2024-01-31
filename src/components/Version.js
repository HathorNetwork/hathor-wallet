/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { VERSION } from '../constants';
import { MODAL_TYPES, useGlobalModalContext } from './GlobalModal';
import SoftwareWalletWarningMessage from './SoftwareWalletWarningMessage';
import LOCAL_STORE from '../storage';


/**
 * Component that renders the version of the wallet
 *
 * @memberof Components
 */
function Version() {
  const contextType = useGlobalModalContext();

  /**
   * If it's software wallet show modal warning
   */
  const walletTypeClicked = () => {
    if (!LOCAL_STORE.isHardwareWallet()) {
      contextType.showModal(MODAL_TYPES.ALERT, {
        body: <SoftwareWalletWarningMessage />,
        buttonName: 'Ok',
        id: 'softwareWalletWarningModal',
        title: 'Software wallet warning',
      });
    }
  }

  return (
    <div className='d-flex flex-column version-wrapper align-items-center'>
      <span className={LOCAL_STORE.isHardwareWallet() ? 'hardware' : 'software'} onClick={walletTypeClicked}>
        {LOCAL_STORE.isHardwareWallet() ? t`Hardware Wallet` : t`Software Wallet`}
      </span>
      <span>{VERSION}</span>
    </div>
  );
}

export default Version;
