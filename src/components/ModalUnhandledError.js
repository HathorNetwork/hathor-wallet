/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState } from 'react';
import { t } from 'ttag';
import walletUtils from '../utils/wallet';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { walletReset } from '../actions';
import { useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const UNHANDLED_ERROR_MODAL_ID = 'unhandledErrorModal';
export const UNHANDLED_ERROR_MODAL_ID_SELECTOR = `#${UNHANDLED_ERROR_MODAL_ID}`;

/**
 * Component that shows a modal when an unhandled error happens
 * Shows a message to the user with a button for him to copy the error or reset the wallet
 *
 * @memberof Components
 */
function ModalUnhandledError({ resetError, error, renderError, info }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  /**
   * successMessage {string} Message to be shown to the user in the modal
   */
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Called when user clicks the button to reset the wallet, then reset data and go to Welcome screen
   *
   * @param {Object} e Event emitted on button click
   */
  const handleConfirm = (e) => {
    e.preventDefault();
    dispatch(walletReset());
    // TODO: This should reset the navigation history instead of just navigating
    // @see: https://github.com/HathorNetwork/hathor-wallet-mobile/blob/53bb86ca5b2b8162cae6cd71b381c68d3474c000/src/NavigationService.js#L33-L45
    navigate('/welcome/');
  }

  /**
   * Called when user clicks the button to go to home ('/'), then reset error data and redirects page
   */
  const handleGoToHome = () => {
    resetError();
    navigate('/');
  }

  /**
   * Called when user clicks to send the error to Sentry, so we allow Sentry, send the error, and then disallow again
   */
  const onSendErrorToSentry = () => {
    walletUtils.allowSentry();
    walletUtils.sentryWithScope(error, info);
    walletUtils.disallowSentry();
    setSuccessMessage(t`Report sent to Hathor Team! Thanks for the support!`);

    // Hiding message after some time
    setTimeout(() => {
      setSuccessMessage('');
    }, 4000);
  }

  const { message = null, stack = null } = error || {}
  const readableError = t`Error Message: ${message}\nStack trace: ${stack}`
  return (
    <div className="modal fade" id={UNHANDLED_ERROR_MODAL_ID} tabIndex="-1" role="dialog" aria-labelledby="unhandledErrorModal" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="errorModalLabel">{t`Ooops... Something went wrong...`}</h5>
          </div>
          <div className="modal-body">
            <p>{t`An unhandled exception occurred in your wallet.`}</p>
            <p>{t`If you'd like to help us improve it, please click in the button bellow to copy the error details to your clipboard.`}</p>
            <div className="d-flex flex-row justify-content-between">
              <div className="copy-error">
                <CopyToClipboard text={readableError}>
                  <button className="btn send-tokens btn-hathor">{t`Copy Error`}</button>
                </CopyToClipboard>
              </div>
              {!walletUtils.isSentryAllowed() && <div><button className="btn send-tokens btn-hathor" onClick={onSendErrorToSentry}>{t`Send error report to help the developers`}</button></div>}
            </div>
            <p>{t`Send it to us with all relevant information about the issues you are experiencing.`}</p>
            <p>{t`If you are facing recurrent issues, resetting your wallet may solve your problem. Please, double-check your backup before doing it.`}</p>
          </div>
          <div className="modal-footer">
            <div className="d-flex flex-row align-items-center justify-content-between w-100">
              <span className="text-success">{successMessage}</span>
              <div>
                {renderError
                  ? <button onClick={handleGoToHome} type="button" className="btn btn-secondary mr-2" data-dismiss="modal">{t`Home`}</button>
                  : <button type="button" className="btn btn-secondary mr-2" data-dismiss="modal">{t`Dismiss`}</button>}
                <button onClick={handleConfirm} type="button" className="btn btn-hathor" data-dismiss="modal">{t`Reset wallet`}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalUnhandledError;
