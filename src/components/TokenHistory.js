/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import ReactLoading from 'react-loading';
import hathorLib from '@hathor/wallet-lib';
import { t } from 'ttag';
import { Link } from 'react-router-dom'
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { connect } from 'react-redux';
import { get } from 'lodash';
import walletUtils from '../utils/wallet';
import helpers from '../utils/helpers';
import { colors } from '../constants';
import TokenPagination from './TokenPagination';
import HathorAlert from './HathorAlert';
import { TOKEN_DOWNLOAD_STATUS } from '../constants';
import { getGlobalWallet } from "../modules/wallet";

const mapStateToProps = (state, props) => {
  const defaultTokenHistory = {
    status: TOKEN_DOWNLOAD_STATUS.LOADING,
    data: [],
  };
  let history = defaultTokenHistory;
  if (props.selectedToken) {
    history = get(state.tokensHistory, `${props.selectedToken}`, defaultTokenHistory);
  }

  return {
    tokenHistory: history,
    tokenMetadata: state.tokenMetadata,
    decimalPlaces: state.serverInfo.decimalPlaces,
  };
};


/**
 * Component that shows the history data of a token
 *
 * @memberof Components
 */
class TokenHistory extends React.Component {
  constructor(props) {
    super(props);

    this.alertCopiedRef = React.createRef();
  }
  /**
   * hasAfter {boolean} if should activate 'Next' button in pagination
   * hasBefore {boolean} if should activate 'Previous' button in pagination
   * firstHash {string} ID of the first transaction being shown
   * lastHash {string} ID of the last transaction being shown
   * reference {string} ID of the reference transaction used when clicking on pagination button
   * direction {string} 'previous' or 'next', dependending on which pagination button the user has clicked
   * transactions {Array} List of transactions to be shown in the screen
   * shouldFetch {Boolean} If should fetch more history (when the fetch returns 0 elements, should be set to false)
   */
  state = {
    hasAfter: false,
    hasBefore: false,
    firstHash: null,
    lastHash: null,
    reference: null,
    direction: null,
    transactions: [],
    shouldFetch: true,
  };

  componentDidMount = () => {
    this.handleHistoryUpdate();
  }

  componentDidUpdate = (prevProps) => {
    if (prevProps.tokenHistory.data !== this.props.tokenHistory.data) {
      this.handleHistoryUpdate();
    }
  }

  /**
   * Fetch more history
   */
  fetchMoreHistory = async () => {
    if (this.state.shouldFetch) {
      const newHistory = await walletUtils.fetchMoreHistory(
        getGlobalWallet(),
        this.props.selectedToken,
        this.props.tokenHistory.data
      );
      if (newHistory.length === 0) {
        // Last page already fetched, no need to fetch anymore
        this.setState({ shouldFetch: false });
      }
    }
  }

