/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { connect } from 'react-redux';
import { get } from 'lodash';
import hathorLib from '@hathor/wallet-lib';
import $ from 'jquery';
import HathorAlert from '../components/HathorAlert';
import TokenHistory from '../components/TokenHistory';
import TokenBar from '../components/TokenBar';
import ModalAddManyTokens from '../components/ModalAddManyTokens';
import BackButton from '../components/BackButton';
import { tokenFetchBalanceRequested, tokenFetchHistoryRequested } from '../actions';
import { WALLET_HISTORY_COUNT } from '../constants';
import helpers from '../utils/helpers';
import wallet from "../utils/wallet";


const mapStateToProps = (state) => {
  return {
    registeredTokens: state.tokens,
    allTokens: state.allTokens,
    tokensBalance: state.tokensBalance,
    tokensHistory: state.tokensHistory,
    tokenMetadata: state.tokenMetadata,
  };
};

const mapDispatchToProps = (dispatch) => ({
  getBalance: (tokenId) => dispatch(tokenFetchBalanceRequested(tokenId)),
  getHistory: (tokenId) => dispatch(tokenFetchHistoryRequested(tokenId)),
});


/**
 * List of unknown tokens with its transactions and possibility to add them
 *
 * @memberof Screens
 */
class UnknownTokens extends React.Component {
  constructor(props) {
    super(props);

    this.anchorHideRefs = [];
    this.anchorOpenRefs = [];
    this.historyRefs = [];

    /**
     * uidSelected {string} UID of the token the user clicked to add
     * successMessage {string} Message to be shown in the alert in case of success
     */
    this.state = {
      uidSelected: null,
      successMessage: ''
    };
  }

  componentDidMount() {
    const unknownTokens = wallet.fetchUnknownTokens(
      this.props.allTokens,
      this.props.registeredTokens,
      this.props.tokensBalance,
      wallet.areZeroBalanceTokensHidden(),
    );

    // Dispatch fetch token balance actions for each token in the list.
    for (const token of unknownTokens) {
      this.props.getBalance(token.uid);
    }
  }

  /**
   * Get all unknown tokens from the wallet
   * Comparing `allTokens` and `tokens` in the Redux we get the ones that are unknown
   *
   * @param {boolean} [hideZeroBalance] If true, omits tokens with zero balance
   * @return {Array} Array with unknown tokens {uid, balance, history}
   */
  getUnknownTokens = (hideZeroBalance) => {
    this.historyRefs = [];
    this.anchorOpenRefs = [];
    this.anchorHideRefs = [];

    const unknownTokens = wallet.fetchUnknownTokens(
      this.props.allTokens,
      this.props.registeredTokens,
      this.props.tokensBalance,
      hideZeroBalance,
    );

    for (const _token of unknownTokens) {
      this.historyRefs.push(React.createRef());
      this.anchorOpenRefs.push(React.createRef());
      this.anchorHideRefs.push(React.createRef());
    }

    return unknownTokens;
  }

  /**
   * Triggered when user clicks to open the history of the unknown token
   *
   * @param {Object} e Event emitted by the click
   * @param {number} index Index of the unknown token user clicked
   * @param {string} tokenId of the unknown token user clicked
   */
  openHistory = (e, index, tokenId) => {
    e.preventDefault();

    this.props.getHistory(tokenId);

    $(this.historyRefs[index].current).show(400);
    $(this.anchorHideRefs[index].current).show(300);
    $(this.anchorOpenRefs[index].current).hide(300);
  }

  /**
   * Triggered when user clicks to hide the history of the unknown token
   *
   * @param {Object} e Event emitted by the click
   * @param {number} index Index of the unknown token user clicked
   */
  hideHistory = (e, index) => {
    e.preventDefault();
    $(this.historyRefs[index].current).hide(400);
    $(this.anchorHideRefs[index].current).hide(300);
    $(this.anchorOpenRefs[index].current).show(300);
  }

  /**
   * Triggered when user clicks to do a bulk import
   */
  massiveImport = () => {
    $('#addManyTokensModal').modal('show');
  }

  /**
   * Triggered after success doing a bulk import
   *
   * @param {number} count Quantity of tokens that were added
   */
  massiveImportSuccess = (count) => {
    $('#addManyTokensModal').modal('hide');
    const message = `${count} ${hathorLib.helpers.plural(count, 'token was', 'tokens were')} added!`;
    this.setState({ successMessage: message }, () => {
      this.refs.alertSuccess.show(3000);
    });
  }

