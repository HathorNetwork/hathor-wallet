/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { Link } from 'react-router-dom'
import { CopyToClipboard } from 'react-copy-to-clipboard';
import HathorAlert from './HathorAlert';
import hathorLib from 'hathor-wallet-utils';


/**
 * Component that shows the history data of a token
 *
 * @memberof Components
 */
class TokenHistory extends React.Component {
  /**
   * hasAfter {boolean} if should activate 'Next' button in pagination
   * hasBefore {boolean} if should activate 'Previous' button in pagination
   * firstHash {string} ID of the first transaction being shown
   * lastHash {string} ID of the last transaction being shown
   * reference {string} ID of the reference transaction used when clicking on pagination button
   * direction {string} 'previous' or 'next', dependending on which pagination button the user has clicked
   * transactions {Array} List of transactions to be shown in the screen
   */
  state = {
    hasAfter: false,
    hasBefore: false,
    firstHash: null,
    lastHash: null,
    reference: null,
    direction: null,
    transactions: [],
  };

  componentDidMount = () => {
    this.handleHistoryUpdate();
  }

  componentDidUpdate = (prevProps) => {
    if (this.props.history !== prevProps.history) {
      this.handleHistoryUpdate();
    }
  }

  /**
   * Called when user clicks 'Next' pagination button
   *
   * @param {Object} e Event emitted when button is clicked
   */
  nextClicked = (e) => {
    e.preventDefault();
    this.setState({ reference: this.state.lastHash, direction: 'next' }, () => {
      this.handleHistoryUpdate();
    });
  }

  /**
   * Called when user clicks 'Previous' pagination button
   *
   * @param {Object} e Event emitted when button is clicked
   */
  previousClicked = (e) => {
    e.preventDefault();
    this.setState({ reference: this.state.firstHash, direction: 'previous' }, () => {
      this.handleHistoryUpdate();
    });
  }

  /**
   * Calculates the transactions that will be shown in the list, besides the pagination data
   */
  handleHistoryUpdate = () => {
    if (this.props.history.length > 0) {
      let startIndex = 0;
      let endIndex = this.props.count;;
      if (this.state.reference !== null) {
        // If has a reference, a pagination button was clicked, so we need to find the index
        // to calculate the slice to be done in the history
        const idxReference = this.getReferenceIndex();
        if (this.state.direction === 'previous') {
          endIndex = idxReference;
          startIndex = Math.max(0, endIndex - this.props.count);
        } else if (this.state.direction === 'next') {
          startIndex = idxReference + 1;
          endIndex = startIndex + this.props.count
        }
      }
      const hasAfter = this.props.history.length > endIndex;
      const hasBefore = startIndex > 0;
      const transactions = this.props.history.slice(startIndex, endIndex);
      const firstHash = transactions.length > 0 ? transactions[0].tx_id : null;
      const lastHash = transactions.length > 0 ? transactions[transactions.length - 1].tx_id : null;
      let reference = this.state.reference;
      // If back to first page, we have no reference anymore, so new transactions can appear automatically
      if (startIndex === 0) reference = null;
      this.setState({ hasAfter, hasBefore, firstHash, lastHash, transactions, reference });
    }
  }

  /**
   * Calculates the index of the reference hash in the history list
   */
  getReferenceIndex = () => {
    const idxReference = this.props.history.findIndex((tx) =>
      tx.tx_id === this.state.reference
    )
    return idxReference;
  }

  /**
   * Method called on copy to clipboard success  
   * Show alert success message
   *
   * @param {string} text Text copied to clipboard
   * @param {*} result Null in case of error
   */
  copied = (text, result) => {
    if (result) {
      // If copied with success
      this.refs.alertCopied.show(1000);
    }
  }

  /**
   * Calculates the current page number that user is seeing
   */
  getPageNumber = () => {
    if (this.state.reference === null) {
      return 1;
    } else {
      const idxReference = this.getReferenceIndex();
      let quantityBefore = 0;
      if (this.state.direction === 'next') {
        quantityBefore = idxReference + 1;
      } else {
        quantityBefore = idxReference - this.props.count;
      }
      const pagesBefore = Math.ceil(quantityBefore / this.props.count);
      return pagesBefore + 1;
    }
  }

  /**
   * Goes to first page of the history list
   *
   * @param {Object} event emitted when clicking on the link
   */
  goToPage1 = (e) => {
    e.preventDefault();
    this.setState({ reference: null, direction: null }, () => {
      this.handleHistoryUpdate();
    });
  }

