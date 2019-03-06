import React from 'react';
import WalletHistory from '../components/WalletHistory';
import WalletBalance from '../components/WalletBalance';
import WalletAddress from '../components/WalletAddress';
import ModalBackupWords from '../components/ModalBackupWords';
import HathorAlert from '../components/HathorAlert';
import wallet from '../utils/wallet';
import $ from 'jquery';
import { updateWords } from '../actions/index';
import { connect } from "react-redux";


const mapDispatchToProps = dispatch => {
  return {
    updateWords: data => dispatch(updateWords(data)),
  };
};


const mapStateToProps = (state) => {
  return { unspentTxs: state.unspentTxs };
};


class Wallet extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      balance: null,
      backupDone: true,
    }
  }

  componentDidMount = () => {
    this.setState({ balance: wallet.calculateBalance(this.props.unspentTxs), backupDone: wallet.isBackupDone() });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.unspentTxs !== this.props.unspentTxs) {
      this.setState({ balance: wallet.calculateBalance(this.props.unspentTxs) });
    }
  }

  sendTokens = () => {
    this.props.history.push('/wallet/send_tokens');
  }

  lockWallet = () => {
    wallet.lock();
    this.props.history.push('/locked/');
  }

  backupClicked = (e) => {
    e.preventDefault();
    $('#backupWordsModal').modal('show');
  }

  backupSuccess = () => {
    $('#backupWordsModal').modal('hide');
    wallet.markBackupAsDone();
    this.props.updateWords(null);
    this.setState({ backupDone: true });
    this.refs.alertSuccess.show(1000);
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
              <WalletBalance balance={this.state.balance} />
              {renderBtns("d-flex flex-column")}
            </div>
            <WalletAddress goToSignin={this.goToSignin} />
          </div>
          <div className="d-sm-none d-flex flex-column align-items-center justify-content-between">
            <div className="d-flex flex-column align-items-center justify-content-between">
              <WalletBalance balance={this.state.balance} />
              <div className="d-flex flex-row align-items-center">
                {renderBtns("d-flex")}
              </div>
            </div>
            <WalletAddress goToSignin={this.goToSignin} />
          </div>
          <WalletHistory ref={(node) => { this.historyNode = node; }} />
        </div>
      );
    }

    const renderBtns = (wrapperClass) => {
      return (
        <div className={wrapperClass}>
          <div><button className="btn send-tokens btn-hathor" onClick={this.sendTokens}>Send tokens</button></div>
          <div><button className="btn btn-hathor" onClick={this.lockWallet}>Lock wallet</button></div>
        </div>
      );
    }

    const renderUnlockedWallet = () => {
      return (
        <div>
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
        <HathorAlert ref="alertSuccess" text="Backup completed!" type="success" />
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(Wallet);
