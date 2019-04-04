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
   * Called when user clicks the button to reset the wallet, then reset data and go to Welcome screen
   *
   * @param {Object} e Event emitted on button click
   */
  handleConfirm = (e) => {
    e.preventDefault();
    wallet.resetAllData();
    this.props.history.push('/welcome/');
  }

  /**
   * Called when user clicks the button to go to home ('/'), then reset error data and redirects page
   */
  handleGoToHome = () => {
    this.props.resetError();
    this.props.history.push('/');
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
              <div className="copy-error">
                <CopyToClipboard text={readableError}>
                  <button className="btn send-tokens btn-hathor">Copy Error</button>
                </CopyToClipboard>
              </div>
              <p>Send it to us with all relevant information about the issues you are experiencing.</p>
              <p>If you are facing recurrent issues, resetting your wallet may solve your problem. Please, double-check your backup before doing it.</p>
            </div>
            <div className="modal-footer">
              {renderError
                ? <button onClick={this.handleGoToHome} type="button" className="btn btn-secondary" data-dismiss="modal">Home</button>
                : <button onClick={this.copyError} type="button" className="btn btn-secondary" data-dismiss="modal">Dismiss</button>}
              <button onClick={this.handleConfirm} type="button" className="btn btn-hathor" data-dismiss="modal">Reset wallet</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ModalUnhandledError;