  /**
   * For each transaction we calculate the final balance for the user and the selected token
   *
   * @param {Object} tx Transaction data
   *
   * @return {Object} {found, value} where 'found' is a boolean that shows if any of the addresses is of this user and 'value' is the final value of the transaction
   */
  prepareTx = (tx, keys) => {
    const selectedToken = this.props.selectedToken;
    let found = false;
    let value = 0;

    for (let txin of tx.inputs) {
      if (hathorLib.wallet.isAuthorityOutput(txin)) {
        continue;
      }
      if (txin.token === selectedToken && txin.decoded.address in keys) {
        found = true;
        value -= txin.value;
      }
    }

    for (let txout of tx.outputs) {
      if (hathorLib.wallet.isAuthorityOutput(txout)) {
        continue;
      }
      if (txout.token === selectedToken && txout.decoded.address in keys) {
        found = true;
        value += txout.value;
      }
    }

    return {found, value};
  }

  render() {
    const loadPagination = () => {
      if (this.props.history === null ||
          this.props.history.length === 0 ||
          (this.state.hasBefore === false && this.state.hasAfter === false)) {
        return null;
      } else {
        return (
          <nav aria-label="Token pagination" className="d-flex justify-content-center">
            <ul className="pagination">
              <li className={(!this.state.hasBefore || this.props.history.length === 0) ? "page-item mr-3 disabled" : "page-item mr-3"}><a className="page-link" onClick={(e) => this.previousClicked(e)} href="true">Previous</a></li>
              <li className={(!this.state.hasAfter || this.props.history.length === 0) ? "page-item disabled" : "page-item"}><a className="page-link" href="true" onClick={(e) => this.nextClicked(e)}>Next</a></li>
            </ul>
          </nav>
        );
      }
    }

    const renderHistory = () => {
      return (
        <div className="table-responsive">
          <table className="mt-3 table table-striped" id="token-history">
            <thead>
              <tr>
                <th>Date</th>
                <th>ID</th>
                <th>Type</th>
                <th></th>
                <th>Value</th>
              </tr>
            </thead>
            <tbody>
              {renderHistoryData()}
            </tbody>
          </table>
          {loadPagination()}
        </div>
      );
    }

    const renderVoidedElement = () => {
      return (
        <span className="voided-element">Voided</span>
      );
    }

    const renderHistoryData = () => {
      const keys = hathorLib.wallet.getWalletData().keys;
      return this.state.transactions.map((tx, idx) => {
        const extra = this.prepareTx(tx, keys);
        if (!extra.found) {
          return null;
        }
        let statusElement = '';
        let trClass = '';
        if (extra.value > 0) {
          statusElement = <span>Received <i className={`fa ml-3 fa-long-arrow-down`}></i></span>;
          trClass = 'output-tr';
        } else if (extra.value < 0) {
          statusElement = <span>Sent <i className={`fa ml-3 fa-long-arrow-up`}></i></span>
          trClass = 'input-tr';
        }
        return (
          <tr key={`${tx.tx_id}`} className={trClass}>
            <td>{hathorLib.dateFormatter.parseTimestamp(tx.timestamp)}</td>
            <td>
              <Link className={tx.is_voided ? 'voided' : ''} to={`/transaction/${tx.tx_id}`}>{hathorLib.helpers.getShortHash(tx.tx_id)}</Link>
              <CopyToClipboard text={tx.tx_id} onCopy={this.copied}>
                <i className="fa fa-clone pointer ml-1" title="Copy to clipboard"></i>
              </CopyToClipboard>
            </td>
            <td className={tx.is_voided ? 'voided state' : 'state'}>{statusElement}</td>
            <td>{tx.is_voided && renderVoidedElement()}</td>
            <td className='value'><span className={tx.is_voided ? 'voided' : ''}>{hathorLib.helpers.prettyValue(extra.value)}</span></td>
          </tr>
        );
      });
    }

    const renderPage = () => {
      const page = this.getPageNumber();
      let span = null;
      if (page === 1) {
        span = <span>You are receiving transactions in real time.</span>;
      } else {
        span = <span className="text-warning">To receive transactions in real time, <a href="true" onClick={(e) => this.goToPage1(e)}>go to page 1</a>.</span>;
      }
      return (
        <p className="mt-3 mb-0 page-text"><strong>Page {page}</strong> - {span}</p>
      );
    }

    return (
      <div>
        {this.props.showPage && renderPage()}
        {renderHistory()}
        <HathorAlert ref="alertCopied" text="Copied to clipboard!" type="success" />
      </div>
    );
  }
}

export default TokenHistory;
