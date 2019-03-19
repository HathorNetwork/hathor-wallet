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


const mapDispatchToProps = dispatch => {
  return {
    updateWords: (data) => dispatch(updateWords(data)),
  };
};


class WalletVersionError extends React.Component {
  backupClicked = (e) => {
    e.preventDefault();
    $('#backupWordsModal').modal('show');
  }

  backupSuccess = () => {
    $('#backupWordsModal').modal('hide');
    wallet.markBackupAsDone();
    this.props.updateWords(null);
    this.refs.alertSuccess.show(2000);
  }

  resetClicked = (e) => {
    e.preventDefault();
    $('#confirmResetModal').modal('show');
  }

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