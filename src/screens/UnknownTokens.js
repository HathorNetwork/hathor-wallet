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
import $ from 'jquery';
import HathorAlert from '../components/HathorAlert';
import TokenHistory from '../components/TokenHistory';
import BackButton from '../components/BackButton';
import { tokenFetchBalanceRequested, tokenFetchHistoryRequested } from '../actions';
import { TOKEN_DOWNLOAD_STATUS } from '../sagas/tokens';
import { WALLET_HISTORY_COUNT } from '../constants';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import helpers from '../utils/helpers';
import wallet from "../utils/wallet";
import Loading from '../components/Loading';

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
  static contextType = GlobalModalContext;

  constructor(props) {
    super(props);

    this.anchorHideRefs = [];
    this.anchorOpenRefs = [];
    this.historyRefs = [];

    this.alertSuccessRef = React.createRef();

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
    this.context.showModal(MODAL_TYPES.ADD_MANY_TOKENS, {
      success: this.massiveImportSuccess,
      tokensBalance: this.props.tokensBalance,
    });
  }

  /**
   * Triggered after success doing a bulk import
   *
   * @param {number} count Quantity of tokens that were added
   */
  massiveImportSuccess = (count) => {
    this.context.hideModal();
    const message = `${count} ${helpers.plural(count, 'token was', 'tokens were')} added!`;
    this.setState({ successMessage: message }, () => {
      this.alertSuccessRef.current.show(3000);
    });
  }

  retryDownload = (e, tokenId) => {
    e.preventDefault();
    const balanceStatus = get(
      this.props.tokensBalance,
      `${tokenId}.status`,
      TOKEN_DOWNLOAD_STATUS.LOADING,
    );
    const historyStatus = get(
      this.props.tokensHistory,
      `${tokenId}.status`,
      TOKEN_DOWNLOAD_STATUS.LOADING,
    );

    // We should only retry the request that failed:

    if (historyStatus === TOKEN_DOWNLOAD_STATUS.FAILED) {
      this.props.getHistory(tokenId);
    }

    if (balanceStatus === TOKEN_DOWNLOAD_STATUS.FAILED) {
      this.props.getBalance(tokenId);
    }
  }

  render = () => {
    const unknownTokens = this.getUnknownTokens(wallet.areZeroBalanceTokensHidden());

    const renderLoadingMessage = (tokenBalance, tokenHistory) => {
      if (tokenBalance.status === TOKEN_DOWNLOAD_STATUS.LOADING) {
        if (tokenHistory.status === TOKEN_DOWNLOAD_STATUS.LOADING) {
          return t`Loading token balance and history...`;
        }

        return t`Loading token balance...`;
      }

      if (tokenHistory.status === TOKEN_DOWNLOAD_STATUS.LOADING) {
        return t`Loading token history...`;
      }
    };

    const renderTokenBalance = (token, isNFT, tokenBalance, tokenHistory) => {
      const loadingTemplate = () => (
        <div className="d-flex flex-row align-items-center justify-content-start w-100" style={{ lineHeight: '10px' }}>
          <Loading width={16} height={16} />
          <span style={{marginLeft: 10}}><strong>{ renderLoadingMessage(tokenBalance, tokenHistory) }</strong></span>
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

      const retryTemplate = () => {
        return (
          <div className="d-flex flex-row align-items-center justify-content-start w-100">
            {t`Download failed, please`}&nbsp;
            <a onClick={(e) => this.retryDownload(e, token.uid)} href="true">
              {t`try again`}
            </a>
          </div>
        );
      }

      if (tokenHistory.status === TOKEN_DOWNLOAD_STATUS.FAILED
          || tokenBalance.status === TOKEN_DOWNLOAD_STATUS.FAILED) {
        return retryTemplate();
      }

      if (tokenHistory.status !== TOKEN_DOWNLOAD_STATUS.READY
          || tokenBalance.status !== TOKEN_DOWNLOAD_STATUS.READY) {
        if (tokenBalance.status === TOKEN_DOWNLOAD_STATUS.READY
            && tokenHistory.status === TOKEN_DOWNLOAD_STATUS.INVALIDATED) {
          return balanceTemplate();
        }

        return loadingTemplate();
      }

      return balanceTemplate();
    }

    const renderTokens = () => {
      if (unknownTokens.length === 0) {
        return <p>{t`You don't have any unknown tokens`}</p>;
      }

      return unknownTokens.map((token, index) => {
        const isNFT = helpers.isTokenNFT(token.uid, this.props.tokenMetadata);

        // Note: We can't default to LOADING here otherwise we will never show the `Show History` button
        const tokenBalance = get(this.props.tokensBalance, `${token.uid}`, { status: TOKEN_DOWNLOAD_STATUS.INVALIDATED });
        const tokenHistory = get(this.props.tokensHistory, `${token.uid}`, { status: TOKEN_DOWNLOAD_STATUS.INVALIDATED });

        return (
          <div key={token.uid} className="unknown-token card">
            <div className="header d-flex flex-row align-items-center justify-content-between">
              <div className="d-flex flex-column align-items-center justify-content-center">
                <p>{token.uid}</p>
                { renderTokenBalance(token, isNFT, tokenBalance, tokenHistory) }
              </div>
              <div className="d-flex flex-row align-items-center">
                <a onClick={(e) => this.openHistory(e, index, token.uid)} ref={this.anchorOpenRefs[index]} href="true">
                  {(tokenHistory.status !== TOKEN_DOWNLOAD_STATUS.LOADING
                    && tokenHistory.status !== TOKEN_DOWNLOAD_STATUS.FAILED) && t`Show history`}
                </a>
                <a onClick={(e) => this.hideHistory(e, index)} ref={this.anchorHideRefs[index]} href="true" style={{display: 'none'}}>
                  {(tokenHistory.status !== TOKEN_DOWNLOAD_STATUS.LOADING
                    && tokenHistory.status !== TOKEN_DOWNLOAD_STATUS.FAILED) &&  t`Hide history`}
                </a>
              </div>
            </div>
            <div className="body mt-3" ref={this.historyRefs[index]} style={{display: 'none'}}>
              { tokenHistory.status === TOKEN_DOWNLOAD_STATUS.READY && (
                <TokenHistory count={WALLET_HISTORY_COUNT} selectedToken={token.uid} showPage={false} />
              )}
            </div>
          </div>
        );
      });
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
        <HathorAlert ref={this.alertSuccessRef} text={this.state.successMessage} type="success" />
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(UnknownTokens);
