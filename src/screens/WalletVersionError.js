/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import logo from '../assets/images/hathor-white-logo.png';
import Version from '../components/Version';
import HathorAlert from '../components/HathorAlert';
import { updateWords, walletReset } from '../actions/index';
import { connect } from "react-redux";
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import LOCAL_STORE from '../storage';


const mapDispatchToProps = dispatch => {
  return {
    updateWords: (data) => dispatch(updateWords(data)),
    walletReset: () => dispatch(walletReset()),
  };
};


/**
 * Screen used when the previous wallet version installed is not compatible with the new version
 * So user can reset the wallet, or install the previous version again
 *
 * @memberof Screens
 */
class WalletVersionError extends React.Component {
  static contextType = GlobalModalContext;
  constructor(props) {
    super(props);

    this.alertSuccessRef = React.createRef();
  }

  /**
   * Called if user clicks the button to do the words backup
   *
   * @param {Object} e Event emitted when clicking on the button
   */
  backupClicked = (e) => {
    e.preventDefault();

    this.context.showModal(MODAL_TYPES.BACKUP_WORDS, {
      needPassword: true,
      validationSuccess: this.backupSuccess,
    });
  }

  /**
   * Called when backup of words succeed, then close modal and show success message
   */
  backupSuccess = () => {
    this.context.hideModal();
    LOCAL_STORE.markBackupDone();
    this.props.updateWords(null);
    this.alertSuccessRef.current.show(3000);
  }

  /**
   * Called if user clicks the button to reset the wallet
   *
   * @param {Object} e Event emitted when clicking on the button
   */
  resetClicked = (e) => {
    e.preventDefault();
    this.context.showModal(MODAL_TYPES.RESET_ALL_DATA, {
      success: this.handleReset,
    });
  }

  /**
   * Called when reset wallet succeed, then close modal and go to welcome screen
   */
  handleReset = () => {
    this.context.hideModal();
    this.props.walletReset();
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
          <p>{t`You've recently updated your wallet, and this new version is not compatible with your local data.`}</p>
          <p>{t`You have two alternatives:`}</p>
          <ol>
            <li>{t`Use this new wallet version. In this case, you must reset and import your wallet again.`}</li>
            <li>{t`Go back to the previous installed version.`}</li>
          </ol>
          <p>{t`If you are going to reset your wallet, please double-check your backup before doing so.`}</p>
          <button className="btn btn-secondary" onClick={(e) => this.backupClicked(e)}>{t`Backup Words`}</button>
          <button className="btn btn-hathor ml-3" onClick={(e) => this.resetClicked(e)}>{t`Reset Wallet`}</button>
        </div>
        <HathorAlert ref={this.alertSuccessRef} text={t`Backup done with success!`} type="success" />
      </div>
    );
  }
}

export default connect(null, mapDispatchToProps)(WalletVersionError);
