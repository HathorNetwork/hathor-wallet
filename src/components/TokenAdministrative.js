/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import hathorLib from '@hathor/wallet-lib';
import { t } from 'ttag';
import { connect } from "react-redux";
import { get } from 'lodash';
import HathorAlert from '../components/HathorAlert';
import TokenMint from '../components/tokens/TokenMint';
import TokenMelt from '../components/tokens/TokenMelt';
import TokenDelegate from '../components/tokens/TokenDelegate';
import TokenDestroy from '../components/tokens/TokenDestroy';
import Loading from '../components/Loading';
import helpers from '../utils/helpers';
import { TOKEN_DOWNLOAD_STATUS } from '../constants';
import LOCAL_STORE from '../storage';

const mapStateToProps = (state) => {
  const HTR_UID = hathorLib.constants.NATIVE_TOKEN_UID;
  const htrBalance = get(state.tokensBalance, `${HTR_UID}.data.available`, 0n);

  return {
    htrBalance,
    tokensHistory: state.tokensHistory,
    tokensBalance: state.tokensBalance,
    tokenMetadata: state.tokenMetadata,
    useWalletService: state.useWalletService,
    decimalPlaces: state.serverInfo.decimalPlaces,
  };
};

/**
 * Component to manage a token. Mint, melt, delegate, destroy.
 *
 * @memberof Components
 */
class TokenAdministrative extends React.Component {
  constructor(props) {
    super(props);

    this.alertSuccessRef = React.createRef();
  }

  /**
   * mintCount {Number} Quantity of mint authorities available
   * meltCount {Number} Quantity of melt authorities available
   * action {String} selected action (mint, melt, delegate-mint, delegate-melt, destroy-mint, destroy-melt)
   * successMessage {String} success message to show
   * errorMessage {String} Message to show in case of error getting token info
   * totalSupply {bigint} Token total supply
   * balance.status {String} The current status of the token balance download
   * balance.data.available {Number} Amount available of the current token
   * balance.data.locked {Number} Amount locked of the current token
   */
  state = {
    mintCount: 0,
    meltCount: 0,
    action: '',
    successMessage: '',
    errorMessage: '',
    totalSupply: null,
    balance: {
      status: TOKEN_DOWNLOAD_STATUS.LOADING,
      data: {
        available: 0n,
        locked: 0n,
      },
    },
  };

  /**
   * Show alert success message
   *
   * @param {string} message Success message
   */
  showSuccess = (message) => {
    this.setState({ successMessage: message }, () => {
      this.alertSuccessRef.current.show(3000);
    });
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
    this.setState({ action: '' });
  }

