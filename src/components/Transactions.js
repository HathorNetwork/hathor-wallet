import React from 'react';
import txApi from '../api/txApi';
import ReactLoading from 'react-loading';
import { TX_COUNT } from '../constants';
import TxRow from './TxRow';
import SearchTx from './SearchTx';
import helpers from '../utils/helpers';
import WebSocketHandler from '../WebSocketHandler';


class Transactions extends React.Component {
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

    WebSocketHandler.on('network', this.handleWebsocket);
  }

  componentWillUnmount() {
    WebSocketHandler.removeListener('network', this.handleWebsocket);
  }

  handleWebsocket = (wsData) => {
    if (wsData.type === 'network:new_tx_accepted') {
      this.updateListWs(wsData);
    }
  }

  updateListWs = (tx) => {
    // We only add new tx/blocks if it's the first page
    if (!this.state.hasBefore && ((tx.is_block && this.props.type === 'block') || (!tx.is_block && this.props.type === 'tx'))) {
      let transactions = this.state.transactions;
      let hasAfter = (this.state.hasAfter || (transactions.length === TX_COUNT && !this.state.hasAfter))
      transactions = helpers.updateListWs(transactions, tx, TX_COUNT);

      let firstHash = transactions[0].hash;
      let firstTimestamp = transactions[0].timestamp;
      let lastHash = transactions[transactions.length-1].hash;
      let lastTimestamp = transactions[transactions.length-1].timestamp;

      // Finally we update the state again
      this.setState({ transactions, hasAfter, firstHash, lastHash, firstTimestamp, lastTimestamp });
    }
  }

  handleDataFetched = (data, first, page) => {
    // Handle differently if is the first GET response we receive
    // page indicates if was clicked 'previous' or 'next'
    // Set first and last hash of the transactions
    let firstHash = null;
    let lastHash = null;
    let firstTimestamp = null;
    let lastTimestamp = null;
    if (data.transactions.length) {
      firstHash = data.transactions[0].hash;
      lastHash = data.transactions[data.transactions.length-1].hash;
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

  getData = (first, timestamp, hash, page) => {
    txApi.getTransactions(this.props.type, TX_COUNT, timestamp, hash, page, (data) => {
      this.handleDataFetched(data, first, page);
    }, (e) => {
      // Error in request
      console.log(e);
    });
  }

  previousClicked = (e) => {
    e.preventDefault();
    this.getData(false, this.state.firstTimestamp, this.state.firstHash, 'previous');
  }

  nextClicked = (e) => {
    e.preventDefault();
    this.getData(false, this.state.lastTimestamp, this.state.lastHash, 'next');
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
          <TxRow key={tx.hash} tx={tx} />
        );
      });
    }

    return (
      <div className="tab-content-wrapper">
        <h1>{this.props.type === 'tx' ? 'Transactions' : 'Blocks'}</h1>
        <SearchTx {...this.props} />
        {!this.state.loaded ? <ReactLoading type='spin' color='#0081af' delay={500} /> : loadTable()}
        {loadPagination()}
      </div>
    );
  }
}

export default Transactions;