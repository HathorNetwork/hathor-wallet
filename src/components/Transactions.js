/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import ReactLoading from 'react-loading';
import TxRow from './TxRow';
import SearchTx from './SearchTx';
import BackButton from '../components/BackButton';
import hathorLib from 'hathor-wallet-utils';
import { TX_COUNT } from '../constants';


/**
 * Component that renders a list of transactions or blocks, depending on the type
 *
 * @memberof Components
 */
class Transactions extends React.Component {
  /**
   * transactions {Array} array of transactions or blocks to be listed
   * firstHash {string} ID of the first element of the list (used in the pagination)
   * firstTimestamp {number} timestamp of the first element of the list (used in the pagination)
   * lastHash {string} ID of the last element of the list (used in the pagination)
   * lastTimestamp {number} timestamp of the last element of the list (used in the pagination)
   * loaded {boolean} if the elements are already loaded
   * hasAfter {boolean} if has more elements in the next page (if can go next on pagination)
   * hasBefora {boolean} if has more elements in the last page (if can go previous on pagination)
   */
  state = {
    transactions: [],
    firstHash: null,
    firstTimestamp: null,
    lastHash: null,
    lastTimestamp: null,
    loaded: false,
    hasAfter: false,
    hasBefore: false,
  }

  componentDidMount() {
    this.getData(true, null, null, '');

    hathorLib.WebSocketHandler.on('network', this.handleWebsocket);
  }

  componentWillUnmount() {
    hathorLib.WebSocketHandler.removeListener('network', this.handleWebsocket);
  }

  /**
   * Called when a new element arrives from the websocket
   *
   * @param {Object} wsData Object with type of data and the element
   */
  handleWebsocket = (wsData) => {
    if (wsData.type === 'network:new_tx_accepted') {
      this.updateListWs(wsData);
    }
  }

  /**
   * Update the list rendered with new element that arrived from websocket
   *
   * @param {Object} tx Object with data from element
   */
  updateListWs = (tx) => {
    // We only add new tx/blocks if it's the first page
    if (!this.state.hasBefore && ((tx.is_block && this.props.type === 'block') || (!tx.is_block && this.props.type === 'tx'))) {
      let transactions = this.state.transactions;
      let hasAfter = (this.state.hasAfter || (transactions.length === TX_COUNT && !this.state.hasAfter))
      transactions = hathorLib.helpers.updateListWs(transactions, tx, TX_COUNT);

      let firstHash = transactions[0].tx_id;
      let firstTimestamp = transactions[0].timestamp;
      let lastHash = transactions[transactions.length-1].tx_id;
      let lastTimestamp = transactions[transactions.length-1].timestamp;

      // Finally we update the state again
      this.setState({ transactions, hasAfter, firstHash, lastHash, firstTimestamp, lastTimestamp });
    }
  }

  /**
   * Called after data is fetched from the server, to update component state
   *
   * @param {Object} data Object with 'transactions' key
   * @param {boolean} first If it was the first call
   * @param {string} page if was called 'previous' or 'next' page (can be '')
   */
  handleDataFetched = (data, first, page) => {
    // Handle differently if is the first GET response we receive
    // page indicates if was clicked 'previous' or 'next'
    // Set first and last hash of the transactions
    let firstHash = null;
    let lastHash = null;
    let firstTimestamp = null;
    let lastTimestamp = null;
    if (data.transactions.length) {
      firstHash = data.transactions[0].tx_id;
      lastHash = data.transactions[data.transactions.length-1].tx_id;
      firstTimestamp = data.transactions[0].timestamp;
      lastTimestamp = data.transactions[data.transactions.length-1].timestamp;
    }

    let hasAfter = false;
    let hasBefore = false;
    if (first) {
      // Before is always false, so we check after
      hasAfter = data.has_more;
    } else {
      if (page === 'previous') {
        hasAfter = true;
        hasBefore = data.has_more;
      } else {
        hasBefore = true;
        hasAfter = data.has_more;
      }
    }

    this.setState({ transactions: data.transactions, loaded: true, firstHash, lastHash, firstTimestamp, lastTimestamp, hasAfter, hasBefore });
  }

  /**
   * Get data from server
   *
   * @param {boolean} first If it was the first call
   * @param {number} timestamp Timestamp to be used as parameter on the search (can be null)
   * @param {string} hash Hash to used as parameter on the search (can be '')
   * @param {string} page if was called 'previous' or 'next' page (can be '')
   */
  getData = (first, timestamp, hash, page) => {
    hathorLib.txApi.getTransactions(this.props.type, TX_COUNT, timestamp, hash, page, (data) => {
      this.handleDataFetched(data, first, page);
    }, (e) => {
      // Error in request
      console.log(e);
    });
  }

  /**
   * Called when user clicked on the 'Previous' button, then get new data
   *
   * @param {Object} e Event emitted by the button click
   */
  previousClicked = (e) => {
    e.preventDefault();
    this.getData(false, this.state.firstTimestamp, this.state.firstHash, 'previous');
  }

  /**
   * Called when user clicked on the 'Next' button, then get new data
   *
   * @param {Object} e Event emitted by the button click
   */
  nextClicked = (e) => {
    e.preventDefault();
    this.getData(false, this.state.lastTimestamp, this.state.lastHash, 'next');
  }

  /**
   * Called when user searches for an address and received new data
   *
   * @param {Object} data New data to be rendered on the page
   */
  newData = (data) => {
    // Data received from Search tx when searching by address
    const transactions = []
    for (const tx of data) {
      if (hathorLib.helpers.isBlock(tx) && this.props.type === 'block') {
        transactions.push(tx);
        continue;
      }

      if (!hathorLib.helpers.isBlock(tx) && this.props.type === 'tx') {
        transactions.push(tx);
        continue;
      }
    }

    this.handleDataFetched({ transactions }, true, '');
  }

  /**
   * Called when user undo a search and want to see initial data again
   */
  resetData = () => {
    this.getData(true, null, null, '');
  }

  render() {
    const loadPagination = () => {
      if (this.state.transactions.length === 0) {
        return null;
      } else {
        return (
          <nav aria-label="Tx pagination" className="d-flex justify-content-center">
            <ul className="pagination">
              <li ref="txPrevious" className={(!this.state.hasBefore || this.state.transactions.length === 0) ? "page-item mr-3 disabled" : "page-item mr-3"}><a className="page-link" onClick={(e) => this.previousClicked(e)} href="true">Previous</a></li>
              <li ref="txNext" className={(!this.state.hasAfter || this.state.transactions.length === 0) ? "page-item disabled" : "page-item"}><a className="page-link" href="true" onClick={(e) => this.nextClicked(e)}>Next</a></li>
            </ul>
          </nav>
        );
      }
    }

    const loadTable = () => {
      return (
        <div className="table-responsive">
          <table className="table table-striped" id="tx-table">
            <thead>
              <tr>
                <th>Hash</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {loadTableBody()}
            </tbody>
          </table>
        </div>
      );
    }

    const loadTableBody = () => {
      return this.state.transactions.map((tx, idx) => {
        return (
          <TxRow key={tx.tx_id} tx={tx} />
        );
      });
    }

    return (
      <div className="tab-content-wrapper">
        <BackButton {...this.props} />
        <h1>{this.props.type === 'tx' ? 'Transactions' : 'Blocks'}</h1>
        <SearchTx {...this.props} newData={this.newData} resetData={this.resetData} />
        {!this.state.loaded ? <ReactLoading type='spin' color='#0081af' delay={500} /> : loadTable()}
        {loadPagination()}
      </div>
    );
  }
}

export default Transactions;