  render() {
    if (LOCAL_STORE.isHardwareWallet()) {
      return (
        <div className="content-wrapper flex align-items-start">
          <p>{t`This feature is not currently supported for a hardware wallet.`}</p>
        </div>
      )
    }

    if (this.state.errorMessage) {
      return (
        <div className="content-wrapper flex align-items-start">
          <p className="text-danger">{this.state.errorMessage}</p>
        </div>
      )
    }

    const renderBottom = () => {
      switch (this.state.action) {
        case 'mint':
          return <TokenMint htrBalance={this.props.htrBalance} action={this.state.action} cancelAction={this.cancelAction} token={this.props.token} showSuccess={this.showSuccess} />
        case 'melt':
          return <TokenMelt action={this.state.action} cancelAction={this.cancelAction} token={this.props.token} showSuccess={this.showSuccess} tokenBalance={this.props.tokenBalance} />
        case 'delegate-mint':
          return <TokenDelegate action={this.state.action} cancelAction={this.cancelAction} token={this.props.token} showSuccess={this.showSuccess} />
        case 'delegate-melt':
          return <TokenDelegate action={this.state.action} cancelAction={this.cancelAction} token={this.props.token} showSuccess={this.showSuccess} />
        case 'destroy-mint':
          return <TokenDestroy action={this.state.action} cancelAction={this.cancelAction} token={this.props.token} authoritiesLength={this.props.mintCount} showSuccess={this.showSuccess} />
        case 'destroy-melt':
          return <TokenDestroy action={this.state.action} cancelAction={this.cancelAction} token={this.props.token} authoritiesLength={this.props.meltCount} showSuccess={this.showSuccess} />
        default:
          return null;
      }
    };

    const renderMeltLinks = () => {
      return (
        <div className="d-flex flex-column align-items-center">
          <p><strong>{t`Operations`}</strong></p>
          <a className={`${this.state.action === 'melt' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'melt')} href="true">{t`Melt tokens`} <i className="fa fa-minus ml-1" title={t`Melt tokens`}></i></a>
          <a className={`mt-1 mb-1 ${this.state.action === 'delegate-melt' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'delegate-melt')} href="true">{t`Delegate melt`} <i className="fa fa-long-arrow-up ml-1" title={t`Delegate melt`}></i></a>
          <a className={`${this.state.action === 'destroy-melt' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'destroy-melt')} href="true">{t`Destroy melt`} <i className="fa fa-trash ml-1" title={t`Destroy melt`}></i></a>
        </div>
      );
    };

    const renderMintLinks = () => {
      return (
        <div className="d-flex flex-column align-items-center">
          <p><strong>{t`Operations`}</strong></p>
          <a className={`${this.state.action === 'mint' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'mint')} href="true">{t`Mint tokens`} <i className="fa fa-plus ml-1" title={t`Mint more tokens`}></i></a>
          <a className={`mt-1 mb-1 ${this.state.action === 'delegate-mint' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'delegate-mint')} href="true">{t`Delegate mint`} <i className="fa fa-long-arrow-up ml-1" title={t`Delegate mint`}></i></a>
          <a className={`${this.state.action === 'destroy-mint' && 'font-weight-bold'}`} onClick={(e) => this.actionClicked(e, 'destroy-mint')} href="true">{t`Destroy mint`} <i className="fa fa-trash ml-1" title={t`Destroy mint`}></i></a>
        </div>
      );
    };

    const renderMintMeltWrapper = () => {
      if (this.props.mintCount === 0 && this.props.meltCount === 0) {
        return <p>{t`You have no more authority outputs for this token`}</p>;
      }

      return (
        <div className="d-flex align-items-center mt-3">
          <div className="token-manage-wrapper d-flex flex-column align-items-center mr-4">
            <p><strong>{t`Mint authority management`}</strong></p>
            <p>You are the owner of {this.props.mintCount} mint {helpers.plural(this.props.mintCount, 'output', 'outputs')}</p>
            {this.props.mintCount > 0 && renderMintLinks()}
          </div>
          <div className="token-manage-wrapper d-flex flex-column align-items-center">
            <p><strong>{t`Melt authority management`}</strong></p>
            <p>You are the owner of {this.props.meltCount} melt {helpers.plural(this.props.meltCount, 'output', 'outputs')}</p>
            {this.props.meltCount > 0 && renderMeltLinks()}
          </div>
        </div>
      );
    };

    const renderReadyBalance = () => (
      <>
        { hathorLib.numberUtils.prettyValue(this.props.tokenBalance.data.available, isNFT ? 0 : this.props.decimalPlaces) }
        &nbsp;
        { this.props.token.symbol }
      </>
    );


    const isNFT = helpers.isTokenNFT(get(this.props, 'token.uid'), this.props.tokenMetadata);

    return (
      <div className="flex align-items-center">
        <p className="mt-2 mb-2"><strong>{t`Total supply:`} </strong>{this.props.totalSupply ? hathorLib.numberUtils.prettyValue(this.props.totalSupply, isNFT ? 0 : this.props.decimalPlaces) : '-'} {this.props.token.symbol}</p>
        <div className="mt-2 mb-2">
          <strong>{t`Your balance available:`} </strong>
          { this.props.tokenBalance.status === TOKEN_DOWNLOAD_STATUS.LOADING && (
            <Loading width={14} height={14} />
          ) }
          { this.props.tokenBalance.status === TOKEN_DOWNLOAD_STATUS.READY && renderReadyBalance() }
        </div>
        <div className="token-detail-wallet-info">
          {renderMintMeltWrapper()}
        </div>
        <div className='token-detail-bottom'>
          {renderBottom()}
        </div>
        <HathorAlert ref={this.alertSuccessRef} text={this.state.successMessage} type="success" />
      </div>
    )
  }
}


/*
 * token: Token to show administrative tools {name, symbol, uid}
 */
TokenAdministrative.propTypes = {
  token: PropTypes.exact({
    name: PropTypes.string,
    symbol: PropTypes.string,
    uid: PropTypes.string,
  }),
};

export default connect(mapStateToProps, null, null, {forwardRef: true})(TokenAdministrative);
