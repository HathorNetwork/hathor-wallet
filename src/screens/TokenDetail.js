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
import QRCode from 'qrcode.react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import HathorAlert from '../components/HathorAlert';
import { TokenDestroy, TokenDelegate, TokenMint, TokenMelt } from '../components/TokenDetailAction';
import { connect } from "react-redux";
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
  /**
   * token {Object} selected token data
   * mintOutputs {Object} array with outputs available to mint
   * meltOutputs {Object} array with outputs available to melt
   * walletAmount {number} amount available of this token on this wallet
   * action {string} selected action (mint, melt, delegate-mint, delegate-melt, destroy-mint, destroy-melt)
   * successMessage {string} success message to show
   */
  state = {
    token: null,
    mintOutputs: [],
    meltOutputs: [],
    walletAmount: 0,
    action: '',
    successMessage: '',
  };

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
    const mintOutputs = [];
    const meltOutputs = [];
    let walletAmount = 0;

    const walletData = hathorLib.wallet.getWalletData();

    for (const tx_id in this.props.historyTransactions) {
      const tx = this.props.historyTransactions[tx_id];
      for (const [index, output] of tx.outputs.entries()) {
        // This output is not mine
        if (!hathorLib.wallet.isAddressMine(output.decoded.address, walletData)) {
          continue;
        }

        // This token is not the one of this screen
        if (output.token !== this.state.token.uid) {
          continue;
        }

        // If output was already used, we can't list it here
        if (output.spent_by) {
          continue;
        }

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

  /**
   * Show alert success message
   *
   * @param {string} message Success message
   */
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

  /**
   * Clean all states to its initial values
   */
  cleanStates = () => {
    this.setState({ action: '', errorMessage: '', pin: '', formValidated: false, loading: false });
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
          return <TokenMint action={this.state.action} cancelAction={this.cancelAction} token={this.state.token} mintOutputs={this.state.mintOutputs} showSuccess={this.showSuccess} />
        case 'melt':
          return <TokenMelt action={this.state.action} cancelAction={this.cancelAction} token={this.state.token} meltOutputs={this.state.meltOutputs} showSuccess={this.showSuccess} walletAmount={this.state.walletAmount} />
        case 'delegate-mint':
          return <TokenDelegate action={this.state.action} cancelAction={this.cancelAction} token={this.state.token} authorityOutputs={this.state.mintOutputs} showSuccess={this.showSuccess} />
        case 'delegate-melt':
          return <TokenDelegate action={this.state.action} cancelAction={this.cancelAction} token={this.state.token} authorityOutputs={this.state.meltOutputs} showSuccess={this.showSuccess} />
        case 'destroy-mint':
          return <TokenDestroy action={this.state.action} cancelAction={this.cancelAction} token={this.state.token} authorityOutputs={this.state.mintOutputs} showSuccess={this.showSuccess} />
        case 'destroy-melt':
          return <TokenDestroy action={this.state.action} cancelAction={this.cancelAction} token={this.state.token} authorityOutputs={this.state.meltOutputs} showSuccess={this.showSuccess} />
        default:
          return null;
      }
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

    const renderMintMeltWrapper = () => {
      if (this.state.mintOutputs.length === 0 && this.state.meltOutputs.length === 0) {
        return null;
      }

      return (
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
      );
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
              {renderMintMeltWrapper()}
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
      </div>
    )
  }
}

export default connect(mapStateToProps)(TokenDetail);