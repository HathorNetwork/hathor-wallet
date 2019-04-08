/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import dateFormatter from '../utils/date';
import HathorPaginate from '../components/HathorPaginate';
import { Link } from 'react-router-dom'
import { CopyToClipboard } from 'react-copy-to-clipboard';
import HathorAlert from './HathorAlert';
import helpers from '../utils/helpers';
import wallet from '../utils/wallet';


/**
 * Component that shows the history data of a token
 *
 * @memberof Components
 */
class TokenHistory extends React.Component {
  /**
   * page {number} Page of the history (default is 1)
   */
  state = { page: 1 };

  /**
   * Method called when user clicked on a page button
   *
   * @param {Object} data Object that has the index of page button clicked
   */
  handlePageClick = (data) => {
    let selected = data.selected;
    let page = selected + 1;

    this.setState({ page: page });
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
   * For each transaction we calculate the final balance for the user and the selected token
   *
   * @param {Object} tx Transaction data
   *
   * @return {Object} {found, value} where 'found' is a boolean that shows if any of the addresses is of this user and 'value' is the final value of the transaction
   */
  prepareTx = (tx) => {
    const keys = wallet.getWalletData().keys;
    const selectedToken = this.props.selectedToken;
    let found = false;
    let value = 0;

    for (let txin of tx.inputs) {
      if (wallet.isAuthorityOutput(txin)) {
        continue;
      }
      if (txin.token === selectedToken && txin.decoded.address in keys) {
        found = true;
        value -= txin.value;
      }
    }

    for (let txout of tx.outputs) {
      if (wallet.isAuthorityOutput(txout)) {
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
          this.props.totalPages === 1) {
        return null;
      } else {
        return (
          <HathorPaginate pageCount={this.props.totalPages}
            onPageChange={this.handlePageClick} />
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
      const startIndex = (this.state.page - 1) * this.props.count;
      const endIndex = startIndex + this.props.count;
      const history = this.props.history.slice(startIndex, endIndex);
      return history.map((tx, idx) => {
        const extra = this.prepareTx(tx);
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
            <td>{dateFormatter.parseTimestamp(tx.timestamp)}</td>
            <td>
              <Link className={tx.is_voided ? 'voided' : ''} to={`/transaction/${tx.tx_id}`}>{helpers.getShortHash(tx.tx_id)}</Link>
              <CopyToClipboard text={tx.tx_id} onCopy={this.copied}>
                <i className="fa fa-clone pointer ml-1" title="Copy to clipboard"></i>
              </CopyToClipboard>
            </td>
            <td className={tx.is_voided ? 'voided state' : 'state'}>{statusElement}</td>
            <td>{tx.is_voided && renderVoidedElement()}</td>
            <td className='value'><span className={tx.is_voided ? 'voided' : ''}>{helpers.prettyValue(extra.value)}</span></td>
          </tr>
        );
      });
    }

    return (
      <div>
        {renderHistory()}
        <HathorAlert ref="alertCopied" text="Copied to clipboard!" type="success" />
      </div>
    );
  }
}

export default TokenHistory;