  /**
   * Called when user clicks 'Next' pagination button
   *
   * @param {Object} e Event emitted when button is clicked
   */
  nextClicked = async (e) => {
    e.preventDefault();
    this.setState({ reference: this.state.lastHash, direction: 'next' }, () => {
      // Every time the user clicks on the next button we must try to fetch more history
      // usually we will have at least five more pages already fetched
      this.fetchMoreHistory();
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
    const history = get(this.props.tokenHistory, 'data', []);
    if (history.length > 0) {
      let startIndex = 0;
      let endIndex = this.props.count;
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
      const hasAfter = history.length > endIndex;
      const hasBefore = startIndex > 0;
      const transactions = history.slice(startIndex, endIndex);
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
    if (this.state.reference === null) {
      throw new Error('State reference cannot be null calling this method.');
    }
    const history = get(this.props.tokenHistory, 'data', []);
    const idxReference = history.findIndex((tx) =>
      tx.tx_id === this.state.reference
    );
    return idxReference;
  }

  /**
   * Method called on copy to clipboard success
   * Show alert success message
   *
   * @param {string} text Text copied to clipboard
   * @param {*} result Null in case of error
   */
  copied = (_text, result) => {
    if (result) {
      // If copied with success
      this.alertCopiedRef.current.show(1000);
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

  render() {
    const renderHistory = () => {
      return (
        <div className="table-responsive">
          <table className="mt-3 table table-striped" id="token-history">
            <thead>
              <tr>
                <th>{t`Date`}</th>
                <th>{t`ID`}</th>
                <th>{t`Type`}</th>
                <th></th>
                <th>{t`Value`}</th>
              </tr>
            </thead>
            <tbody>
              { renderHistoryData() }
            </tbody>
          </table>
          <TokenPagination
            history={this.props.tokenHistory.data}
            hasBefore={this.state.hasBefore}
            hasAfter={this.state.hasAfter}
            nextClicked={this.nextClicked}
            previousClicked={this.previousClicked}
          />
        </div>
      );
    }

    const renderVoidedElement = () => {
      return (
        <span className="voided-element">{t`Voided`}</span>
      );
    }

    const renderLoading = () => {
      return (
        <div>
          <ReactLoading
            type='spin'
            color={colors.purpleHathor}
            width={24}
            height={24}
            delay={200} />
          <strong>{t`Loading history...`}</strong>
        </div>
      )
    };

    const renderHistoryData = () => {
      const isNFT = helpers.isTokenNFT(get(this.props, 'selectedToken'), this.props.tokenMetadata);

      return this.state.transactions.map((tx) => {
        let statusElement = '';
        let trClass = '';
        let value = hathorLib.numberUtils.prettyValue(tx.balance, isNFT ? 0 : this.props.decimalPlaces);
        if (tx.balance > 0) {
          if (tx.version === hathorLib.constants.CREATE_TOKEN_TX_VERSION) {
            statusElement = <span>{t`Token creation`} <i className={`fa ml-3 fa-long-arrow-down`}></i></span>;
          } else {
            statusElement = <span>{t`Received`} <i className={`fa ml-3 fa-long-arrow-down`}></i></span>;
          }
          trClass = 'output-tr';
        } else if (tx.balance < 0) {
          if (tx.version === hathorLib.constants.CREATE_TOKEN_TX_VERSION) {
            statusElement = <span>{t`Token deposit`} <i className={`fa ml-3 fa-long-arrow-up`}></i></span>
          } else {
            statusElement = <span>{t`Sent`} <i className={`fa ml-3 fa-long-arrow-up`}></i></span>
          }
          trClass = 'input-tr';
        } else {
          if (tx.isAllAuthority) {
            statusElement = <span>{`Authority`}</span>;
            value = '--';
          }
        }
        return (
          <tr key={`${tx.tx_id}`} className={trClass}>
            <td>{hathorLib.dateFormatter.parseTimestamp(tx.timestamp)}</td>
            <td>
              <Link className={tx.is_voided ? 'voided' : ''} to={`/transaction/${tx.tx_id}`}>{hathorLib.helpersUtils.getShortHash(tx.tx_id)}</Link>
              <CopyToClipboard text={tx.tx_id} onCopy={this.copied}>
                <i className="fa fa-clone pointer ml-1" title="Copy to clipboard"></i>
              </CopyToClipboard>
            </td>
            <td className={tx.is_voided ? 'voided state' : 'state'}>{statusElement}</td>
            <td>{tx.is_voided && renderVoidedElement()}</td>
            <td className='value'><span className={tx.is_voided ? 'voided' : ''}>{value}</span></td>
          </tr>
        );
      });
    }

    const renderPage = () => {
      const page = this.getPageNumber();
      let span = null;
      if (page === 1) {
        span = <span>{t`You are receiving transactions in real time.`}</span>;
      } else {
        span = <span className="text-warning">To receive transactions in real time, <a href="true" onClick={(e) => this.goToPage1(e)}>go to page 1</a>.</span>;
      }
      return (
        <p className="mt-3 mb-0 page-text"><strong>{t`Page ${page}`}</strong> - {span}</p>
      );
    }

    return (
      <div>
        {this.props.showPage && renderPage()}
        {this.props.tokenHistory.status === TOKEN_DOWNLOAD_STATUS.READY && renderHistory()}
        {this.props.tokenHistory.status === TOKEN_DOWNLOAD_STATUS.LOADING && renderLoading()}

        <HathorAlert ref={this.alertCopiedRef} text="Copied to clipboard!" type="success" />
      </div>
    );
  }
}

export default connect(mapStateToProps)(TokenHistory);
