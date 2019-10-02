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
import QRCode from 'qrcode.react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import HathorAlert from '../components/HathorAlert';
import TokenMint from '../components/tokens/TokenMint';
import TokenMelt from '../components/tokens/TokenMelt';
import TokenDelegate from '../components/tokens/TokenDelegate';
import TokenDestroy from '../components/tokens/TokenDestroy';
import { connect } from "react-redux";
import hathorLib from '@hathor/wallet-lib';

const mapStateToProps = (state) => {
  const balance = hathorLib.wallet.calculateBalance(
    Object.values(state.historyTransactions),
    hathorLib.constants.HATHOR_TOKEN_CONFIG.uid
  );
  return {
    htrBalance: balance.available,
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
   * errorMessage {string} error message to show
   * totalSupply {number} Token total supply
   * canMint {boolean} If this token can still be minted
   * canMelt {boolean} If this token can still be melted
   * transactionsCount {number} Total number of transactions of this token
   * paramUID {string} UID of the token in the URL param (useful when we don't have the token registered)
   * tokenUnknown {boolean} If this token is registered or not in the wallet
   */
  state = {
    token: null,
    mintOutputs: [],
    meltOutputs: [],
    walletAmount: 0,
    action: '',
    successMessage: '',
    errorMessage: '',
    totalSupply: 0,
    canMint: null,
    canMelt: null,
    transactionsCount: 0,
    paramUID: null,
    tokenUnknown: null,
  };

  componentDidMount() {
    this.screenMounted();
  }

  componentDidUpdate = (prevProps) => {
    if (this.props.historyTransactions !== prevProps.historyTransactions) {
      this.updateInfo();
    }
  }

  /**
   * Called when the screen is mounted and after register the screen token
   */
  screenMounted = () => {
    const { match: { params } } = this.props;

    const allTokens = hathorLib.tokens.getTokens();
    const token = allTokens.find((data) => data.uid === params.tokenUID);
    const tokenUnknown = token === undefined;

    this.setState({ token, tokenUnknown, paramUID: params.tokenUID }, () => {
      this.updateInfo();
    });
  }

  /**
   * Update token info and wallet info
   */
  updateInfo = () => {
    this.updateTokenInfo();
    this.updateWalletInfo();
  }

  /**
   * Upadte token info getting data from the full node (can mint, can melt, total supply)
   */
  updateTokenInfo = () => {
    hathorLib.walletApi.getGeneralTokenInfo(this.state.paramUID, (response) => {
      if (response.success) {
        this.setState({
          token: {uid: this.state.paramUID, name: response.name, symbol: response.symbol },
          totalSupply: response.total,
          canMint: response.mint.length > 0,
          canMelt: response.melt.length > 0,
          transactionsCount: response.transactions_count,
        });
      } else {
        this.setState({ errorMessage: response.message });
      }
    });
  }

  /**
   * Update token state after didmount or props update
   */
  updateWalletInfo = () => {
    // We only update wallet info if we have this token registered
    if (this.state.tokenUnknown) return;

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
    $('#unregisterModal').modal('show');
  }

  /**
   * When user confirms the unregister of the token, hide the modal and execute it
   */
  unregisterConfirmed = () => {
    $('#unregisterModal').modal('hide');
    tokens.unregisterToken(this.state.token.uid);
    this.screenMounted();
  }

  /**
   * Called when user clicks to register the token, then opens the modal
   */
  registerClicked = () => {
    $('#registerModal').modal('show');
  }

  /**
   * When user confirms the register of the token, hide the modal and execute it
   */
  registerConfirmed = () => {
    $('#registerModal').modal('hide');
    tokens.addToken(this.state.token.uid, this.state.token.name, this.state.token.symbol);
    this.screenMounted();
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
    if (this.state.errorMessage) {
      return (
        <div className="content-wrapper flex align-items-start">
          <p className="text-danger">{this.state.errorMessage}</p>
        </div>
      )
    }

    if (!this.state.token) return null;

    const configurationString = hathorLib.tokens.getConfigurationString(this.state.token.uid, this.state.token.name, this.state.token.symbol);

    const getShortConfigurationString = () => {
      const configArr = configurationString.split(':');
      return `${configArr[0]}:${configArr[1]}...${configArr[3]}`;
    }

    const getUnregisterBody = () => {
      return (
        <div>
          <p>Are you sure you want to unregister the token <strong>{this.state.token.name} ({this.state.token.symbol})</strong>?</p>
          <p>You won't lose your tokens, you just won't see this token on the side bar anymore.</p>
        </div>
      )
    }

    const getRegisterBody = () => {
      return (
        <div>
          <p>Are you sure you want to register the token <strong>{this.state.token.name} ({this.state.token.symbol})</strong>?</p>
        </div>
      )
    }

    const renderBottom = () => {
      switch (this.state.action) {
        case 'mint':
          return <TokenMint htrBalance={this.props.htrBalance} action={this.state.action} cancelAction={this.cancelAction} token={this.state.token} mintOutputs={this.state.mintOutputs} showSuccess={this.showSuccess} />
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

    const renderIcons = () => {
      if (this.state.tokenUnknown) {
        return (
          <div>
            <i className="fa fa-warning text-warning ml-3" title="Token is not registered"></i>
            <i className="fa fa-check pointer ml-3" title="Register token" onClick={this.registerClicked}></i>
          </div>
        );
      } else {
        return (
          <div>
            <i className="fa fa-trash pointer ml-3" title="Unregister token" onClick={this.unregisterClicked}></i>
          </div>
        );
      }
    }

    const renderWalletInfo = () => {
      if (this.state.tokenUnknown) {
        return null;
      } else {
        return (
          <div className="token-detail-wallet-info">
            <h3 className="mt-4 mb-2"><strong>Your balance and administrative actions:</strong></h3>
            <p className="mt-4 mb-4"><strong>Amount: </strong>{hathorLib.helpers.prettyValue(this.state.walletAmount)}</p>
            {renderMintMeltWrapper()}
          </div>
        );
      }
    }

    const renderTokenInfo = () => {
      return (
        <div>
          <h3 className="mt-3 mb-2"><strong>About the token:</strong></h3>
          <p className="mt-4 mb-2"><strong>UID: </strong>{this.state.paramUID}</p>
          <p className="mt-2 mb-2"><strong>Total supply: </strong>{hathorLib.helpers.prettyValue(this.state.totalSupply)} {this.state.token.symbol}</p>
          <p className="mt-2 mb-2"><strong>Can mint: </strong>{this.state.canMint ? <i className="fa fa-check ml-1" title="Can mint"></i> : <i className="fa fa-close ml-1" title="Can't mint"></i>}</p>
          <p className="mt-2 mb-2"><strong>Can melt: </strong>{this.state.canMelt ? <i className="fa fa-check ml-1" title="Can melt"></i> : <i className="fa fa-close ml-1" title="Can't melt"></i>}</p>
          <p className="mt-2 mb-4"><strong>Total transactions: </strong>{this.state.transactionsCount}</p>
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
              {renderIcons()}
            </div>
            {renderTokenInfo()}
            {renderWalletInfo()}
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
        <ModalConfirm modalID="unregisterModal" title="Unregister token" body={getUnregisterBody()} handleYes={this.unregisterConfirmed} />
        <ModalConfirm modalID="registerModal" title="Register token" body={getRegisterBody()} handleYes={this.registerConfirmed} />
        <HathorAlert ref="alertSuccess" text={this.state.successMessage} type="success" />
      </div>
    )
  }
}

export default connect(mapStateToProps)(TokenDetail);
