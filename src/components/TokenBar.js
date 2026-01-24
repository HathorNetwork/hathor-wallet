/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState } from 'react';
import { t } from 'ttag';
import { useSelector, useDispatch } from 'react-redux';
import { numberUtils } from '@hathor/wallet-lib';
import { selectToken } from '../actions/index';
import { get } from 'lodash';
import helpers from '../utils/helpers';
import wallet from "../utils/wallet";
import Loading from '../components/Loading';
import { TOKEN_DOWNLOAD_STATUS } from '../constants';
import { useLocation, useNavigate } from 'react-router-dom';
import LOCAL_STORE from '../storage';

// Routes that should display the TokenBar
const ROUTE_WHITELIST = [
  '/wallet/',
];

export default function TokenBar () {
  const [opened, setOpened] = useState(false);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  // These are all tokens that are currently registered on the wallet
  const tokens = useSelector((state) => state.tokens);
  const allTokens = useSelector((state) => state.allTokens);
  const selectedToken = useSelector((state) => state.selectedToken);
  const tokensBalance = useSelector((state) => state.tokensBalance);
  const tokenMetadata = useSelector((state) => state.tokenMetadata);
  const decimalPlaces = useSelector((state) => state.serverInfo.decimalPlaces);
  const networkTokens = useSelector((state) => state.serverInfo.customTokens);

  // If the current route is not in the whitelist, we should not render the tokenbar
  if (ROUTE_WHITELIST.indexOf(location.pathname) < 0) {
    return null;
  }

  /**
   * Get quantity of unknown tokens comparing allTokens and registeredTokens in redux
   *
   * @return {number} Quantity of unknown tokens
   */
  const getUnknownTokens = (hideZeroBalance) => {
    const unknownTokens = wallet.fetchUnknownTokens(
      allTokens,
      tokens,
      tokensBalance,
      hideZeroBalance,
    );

    return unknownTokens.length;
  };

  /**
   * Called when user clicked to expand bar
   */
  const toggleExpand = () => {
    setOpened(!opened);
  };

  /**
   * Called when user selects another token
   *
   * @param {string} uid UID of token user selected
   */
  const tokenSelected = (uid) => dispatch(selectToken(uid));

  /**
   * Called when user clicks to lock wallet, then redirects to locked screen
   */
  const lockWallet = () => {
    LOCAL_STORE.lock();
    navigate('/locked/');
  };

  /**
   * Called when user clicks to go to settings, then redirects to settings screen
   */
  const goToSettings = () => {
    navigate('/settings/');
  };

  /**
   * Gets the balance of one token
   *
   * @param {string} uid UID to get balance from
   * @return {bigint} Total token balance
   */
  const getTokenBalance = (uid) => {
    const { available, locked } = get(tokensBalance, `${uid}.data`, {
      available: 0n,
      locked: 0n,
    });

    return available + locked;
  };

  /**
   * Gets the balance of one token formatted for exhibition
   *
   * @param {string} uid UID to get balance from
   * @return {string} String formatted balance, ready for exhibition
   */
  const getTokenBalanceFormatted = (uid) => {
    const total = getTokenBalance(uid);

    // Formatting to string for exhibition
    const isNFT = helpers.isTokenNFT(uid, tokenMetadata);
    return numberUtils.prettyValue(total, isNFT ? 0 : decimalPlaces);
  };

  /**
   * Called when user clicks in the unknown tokens number, then redirects to unknown tokens screen
   */
  const unknownClicked = () => {
    navigate('/unknown_tokens/');
  };

  const renderLoading = () => (
    <Loading width={14} height={14} />
  );

  const shouldHideZeroBalanceTokens = wallet.areZeroBalanceTokensHidden();
  const unknownTokens = getUnknownTokens(shouldHideZeroBalanceTokens);

  const renderTokens = () => {
    // Will fetch registered state.tokens respecting both the shouldHideZeroBalanceTokens setting and
    // the individual alwaysShowToken option for each token.
    const registeredTokens = wallet.fetchRegisteredTokens(
      tokens,
      tokensBalance,
      shouldHideZeroBalanceTokens,
      networkTokens,
    );

    return registeredTokens.map((token) => {
      const tokenUid = token.uid;
      const tokenBalance = get(tokensBalance, `${token.uid}`, {
        status: TOKEN_DOWNLOAD_STATUS.LOADING,
        data: {
          locked: 0n,
          available: 0n
        }
      });

      return (
        <div
          key={tokenUid}
          className={`token-wrapper ${tokenUid === selectedToken ? 'selected' : ''}`}
          onClick={() => {tokenSelected(tokenUid)}}>
          <span className='ellipsis'>
            {token.symbol} {opened && ` | `}

            {(tokenBalance.status === TOKEN_DOWNLOAD_STATUS.READY && opened) && getTokenBalanceFormatted(tokenUid)}
            {(tokenBalance.status === TOKEN_DOWNLOAD_STATUS.LOADING  && opened) && renderLoading()}
          </span>
        </div>
      )
    });
  };

  const renderExpandedHeader = () => {
    return (
      <div className='d-flex align-items-center justify-content-between flex-row w-100'>
        <span>{t`Tokens`}</span>
        <i className='fa fa-chevron-left' title='Close bar'></i>
      </div>
    )
  };

  const renderUnknownTokens = () => {
    return (
      <div title={`${unknownTokens} unknown ${helpers.plural(unknownTokens, 'token', 'tokens')}`} className={`d-flex align-items-center icon-wrapper ${opened ? 'justify-content-start' : 'justify-content-center'}`} onClick={unknownClicked}>
        <div className="unknown-symbol d-flex flex-row align-items-center justify-content-center">{unknownTokens}</div>
        {opened && <span className='ellipsis'>Unknown {helpers.plural(unknownTokens, 'token', 'tokens')}</span>}
      </div>
    );
  };

  return (
    <div className={`d-flex flex-column align-items-center justify-content-between token-bar ${opened ? 'opened' : 'closed'}`}>
      <div className='d-flex flex-column align-items-center justify-content-between w-100 first-child'>
        <div className='header d-flex align-items-center justify-content-center w-100' onClick={toggleExpand}>
          {opened ? renderExpandedHeader() : <i className='fa fa-chevron-right' title='Expand bar'></i>}
        </div>
        <div className='body'>
          {renderTokens()}
          {unknownTokens > 0 ? renderUnknownTokens() : null}
        </div>
      </div>
      <div className='footer d-flex align-items-center justify-content-center flex-column'>
        <div className={`d-flex align-items-center icon-wrapper ${opened ? 'justify-content-start' : 'justify-content-center'}`} onClick={lockWallet}>
          <i className='fa fa-lock token-icon' title={t`Lock wallet`}></i>
          {opened && <span className='ellipsis'>{t`Lock wallet`}</span>}
        </div>
        <div className={`d-flex align-items-center icon-wrapper ${opened ? 'justify-content-start' : 'justify-content-center'}`} onClick={goToSettings}>
          <i className='fa fa-cog token-icon' title={t`Settings`}></i>
          {opened && <span className='ellipsis'>{t`Settings`}</span>}
        </div>
      </div>
    </div>
  );

};
