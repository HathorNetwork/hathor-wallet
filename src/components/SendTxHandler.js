/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import {
  SendTransactionWalletService,
  SendTransaction,
  ErrorMessages as errorMessagesEnum,
} from '@hathor/wallet-lib';
import PropTypes from 'prop-types';


/**
 * Component responsible for managing the tx mining and propagation
 *
 * @memberof Components
 */
export class SendTxHandler extends React.Component {
  // Loading message to be shown while server does not return a response
  powMessage = t`Resolving proof of work of your transaction.`

  // Loading message to be shown after return from the server
  propagatingMessage = t`Propagating transaction to the network.`

  // Success message to be show after tx is sent
  successMessage = t`Your transaction was sent successfully!`

  /**
   * miningEstimation {Number} Estimated seconds to complete the job
   * jobID {String} Mining job ID
   * loadingMessage {string} Message to be shown to the user while executing the requests
   */
  state = {
    miningEstimation: null,
    jobID: null,
    loadingMessage: this.powMessage,
  }

  componentDidMount = () => {
    // Start listening for events
    this.addSendTxEventHandlers();
    // Promise of the sendTransaction object that resolves when the tx is sent
    let sendPromise;
    // Start sendTransaction object (submit job)
    if (this.props.sendTransaction.transaction) {
      // Token action transactions already have the full tx prepared
      // just need to mine and propagate
      sendPromise = this.props.sendTransaction.runFromMining();
    } else {
      sendPromise = this.props.sendTransaction.run();
    }
    sendPromise.then((tx) => {
      this.sendSuccess(tx);
    }, (err) => {
      this.sendError(err.message);
    });
  }

  /**
   * Create event listeners for all sendTransaction events
   */
  addSendTxEventHandlers = () => {
    this.props.sendTransaction.on('job-submitted', this.updateEstimation);
    this.props.sendTransaction.on('estimation-updated', this.updateEstimation);
    this.props.sendTransaction.on('job-done', this.jobDone);
    this.props.sendTransaction.on('send-error', this.sendError);
  }

  /**
   * Method executed after the tx send succeeds
   *
   * @param {Object} tx Transaction data
   */
  sendSuccess = (tx) => {
    this.setState({ loadingMessage: this.successMessage });
    if (this.props.onSendSuccess) {
      this.props.onSendSuccess(tx);
    }
  }

  /**
   * Method executed after the tx send fails
   *
   * @param {String} message Error message
   */
  sendError = (message) => {
    const errorMap = {
      [errorMessagesEnum.ErrorMessages.UNEXPECTED_PUSH_TX_ERROR]: t`There was an unexpected error when pushing the transaction to the network.`,
      [errorMessagesEnum.ErrorMessages.NO_UTXOS_AVAILABLE]: t`There are no utxos available to fill the transaction.`,
      [errorMessagesEnum.ErrorMessages.INVALID_INPUT]: t`The selected inputs are invalid.`,
    }

    const errorMessage = message in errorMap ? errorMap[message] : message;
    this.setState({ errorMessage: `Error: ${errorMessage}`});
    if (this.props.onSendError) {
      this.props.onSendError(message);
    }
  }

  /**
   * Method executed after the mining job is done
   *
   * @param {Object} data Object with jobID
   */
  jobDone = (data) => {
    this.setState({ miningEstimation: null, loadingMessage: this.propagatingMessage });
  }

  /**
   * Method executed when the estimation-updated event is received
   * Update the state with the new estimation
   *
   * @param {Object} data Object with jobID and estimation
   */
  updateEstimation = (data) => {
    this.setState({ miningEstimation: data.estimation });
  }

  render() {
    const renderBody = () => {
      if (this.state.errorMessage) {
        return (
          <p className="text-danger mt-3 white-space-pre-wrap">{this.state.errorMessage}</p>
        )
      } else {
        return (
          <div className="d-flex flex-column">
            <p>{this.state.loadingMessage}</p>
          </div>
        );
      }
    }

    return renderBody();
  }
}

/*
 * sendTransaction: lib object that handles the mining/propagation requests and emit events
 * onSendSuccess: optional method to be executed when the tx is mined and propagated with success
 * onSendError: optional method to be executed when an error happens while sending the tx
 */
SendTxHandler.propTypes = {
  sendTransaction: PropTypes.oneOfType([
    PropTypes.instanceOf(SendTransaction),
    PropTypes.instanceOf(SendTransactionWalletService),
  ]).isRequired,
  onSendSuccess: PropTypes.func,
  onSendError: PropTypes.func,
};

export default SendTxHandler;
