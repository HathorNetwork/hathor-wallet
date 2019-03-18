import React from 'react';
import WalletHistory from '../components/WalletHistory';
import WalletBalance from '../components/WalletBalance';
import WalletAddress from '../components/WalletAddress';
import ModalBackupWords from '../components/ModalBackupWords';
import ModalAddToken from '../components/ModalAddToken';
import TokenBar from '../components/TokenBar';
import HathorAlert from '../components/HathorAlert';
import wallet from '../utils/wallet';
import $ from 'jquery';
import { updateWords } from '../actions/index';
import { connect } from "react-redux";


const mapDispatchToProps = dispatch => {
  return {
    updateWords: (data) => dispatch(updateWords(data)),
  };
};


const mapStateToProps = (state) => {
  const filteredHistoryTransactions = wallet.filterHistoryTransactions(state.historyTransactions, state.selectedToken);
  const balance = wallet.calculateBalance(filteredHistoryTransactions, state.selectedToken);
  return {
    balance: balance,
    historyTransactions: filteredHistoryTransactions,
    selectedToken: state.selectedToken,
  };
};


class Wallet extends React.Component {
  state = { balance: null, backupDone: true, successMessage: '' };

  componentDidMount = () => {
    this.setState({
      backupDone: wallet.isBackupDone()
    });
  }

  backupClicked = (e) => {
    e.preventDefault();
    $('#backupWordsModal').modal('show');
  }

  backupSuccess = () => {
    $('#backupWordsModal').modal('hide');
    wallet.markBackupAsDone();
    this.props.updateWords(null);
    this.setState({ backupDone: true, successMessage: 'Backup completed!' }, () => {
      this.refs.alertSuccess.show(1000);
    });
  }

  newTokenSuccess = () => {
    $('#addTokenModal').modal('hide');
    this.setState({ successMessage: 'Token added!' }, () => {
      this.refs.alertSuccess.show(1000);
    });
  }

  addTokenClicked = (e) => {
    e.preventDefault()
    $('#addTokenModal').modal('show');
  }

  render() {
    const renderBackupAlert = () => {
      return (
        <div ref="backupAlert" className="alert alert-warning backup-alert" role="alert">
          You haven't done the backup of your wallet yet. You should do it as soon as possible for your own safety. <a href="true" onClick={(e) => this.backupClicked(e)}>Do it now</a>
        </div>
      )
    }

    const renderWallet = () => {
      return (
        <div>
          <div className="d-none d-sm-flex flex-row align-items-center justify-content-between">
            <div className="d-flex flex-column align-items-start justify-content-between">
              <WalletBalance balance={this.props.balance} />
            </div>
            <WalletAddress goToSignin={this.goToSignin} />
          </div>
          <div className="d-sm-none d-flex flex-column align-items-center justify-content-between">
            <div className="d-flex flex-column align-items-center justify-content-between">
              <WalletBalance balance={this.props.balance} />
              <div className="d-flex flex-row align-items-center">
              </div>
            </div>
            <WalletAddress goToSignin={this.goToSignin} />
          </div>
          <WalletHistory
            historyTransactions={this.props.historyTransactions}
            selectedToken={this.props.selectedToken}
            ref={(node) => { this.historyNode = node; }} />
        </div>
      );
    }

    const renderUnlockedWallet = () => {
      return (
        <div className='wallet-wrapper'>
          {renderWallet()}
        </div>
      );
    }

    return (
      <div>
        {!this.state.backupDone && renderBackupAlert()}
        <div className="content-wrapper">
          {renderUnlockedWallet()}
        </div>
        <ModalBackupWords needPassword={true} validationSuccess={this.backupSuccess} />
        <ModalAddToken success={this.newTokenSuccess} />
        <HathorAlert ref="alertSuccess" text={this.state.successMessage} type="success" />
        <TokenBar {...this.props} balance={this.state.balance} addToken={this.addTokenClicked} />
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Wallet);
