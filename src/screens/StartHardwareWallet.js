/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'
import { connect } from 'react-redux';

import logo from '../assets/images/hathor-logo.png';
import ledger from '../utils/ledger';
import helpers from '../utils/helpers';
import { LEDGER_GUIDE_URL, IPC_RENDERER, LEDGER_MIN_VERSION, LEDGER_MAX_VERSION } from '../constants';
import { startWalletRequested } from '../actions';
import InitialImages from '../components/InitialImages';
import hathorLib from '@hathor/wallet-lib';
import LOCAL_STORE from '../storage';

const mapDispatchToProps = dispatch => {
  return {
    startWallet: (payload) => dispatch(startWalletRequested(payload)),
  };
};

/**
 * Screen used to select between hardware wallet or software wallet
 *
 * @memberof Screens
 */
class StartHardwareWallet extends React.Component {
  // Attempt parameters when trying to connect to ledger
  // attemptNumber: current attempt
  // attemptLimit: maximum number of attempts
  // attemptInterval: wait interval between attempts
  attemptNumber = 0
  attemptLimit = 100
  attemptInterval = 3000

  /**
   * errorMessage {string} message to show in case of error connecting to ledger
   * waitAction {boolean} after connecting to ledger we need to wait for user action
   */
  state = {
    errorMessage: '',
    waitAction: false,
  }

  componentDidMount() {
    if (IPC_RENDERER) {
      IPC_RENDERER.on("ledger:version", this.handleVersion);
      IPC_RENDERER.on("ledger:publicKeyData", this.handlePublicKeyData);
    }
    this.attemptNumber = 1;
    ledger.getVersion();
  }

  componentWillUnmount() {
    if (IPC_RENDERER) {
      // Remove listeners
      IPC_RENDERER.removeAllListeners("ledger:version");
      IPC_RENDERER.removeAllListeners("ledger:publicKeyData");
    }
  }

  /**
   * Handle the response of a get version call to Ledger.
   *
   * @param {IpcRendererEvent} event May be used to reply to the event
   * @param {Object} arg Data returned from the get version call
   */
  handleVersion = (event, arg) => {
    if (arg.success) {
      // compare ledger version with our min version
      const version = Buffer.from(arg.data).slice(3, 6).join('.');
      LOCAL_STORE.saveLedgerAppVersion(version);
      if (
        helpers.cmpVersionString(version, LEDGER_MIN_VERSION) < 0 ||
        helpers.cmpVersionString(version, LEDGER_MAX_VERSION) >= 0
      ) {
        // unsupported version
        this.setState({ errorMessage: t`Unsupported Ledger app version` });
        return;
      }
      // We wait 2 seconds to update the message on the screen
      // so the user don't see the screen updating fast
      setTimeout(() => {
        this.setState({ waitAction: true, errorMessage: '' }, () => {
          ledger.getPublicKeyData();
        })
      }, 2000);
    } else {
      if (this.attemptNumber < this.attemptLimit) {
        setTimeout(() => {
          this.attemptNumber += 1;
          ledger.getVersion();
        }, this.attemptInterval);
      } else {
        // Error
        this.setState({ errorMessage: arg.error.message });
      }
    }
  }

  /**
   * Handle the response of a get public key data call to Ledger.
   *
   * @param {IpcRendererEvent} event May be used to reply to the event
   * @param {Object} arg Data returned from the get public key data call
   */
  handlePublicKeyData = (event, arg) => {
    if (arg.success) {
      const data = Buffer.from(arg.data);
      const uncompressedPubkey = data.slice(0, 65);
      const compressedPubkey = hathorLib.walletUtils.toPubkeyCompressed(uncompressedPubkey);
      const chainCode = data.slice(65, 97);
      const fingerprint = data.slice(97, 101);
      const xpub = hathorLib.walletUtils.xpubFromData(compressedPubkey, chainCode, fingerprint);

      LOCAL_STORE.setHardwareWallet(true);
      this.props.startWallet({
        words: null,
        passphrase: '',
        pin: null,
        password: '',
        routerHistory: this.props.history,
        xpub,
        hardware: true,
      });
      LOCAL_STORE.markBackupDone();

      this.props.history.push('/wallet/');
    } else {
      // Error
      this.setState({ errorMessage: arg.error.message });
    }
  }

  /*
   * Try getting user approval on Ledger again
   */
  tryAgain = () => {
    // clear error
    this.setState({ errorMessage: null, waitAction: false }, () => {
      this.attemptNumber = 1;
      ledger.getVersion();
    });
  }

  /**
   * Method called to open ledger guide
   *
   * @param {Object} e Event for the click
   */
  openLedgerGuide = (e) => {
    e.preventDefault();
    const url = new URL(LEDGER_GUIDE_URL);
    helpers.openExternalURL(url.href);
  }

  render() {
    const renderError = () => {
      return (
        <div className="d-flex align-items-center flex-column">
          <p className="mt-4 mb-4 text-danger">{this.state.errorMessage}</p>
          <button onClick={this.tryAgain} type="button" className="btn btn-hathor">{t`Try again`}</button>
        </div>
      )
    }

    const renderText = () => {
      if (this.state.waitAction) {
        return t`You need to authorize the operation on your Ledger.`;
      } else {
        return t`Please connect your Ledger device to the computer and open the Hathor app.`;
      }
    }

    const renderTextTitle = () => {
      if (this.state.waitAction) {
        return t`Step 2/2`;
      } else {
        return t`Step 1/2`;
      }
    }

    const renderHardware = () => {
      return (
        <div>
          <p className="mt-5 mb-2 text-center"><strong>{t`Connecting to Ledger`}</strong></p>
          <p className="mt-4 mb-2 text-center"><strong>{renderTextTitle()}</strong></p>
          <p className="mt-4 mb-4">{renderText()}</p>
          <div className="d-flex align-items-center flex-column w-100 mt-5">
            <button onClick={this.props.history.goBack} type="button" className="btn btn-secondary">{t`Back`}</button>
          </div>
        </div>
      )
    }

    const renderBody = () => {
      if (this.state.errorMessage) {
        return renderError();
      } else {
        return renderHardware();
      }
    }

    return (
      <div className="outside-content-wrapper">
        <div className="inside-white-wrapper col-sm-12 col-md-8">
          <div className="inside-div">
            <div className="d-flex align-items-center flex-column">
              <img className="hathor-logo" src={logo} alt="" />
              {renderBody()}
            </div>
          </div>
          <InitialImages />
        </div>
      </div>
    )
  }
}

export default connect(null, mapDispatchToProps)(StartHardwareWallet);
