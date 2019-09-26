/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import ReactLoading from 'react-loading';
import TxData from '../components/TxData';
import BackButton from '../components/BackButton';
import hathorLib from '@hathor/wallet-lib';


/**
 * Shows the detail of a transaction or block
 *
 * @memberof Screens
 */
class TransactionDetail extends React.Component {
  constructor(props) {
    super(props);

    /**
     * transaction {Object} Loaded transaction
     * loaded {boolean} If had success loading transaction from the server
     * success {boolean} If a transaction was returned from the server or an error ocurred
     * meta {Object} Metadata of loaded transaction received from the server
     * spentOutputs {Object} Spent outputs of loaded transaction received from the server
     * confirmationData {Object} Confirmation data of loaded transaction received from the server
     */
    this.state = {
      transaction: null,
      meta: null,
      spentOutputs: null,
      loaded: false,
      success: null,
      confirmationData: null,
    }
  }

  componentDidMount() {
    this.getTx();
  }

  /**
   * Get accumulated weight and confirmation level of the transaction
   */
  getConfirmationData = () => {
    hathorLib.txApi.getConfirmationData(this.props.match.params.id, (data) => {
      this.setState({ confirmationData: data });
    }, (e) => {
      // Error in request
      console.log(e);
    });
  }

  /**
   * Update state after receiving the transaction response back from the server
   */
  txReceived(data) {
    if (data.success) {
      this.setState({ transaction: data.tx, meta: data.meta, spentOutputs: data.spent_outputs, loaded: true, success: true });
    } else {
      this.setState({ loaded: true, success: false, transaction: null });
    }
  }

  /**
   * Get transaction in the server when mounting the page
   */
  getTx() {
    hathorLib.txApi.getTransaction(this.props.match.params.id, (data) => {
      this.txReceived(data);
      if (data.success && !hathorLib.helpers.isBlock(data.tx)) {
        this.getConfirmationData();
      }
    }, (e) => {
      // Error in request
      console.log(e);
    });
  }

  /**
   * When transaction changed in the page we need to load the new one and the new confirmation data
   */
  componentDidUpdate(prevProps, prevState, snapshot) {
    if (this.props.match.params.id !== prevProps.match.params.id) {
      this.getTx();
    }
  }

  render() {
    const renderTx = () => {
      return (
        <div>
          <BackButton {...this.props} />
          {this.state.transaction ? <TxData transaction={this.state.transaction} confirmationData={this.state.confirmationData} spentOutputs={this.state.spentOutputs} meta={this.state.meta} showRaw={true} showConflicts={true} showGraphs={true} /> : <p className="text-danger">Transaction with hash {this.props.match.params.id} not found</p>}
        </div>
      );
    }

    return (
      <div className="flex align-items-center content-wrapper">
        {!this.state.loaded ? <ReactLoading type='spin' color='#0081af' delay={500} /> : renderTx()}
      </div>
    );
  }
}

export default TransactionDetail;
