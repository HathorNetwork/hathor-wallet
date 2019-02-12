import React from 'react';
import dateFormatter from '../utils/date';
import HathorPaginate from '../components/HathorPaginate';
import { Link } from 'react-router-dom'
import { WALLET_HISTORY_COUNT } from '../constants';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import HathorAlert from './HathorAlert';
import helpers from '../utils/helpers';
import { connect } from "react-redux";


const mapStateToProps = (state) => {
  return { sortedHistory: state.sortedHistory };
};


class WalletHistory extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      totalPages: 0,
      page: 1,
    }
  }

  componentDidMount = () => {
    this.updateTotalPages();
  }

  componentDidUpdate = (prevProps) => {
    this.updateTotalPages();
  }

  updateTotalPages = () => {
    let calcPages = Math.ceil(this.props.sortedHistory.length / WALLET_HISTORY_COUNT);
    if (this.state.totalPages !== calcPages) {
      this.setState({ totalPages: calcPages });
    }
  }

  handlePageClick = (data) => {
    let selected = data.selected;
    let page = selected + 1;

    this.setState({ page: page });
  }

  copied = (text, result) => {
    if (result) {
      // If copied with success
      this.refs.alertCopied.show(1000);
    }
  }

  render() {
    const loadPagination = () => {
      if (this.props.sortedHistory === null || this.props.sortedHistory.length === 0 || this.state.totalPages === 1) {
        return null;
      } else {
        return (
          <HathorPaginate pageCount={this.state.totalPages}
            onPageChange={this.handlePageClick} />
        );
      }
    }

    const renderHistory = () => {
      return (
        <div className="d-flex flex-column">
          <strong>Transaction history</strong>
          <div className="table-responsive">
            <table className="mt-3 table table-striped" id="wallet-history">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Date</th>
                  <th>Index</th>
                  <th>Value</th>
                  <th>State</th>
                </tr>
              </thead>
              <tbody>
                {renderHistoryData()}
              </tbody>
            </table>
          </div>
          {loadPagination()}
        </div>
      );
    }

    const renderHistoryData = () => {
      let startIndex = (this.state.page - 1) * WALLET_HISTORY_COUNT;
      let endIndex = startIndex + WALLET_HISTORY_COUNT;
      return this.props.sortedHistory.slice(startIndex, endIndex).map((tx, idx) => {
        return (
          <tr key={`${tx.tx_id}${tx.index}${tx.from_tx_id}`}>
            <td>
              <Link className={tx.voided && !tx.from_tx_id ? 'voided' : ''} to={`/transaction/${tx.from_tx_id ? tx.from_tx_id : tx.tx_id}`}>{tx.from_tx_id ? tx.from_tx_id.substring(0,32) : tx.tx_id.substring(0,32)}...</Link>
              <CopyToClipboard text={tx.from_tx_id ? tx.from_tx_id : tx.tx_id} onCopy={this.copied}>
                <i className="fa fa-clone pointer ml-1" title="Copy to clipboard"></i>
              </CopyToClipboard>
            </td>
            <td>{dateFormatter.parseTimestamp(tx.timestamp)}</td>
            <td>{tx.index}</td>
            <td className={tx.from_tx_id && !tx.voided ? "spent-tx" : ""}>{helpers.prettyValue(tx.value)}</td>
            <td>
              {tx.from_tx_id ?
                <div>
                  <Link className={tx.voided ? 'voided' : ''} to={`/transaction/${tx.tx_id}`}>
                    Spent {tx.voided ? '(Voided)' : ''}
                  </Link> 
                  <CopyToClipboard text={tx.tx_id} onCopy={this.copied}>
                    <i className="fa fa-clone pointer ml-1" title="Copy hash to clipboard"></i>
                  </CopyToClipboard>
                </div>
              : (tx.voided ? 'Voided' : '')}
            </td>
          </tr>
        );
      });
    }

    return (
      <div className="content-wrapper flex align-items-center">
        {renderHistory()}
        <HathorAlert ref="alertCopied" text="Copied to clipboard!" type="success" />
      </div>
    );
  }
}

export default connect(mapStateToProps)(WalletHistory);
