import React from 'react';
import TokenHistory from '../components/TokenHistory';
import { WALLET_HISTORY_COUNT } from '../constants';

class WalletHistory extends React.Component {

  getTotalPages = () => {
    const historyTransactions = this.props.historyTransactions;
    if (historyTransactions.length === 0) {
      return;
    }

    let calcPages = Math.ceil(historyTransactions.length / WALLET_HISTORY_COUNT);
    return calcPages;
  }

  render() {
    const renderHistory = () => {
      const totalPages = this.getTotalPages();
      return (
        <div className="d-flex flex-column">
          <strong>Transaction history</strong>
          <TokenHistory history={this.props.historyTransactions} totalPages={totalPages} count={WALLET_HISTORY_COUNT} selectedToken={this.props.selectedToken} />
        </div>
      );
    }

    return (
      <div>
        {renderHistory()}
      </div>
    );
  }
}

export default WalletHistory;
