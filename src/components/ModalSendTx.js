/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { connect } from "react-redux";
import $ from 'jquery';
import PropTypes from "prop-types";
import SendTxHandler from '../components/SendTxHandler';
import ReactLoading from 'react-loading';
import colors from '../index.scss';


const mapStateToProps = (state) => {
  return {
    wallet: state.wallet,
    useWalletService: state.useWalletService,
  };
};

/**
 * Component that shows a modal with a form to ask for the user PIN
 * and when the PIN succeeds, it sends a transaction
 *
 * @memberof Components
 */
class ModalSendTx extends React.Component {
  /**
   * errorMessage {string} Message to be shown to the user in case of error in the form
   * loading {Boolean} If it's executing a sending tx request
   */
  state = {
    errorMessage: '',
    loading: false,
  }

  // SendTransaction object to handle send events
  sendTransaction = null;

  // Tx send data, if succeeded
  tx = null;

  // Error message when sending
  sendErrorMessage = '';

  componentDidMount = () => {
    $('#sendTxModal').modal('show');
    $('#sendTxModal').on('hidden.bs.modal', (e) => {
      this.props.onClose();
      if (this.tx && this.props.onSendSuccess) {
        // If succeeded to send tx and has method to execute
        this.props.onSendSuccess(this.tx);
        return;
      }

      if (this.sendErrorMessage && this.props.onSendError) {
        // If had an error sending and have an error method
        this.props.onSendError(this.sendErrorMessage);
      }
    });

    // Start the promise and ignore its results
    this.processTxWithPin(this.props.pin);
  }

  componentWillUnmount = () => {
    // Removing all event listeners
    $('#sendTxModal').off();
    $('#sendTxModal').modal('hide');
  }

  /**
   * Method called after user clicks the 'Go' button. We validate the form and that the pin is correct, then call a method from props
   *
   * @param {string} pin Pin received from the user
   */
  processTxWithPin = async (pin) => {
    // If we are using the wallet service facade, we should avail of the validated PIN
    // to renew the auth token.
    if (this.props.useWalletService) {
      await this.props.wallet.validateAndRenewAuthToken(pin);
    }

    this.sendTransaction = await this.props.prepareSendTransaction(pin);
    if (this.sendTransaction) {
      // Show send tx handler component and start sending
      this.setState({ loading: true });
    } else {
      // Close modal and show error
      $('#sendTxModal').modal('hide');
    }
  }

  /**
   * Executed when used clicked ok after tx is sent (or an error happened)
   */
  onClickOk = () => {
    $('#sendTxModal').modal('hide');
  }

  /**
   * Executed when tx was sent with success
   *
   * @param {Object} tx Transaction data
   */
  onSendSuccess = (tx) => {
    this.tx = tx;
    this.setState({ loading: false });
  }

  /**
   * Executed when there is an error while sending the tx
   *
   * @param {String} message Error message
   */
  onSendError = (message) => {
    this.sendErrorMessage = message;
    this.setState({ loading: false });
  }

  render() {
    return (
      <div>
        <div className="modal fade"
             id="sendTxModal"
             tabIndex="-1"
             role="dialog"
             aria-labelledby="sendTxModal"
             aria-hidden="true"
             data-backdrop="static"
             data-keyboard="false"
        >
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="exampleModalLabel">{this.props.title}</h5>
              </div>
              <div className="modal-body modal-body-pin">
                { this.sendTransaction &&
                <SendTxHandler
                    sendTransaction={this.sendTransaction}
                    onSendSuccess={this.onSendSuccess}
                    onSendError={this.onSendError}
                />
                }
              </div>
              <div className="modal-footer">
                {<div className="d-flex flex-row align-items-center">
                  {this.state.loading &&  <ReactLoading
                      type='spin'
                      color={colors.purpleHathor}
                      width={24} height={24} delay={200}/>}
                  <button type="button" className="btn btn-hathor ml-3" onClick={this.onClickOk}
                          disabled={this.state.loading}>{t`Ok`}</button>
                </div>}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

ModalSendTx.propTypes = {
  /**
   * User PIN already validated
   */
  pin: PropTypes.string.isRequired,
  /**
   * Title of the modal to be shown
   */
  title: PropTypes.string.isRequired,
  /**
   * A function that should prepare data before sending tx to be mined,
   * receiving the PIN as a parameter
   * @param {string} pin
   */
  prepareSendTransaction: PropTypes.func.isRequired,
  /**
   * Callback invoked when tx is sent with success
   */
  onSendSuccess: PropTypes.func.isRequired,
  /**
   * Callback invoked when there is an error sending the tx (Recommended)
   */
  onSendError: PropTypes.func,
  /**
   * Callback provided by the GlobalModal helper to manage the modal lifecycle
   */
  onClose: PropTypes.func.isRequired,
}

export default connect(mapStateToProps)(ModalSendTx);
