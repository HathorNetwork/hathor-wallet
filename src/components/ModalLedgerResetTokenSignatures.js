/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, {useState, useEffect} from 'react';
import $ from 'jquery';
import ledger from '../utils/ledger';
import tokens from '../utils/tokens';
import { IPC_RENDERER } from '../constants';
import { t } from 'ttag';

/**
 * Component shows a modal to reset all token signatures and handle interaction with ledger
 *
 * @memberof Components
 */
function ModalLedgerResetTokenSignatures() {
  const modalId = "resetTokenSignatures";
  const [waitingLedger, setWaitingLedger] = useState(false);
  const [showOk, setOk] = useState(false);
  const [errorMessage, setError] = useState(null);

  const closeModal = () => {
    $(`#${modalId}`).modal('hide');
  }

  const initialState = () => {
    setWaitingLedger(false);
    setError(null);
    setOk(false);
  }

  /**
   * Method called when user clicks the button to reset token signatures
   *
   */
  const handleSend = () => {
    setError(null);
    // send command to ledger
    setWaitingLedger(true);
    ledger.resetTokenSignatures();
  }

  /**
   * Handle the response of a reset token signatures call to Ledger.
   *
   * close the modal on success, show error on failure
   *
   * @param {IpcRendererEvent} event May be used to reply to the event
   * @param {Object} arg Data returned from the reset token signatures call
   */
  const handleSignatureReset = (event, arg) => {
    setWaitingLedger(false);
    if (arg.success) {
      // clean signatures and close on ok
      tokens.resetTokenSignatures();
      // Show ok message
      setOk(true);
    } else {
      switch (arg.error.status) {
        // user deny
        case 0x6985:
          setError('user_deny');
          break;
        default:
          setError('unknown_error');
      }
    }
  }

  /**
   * Effects
   */

  // useEffect second parameter [] ensures this runs only once
  useEffect(() => {
    $(`#${modalId}`).on('hidden.bs.modal', (e) => {
      // clean state when closing
      initialState();
      // remove ledger listeners when closing
      if (IPC_RENDERER) {
        IPC_RENDERER.removeAllListeners("ledger:tokenSignatureReset");
      }
    });

    $(`#${modalId}`).on('shown.bs.modal', (e) => {
      // ledger listeners
      if (IPC_RENDERER) {
        IPC_RENDERER.on("ledger:tokenSignatureReset", handleSignatureReset);
      }
    });

    return () => {
      // remove all listeners on unmount
      $(`#${modalId}`).off();
    }
  }, []);

  /**
   * Render
   */

  const renderFooter = () => {
    // Don't render the footer separator if there is no footer
    if (waitingLedger) return (
      <div className="modal-footer">
        <p>{t`Waiting for Ledger...`}</p>
      </div>
    );

    return (
      <div className="modal-footer">
        {!showOk && <button type="button" className="btn btn-hathor" onClick={handleSend}>{ errorMessage === null ? t`Start` : t`Try again` }</button>}
        <button onClick={closeModal} type="button" className="btn btn-secondary">{t`Close`}</button>
      </div>
    );
  }

  const renderMessage = () => {
    // If there is error, don't show message
    if (errorMessage !== null) return null;
    if (showOk) return <label>{t`Custom tokens on Ledger were reset!`}</label>
    return (
      <div className="flex align-items-center">
        <div className='d-flex flex-column align-items-start justify-content-between token-detail-top'>
          <div className='d-flex flex-column justify-content-between mr-3'>
            <p className="mt-2 mb-2">
              {t`This will only remove the verification that Ledger trusts all tokens from you wallet but it won't have any effect in your balance or history. You can only execute this action for all tokens, so if you decide to use any token after that you will need to verify it again with Ledger.`}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const renderErrorMessage = () => {
    // Only show error if there is error to show
    if (errorMessage === null) return null;

    let error = '';
    switch (errorMessage) {
      case 'user_deny':
        error = t`User denied on Ledger`;
        break;
      default:
        error = t`Unkown error`;
    }
    return (
      <div>
        <label>{error}</label>
      </div>
    );
  }

  return (
      <div className="modal fade" id={modalId} tabIndex="-1" role="dialog" aria-labelledby={modalId} aria-hidden="true" data-backdrop="static" data-keyboard="false">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title">{t`Reset token signatures`}</h5>
            </div>
            <div className="modal-body">
              {renderMessage()}
              {renderErrorMessage()}
            </div>
            {renderFooter()}
          </div>
        </div>
      </div>
    );
}

export default ModalLedgerResetTokenSignatures;
