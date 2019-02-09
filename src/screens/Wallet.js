import React from 'react';
import WalletHistory from '../components/WalletHistory';
import WalletBalance from '../components/WalletBalance';
import WalletAddress from '../components/WalletAddress';
import HathorAlert from '../components/HathorAlert';
import wallet from '../utils/wallet';
import { connect } from "react-redux";


const mapStateToProps = (state) => {
  return { unspentTxs: state.unspentTxs };
};


class Wallet extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      warning: null,
      balance: null,
    }
  }

  componentDidMount = () => {
    this.setState({ balance: wallet.calculateBalance(this.props.unspentTxs) });
  }

  componentDidUpdate(prevProps) {
    if (prevProps.unspentTxs !== this.props.unspentTxs) {
      this.setState({ balance: wallet.calculateBalance(this.props.unspentTxs) });
    }
  }

  showWarning = (message) => {
    this.setState({ warning: message })
    this.refs.alertWarning.show(5000);
  }

  backupKeysWarning = (keysCount) => {
    const warnMessage = `${keysCount} new keys were generated! Backup your wallet`;
    this.showWarning(warnMessage);
  }

  gapLimitWarning = () => {
    const warnMessage = 'You have achieved the limit of unused addresses in sequence. Use this one to generate more.';
    this.showWarning(warnMessage);
  }

  sendTokens = () => {
    this.props.history.push('/wallet/send_tokens');
  }

  willLockWallet = () => {
    wallet.cleanWallet();
    this.props.history.push('/');
  }

  addressLoaded = () => {
    this.setState({addressLoaded: true});
  }

  render() {
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
          <div><button className="btn send-tokens btn-primary" onClick={this.sendTokens}>Send tokens</button></div>
          <div><button className="btn btn-primary" onClick={this.willLockWallet}>Lock wallet</button></div>
        </div>
      );
    }

    const renderUnlockedWallet = () => {
      return (
        <div>
          {renderWallet()}
          {this.state.warning ? <HathorAlert ref="alertWarning" text={this.state.warning} type="warning" /> : null}
        </div>
      );
    }

    return (
      <div className="content-wrapper">
        {renderUnlockedWallet()}
      </div>
    );
  }
}

export default connect(mapStateToProps)(Wallet);
