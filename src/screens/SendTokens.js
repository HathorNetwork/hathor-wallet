import React from 'react';
import $ from 'jquery';
import walletApi from '../api/wallet';
import { util } from 'bitcore-lib';
import transaction from '../utils/transaction';
import AddressError from '../utils/errors';
import ReactLoading from 'react-loading';
import ModalPin from '../components/ModalPin';
import SendTokensOne from '../components/SendTokensOne';
import tokens from '../utils/tokens';
import { HATHOR_TOKEN_CONFIG } from '../constants';
import { connect } from "react-redux";


const mapStateToProps = (state) => {
  return { tokens: state.tokens };
};


class SendTokens extends React.Component {
  constructor(props) {
    super(props);

    // Holds the children components references
    this.references = [React.createRef()];

    this.state = {
      errorMessage: '',
      loading: false,
      pin: '',
      txTokens: [HATHOR_TOKEN_CONFIG]
    };
  }


  validateData = () => {
    const isValid = this.refs.formSendTokens.checkValidity();
    if (isValid === false) {
      this.refs.formSendTokens.classList.add('was-validated');
    } else {
      this.refs.formSendTokens.classList.remove('was-validated');
    }
    return isValid;
  }

  getData = () => {
    let data = {'inputs': [], 'outputs': []};
    for (const ref of this.references) {
      const instance = ref.current.getWrappedInstance();
      let dataOne = instance.getData();
      if (!dataOne) return;
      dataOne = instance.handleInitialData(dataOne);
      if (!dataOne) return;
      data['inputs'] = [...data['inputs'], ...dataOne['inputs']];
      data['outputs'] = [...data['outputs'], ...dataOne['outputs']];
    }
    return data;
  }

  send = () => {
    $('#pinModal').modal('toggle');
    const isValid = this.validateData();
    if (!isValid) return;
    let data = this.getData();
    if (!data) return;
    data.tokens = tokens.filterTokens(this.state.txTokens, HATHOR_TOKEN_CONFIG).map((token) => token.uid);
    if (data) {
      this.setState({ errorMessage: '', loading: true });
      try {
        let dataToSign = transaction.dataToSign(data);
        data = transaction.signTx(data, dataToSign, this.state.pin);
        // Completing data in the same object
        transaction.completeTx(data);
        let txBytes = transaction.txToBytes(data);
        let txHex = util.buffer.bufferToHex(txBytes);
        walletApi.sendTokens(txHex, (response) => {
          if (response.success) {
            this.props.history.push('/wallet/');
          } else {
            this.setState({ errorMessage: response.message, loading: false });
          }
        }, (e) => {
          // Error in request
          console.log(e);
          this.setState({ loading: false });
        });
      } catch(e) {
        if (e instanceof AddressError) {
          this.setState({ errorMessage: e.message, loading: false });
        } else {
          // Unhandled error
          throw e;
        }
      }
    }
  }

  handleChangePin = (e) => {
    this.setState({ pin: e.target.value });
  }

  updateState = (newState) => {
    this.setState(newState);
  }

  addAnotherToken = () => {
    if (this.state.txTokens.length === this.props.tokens.length) {
      this.setState({ errorMessage: 'All your tokens were already added' });
      return;
    }

    // Among all the token options we choose the first one that is not already selected
    const newToken = this.props.tokens.find((token) => {
      return this.state.txTokens.find((txToken) =>
        txToken.uid === token.uid
      ) === undefined
    });

    this.references.push(React.createRef());
    const txTokens = [...this.state.txTokens, newToken];
    this.setState({ txTokens });
  }

  tokenSelectChange = (selected, index) => {
    let txTokens = [...this.state.txTokens];
    txTokens[index] = selected;
    this.setState({ txTokens });
  }

  removeToken = (index) => {
    let txTokens = [...this.state.txTokens];
    txTokens.splice(index, 1);
    this.setState({ txTokens });
    this.references.splice(index, 1);
  }

  render = () => {
    const renderOnePage = () => {
      return this.state.txTokens.map((token, index) => {
        return <SendTokensOne key={`${token.uid}-${index}`} ref={this.references[index]} pin={this.state.pin} config={token} index={index} selectedTokens={this.state.txTokens} tokens={this.props.tokens} tokenSelectChange={this.tokenSelectChange} removeToken={this.removeToken} updateState={this.updateState} />
      });
    }

    const renderPage = () => {
      return (
        <div className='content-wrapper'>
          <form ref="formSendTokens" id="formSendTokens">
            {renderOnePage()}
            <div className="mt-5">
              <button type="button" className="btn btn-secondary mr-4" onClick={this.addAnotherToken} disabled={this.state.loading}>Add another token</button>
              <button type="button" className="btn btn-hathor" data-toggle="modal" disabled={this.state.loading} data-target="#pinModal">Send Tokens</button>
            </div>
          </form>
          <p className="text-danger mt-3">{this.state.errorMessage}</p>
        </div>
      );
    }

    const isLoading = () => {
      return (
        <div className="d-flex flex-row">
          <p className="mr-3">Please, wait while we solve the proof of work and propagate the transaction</p>
          <ReactLoading type='spin' color='#0081af' width={24} height={24} delay={200} />
        </div>
      )
    }

    return (
      <div className="content-wrapper flex align-items-center">
        {renderPage()}
        {this.state.loading ? isLoading() : null}
        <ModalPin execute={this.send} handleChangePin={this.handleChangePin} />
      </div>
    );
  }
}

export default connect(mapStateToProps)(SendTokens);
