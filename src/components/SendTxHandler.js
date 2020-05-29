/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import hathorLib from '@hathor/wallet-lib';
import { LedgerError } from '../utils/ledger';
import { MIN_JOB_ESTIMATION, MIN_POLL, IPC_RENDERER } from '../constants';


/**
 *
 * @memberof Components
 */
class SendTxHandler extends React.Component {
  // Loading message to be shown while server does not return a response
  powMessage = t`Resolving proof of work of your transaction.`

  // Loading message to be shown after return from the server
  propagatingMessage = t`Propagating transaction to the network.`

  // Success message to be show after tx is sent
  successMessage = t`Your transaction was sent successfully!`

  /**
   * errorMessage {string} Message to be shown to the user in case of error in the form
   */
  state = {
    miningEstimation: null,
    jobID: null,
    loadingMessage: this.powMessage,
  }

  componentDidMount = () => {
    this.addSendTxEventHandlers();
    this.props.sendTransaction.start();
  }

  addSendTxEventHandlers = () => {
    this.props.sendTransaction.on('job-submitted', this.updateEstimation);
    this.props.sendTransaction.on('estimation-updated', this.updateEstimation);
    this.props.sendTransaction.on('job-done', this.jobDone);
    this.props.sendTransaction.on('send-success', this.sendSuccess);
    this.props.sendTransaction.on('send-error', this.sendError);
  }

  sendSuccess = (tx) => {
    this.setState({ loadingMessage: this.successMessage });
    if (this.props.onSendSuccess) {
      this.props.onSendSuccess(tx);
    }
  }

  sendError = (message) => {
    this.setState({ errorMessage: `Error: ${message}`});
    if (this.props.onSendError) {
      this.props.onSendError(message);
    }
  }

  jobDone = (data) => {
    this.setState({ miningEstimation: null, loadingMessage: this.propagatingMessage });
  }

  updateEstimation = (data) => {
    this.setState({ miningEstimation: data.estimation });
  }

  render() {
    const renderMiningEstimation = () => {
      const estimation = Math.max(Math.ceil(this.state.miningEstimation), MIN_JOB_ESTIMATION);
      return t`Estimated time: ${estimation}s`;
    }

    const renderBody = () => {
      if (this.state.errorMessage) {
        return (
          <p className="text-danger mt-3 white-space-pre-wrap">{this.state.errorMessage}</p>
        )
      } else {
        return (
          <div className="d-flex flex-column">
            <p>{this.state.loadingMessage}</p>
            <p>{this.state.miningEstimation && renderMiningEstimation()}</p>
          </div>
        );
      }
    }

    return renderBody();
  }
}

export default SendTxHandler;
