import React from 'react';
import dateFormatter from '../utils/date';
import HathorPaginate from '../components/HathorPaginate';
import { Link } from 'react-router-dom'
import { CopyToClipboard } from 'react-copy-to-clipboard';
import HathorAlert from './HathorAlert';
import helpers from '../utils/helpers';


class TokenHistory extends React.Component {
  state = { page: 1 };

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
                <th>ID</th>
                <th>Date</th>
                <th>Index</th>
                <th>State</th>
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
        return (
          <tr key={`${tx.tx_id}${tx.index}${tx.from_tx_id}`} className={tx.is_output ? 'output-tr' : 'input-tr'}>
            <td>
              <Link className={tx.voided ? 'voided' : ''} to={`/transaction/${tx.tx_id}`}>{tx.tx_id.substring(0,12)}...{tx.tx_id.substring(52,64)}</Link>
              <CopyToClipboard text={tx.tx_id} onCopy={this.copied}>
                <i className="fa fa-clone pointer ml-1" title="Copy to clipboard"></i>
              </CopyToClipboard>
            </td>
            <td>{dateFormatter.parseTimestamp(tx.timestamp)}</td>
            <td>{tx.from_tx_id ? '-' : tx.index}</td>
            <td className={tx.voided ? 'voided state' : 'state'}>{tx.is_output ? 'Received' : 'Sent'} <i className={`fa ml-3 ${tx.is_output ? 'fa-long-arrow-down' : 'fa-long-arrow-up'}`}></i></td>
            <td className='value'><span className={tx.voided ? 'voided' : ''}>{helpers.prettyValue(tx.value)}</span>{tx.voided && renderVoidedElement()}</td>
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