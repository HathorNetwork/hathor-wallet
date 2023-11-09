/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, {useState, useEffect} from 'react';
import $ from 'jquery';
import ledger, { serializeTokenInfo } from '../utils/ledger';
import tokens from '../utils/tokens';
import { IPC_RENDERER } from '../constants';
import { t } from 'ttag';
import LedgerSignTokenInfo from './LedgerSignTokenInfo';

const LEDGER_ERROR = {
  USER_DENY:                  0x6985,
  WRONG_P1P2:                 0x6a86,
  SW_WRONG_DATA_LENGTH:       0x6a87,
  SW_INS_NOT_SUPPORTED:       0x6d00,
  SW_CLA_NOT_SUPPORTED:       0x6e00,
  SW_WRONG_RESPONSE_LENGTH:   0xb000,
  SW_DISPLAY_BIP32_PATH_FAIL: 0xb001,
  SW_DISPLAY_ADDRESS_FAIL:    0xb002,
  SW_DISPLAY_AMOUNT_FAIL:     0xb003,
  SW_WRONG_TX_LENGTH:         0xb004,
  SW_TX_PARSING_FAIL:         0xb005,
  SW_TX_HASH_FAIL:            0xb006,
  SW_BAD_STATE:               0xb007,
  SW_SIGNATURE_FAIL:          0xb008,
  SW_INVALID_TX:              0xb009,
  SW_INVALID_SIGNATURE:       0xb00a,
}

/**
 * Component that shows a modal to sign a custom token with ledger
 *
 * props: token, modalId, cb
 *
 *   token  : {uid, name, symbol}, token to sign
 *   modalId: string, modal container id so it can be controlled externally
 *   cb     : function, Signal parent that the token was successfuly signed
 *
 * @memberof Components
 */
