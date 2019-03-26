import React from 'react';
import txApi from '../api/txApi';
import { DASHBOARD_BLOCKS_COUNT, DASHBOARD_TX_COUNT } from '../constants';
import TxRow from '../components/TxRow';
import SearchTx from '../components/SearchTx';
import helpers from '../utils/helpers';
import WebSocketHandler from '../WebSocketHandler';


class DashboardTx extends React.Component {
  state = { transactions: [], blocks: [] };

  componentDidMount = () => {
    txApi.getDashboardTx(DASHBOARD_BLOCKS_COUNT, DASHBOARD_TX_COUNT, (data) => {
      this.updateData(data.transactions, data.blocks);
    }, (e) => {
      // Error in request
      console.log(e);
    });

    WebSocketHandler.on('network', this.handleWebsocket);
  }

  componentWillUnmount = () => {
    WebSocketHandler.removeListener('network', this.handleWebsocket);
  }

  handleWebsocket = (wsData) => {
    if (wsData.type === 'network:new_tx_accepted') {
      this.updateListWs(wsData);
    }
  }

  updateListWs = (tx) => {
    if (tx.is_block) {
      let blocks = this.state.blocks;

      blocks = helpers.updateListWs(blocks, tx, DASHBOARD_BLOCKS_COUNT);

      // Finally we update the state again
      this.setState({ blocks });
    } else {
      let transactions = this.state.transactions;

      transactions = helpers.updateListWs(transactions, tx, DASHBOARD_TX_COUNT);

      // Finally we update the state again
      this.setState({ transactions });
    }
  }

  updateData = (transactions, blocks) => {
    this.setState({ transactions, blocks });
  }

  goToList = (e, to) => {
    e.preventDefault();
    this.props.history.push(to);
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
          <TxRow key={tx.hash} tx={tx} />
        );
      });
    }

    return (
      <div className="content-wrapper">
        <SearchTx {...this.props} />
        <div className="table-responsive">
          <table className="table" id="tx-table">
            <thead>
              <tr>
                <th>Hash</th>
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