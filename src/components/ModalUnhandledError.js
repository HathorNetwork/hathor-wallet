/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import wallet from '../utils/wallet';
import { CopyToClipboard } from 'react-copy-to-clipboard';

/**
 * Component that shows a modal when an unhandled error happens  
 * Shows a message to the user with a button for him to copy the error or reset the wallet
 *
 * @memberof Components
 */
class ModalUnhandledError extends React.Component {
  /**
   * successMessage {string} Message to be shown to the user in the modal
   */
  state = { successMessage: '' };

  /**
   * Called when user clicks the button to reset the wallet, then reset data and go to Welcome screen
   *
   * @param {Object} e Event emitted on button click
   */
  handleConfirm = (e) => {
    e.preventDefault();
    wallet.resetWalletData();
    this.props.history.push('/welcome/');
  }

  /**
   * Called when user clicks the button to go to home ('/'), then reset error data and redirects page
   */
  handleGoToHome = () => {
    this.props.resetError();
    this.props.history.push('/');
  }

  /**
   * Called when user clicks to send the error to Sentry, so we allow Sentry, send the error, and then disallow again
   */
  onSendErrorToSentry = () => {
    wallet.allowSentry();
    wallet.sentryWithScope(this.props.error, this.props.info);
    wallet.disallowSentry();
    this.setState({ successMessage: 'Report sent to Hathor Team! Thanks for the support!' });
    // Hiding message after some time
    setTimeout(() => {
      this.setState({ successMessage: '' });
    }, 4000);
  }

  render() {
    const { message = null, stack = null } = this.props.error || {}
    const { renderError } = this.props
    const readableError = `Error Message: ${message}\nStack trace: ${stack}`
    return (
      <div className="modal fade" id="unhandledErrorModal" tabIndex="-1" role="dialog" aria-labelledby="unhandledErrorModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="errorModalLabel">Ooops... Something went wrong...</h5>
            </div>
            <div className="modal-body">
              <p>An unhandled exception occurred in your wallet.</p>
              <p>If you'd like to help us improve it, please click in the button bellow to copy the error details to your clipboard.</p>
              <div className="d-flex flex-row justify-content-between">
                <div className="copy-error">
                  <CopyToClipboard text={readableError}>
                    <button className="btn send-tokens btn-hathor">Copy Error</button>
                  </CopyToClipboard>
                </div>
                {!wallet.isSentryAllowed() && <div><button className="btn send-tokens btn-hathor" onClick={this.onSendErrorToSentry}>Send error report to help the developers</button></div>}
              </div>
              <p>Send it to us with all relevant information about the issues you are experiencing.</p>
              <p>If you are facing recurrent issues, resetting your wallet may solve your problem. Please, double-check your backup before doing it.</p>
            </div>
            <div className="modal-footer">
              <div className="d-flex flex-row align-items-center justify-content-between w-100">
                <span className="text-success">{this.state.successMessage}</span>
                <div>
                  {renderError
                    ? <button onClick={this.handleGoToHome} type="button" className="btn btn-secondary mr-2" data-dismiss="modal">Home</button>
                    : <button onClick={this.copyError} type="button" className="btn btn-secondary mr-2" data-dismiss="modal">Dismiss</button>}
                  <button onClick={this.handleConfirm} type="button" className="btn btn-hathor" data-dismiss="modal">Reset wallet</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ModalUnhandledError;
