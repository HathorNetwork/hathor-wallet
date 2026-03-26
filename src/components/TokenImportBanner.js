/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { t } from 'ttag';
import { dismissTokenImportBanner } from '../actions/index';
import { GlobalModalContext, MODAL_TYPES } from './GlobalModal';
import walletUtils from '../utils/wallet';

/**
 * Banner component that notifies the user when there are unregistered tokens
 * linked to their address. Displays a message with a link to add the tokens.
 *
 * @memberof Components
 */
export default function TokenImportBanner() {
  const dispatch = useDispatch();
  const context = useContext(GlobalModalContext);

  const allTokens = useSelector((state) => state.allTokens);
  const tokens = useSelector((state) => state.tokens);
  const tokensBalance = useSelector((state) => state.tokensBalance);
  const dismissed = useSelector((state) => state.tokenImportBannerDismissed);

  const hideZeroBalance = walletUtils.areZeroBalanceTokensHidden();
  const unknownTokens = walletUtils.fetchUnknownTokens(
    allTokens,
    tokens,
    tokensBalance,
    hideZeroBalance,
  );

  // Do not render if banner was dismissed or there are no unknown tokens
  if (dismissed || unknownTokens.length === 0) {
    return null;
  }

  const handleAddTokens = (e) => {
    e.preventDefault();
    context.showModal(MODAL_TYPES.TOKEN_IMPORT, { unknownTokens });
  };

  const handleDismiss = () => {
    dispatch(dismissTokenImportBanner());
  };

  return (
    <div className="alert token-import-banner" role="alert">
      <div className="token-import-banner__content">
        <p className="mb-0">
          <strong>{t`New tokens:`}</strong> {t`We found tokens linked to your address that are not yet in your wallet.`}{' '}
          <a href="true" onClick={handleAddTokens}>{t`Add tokens`}</a>.
        </p>
        <button type="button" className="close ml-3" onClick={handleDismiss} aria-label={t`Close`}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    </div>
  );
}
