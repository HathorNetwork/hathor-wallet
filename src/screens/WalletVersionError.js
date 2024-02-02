/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useContext, useRef } from 'react';
import { t } from 'ttag';
import logo from '../assets/images/hathor-white-logo.png';
import Version from '../components/Version';
import HathorAlert from '../components/HathorAlert';
import { updateWords, walletReset } from '../actions/index';
import { useDispatch } from "react-redux";
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import LOCAL_STORE from '../storage';
import { useNavigate } from 'react-router-dom';


/**
 * Screen used when the previous wallet version installed is not compatible with the new version
 * So user can reset the wallet, or install the previous version again
 *
 * @memberof Screens
 */
function WalletVersionError() {
  const context = useContext(GlobalModalContext);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const alertSuccessRef = useRef();

  /**
   * Called when backup of words succeed, then close modal and show success message
   */
  const backupSuccess = () => {
    context.hideModal();
    LOCAL_STORE.markBackupDone();
    dispatch(updateWords(null));
    alertSuccessRef.current.show(3000);
  }

  /**
   * Called if user clicks the button to do the words backup
   *
   * @param {Object} e Event emitted when clicking on the button
   */
  const backupClicked = (e) => {
    e.preventDefault();

    context.showModal(MODAL_TYPES.BACKUP_WORDS, {
      needPassword: true,
      validationSuccess: backupSuccess,
    });
  }

  /**
   * Called when reset wallet succeed, then close modal and go to welcome screen
   */
  const handleReset = () => {
    context.hideModal();
    dispatch(walletReset());
    navigate('/welcome/');
  }

  /**
   * Called if user clicks the button to reset the wallet
   *
   * @param {Object} e Event emitted when clicking on the button
   */
  const resetClicked = (e) => {
    e.preventDefault();
    context.showModal(MODAL_TYPES.RESET_ALL_DATA, {
      success: handleReset,
    });
  }

  return (
    <div className="component-div">
      <div className="main-nav">
        <nav className="navbar navbar-expand-lg navbar-dark">
          <div className="d-flex flex-column align-items-center navbar-brand">
            <img src={logo} alt="" />
          </div>
          <div className="collapse navbar-collapse d-flex flex-column align-items-end" id="navbarSupportedContent">
            <div>
              <Version />
            </div>
          </div>
        </nav>
      </div>
      <div className="content-wrapper">
        <p>{t`You've recently updated your wallet, and this new version is not compatible with your local data.`}</p>
        <p>{t`You have two alternatives:`}</p>
        <ol>
          <li>{t`Use this new wallet version. In this case, you must reset and import your wallet again.`}</li>
          <li>{t`Go back to the previous installed version.`}</li>
        </ol>
        <p>{t`If you are going to reset your wallet, please double-check your backup before doing so.`}</p>
        <button className="btn btn-secondary" onClick={(e) => backupClicked(e)}>{t`Backup Words`}</button>
        <button className="btn btn-hathor ml-3" onClick={(e) => resetClicked(e)}>{t`Reset Wallet`}</button>
      </div>
      <HathorAlert ref={alertSuccessRef} text={t`Backup done with success!`} type="success" />
    </div>
  );
}

export default WalletVersionError;
