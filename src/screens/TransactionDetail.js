/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import ReactLoading from 'react-loading';
import { t } from 'ttag';
import TxData from '../components/TxData';
import BackButton from '../components/BackButton';
import hathorLib from '@hathor/wallet-lib';
import colors from '../index.scss';
import helpers from '../utils/helpers';
import path from 'path';

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

  /**
   * Method called when user clicked on 'See on explorer' link
   *
   * @param {Object} e Event for the click
   */
  goToExplorer = (e) => {
    e.preventDefault();
    const url = path.join(helpers.getExplorerURL(), `transaction/${this.state.transaction.hash}`);
    helpers.openExternalURL(url);
  }

  render() {
    const renderTx = () => {
      return (
        <div>
          {renderLinks()}
          {this.state.transaction ? <TxData key={this.state.transaction.hash} transaction={this.state.transaction} confirmationData={this.state.confirmationData} spentOutputs={this.state.spentOutputs} meta={this.state.meta} showRaw={true} showConflicts={true} showGraphs={true} history={this.props.history} /> : <p className="text-danger">{t`Transaction with hash ${this.props.match.params.id} not found`}</p>}
        </div>
      );
    }

    const renderLinks = () => {
      return (
        <div className="d-flex flex-row justify-content-between">
          <BackButton {...this.props} />
          {this.state.transaction && renderExplorerLink()}
        </div>
      );
    }

    const renderExplorerLink = () => {
      return (
        <div className="d-flex flex-row align-items-center mb-3 back-div">
          <a href="true" onClick={this.goToExplorer}>{t`See on explorer`}</a>
          <i className="fa fa-long-arrow-right ml-2" />
        </div>
      );
    }

    return (
      <div className="flex align-items-center content-wrapper">
        {!this.state.loaded ? <ReactLoading type='spin' color={colors.purpleHathor} delay={500} /> : renderTx()}
      </div>
    );
  }
}

export default TransactionDetail;
