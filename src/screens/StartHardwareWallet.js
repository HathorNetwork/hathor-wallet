/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect } from 'react';
import { t } from 'ttag'
import { useDispatch } from 'react-redux';
import { useHistory } from 'react-router-dom'

import logo from '../assets/images/hathor-logo.png';
import ledger from '../utils/ledger';
import helpers from '../utils/helpers';
import { IPC_RENDERER, LEDGER_MIN_VERSION, LEDGER_MAX_VERSION } from '../constants';
import { startWalletRequested } from '../actions';
import InitialImages from '../components/InitialImages';
import hathorLib from '@hathor/wallet-lib';
import LOCAL_STORE from '../storage';

// Ledger connection constants for the component
const attemptLimit = 100;
const attemptInterval = 3000;

/**
 * Screen used to select between hardware wallet or software wallet
 *
 * @memberof Screens
 */
function StartHardwareWallet() {
  const history = useHistory();
  const dispatch = useDispatch();

  // Attempt parameters when trying to connect to ledger
  const [attemptNumber, setAttemptNumber] = useState(0);

  /** errorMessage {string} message to show in case of error connecting to ledger */
  const [errorMessage, setErrorMessage] = useState('');
  /** waitAction {boolean} after connecting to ledger we need to wait for user action */
  const [waitAction, setWaitAction] = useState(false);

  /**
   * Handle the response of a get version call to Ledger.
   *
   * @param {IpcRendererEvent} event May be used to reply to the event
   * @param {Object} arg Data returned from the get version call
   */
  const handleVersion = (event, arg) => {
    if (arg.success) {
      // compare ledger version with our min version
      const version = Buffer.from(arg.data).slice(3, 6).join('.');
      LOCAL_STORE.saveLedgerAppVersion(version);
      if (
        helpers.cmpVersionString(version, LEDGER_MIN_VERSION) < 0 ||
        helpers.cmpVersionString(version, LEDGER_MAX_VERSION) >= 0
      ) {
        // unsupported version
        setErrorMessage(t`Unsupported Ledger app version`);
        return;
      }
      // We wait 2 seconds to update the message on the screen
      // so the user don't see the screen updating fast
      setTimeout(() => {
        setWaitAction(true);
        setErrorMessage('');
      }, 2000);
    } else {
      if (attemptNumber < attemptLimit) {
        setTimeout(() => {
          setAttemptNumber(current => current + 1);
          ledger.getVersion();
        }, attemptInterval);
      } else {
        // Error
        setErrorMessage(arg.error.message);
      }
    }
  }

  // Gets the public key data when the user progresses to the second step
  useEffect(() => {
    if (waitAction) {
      ledger.getPublicKeyData();
    }
  }, [waitAction]);

  /**
   * Handle the response of a get public key data call to Ledger.
   *
   * @param {IpcRendererEvent} event May be used to reply to the event
   * @param {Object} arg Data returned from the get public key data call
   */
  const handlePublicKeyData = (event, arg) => {
    if (arg.success) {
      const data = Buffer.from(arg.data);
      const uncompressedPubkey = data.slice(0, 65);
      const compressedPubkey = hathorLib.walletUtils.toPubkeyCompressed(uncompressedPubkey);
      const chainCode = data.slice(65, 97);
      const fingerprint = data.slice(97, 101);
      const xpub = hathorLib.walletUtils.xpubFromData(compressedPubkey, chainCode, fingerprint);

      LOCAL_STORE.setHardwareWallet(true);
      LOCAL_STORE.markBackupDone();
			dispatch(startWalletRequested({
        words: null,
        passphrase: '',
        pin: null,
        password: '',
        xpub,
        hardware: true,
      }));
    } else {
      // Error
      setErrorMessage(arg.error.message);
    }
  }

  // Ledger event listeners and lifecycle management
  useEffect(() => {
    if (IPC_RENDERER) {
      IPC_RENDERER.on("ledger:version", handleVersion);
      IPC_RENDERER.on("ledger:publicKeyData", handlePublicKeyData);
    }
    setAttemptNumber(1);
    ledger.getVersion();

    return () => {
      if (IPC_RENDERER) {
        console.log(`listeners removed`)
        // Remove listeners
        IPC_RENDERER.removeAllListeners('ledger:version');
        IPC_RENDERER.removeAllListeners('ledger:publicKeyData');
      }
    }
  }, [])

  /*
   * Try getting user approval on Ledger again
   */
  const tryAgain = () => {
    // clear error
    setErrorMessage(null);
    setWaitAction(false);
    setAttemptNumber(1);
    ledger.getVersion();
  }

  const renderError = () => {
    return (
      <div className="d-flex align-items-center flex-column">
        <p className="mt-4 mb-4 text-danger">{errorMessage}</p>
        <button onClick={tryAgain} type="button" className="btn btn-hathor">{t`Try again`}</button>
      </div>
    )
  }

  const renderText = () => {
    if (waitAction) {
      return t`You need to authorize the operation on your Ledger.`;
    } else {
      return t`Please connect your Ledger device to the computer and open the Hathor app.`;
    }
  }

  const renderTextTitle = () => {
    if (waitAction) {
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
          <button onClick={history.goBack} type="button" className="btn btn-secondary">{t`Back`}</button>
        </div>
      </div>
    )
  }

  const renderBody = () => {
    if (errorMessage) {
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

export default StartHardwareWallet;
