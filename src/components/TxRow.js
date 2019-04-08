/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import dateFormatter from '../utils/date';
import { withRouter } from "react-router-dom";


/**
 * Component that renders the row of the list of transactions/blocks in the explorer
 *
 * @memberof Components
 */
class TxRow extends React.Component {

  /**
   * When clicking in a row we redirect to the TransactionDetail screen
   *
   * @param {string} hash ID of the transaction clicked
   */
  handleClickTr = (hash) => {
    this.props.history.push(`/transaction/${hash}`);
  }

  render() {
    return (
      <tr onClick={(e) => this.handleClickTr(this.props.tx.tx_id)}>
        <td className="pr-3">{this.props.tx.tx_id}</td>
        <td className="pr-3">{dateFormatter.parseTimestamp(this.props.tx.timestamp)}</td>
      </tr>
    );
  }
}

export default withRouter(TxRow);
