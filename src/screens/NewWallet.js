import React from 'react';
import wallet from '../utils/wallet';
import WalletForm from '../components/WalletForm';


class NewWallet extends React.Component {
  create = () => {
    let words = wallet.executeGenerateWallet(256, this.refs.walletForm.state.passphrase, this.refs.walletForm.state.pin);
    this.refs.walletForm.setState({words: words});
  }

  goToWallet = () => {
    this.props.history.push('/wallet/');
  }

  render() {
    return (
      <WalletForm ref="walletForm" submit={this.create} description="Please write your passphrase and a pin to encrypt your private key" loadWallet={false} button="Create" goToWallet={this.goToWallet} />
    )
  }
}

export default NewWallet;
