import React from 'react';
import TokenHistory from '../components/TokenHistory';
import { WALLET_HISTORY_COUNT } from '../constants';
import { connect } from "react-redux";


const mapStateToProps = (state) => {
  return { sortedHistory: state.sortedHistory, selectedToken: state.selectedToken };
};


class WalletHistory extends React.Component {
  state = { totalPages: 0 };

  componentDidMount = () => {
    this.updateTotalPages();
  }

  componentDidUpdate = (prevProps) => {
    this.updateTotalPages();
  }

  updateTotalPages = () => {
    if (this.props.sortedHistory === null ||
        this.props.sortedHistory[this.props.selectedToken] === undefined ||
        this.props.sortedHistory[this.props.selectedToken].length === 0) {
      return;
    }

    let calcPages = Math.ceil(this.props.sortedHistory[this.props.selectedToken].length / WALLET_HISTORY_COUNT);
    if (this.state.totalPages !== calcPages) {
      this.setState({ totalPages: calcPages });
    }
  }

  render() {
    const renderHistory = () => {
      let historyData = [];
      if (this.props.sortedHistory !== null && this.props.sortedHistory[this.props.selectedToken] !== undefined) {
        historyData = this.props.sortedHistory[this.props.selectedToken];
      }
      return (
        <div className="d-flex flex-column">
          <strong>Transaction history</strong>
          <TokenHistory history={historyData} totalPages={this.state.totalPages} count={WALLET_HISTORY_COUNT} />
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

export default connect(mapStateToProps)(WalletHistory);