function ModalLedgerSignToken({token, modalId, cb, onClose}) {
  const [errorMessage, setError] = useState(null);
  const [showOk, setOk] = useState(false);
  const [showSend, canSend] = useState(true);

  const [waitingLedger, setWaitingLedger] = useState(false);


  const closeModal = () => {
    $(`#${modalId}`).modal('hide');
  }

  const initialState = () => {
    setWaitingLedger(false);
    canSend(false);
    setOk(false);
    setError(null);
  }

  const validateTokenData = () => {
    const data = serializeTokenInfo(token, false);

    // Symbol
    // data[2] is symbol length (max of 5, UTF-8 encoded)
    // data[3] is symbol string UTF-8, only allowing ascii printable because of Ledger display limitation
    if (!(data[2][0] <= 5 && data[3].every(b => b < 0x80))) {
      setError('invalid_symbol');
      return false;
    }

    // Name
    // data[2] is name length (max of 30, UTF-8 encoded)
    // data[3] is name string UTF-8, only allowing ascii printable because of Ledger display limitation
    if (!(data[4][0] <= 30 && data[5].every(b => b < 0x80))) {
      setError('invalid_name');
      return false;
    }

    return true;
  }

  // verify token information
  const verifyToken = () => {
    // if the token data is invalid, we don't need to verify the signature
    if (!validateTokenData()) return;

    const signature = tokens.getTokenSignature(token.uid);
    if (signature !== null) {
      // the token has a signature on storage, we need to verify it
      const signedToken = {
        'uid': token.uid,
        'name': token.name,
        'symbol': token.symbol,
        'signature': signature,
      };
      setWaitingLedger(true);
      ledger.verifyTokenSignature(signedToken);
    } else {
      canSend(true);
    }
  }

  /**
   * Method called when user clicks the button to send the token to Ledger
   *
   */
  const handleSend = () => {
    canSend(false);
    setOk(false);
    setError(null);
    // send token data to ledger
    setWaitingLedger(true);
    ledger.signToken(token);
  }

  /**
   * Handle the response of a sign token call to Ledger.
   * The response is the signature received from Ledger.
   *
   *
   * @param {IpcRendererEvent} event May be used to reply to the event
   * @param {Object} arg Data returned from the send token data call
   */
  const handleSignature = (event, arg) => {
    setWaitingLedger(false);
    if (arg.success) {
      // save token signature on storage
      const hexSignature = Buffer.from(arg.data).toString('hex');
      tokens.addTokenSignature(token.uid, hexSignature);
      setOk(true);
      // Signal parent that the token signature has been added
      cb(true);
    } else {
      switch (arg.error.status) {
        // user deny
        case LEDGER_ERROR.USER_DENY:
          setError('user_deny');
          break;
        case LEDGER_ERROR.SW_INVALID_SIGNATURE:
          setError('invalid_token');
          break;
        default:
          setError('unknown_error');
      }
    }
  }

  /**
   * Handle the response of a verify token data call to Ledger.
   * If the signature we already have on storage is valid, we don't have to sign again
   *
   * @param {IpcRendererEvent} event May be used to reply to the event
   * @param {Object} arg Data returned from the send token data call
   */
  const handleVerify = (event, arg) => {
    setWaitingLedger(false);
    if (arg.success) {
      setOk(true);
    } else {
      // Invalid signature, we should start the signing process
      canSend(true);
    }
  }

  /**
   * Effects
   */

  // token change -> go to begin and verify it
  useEffect(() => {
    $(`#${modalId}`).modal('show');

    $(`#${modalId}`).on('hidden.bs.modal', (e) => {
      // clean state when closing
      initialState();
      // remove ledger listeners when closing
      if (IPC_RENDERER) {
        IPC_RENDERER.removeAllListeners("ledger:tokenSignature");
        IPC_RENDERER.removeAllListeners("ledger:tokenSignatureValid");
      }

      onClose();
    });

    $(`#${modalId}`).on('shown.bs.modal', (e) => {
      // ledger listeners
      if (IPC_RENDERER) {
        IPC_RENDERER.on("ledger:tokenSignature", handleSignature);
        IPC_RENDERER.on("ledger:tokenSignatureValid", handleVerify);
      }
      // verify token information when opening modal
      verifyToken();
    });

    $(`#${modalId}`).modal('hide');

    return () => {
      $(`#${modalId}`).modal('hide');

      // remove ledger listeners when closing
      if (IPC_RENDERER) {
        IPC_RENDERER.removeAllListeners("ledger:tokenSignature");
        IPC_RENDERER.removeAllListeners("ledger:tokenSignatureValid");
      }
      $(`#${modalId}`).off();
    };
  }, []);

  /**
   * Render
   */

  const renderOkMessage = () => {
    return (
      <div>
        <label>{t`Token was signed!`}</label>
      </div>
    );
  }

  const renderSendButton = () => {
    return (
      <button type="button" className="btn btn-hathor" onClick={handleSend}>{t`Sign token`}</button>
    );
  }

  const renderFooter = () => {
    // When waitingLedger is true, showSend is always false
    if (waitingLedger) return (
      <div className="modal-footer">
        <p>{t`Waiting for Ledger...`}</p>
      </div>
    );

    return (
      <div className="modal-footer">
        {showSend && renderSendButton()}
        <button onClick={closeModal} type="button" className="btn btn-secondary">{t`Close`}</button>
      </div>
    );
  }

  const renderErrorMessage = () => {
    let error = '';
    switch (errorMessage) {
      case 'signature_fail':
        error = t`Signature failed on Ledger`;
        break;
      case 'user_deny':
        error = t`User denied token on Ledger`;
        break;
      case 'invalid_token':
        error = t`Ledger denied token`;
        break;
      case 'invalid_symbol':
        error = t`Invalid token symbol`;
        break;
      case 'invalid_name':
        error = t`Invalid token name`;
        break;
    }
    return (
      <div>
        <label>{t`Error signing token!`}</label><br/>
        <label>{error}</label>
      </div>
    );
  }

  // If there is no token, there is nothing to show/hide
  if (!token) return null;

  return (
      <div className="modal fade" id={modalId} tabIndex="-1" role="dialog" aria-labelledby={modalId} aria-hidden="true" data-backdrop="static" data-keyboard="false">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-body">
              {((!showOk) && (errorMessage === null)) && <LedgerSignTokenInfo token={token} />}
              {(showOk && (errorMessage === null)) && renderOkMessage()}
              {errorMessage !== null && renderErrorMessage()}
            </div>
            {renderFooter()}
          </div>
        </div>
      </div>
    );
}

export default ModalLedgerSignToken;
