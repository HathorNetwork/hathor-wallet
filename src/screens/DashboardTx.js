/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import TxRow from '../components/TxRow';
import SearchTx from '../components/SearchTx';
import WebSocketHandler from '../WebSocketHandler';
import BackButton from '../components/BackButton';
import hathorLib from 'hathor-wallet-utils';


/**
 * Dashboard screen that show some blocks and some transactions
 *
 * @memberof Screens
 */
class DashboardTx extends React.Component {
  /**
   * transactions {Array} Array of transactions to show in the dashboard
   * blocks {Array} Array of blocks to show in the dashboard
   */
  state = { transactions: [], blocks: [] };

  componentDidMount = () => {
    this.getInitialData();
    WebSocketHandler.on('network', this.handleWebsocket);
  }

  componentWillUnmount = () => {
    WebSocketHandler.removeListener('network', this.handleWebsocket);
  }

  /**
   * Get initial data to fill the screen and update the state with this data
   */
  getInitialData = () => {
    hathorLib.txApi.getDashboardTx(hathorLib.constants.DASHBOARD_BLOCKS_COUNT, hathorLib.constants.DASHBOARD_TX_COUNT, (data) => {
      this.updateData(data.transactions, data.blocks);
    }, (e) => {
      // Error in request
      console.log(e);
    });
  }

  /**
   * Handle websocket message to see if should update the list
   */
  handleWebsocket = (wsData) => {
    if (wsData.type === 'network:new_tx_accepted') {
      this.updateListWs(wsData);
    }
  }

  /**
   * Update list because a new element arrived
   */
  updateListWs = (tx) => {
    if (tx.is_block) {
      let blocks = this.state.blocks;

      blocks = hathorLib.helpers.updateListWs(blocks, tx, hathorLib.constants.DASHBOARD_BLOCKS_COUNT);

      // Finally we update the state again
      this.setState({ blocks });
    } else {
      let transactions = this.state.transactions;

      transactions = hathorLib.helpers.updateListWs(transactions, tx, hathorLib.constants.DASHBOARD_TX_COUNT);

      // Finally we update the state again
      this.setState({ transactions });
    }
  }

  /**
   * Update state data for transactions and blocks
   */
  updateData = (transactions, blocks) => {
    this.setState({ transactions, blocks });
  }

  /**
   * Go to specific transaction or block page after clicking on the link
   */
  goToList = (e, to) => {
    e.preventDefault();
    this.props.history.push(to);
  }

  /**
   * Reload data after search for address was executed  
   * Must separate into transactions and blocks
   */
  newData = (data) => {
    const transactions = [];
    const blocks = [];
    for (const tx of data) {
      if (hathorLib.helpers.isBlock(tx)) {
        blocks.push(tx);
      } else {
        transactions.push(tx);
      }
    }
    this.updateData(transactions, blocks);
  }

  /**
   * Reset data loading initial data  
   * Executed when searching 'empty' after a previous filter was done
   */
  resetData = () => {
    this.getInitialData();
  }

  render() {
    const renderTableBody = () => {
      return (
        <tbody>
          {this.state.blocks.length ?
              <tr className="tr-title"><td colSpan="2">Blocks <a href="true" onClick={(e) => this.goToList(e, '/blocks/')}>(See all blocks)</a></td></tr>
          : null}
          {renderRows(this.state.blocks)}
          {this.state.transactions.length ?
              <tr className="tr-title"><td colSpan="2">Transactions <a href="true" onClick={(e) => this.goToList(e, '/transactions/')}>(See all transactions)</a></td></tr>
          : null}
          {renderRows(this.state.transactions)}
        </tbody>
      );
    }

    const renderRows = (elements) => {
      return elements.map((tx, idx) => {
        return (
          <TxRow key={tx.tx_id} tx={tx} />
        );
      });
    }

    return (
      <div className="content-wrapper">
        <BackButton {...this.props} />
        <h3 className="mt-4">Explorer</h3>
        <p className="mt-4">Here you can see the most recent transactions and blocks of the network.</p>
        <SearchTx {...this.props} newData={this.newData} resetData={this.resetData} />
        <div className="table-responsive">
          <table className="table" id="tx-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Timestamp</th>
              </tr>
            </thead>
            {renderTableBody()}
          </table>
        </div>
      </div>
    );
  }
}

export default DashboardTx;
