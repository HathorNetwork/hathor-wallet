/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import tokens from '../utils/tokens';
import helpers from '../utils/helpers';
import wallet from '../utils/wallet';
import { TOKEN_MINT_MASK, TOKEN_MELT_MASK } from '../constants';
import ModalConfirm from '../components/ModalConfirm';
import ModalEditToken from '../components/ModalEditToken';
import QRCode from 'qrcode.react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import HathorAlert from '../components/HathorAlert';
import { connect } from "react-redux";
import ReactLoading from 'react-loading';

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
    };

    // Mint refs
    this.mintAmount = React.createRef();
    this.mintChooseAddress = React.createRef();
    this.mintAddress = React.createRef();
    this.mintCreateAnother = React.createRef();

    // Melt refs
    this.meltAmount = React.createRef();
    this.meltChooseAddress = React.createRef();
    this.meltAddress = React.createRef();
    this.meltCreateAnother = React.createRef();

    // Delegate refs
    this.delegateAddress = React.createRef();
    this.delegateCreateAnother = React.createRef();

    // Destroy refs
    this.destroyQuantity = React.createRef();

    this.form = React.createRef();
  }

  componentDidMount() {
    const { match: { params } } = this.props;

    const allTokens = tokens.getTokens();
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
    const filteredHistoryTransactions = wallet.filterHistoryTransactions(this.props.historyTransactions, this.state.token.uid);
    const mintOutputs = [];
    const meltOutputs = [];
    let walletAmount = 0;

    const walletData = wallet.getWalletData();

    for (const tx of filteredHistoryTransactions) {
      for (const output of tx.outputs) {
        // This output is not mine
        if (!wallet.isAddressMine(output.decoded.address, walletData)) continue;

        // This token is not the one of this screen
        if (output.token !== this.state.token.uid) continue;

        // If output was already used, we can't list it here
        if (output.spent_by) continue;

        if (wallet.isAuthorityOutput(output)) {
          if ((output.value & TOKEN_MINT_MASK) > 0) {
            mintOutputs.push(output);
          } else if ((output.value & TOKEN_MELT_MASK) > 0) {
            meltOutputs.push(output);
          }
        } else {
          walletAmount += output.value;
        }

      }
    }

    this.setState({ mintOutputs, meltOutputs, walletAmount });
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
    console.log(token);
    $('#editTokenModal').modal('hide');
    this.setState({ token });
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
      this.setState({ successMessage: 'Configuration string copied to clipboard!' }, () => {
        this.refs.alertSuccess.show(1000);
      })
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
    this.setState({ action, errorMessage: '' });
  }

  /**
   * Goes to initial state, without any action selected
   */
  cancelAction = () => {
    this.setState({ action: '', errorMessage: '' });
  }
  
  destroyMint = () => {
    // TODO execute destroy, set loading, close modal, show success message, and clean states
    console.log('Destroy mint');
  }

  destroyMelt = () => {
    // TODO execute destroy, set loading, close modal, show success message, and clean states
    console.log('Destroy melt');
  }

  mint = () => {
    // TODO validate form, validate amount and address valids, execute mint, set loading, show success message, and clean states
    console.log('Mint');
  }

  melt = () => {
    // TODO validate form, validate amount valid, execute melt, set loading, show success message, and clean states
    console.log('Melt');
  }

  delegateMelt = () => {
    // TODO validate form, validate address valid, execute delegate, set loading, show success message, and clean states
    console.log('Delegate melt');
  }

  delegateMint = () => {
    // TODO validate form, validate address valid, execute delegate, set loading, show success message, and clean states
    console.log('Delegate mint');
  }

  openDestroyConfirm = () => {
    // TODO validate form and quantity
    $('#confirmDestroy').modal('show');
  }

  render() {
    if (!this.state.token) return null;

    const configurationString = tokens.getConfigurationString(this.state.token.uid, this.state.token.name, this.state.token.symbol);

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
        <div>
          <div className="form-group d-flex flex-row align-items-center address-checkbox">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref="autoselectAddress" id="autoselectAddress" defaultChecked={true} onChange={this.handleCheckboxAddress} />
              <label className="form-check-label" htmlFor="autoselectAddress">
                Select address automatically
              </label>
            </div>
          </div>
          <div className="form-group col-5" ref={this.address} style={{display: 'none'}}>
            <label>Destination address</label>
            <input ref="address" type="text" placeholder="Address" className="form-control" />
          </div>
        </div>
      );
    }

    const renderMintMelt = () => {
      return (
        <div key={this.state.action}>
          <h2>{this.state.action === 'mint' ? 'Mint' : 'Melt'} tokens</h2>
          <form className="mt-4 mb-3" ref={this.form}>
            <div className="row">
              <div className="form-group col-4">
                <label>Amount</label>
                <input required type="number" ref="amount" step={helpers.prettyValue(1)} min={helpers.prettyValue(1)} placeholder={helpers.prettyValue(0)} className="form-control" />
              </div>
              {this.state.action === 'mint' && renderMintAddress()}
            </div>
            <div className="form-group d-flex flex-row align-items-center">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" ref={this.state.action === 'delegate-mint' ? this.delegateMintCreateAnother : this.delegateMeltCreateAnother} id="keepMint" defaultChecked={true} />
                <label className="form-check-label" htmlFor="keepMint">
                  Create another {this.state.action === 'mint' ? 'mint' : 'melt'} output for you?
                </label>
              </div>
            </div>
          </form>
          {renderButtons(this.state.action === 'delegate-mint' ? this.delegateMint : this.delegateMelt, 'Confirm')}
        </div>
      )
    }

    const renderDelegate = () => {
      return (
        <div key={this.state.action}>
          <h2>Delegate {this.state.action === 'delegate-mint' ? 'Mint' : 'Melt'}</h2>
          <form className="mt-4 mb-3" ref={this.form}>
            <div className="row">
              <div className="form-group col-6">
                <label>Address</label>
                <input required ref={this.delegateAddress} type="text" className="form-control" />
              </div>
            </div>
            <div className="form-group d-flex flex-row align-items-center">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" ref={this.state.action === 'delegate-mint' ? this.delegateMintCreateAnother : this.delegateMeltCreateAnother} id="keepMint" defaultChecked={true} />
                <label className="form-check-label" htmlFor="keepMint">
                  Create another {this.state.action === 'delegate-mint' ? 'mint' : 'melt'} output for you?
                </label>
              </div>
            </div>
          </form>
          {renderButtons(this.state.action === 'delegate-mint' ? this.delegateMint : this.delegateMelt, 'Confirm')}
        </div>
      )
    }

    const renderDestroy = () => {
      return (
        <div key={this.state.action}>
          <h2>Destroy {this.state.action === 'destroy-mint' ? 'Mint' : 'Melt'}</h2>
          <form className="mt-4 mb-3" ref={this.form}>
            <div className="row">
              <div className="form-group col-6">
                <label>How many {this.state.action === 'destroy-mint' ? 'mint' : 'melt'} outputs you want to destroy?</label>
                <input required type="number" className="form-control" min="1" max={this.state.action === 'destroy-mint' ? this.state.mintOutputs.length : this.state.meltOutputs.length} step="1" ref={this.destroyQuantity} onChange={(e) => this.setState({ destroyQuantity: e.target.value })} />
              </div>
            </div>
          </form>
          {renderButtons(this.openDestroyConfirm, 'Destroy')}
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

      const quantity = this.state.destroyQuantity;
      const type = this.state.action === 'destroy-mint' ? 'mint' : 'melt';
      const plural = helpers.plural(quantity, 'output', 'outputs');

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
              <p className="mt-3 mb-4"><strong>Total amount: </strong>{helpers.prettyValue(this.state.walletAmount)}</p>
              <div className="d-flex align-items-center mt-3">
                <div className="token-manage-wrapper d-flex flex-column align-items-center mr-4">
                  <p><strong>Mint: </strong>{this.state.mintOutputs.length} {helpers.plural(this.state.mintOutputs.length, 'output', 'outputs')} available</p>
                  {this.state.mintOutputs.length > 0 && renderMintLinks()}
                </div>
                <div className="token-manage-wrapper d-flex flex-column align-items-center">
                  <p><strong>Melt: </strong>{this.state.meltOutputs.length} {helpers.plural(this.state.meltOutputs.length, 'output', 'outputs')} available</p>
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
        <ModalConfirm modalID="confirmDestroy" title="Destroy authority outputs" body={getDestroyBody()} handleYes={this.state.action === 'destroy-mint' ? this.destroyMint : this.destroyMelt} />
        <ModalEditToken token={this.state.token} success={this.editSuccess} />
        <HathorAlert ref="alertSuccess" text={this.state.successMessage} type="success" />
      </div>
    )
  }
}

export default connect(mapStateToProps)(TokenDetail);