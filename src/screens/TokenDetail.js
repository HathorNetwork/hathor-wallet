/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import tokens from '../utils/tokens';
import ModalConfirm from '../components/ModalConfirm';
import ModalEditToken from '../components/ModalEditToken';
import ModalPin from '../components/ModalPin';
import QRCode from 'qrcode.react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import HathorAlert from '../components/HathorAlert';
import { connect } from "react-redux";
import ReactLoading from 'react-loading';
import hathorLib from '@hathor/wallet-lib';

const mapStateToProps = (state) => {
  return {
    historyTransactions: state.historyTransactions,
  };
};


/**
 * Screen to manage a token. Mint, melt, edit, unregister, configuration string.
 *
 * @memberof Screens
 */
class TokenDetail extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      token: null,
      mintOutputs: [],
      meltOutputs: [],
      walletAmount: 0,
      destroyQuantity: 0, // this is the only one I need as state because I use this value to show message on the confirm modal
      action: '',
      successMessage: '',
      errorMessage: '',
      loading: false,
      pin: '',
      formValidated: false,
    };

    // Mint/melt refs
    this.amount = React.createRef();
    this.chooseAddress = React.createRef(); // Only for mint
    this.address = React.createRef(); // Only for mint
    this.addressWrapper = React.createRef(); // Only for mint
    this.createAnother = React.createRef();

    // Delegate refs
    this.delegateAddress = React.createRef();
    this.delegateCreateAnother = React.createRef();

    // Destroy refs
    this.destroyQuantity = React.createRef();

    this.form = React.createRef();
  }

  componentDidMount() {
    const { match: { params } } = this.props;

    const allTokens = hathorLib.tokens.getTokens();
    const token = allTokens.find((data) => data.uid === params.tokenUID);

    this.setState({ token }, () => {
      this.updateTokenData();
    });
  }

  componentDidUpdate = (prevProps) => {
    if (this.props.historyTransactions !== prevProps.historyTransactions) {
      this.updateTokenData();
    }
  }

  /**
   * Update token state after didmount or props update
   */
  updateTokenData = () => {
    console.log(this.state.token.uid);
    console.log(this.props.historyTransactions['000045dffaa69f3353a2ded1948941c72cfee3e5241e333947bbf5f28b4cbd45']);
    const filteredHistoryTransactions = hathorLib.wallet.filterHistoryTransactions(this.props.historyTransactions, this.state.token.uid, true);
    const mintOutputs = [];
    const meltOutputs = [];
    let walletAmount = 0;

    const walletData = hathorLib.wallet.getWalletData();

    for (const tx of filteredHistoryTransactions) {
      if (tx.tx_id === '000045dffaa69f3353a2ded1948941c72cfee3e5241e333947bbf5f28b4cbd45') {
        console.log('Ta aqui essa porra');
      }
      for (const [index, output] of tx.outputs.entries()) {
        // This output is not mine
        if (!hathorLib.wallet.isAddressMine(output.decoded.address, walletData)) continue;

        // This token is not the one of this screen
        if (output.token !== this.state.token.uid) continue;

        // If output was already used, we can't list it here
        if (output.spent_by) continue;

        output.tx_id = tx.tx_id;
        output.index = index;

        if (hathorLib.wallet.isMintOutput(output)) {
          mintOutputs.push(output);
        } else if (hathorLib.wallet.isMeltOutput(output)) {
          meltOutputs.push(output);
        } else if (!hathorLib.wallet.isAuthorityOutput(output)) {
          walletAmount += output.value;
        }

      }
    }

    this.setState({ mintOutputs, meltOutputs, walletAmount });
  }

  /**
   * Update PIN state when changing it on the PIN modal
   *
   * @param {Object} e Event when changing PIN text
   */
  handleChangePin = (e) => {
    this.setState({ pin: e.target.value });
  }

  /**
   * Called when user clicks to unregister the token, then opens the modal
   */
  unregisterClicked = () => {
    $('#confirmModal').modal('show');
  }

  /**
   * When user confirms the unregister of the token, hide the modal and execute it
   */
  unregisterConfirmed = () => {
    $('#confirmModal').modal('hide');
    tokens.unregisterToken(this.state.token.uid);
    this.props.history.push('/wallet/');
  }

  /**
   * Called when user clicks to edit the token, then  opens the modal
   */
  editClicked = () => {
    $('#editTokenModal').modal('show');
  }

  /**
   * When user finish editing the token, closes the modal
   */
  editSuccess = (token) => {
    $('#editTokenModal').modal('hide');
    this.setState({ token });
    this.showSuccess('Token edited!');
  }

  /**
   * Called when user clicks to download the qrcode
   * Add the href from the qrcode canvas
   *
   * @param {Object} e Event emitted by the link clicked
   */
  downloadQrCode = (e) => {
    e.currentTarget.href = document.getElementsByTagName('canvas')[0].toDataURL();
  }

  showSuccess = (message) => {
    this.setState({ successMessage: message }, () => {
      this.refs.alertSuccess.show(3000);
    })
  }

  /**
   * Method called on copy to clipboard success  
   * Show alert success message
   *
   * @param {string} text Text copied to clipboard
   * @param {*} result Null in case of error
   */
  copied = (text, result) => {
    if (result) {
      // If copied with success
      this.showSuccess('Configuration string copied to clipboard!');
    }
  }

  /**
   * Called when user clicks an action link
   *
   * @param {Object} e Event emitted by the link clicked
   * @param {string} action String representing the action clicked
   */
  actionClicked = (e, action) => {
    e.preventDefault();
    this.cleanStates();
    this.setState({ action });
  }

  /**
   * Goes to initial state, without any action selected
   */
  cancelAction = () => {
    this.cleanStates();
  }

  cleanStates = () => {
    this.setState({ action: '', errorMessage: '', pin: '', formValidated: false, loading: false });
  }

  handlePromise = (promise, successMessage) => {
    console.log('Handle promiseeeee');
    promise.then(() => {
      console.log('Promise then');
      this.cleanStates();
      this.showSuccess(successMessage);
    }, (message) => {
      console.log('Promise catch', message);
      this.setState({ loading: false, errorMessage: message });
    });
  }

  executeDestroy = (array, label) => {
    const data = [];
    for (let i=0; i<this.destroyQuantity.current.value; i++) {
      data.push({
        'tx_id': array[i].tx_id,
        'index': array[i].index,
        'address': array[i].decoded.address,
        'token': this.state.token.uid
      });
    }
    console.log('Execute destroy', data);
    const promise = hathorLib.tokens.destroyAuthority(data, this.state.pin);
    this.handlePromise(promise, `${label} outputs destroyed!`);
  }

  executeDestroyMint = () => {
    console.log('Execute destroy mint');
    this.executeDestroy(this.state.mintOutputs, 'Mint');
  }
  
  destroyMint = () => {
    console.log('Destroy mint');
    if (this.destroyQuantity.current.value > this.state.mintOutputs.length) {
      this.setState({ errorMessage: `You only have ${this.state.mintOutputs.length} mint ${hathorLib.helpers.plural(this.state.mintOutputs.length, 'output', 'outputs')} to destroy.` });
      return;
    }
    console.log('Destroy mint');
    console.log('Quantity', this.destroyQuantity.current.value);
    $('#pinModal').modal('show');
  }

  executeDestroyMelt = () => {
    console.log('Execute destroy melt');
    this.executeDestroy(this.state.meltOutputs, 'Melt');
  }

  destroyMelt = () => {
    console.log('Destroy melt');
    if (this.destroyQuantity.current.value > this.state.meltOutputs.length) {
      this.setState({ errorMessage: `You only have ${this.state.meltOutputs.length} melt ${hathorLib.helpers.plural(this.state.meltOutputs.length, 'output', 'outputs')} to destroy.` });
      return;
    }
    console.log('Destroy melt');
    console.log('Quantity', this.destroyQuantity.current.value);
    $('#pinModal').modal('show');
  }

  executeMint = () => {
    // TODO validate form, validate amount and address valids, execute mint, set loading, show success message, and clean states
    console.log('Execute mint');
    const amountValue = this.amount.current.value*(10**hathorLib.constants.DECIMAL_PLACES);
    const output = this.state.mintOutputs[0];
    const address = this.chooseAddress.current.checked ? hathorLib.wallet.getAddressToUse() : this.address.current.value;
    const promise = hathorLib.tokens.mintTokens(output.tx_id, output.index, output.decoded.address, this.state.token.uid, address, amountValue, this.state.pin, this.createAnother.current.checked, false);
    this.handlePromise(promise, `${hathorLib.helpers.prettyValue(amountValue)} ${this.state.token.symbol} minted!`);
  }

  mint = () => {
    if (this.chooseAddress.current.checked === false && this.address.current.value === '') {
      this.setState({ errorMessage: 'Address is required when not selected automatically' });
      return;
    }
    console.log('Mint');
    console.log('Amount', this.amount.current.value);
    console.log('Address', this.address.current.value);
    console.log('Choose address', this.chooseAddress.current.checked);
    console.log('Create another', this.createAnother.current.checked);
    $('#pinModal').modal('show');
  }

  executeMelt = () => {
    console.log('Execute melt');
    const amountValue = this.amount.current.value*(10**hathorLib.constants.DECIMAL_PLACES);
    const output = this.state.meltOutputs[0];
    const promise = hathorLib.tokens.meltTokens(output.tx_id, output.index, output.decoded.address, this.state.token.uid, amountValue, this.state.pin, this.createAnother.current.checked);
    this.handlePromise(promise, `${hathorLib.helpers.prettyValue(amountValue)} ${this.state.token.symbol} melted!`);
  }

  melt = () => {
    // TODO validate form, validate amount valid, execute melt, set loading, show success message, and clean states
    if (this.amount.current.value > this.state.walletAmount) {
      this.setState({ errorMessage: `The total amount you have is only ${hathorLib.helpers.prettyValue(this.state.walletAmount)}.` });
      return;
    }
    console.log('Melt');
    console.log('Amount', this.amount.current.value);
    console.log('Create another', this.createAnother.current.checked);
    $('#pinModal').modal('show');
  }

  executeDelegateMelt = () => {
    console.log('Execute delegate melt');
    const output = this.state.meltOutputs[0];
    const promise = hathorLib.tokens.delegateAuthority(output.tx_id, output.index, output.decoded.address, this.state.token.uid, this.delegateAddress.current.value, this.delegateCreateAnother.current.checked, 'melt', this.state.pin);
    this.handlePromise(promise, 'Melt output delegated!');
  }

  delegateMelt = () => {
    // TODO validate form, validate address valid, execute delegate, set loading, show success message, and clean states
    console.log('Delegate melt');
    console.log('Delegate address', this.delegateAddress.current.value);
    console.log('Delegate create another', this.delegateCreateAnother.current.value);
    $('#pinModal').modal('show');
  }

  executeDelegateMint = () => {
    console.log('Execute delegate mint');
    const output = this.state.mintOutputs[0];
    const promise = hathorLib.tokens.delegateAuthority(output.tx_id, output.index, output.decoded.address, this.state.token.uid, this.delegateAddress.current.value, this.delegateCreateAnother.current.checked, 'mint', this.state.pin);
    this.handlePromise(promise, 'Mint output delegated!');
  }

  delegateMint = () => {
    // TODO validate form, validate address valid, execute delegate, set loading, show success message, and clean states
    console.log('Delegate mint');
    console.log('Delegate address', this.delegateAddress.current.value);
    console.log('Delegate create another', this.delegateCreateAnother.current.value);
    $('#pinModal').modal('show');
  }

  openPinModal = () => {
    $('#pinModal').modal('show');
  }

  /**
   * Shows/hides address field depending on the checkbox click
   *
   * @param {Object} e Event for the address checkbox input change
   */
  handleCheckboxAddress = (e) => {
    const value = e.target.checked;
    if (value) {
      $(this.addressWrapper.current).hide(400);
    } else {
      $(this.addressWrapper.current).show(400);
    }
  }

  validateForm = () => {
    const isValid = this.form.current.checkValidity();
    console.log('Form validation', isValid);
    this.setState({ formValidated: true, errorMessage: '' });
    if (isValid) {
      switch (this.state.action) {
        case 'mint':
          this.mint();
          break;
        case 'melt':
          this.melt();
          break;
        case 'delegate-mint':
          this.delegateMint();
          break;
        case 'delegate-melt':
          this.delegateMelt();
          break;
        case 'destroy-mint':
          this.destroyMint();
          break;
        case 'destroy-melt':
          this.destroyMelt();
          break;
        default:
          return null;
      }
    }
  }

  pinSuccess = () => {
    $('#pinModal').modal('hide');
    this.setState({ loading: true });
    switch (this.state.action) {
      case 'mint':
        this.executeMint();
        break;
      case 'melt':
        this.executeMelt();
        break;
      case 'delegate-mint':
        this.executeDelegateMint();
        break;
      case 'delegate-melt':
        this.executeDelegateMelt();
        break;
      case 'destroy-mint':
        this.executeDestroyMint();
        break;
      case 'destroy-melt':
        this.executeDestroyMelt();
        break;
      default:
        return null;
    }
  }

  render() {
    if (!this.state.token) return null;

    const configurationString = hathorLib.tokens.getConfigurationString(this.state.token.uid, this.state.token.name, this.state.token.symbol);

    const getShortConfigurationString = () => {
      const configArr = configurationString.split(':');
      return `${configArr[0]}:${configArr[1]}...${configArr[3]}`;
    }

    const getUnregisterBody = () => {
      return (
        <div>
          <p>Are you sure you want to unregister the token <strong>{this.state.token.name} ({this.state.token.symbol})</strong></p>
          <p>You won't lose your tokens, you just won't see this token on the side bar anymore</p>
        </div>
      )
    }

    const renderBottom = () => {
      switch (this.state.action) {
        case 'mint':
        case 'melt':
          return renderMintMelt();
        case 'delegate-mint':
        case 'delegate-melt':
          return renderDelegate();
        case 'destroy-mint':
        case 'destroy-melt':
          return renderDestroy();
        default:
          return null;
      }
    }

    const renderMintAddress = () => {
      return (
        <div className="d-flex flex-row align-items-center justify-content-start col-9">
          <div className="d-flex flex-row align-items-center address-checkbox">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={this.chooseAddress} id="autoselectAddress" defaultChecked={true} onChange={this.handleCheckboxAddress} />
              <label className="form-check-label" htmlFor="autoselectAddress">
                Select address automatically
              </label>
            </div>
          </div>
          <div className="form-group col-8" ref={this.addressWrapper} style={{display: 'none'}}>
            <label>Destination address</label>
            <input ref={this.address} type="text" placeholder="Address" className="form-control" />
          </div>
        </div>
      );
    }

    const renderMintMelt = () => {
      return (
        <div key={this.state.action}>
          <h2>{this.state.action === 'mint' ? 'Mint' : 'Melt'} tokens</h2>
          <form className={`mt-4 mb-3 ${this.state.formValidated ? 'was-validated' : ''}`} ref={this.form} >
            <div className="row">
              <div className="form-group col-3">
                <label>Amount</label>
                <input required type="number" ref={this.amount} step={hathorLib.helpers.prettyValue(1)} min={hathorLib.helpers.prettyValue(1)} placeholder={hathorLib.helpers.prettyValue(0)} className="form-control" />
              </div>
              {this.state.action === 'mint' && renderMintAddress()}
            </div>
            <div className="form-group d-flex flex-row align-items-center">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" ref={this.createAnother} id="keepMint" defaultChecked={true} />
                <label className="form-check-label" htmlFor="keepMint">
                  Create another {this.state.action === 'mint' ? 'mint' : 'melt'} output for you?
                </label>
              </div>
            </div>
          </form>
          {renderButtons(this.validateForm, 'Confirm')}
        </div>
      )
    }

    const renderDelegate = () => {
      return (
        <div key={this.state.action}>
          <h2>Delegate {this.state.action === 'delegate-mint' ? 'Mint' : 'Melt'}</h2>
          <form className={`mt-4 mb-3 ${this.state.formValidated ? 'was-validated' : ''}`} ref={this.form}>
            <div className="row">
              <div className="form-group col-6">
                <label>Address</label>
                <input required ref={this.delegateAddress} type="text" className="form-control" />
              </div>
            </div>
            <div className="form-group d-flex flex-row align-items-center">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" ref={this.delegateCreateAnother} id="keepMint" defaultChecked={true} />
                <label className="form-check-label" htmlFor="keepMint">
                  Create another {this.state.action === 'delegate-mint' ? 'mint' : 'melt'} output for you?
                </label>
              </div>
            </div>
          </form>
          {renderButtons(this.validateForm, 'Confirm')}
        </div>
      )
    }

    const renderDestroy = () => {
      return (
        <div key={this.state.action}>
          <h2>Destroy {this.state.action === 'destroy-mint' ? 'Mint' : 'Melt'}</h2>
          <form className={`mt-4 mb-3 ${this.state.formValidated ? 'was-validated' : ''}`} ref={this.form}>
            <div className="row">
              <div className="form-group col-6">
                <label>How many {this.state.action === 'destroy-mint' ? 'mint' : 'melt'} outputs you want to destroy?</label>
                <input required type="number" className="form-control" min="1" step="1" ref={this.destroyQuantity} onChange={(e) => this.setState({ destroyQuantity: e.target.value })} />
              </div>
            </div>
          </form>
          {renderButtons(this.validateForm, 'Destroy')}
        </div>
      )
    }

    const renderButtons = (onClick, label) => {
      return (
        <div className='d-flex mt-4 flex-column'>
          {this.state.errorMessage && <p className='text-danger mb-4'>{this.state.errorMessage}</p>}
          <div className='d-flex align-items-center'>
            <button className='btn btn-secondary mr-3' disabled={this.state.loading} onClick={this.cancelAction}>Cancel</button>
            <button className='btn btn-hathor mr-4' disabled={this.state.loading} onClick={onClick}>{label}</button>
            {this.state.loading && <ReactLoading type='spin' color='#0081af' width={32} height={32} delay={200} />}
          </div>
        </div>
      )
    }

    const renderMeltLinks = () => {
      return (
        <div className="d-flex flex-column align-items-center">
          <a className={`${this.state.action === 'melt' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'melt')} href="true">Melt tokens <i className="fa fa-minus ml-1" title="Melt tokens"></i></a>
          <a className={`mt-1 mb-1 ${this.state.action === 'delegate-melt' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'delegate-melt')} href="true">Delegate melt <i className="fa fa-long-arrow-up ml-1" title="Delegate melt"></i></a>
          <a className={`${this.state.action === 'destroy-melt' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'destroy-melt')} href="true">Destroy melt <i className="fa fa-trash ml-1" title="Destroy melt"></i></a>
        </div>
      );
    }

    const renderMintLinks = () => {
      return (
        <div className="d-flex flex-column align-items-center">
          <a className={`${this.state.action === 'mint' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'mint')} href="true">Mint tokens <i className="fa fa-plus ml-1" title="Mint more tokens"></i></a>
          <a className={`mt-1 mb-1 ${this.state.action === 'delegate-mint' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'delegate-mint')} href="true">Delegate mint <i className="fa fa-long-arrow-up ml-1" title="Delegate mint"></i></a>
          <a className={`${this.state.action === 'destroy-mint' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'destroy-mint')} href="true">Destroy mint <i className="fa fa-trash ml-1" title="Destroy mint"></i></a>
        </div>
      );
    }

    const getDestroyBody = () => {
      if (this.state.action !== 'destroy-mint' && this.state.action !== 'destroy-melt') return null;

      const quantity = parseInt(this.state.destroyQuantity, 10);
      const type = this.state.action === 'destroy-mint' ? 'mint' : 'melt';
      const plural = hathorLib.helpers.plural(quantity, 'output', 'outputs');

      return (
        <p>Are you sure you want to destroy <strong>{quantity} {type}</strong> authority {plural}?</p>
      )
    }

    return (
      <div className="content-wrapper flex align-items-center">
        <div className='d-flex flex-row align-items-start justify-content-between token-detail-top'>
          <div className='d-flex flex-column justify-content-between mt-4'>
            <div className='token-wrapper d-flex flex-row align-items-center mb-3'>
              <p className='token-name mb-0'>
                <strong>{this.state.token.name} ({this.state.token.symbol})</strong>
              </p>
              <div>
                <i className="fa fa-pencil pointer ml-3" title="Edit token" onClick={this.editClicked}></i>
                <i className="fa fa-trash pointer ml-3" title="Unregister token" onClick={this.unregisterClicked}></i>
              </div>
            </div>
            <div>
              <p className="mt-3 mb-4"><strong>Total amount: </strong>{hathorLib.helpers.prettyValue(this.state.walletAmount)}</p>
              <div className="d-flex align-items-center mt-3">
                <div className="token-manage-wrapper d-flex flex-column align-items-center mr-4">
                  <p><strong>Mint: </strong>{this.state.mintOutputs.length} {hathorLib.helpers.plural(this.state.mintOutputs.length, 'output', 'outputs')} available</p>
                  {this.state.mintOutputs.length > 0 && renderMintLinks()}
                </div>
                <div className="token-manage-wrapper d-flex flex-column align-items-center">
                  <p><strong>Melt: </strong>{this.state.meltOutputs.length} {hathorLib.helpers.plural(this.state.meltOutputs.length, 'output', 'outputs')} available</p>
                  {this.state.meltOutputs.length > 0 && renderMeltLinks()}
                </div>
              </div>
            </div>
          </div>
          <div className='d-flex flex-column align-items-center config-string-wrapper mt-4'>
            <p><strong>Configuration String</strong></p>
            <span ref="configurationString" className="mb-2">
              {getShortConfigurationString()}
              <CopyToClipboard text={configurationString} onCopy={this.copied}>
                <i className="fa fa-clone pointer ml-1" title="Copy to clipboard"></i>
              </CopyToClipboard>
            </span> 
            <QRCode size={200} value={configurationString} />
            <a className="mt-2" onClick={(e) => this.downloadQrCode(e)} download={`${this.state.token.name} (${this.state.token.symbol}) - ${configurationString}`} href="true" ref="downloadLink">Download <i className="fa fa-download ml-1" title="Download QRCode"></i></a>
          </div>
        </div>
        <div className='token-detail-bottom'>
          {renderBottom()}
        </div>
        <ModalConfirm title="Unregister token" body={getUnregisterBody()} handleYes={this.unregisterConfirmed} />
        <ModalEditToken token={this.state.token} success={this.editSuccess} />
        <HathorAlert ref="alertSuccess" text={this.state.successMessage} type="success" />
        <ModalPin execute={this.pinSuccess} handleChangePin={this.handleChangePin} bodyTop={getDestroyBody()} />
      </div>
    )
  }
}

export default connect(mapStateToProps)(TokenDetail);