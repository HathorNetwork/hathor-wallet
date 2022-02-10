/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'

import logo from '../assets/images/hathor-logo.png';
import wallet from '../utils/wallet';
import ledger from '../utils/ledger';
import version from '../utils/version';
import helpers from '../utils/helpers';
import { LEDGER_GUIDE_URL, IPC_RENDERER, HATHOR_WEBSITE_URL, LEDGER_MIN_VERSION, LEDGER_MAX_VERSION } from '../constants';
import SpanFmt from '../components/SpanFmt';
import InitialImages from '../components/InitialImages';
import { str2jsx } from '../utils/i18n';
import hathorLib from '@hathor/wallet-lib';


/**
 * Screen used to select between hardware wallet or software wallet
 *
 * @memberof Screens
 */
class WalletType extends React.Component {
  // Attempt parameters when trying to connect to ledger
  // attemptNumber: current attempt
  // attemptLimit: maximum number of attempts
  // attemptInterval: wait interval between attempts
  attemptNumber = 0
  attemptLimit = 100
  attemptInterval = 3000

  /**
   * errorMessage {string} message to show in case of error connecting to ledger
   * hardware {boolean} if hardware wallet was chosen
   * waitAction {boolean} after connecting to ledger we need to wait for user action
   */
  state = {
    errorMessage: '',
    hardware: false,
    waitAction: false,
  }

  componentDidMount() {
    // Update Sentry when user started wallet now
    wallet.updateSentryState();

    if (IPC_RENDERER) {
      IPC_RENDERER.on("ledger:version", this.handleVersion);
      IPC_RENDERER.on("ledger:publicKeyData", this.handlePublicKeyData);
    }
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
      const version = arg.data.slice(3, 6).join('.');
      hathorLib.storage.setItem('ledger:version', version);
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
      if (!this.state.hardware) {
        // User clicked 'Back' button
        this.attemptNumber = 0;
        return;
      }

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
    if (!this.state.hardware) {
      // User clicked 'Back' button
      return;
    }

    if (arg.success) {
      const data = arg.data;
      const uncompressedPubkey = data.slice(0, 65);
      const compressedPubkey = hathorLib.wallet.toPubkeyCompressed(uncompressedPubkey);
      const chainCode = Buffer.from(data.slice(65, 97));
      const fingerprint = Buffer.from(data.slice(97, 101));
      const xpub = hathorLib.wallet.xpubFromData(compressedPubkey, chainCode, fingerprint);

      wallet.startWallet(null, '', null, '', this.props.history, false, xpub);
      hathorLib.wallet.markBackupAsDone();

      const tokenSignatures = hathorLib.storage.getItem('wallet:token:signatures');
      if (tokenSignatures) {
        const dataToken = hathorLib.tokens.getTokens();
        const tokensToVerify = dataToken
          .filter(t => tokenSignatures[t.uid] != undefined)
          .map(t => {
            const signature = tokenSignatures[t.uid];
            return {
              uid: t.uid,
              name: t.name,
              symbol: t.symbol,
              signature: signature,
            };
          });

        if (version.isLedgerCustomTokenAllowed() && tokensToVerify.length !== 0) {
          ledger.verifyManyTokenSignatures(tokensToVerify);
        }
      }

      this.props.history.push('/wallet/');
    } else {
      // Error
      this.setState({ errorMessage: arg.error.message });
    }
  }

  /**
   * Go to software wallet warning screen
   */
  goToSoftwareWallet = () => {
    hathorLib.wallet.setWalletType('software');
    this.props.history.push('/software_warning/');
  }

  /**
   * Go to the hardware wallet screen
   */
  goToHardwareWallet = () => {
    hathorLib.wallet.setWalletType('hardware');
    this.setState({ hardware: true }, () => {
      this.attemptNumber = 1;
      ledger.getVersion();
    });
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
    const renderInitial  = () => {
      return (
        <div>
          <p className="mt-4 mb-4">{t`Hathor Wallet supports two types of wallet: software and hardware.`}</p>
          <p className="mt-4 mb-4">
            {str2jsx(t`|bold:Hardware wallets| are dedicated external devices that store your private information. We currently support the Ledger hardware wallet and the ledger app must be installed in developer mode for now. For a tutorial about how to use the ledger app with Hathor Wallet check out |fn:this page|.`,
              {
                bold: (x, i) => <strong key={i}>{x}</strong>,
                fn: (x, i) => <a key={i} onClick={this.openLedgerGuide} href="true">{x}</a>
              }
            )}
          </p>
          <p className="mt-4 mb-4"><SpanFmt>{t`**Software wallets**, on the other hand, store the information on your computer.`}</SpanFmt></p>
          <div className="d-flex align-items-center flex-row justify-content-between w-100 mt-4">
            <button onClick={this.goToHardwareWallet} type="button" className="btn btn-hathor mr-3">{t`Hardware wallet`}</button>
            <button onClick={this.goToSoftwareWallet} type="button" className="btn btn-hathor">{t`Software wallet`}</button>
          </div>
        </div>
      );
    }

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
            <button onClick={() => this.setState({ hardware: false, waitAction: false })} type="button" className="btn btn-secondary">Back</button>
          </div>
        </div>
      )
    }

    const renderBody = () => {
      if (this.state.errorMessage) {
        return renderError();
      } else if (this.state.hardware) {
        return renderHardware();
      } else {
        return renderInitial();
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

export default WalletType;
