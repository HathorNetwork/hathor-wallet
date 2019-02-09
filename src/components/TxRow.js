import React from 'react';
import dateFormatter from '../utils/date';
import { withRouter } from "react-router-dom";


class TxRow extends React.Component {

  handleClickTr = (hash) => {
    this.props.history.push(`/transaction/${hash}`);
  }

  render() {
    return (
      <tr onClick={(e) => this.handleClickTr(this.props.tx.hash)}>
        <td className="pr-3">{this.props.tx.hash}</td>
        <td className="pr-3">{dateFormatter.parseTimestamp(this.props.tx.timestamp)}</td>
      </tr>
    );
  }
}

export default withRouter(TxRow);