  render = () => {
    const unknownTokens = this.getUnknownTokens(wallet.areZeroBalanceTokensHidden());

    const renderLoadingMessage = (tokenBalance, tokenHistory) => {
      if (tokenBalance.status === 'loading') {
        if (tokenHistory.status === 'loading') {
          return t`Loading token balance and history...`;
        }

        return t`Loading token balance...`;
      }
    };

    const renderTokenBalance = (token, isNFT, tokenBalance, tokenHistory) => {
      const loadingTemplate = () => (
        <div className="d-flex flex-row align-items-center justify-content-start w-100">
          <span><strong>{ renderLoadingMessage(tokenBalance, tokenHistory) }</strong></span>
        </div>
      );

      const balanceTemplate = () => {
        return (
          <div className="d-flex flex-row align-items-center justify-content-start w-100">
            <span><strong>{t`Total:`}</strong> {helpers.renderValue(tokenBalance.data.available + tokenBalance.data.locked, isNFT)}</span>
            <span className="ml-2"><strong>{t`Available:`}</strong> {helpers.renderValue(tokenBalance.data.available, isNFT)}</span>
            <span className="ml-2"><strong>{t`Locked:`}</strong> {helpers.renderValue(tokenBalance.data.locked, isNFT)}</span>
          </div>
        )
      };

      if (tokenHistory.status !== 'ready' || tokenBalance.status !== 'ready') {
        if (tokenBalance.status === 'ready' && tokenHistory.status === 'not-loaded') {
          return balanceTemplate();
        }

        return loadingTemplate();
      }

      return balanceTemplate();
    }

    const renderTokens = () => {
      if (unknownTokens.length === 0) {
        return <p>You don't have any unknown tokens</p>;
      } else {
        return unknownTokens.map((token, index) => {
          const isNFT = helpers.isTokenNFT(token.uid, this.props.tokenMetadata);
          const tokenBalance = get(this.props.tokensBalance, `${token.uid}`, { status: 'not-loaded' });
          const tokenHistory = get(this.props.tokensHistory, `${token.uid}`, { status: 'not-loaded' });

          return (
            <div key={token.uid} className="unknown-token card">
              <div className="header d-flex flex-row align-items-center justify-content-between">
                <div className="d-flex flex-column align-items-center justify-content-center">
                  <p>{token.uid}</p>
                  { renderTokenBalance(token, isNFT, tokenBalance, tokenHistory) }
                </div>
                <div className="d-flex flex-row align-items-center">
                  <a onClick={(e) => this.openHistory(e, index, token.uid)} ref={this.anchorOpenRefs[index]} href="true">
                    {t`Show history`}
                  </a>
                  <a onClick={(e) => this.hideHistory(e, index)} ref={this.anchorHideRefs[index]} href="true" style={{display: 'none'}}>{t`Hide history`}</a>
                </div>
              </div>
              <div className="body mt-3" ref={this.historyRefs[index]} style={{display: 'none'}}>
                { tokenHistory.status === 'ready' && (
                  <TokenHistory count={WALLET_HISTORY_COUNT} selectedToken={token.uid} showPage={false} />
                )}
              </div>
            </div>
          );
        });
      }
    }

    return (
      <div className="content-wrapper">
        <BackButton {...this.props} />
        <div className="d-flex flex-row align-items-center mb-4 mt-4">
          <h3 className="mr-4">{t`Unknown Tokens`}</h3>
          <button onClick={this.massiveImport} className="btn btn-hathor">{t`Register Tokens`}</button>
        </div>
        <p>{t`Those are the custom tokens which you have at least one transaction. They are still unregistered in this wallet. You need to register a custom token in order to send new transactions using it.`}</p>
        <p className="mb-5">{t`If you have reset your wallet, you need to register your custom tokens again.`}</p>
        {unknownTokens && renderTokens()}
        <ModalAddManyTokens success={this.massiveImportSuccess} tokensBalance={this.props.tokensBalance} />
        <HathorAlert ref="alertSuccess" text={this.state.successMessage} type="success" />
        <TokenBar {...this.props}  />
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(UnknownTokens);
