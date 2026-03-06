/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useContext, useEffect, useRef, useState } from 'react';
import { t } from 'ttag';
import { useDispatch, useSelector } from 'react-redux';
import { get } from 'lodash';
import $ from 'jquery';
import { numberUtils } from '@hathor/wallet-lib';
import HathorAlert from '../components/HathorAlert';
import TokenHistory from '../components/TokenHistory';
import BackButton from '../components/BackButton';
import { tokenFetchBalanceRequested, tokenFetchHistoryRequested } from '../actions';
import { TOKEN_DOWNLOAD_STATUS } from '../constants';
import { WALLET_HISTORY_COUNT } from '../constants';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import helpers from '../utils/helpers';
import walletUtils from '../utils/wallet';
import Loading from '../components/Loading';

/**
 * List of unknown tokens with its transactions and possibility to add them
 *
 * @memberof Screens
 */
function UnknownTokens() {
  const dispatch = useDispatch();

  const {
    registeredTokens,
    allTokens,
    tokensBalance,
    tokensHistory,
    tokenMetadata,
    decimalPlaces,
  } = useSelector(
    (state) => ({
      registeredTokens: state.tokens,
      allTokens: state.allTokens,
      tokensBalance: state.tokensBalance,
      tokensHistory: state.tokensHistory,
      tokenMetadata: state.tokenMetadata,
      decimalPlaces: state.serverInfo.decimalPlaces,
    })
  );

  const modalContext = useContext(GlobalModalContext);

  /** Holds references to the "Open" and "Hide" link elements, that are rendered dynamically */
  const anchorHideRefs = useRef([]);
  const anchorOpenRefs = useRef([]);
  /** Holds references to the transaction history elements, that are rendered dynamically */
  const historyRefs = useRef([]);
  /** Holds reference to the success alert element */
  const alertSuccessRef = useRef(null);

  /** successMessage {string} Message to be shown in the alert in case of success */
  const [successMessage, setSuccessMessage] = useState('');

  /**
   * Pre-emptively fetches all unknown token balances from server at component mount
   */
  useEffect(() => {
    const unknownTokens = walletUtils.fetchUnknownTokens(
      allTokens,
      registeredTokens,
      tokensBalance,
      walletUtils.areZeroBalanceTokensHidden(),
    );

    // Dispatch fetch token balance actions for each token in the list.
    for (const token of unknownTokens) {
      dispatch(tokenFetchBalanceRequested(token.uid))
    }
  }, []);

  /**
   * Get all unknown tokens from the wallet
   * Comparing `allTokens` and `tokens` in the Redux we get the ones that are unknown
   *
   * @param {boolean} [hideZeroBalance] If true, omits tokens with zero balance
   * @return {Array} Array with unknown tokens {uid, balance, history}
   */
  const getUnknownTokens = (hideZeroBalance) => {
    // Emptying element reference arrays
    historyRefs.current.length = 0;
    anchorOpenRefs.current.length = 0;
    anchorHideRefs.current.length = 0;

    const unknownTokens = walletUtils.fetchUnknownTokens(
      allTokens,
      registeredTokens,
      tokensBalance,
      hideZeroBalance,
    );

    // Creates an empty non-reusable reference slot for each unknown token.
    // These will be filled at render time by the actual elements.
    for (const _token of unknownTokens) {
      historyRefs.current.push(React.createRef());
      anchorOpenRefs.current.push(React.createRef());
      anchorHideRefs.current.push(React.createRef());
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
  const openHistory = (e, index, tokenId) => {
    e.preventDefault();
    dispatch(tokenFetchHistoryRequested(tokenId))

    $(historyRefs.current[index].current).show(400);
    $(anchorHideRefs.current[index].current).show(300);
    $(anchorOpenRefs.current[index].current).hide(300);
  }

  /**
   * Triggered when user clicks to hide the history of the unknown token
   *
   * @param {Object} e Event emitted by the click
   * @param {number} index Index of the unknown token user clicked
   */
  const hideHistory = (e, index) => {
    e.preventDefault();

    $(historyRefs.current[index].current).hide(400);
    $(anchorHideRefs.current[index].current).hide(300);
    $(anchorOpenRefs.current[index].current).show(300);
  }

  /**
   * Triggered when user clicks to do a bulk import
   */
  const massiveImport = () => {
    modalContext.showModal(MODAL_TYPES.ADD_MANY_TOKENS, {
      success: massiveImportSuccess,
      tokensBalance: tokensBalance,
    });
  }

  /**
   * Triggered after success doing a bulk import
   *
   * @param {number} count Quantity of tokens that were added
   */
  const massiveImportSuccess = (count) => {
    modalContext.hideModal();
    const message = `${count} ${helpers.plural(count, 'token was', 'tokens were')} added!`;
    setSuccessMessage(message);
    alertSuccessRef.current.show(3000);
  }

  const retryDownload = (e, tokenId) => {
    e.preventDefault();
    const balanceStatus = get(
      tokensBalance,
      `${tokenId}.status`,
      TOKEN_DOWNLOAD_STATUS.LOADING,
    );
    const historyStatus = get(
      tokensHistory,
      `${tokenId}.status`,
      TOKEN_DOWNLOAD_STATUS.LOADING,
    );

    // We should only retry the requests that failed:
    if (historyStatus === TOKEN_DOWNLOAD_STATUS.FAILED) {
      dispatch(tokenFetchHistoryRequested(tokenId));
    }
    if (balanceStatus === TOKEN_DOWNLOAD_STATUS.FAILED) {
      dispatch(tokenFetchBalanceRequested(tokenId))
    }
  }

  const unknownTokensToRender = getUnknownTokens(walletUtils.areZeroBalanceTokensHidden());

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
          <span><strong>{t`Total:`}</strong> {numberUtils.prettyValue(tokenBalance.data.available + tokenBalance.data.locked, isNFT ? 0 : decimalPlaces)}</span>
          <span className="ml-2"><strong>{t`Available:`}</strong> {numberUtils.prettyValue(tokenBalance.data.available, isNFT ? 0 : decimalPlaces)}</span>
          <span className="ml-2"><strong>{t`Locked:`}</strong> {numberUtils.prettyValue(tokenBalance.data.locked, isNFT ? 0 : decimalPlaces)}</span>
        </div>
      )
    };

    const retryTemplate = () => {
      return (
        <div className="d-flex flex-row align-items-center justify-content-start w-100">
          {t`Download failed, please`}&nbsp;
          <a onClick={(e) => retryDownload(e, token.uid)} href="true">
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
    if (unknownTokensToRender.length === 0) {
      return <p>{t`You don't have any unknown tokens`}</p>;
    }

    return unknownTokensToRender.map((token, index) => {
      const isNFT = helpers.isTokenNFT(token.uid, tokenMetadata);

      // Note: We can't default to LOADING here otherwise we will never show the `Show History` button
      const tokenBalance = get(tokensBalance, `${token.uid}`, { status: TOKEN_DOWNLOAD_STATUS.INVALIDATED });
      const tokenHistory = get(tokensHistory, `${token.uid}`, { status: TOKEN_DOWNLOAD_STATUS.INVALIDATED });

      return (
        <div key={token.uid} className="unknown-token card">
          <div className="header d-flex flex-row align-items-center justify-content-between">
            <div className="d-flex flex-column align-items-center justify-content-center">
              <p>{token.uid}</p>
              { renderTokenBalance(token, isNFT, tokenBalance, tokenHistory) }
            </div>
            <div className="d-flex flex-row align-items-center">
              <a onClick={(e) => openHistory(e, index, token.uid)} ref={anchorOpenRefs.current[index]} href="true">
                {(tokenHistory.status !== TOKEN_DOWNLOAD_STATUS.LOADING
                  && tokenHistory.status !== TOKEN_DOWNLOAD_STATUS.FAILED) && t`Show history`}
              </a>
              <a onClick={(e) => hideHistory(e, index)} ref={anchorHideRefs.current[index]} href="true" style={{display: 'none'}}>
                {(tokenHistory.status !== TOKEN_DOWNLOAD_STATUS.LOADING
                  && tokenHistory.status !== TOKEN_DOWNLOAD_STATUS.FAILED) &&  t`Hide history`}
              </a>
            </div>
          </div>
          <div className="body mt-3" ref={historyRefs.current[index]} style={{display: 'none'}}>
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
      <BackButton />
      <div className="d-flex flex-row align-items-center mb-4 mt-4">
        <h3 className="mr-4">{t`Unknown Tokens`}</h3>
        <button onClick={massiveImport} className="btn btn-hathor">{t`Register Tokens`}</button>
      </div>
      <p>{t`Those are the custom tokens which you have at least one transaction. They are still unregistered in this wallet. You need to register a custom token in order to send new transactions using it.`}</p>
      <p className="mb-5">{t`If you have reset your wallet, you need to register your custom tokens again.`}</p>
      {unknownTokensToRender && renderTokens()}
      <HathorAlert ref={alertSuccessRef} text={successMessage} type="success" />
    </div>
  );
}

export default UnknownTokens;
