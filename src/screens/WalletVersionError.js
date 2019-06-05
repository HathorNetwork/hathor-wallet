/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import logo from '../assets/images/hathor-white-logo.png';
import wallet from '../utils/wallet';
import ModalResetAllData from '../components/ModalResetAllData';
import Version from '../components/Version';
import $ from 'jquery';
import ModalBackupWords from '../components/ModalBackupWords';
import HathorAlert from '../components/HathorAlert';
import { updateWords } from '../actions/index';
import { connect } from "react-redux";
import hathorLib from '@hathor/wallet-lib';


const mapDispatchToProps = dispatch => {
  return {
    updateWords: (data) => dispatch(updateWords(data)),
  };
};


/**
 * Screen used when the previous wallet version installed is not compatible with the new version  
 * So user can reset the wallet, or install the previous version again
 *
 * @memberof Screens
 */
class WalletVersionError extends React.Component {
  /**
   * Called if user clicks the button to do the words backup
   *
   * @param {Object} e Event emitted when clicking on the button
   */
  backupClicked = (e) => {
    e.preventDefault();
    $('#backupWordsModal').modal('show');
  }

  /**
   * Called when backup of words succeed, then close modal and show success message
   */
  backupSuccess = () => {
    $('#backupWordsModal').modal('hide');
    hathorLib.wallet.markBackupAsDone();
    this.props.updateWords(null);
    this.refs.alertSuccess.show(2000);
  }

  /**
   * Called if user clicks the button to reset the wallet
   *
   * @param {Object} e Event emitted when clicking on the button
   */
  resetClicked = (e) => {
    e.preventDefault();
    $('#confirmResetModal').modal('show');
  }

  /**
   * Called when reset wallet succeed, then close modal and go to welcome screen
   */
  handleReset = () => {
    $('#confirmResetModal').modal('hide');
    wallet.resetAllData();
    this.props.history.push('/welcome/');
  }

  render() {
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
          <p>You've recently updated your wallet, and this new version is not compatible with your local data.</p>
          <p>You have two alternatives:</p>
          <ol>
            <li>Use this new wallet version. In this case, you must reset and import your wallet again.</li>
            <li>Go back to the previous installed version.</li>
          </ol>
          <p>If you are going to reset your wallet, please double-check your backup before doing so.</p>
          <button className="btn btn-secondary" onClick={(e) => this.backupClicked(e)}>Backup Words</button>
          <button className="btn btn-hathor ml-3" onClick={(e) => this.resetClicked(e)}>Reset Wallet</button>
        </div>
        <ModalResetAllData success={this.handleReset} />
        <ModalBackupWords needPassword={true} validationSuccess={this.backupSuccess} />
        <HathorAlert ref="alertSuccess" text="Backup done with success!" type="success" />
      </div>
    );
  }
}

export default connect(null, mapDispatchToProps)(WalletVersionError);
