import React from 'react';
import wallet from '../utils/wallet';
import $ from 'jquery';
import WalletForm from '../components/WalletForm';


class LoadWallet extends React.Component {
  load = () => {
    let words = '';
    if (this.refs.walletForm.state.wordInput === '24inputs') {
      let wordsArr = [];
      $('.word-input').each((idx, input) => {
        wordsArr.push($(input).val());
      });
      words = wordsArr.join(' ');
    } else {
      words = this.refs.walletForm.refs.oneWordInput.value;
    }
    let success = wallet.generateWallet(words, this.refs.walletForm.state.passphrase, this.refs.walletForm.state.pin, true);
    if (success) {
      this.props.history.push('/wallet/');
    } else {
      this.refs.walletForm.setState({formInvalid: true, errorMessage: 'Invalid sequence of words', loading: false});
    }
  }

  render() {
    return (
      <WalletForm ref="walletForm" submit={this.load} description="Please write your 24 words, passphrase and the pin to encrypt your private keys" loadWallet={true} button="Load" />
    )
  }
}

export default LoadWallet;
