/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { get } from 'lodash';
import { numberUtils, TokenVersion } from '@hathor/wallet-lib';
import { useSelector } from 'react-redux';
import helpers from '../utils/helpers';
import { FEE_TOKEN_FEATURE_TOGGLE, FEATURE_TOGGLE_DEFAULTS } from '../constants';

const getFeeModelInfo = (tokenVersion) => {
  if (tokenVersion === TokenVersion.FEE) {
    return {
      label: t`Fee-based`,
      description: t`This token was created without a deposit. A small network fee in HTR is charged on every transfer.`,
    };
  }
  if (tokenVersion === TokenVersion.DEPOSIT) {
    return {
      label: t`Deposit-based`,
      description: t`This token was created with a 1% HTR deposit. No network fees are charged for transfers.`,
    };
  }
  // This should never happen because of the feature flag. When the feature flag is enabled
  // the token sync will run after wallet startup
  return {
    label: t`Unknown`,
    description: t`Unknown fee model`,
  };
};

export default function TokenInfoBox ({
  token,
  totalSupply,
  canMint,
  canMelt,
  transactionsCount,
  tokenMetadata,
  children,
}) {
  const isNFT = helpers.isTokenNFT(get(token, 'uid'), tokenMetadata || {});
  const decimalPlaces = useSelector((state) => state.serverInfo.decimalPlaces);
  const featureToggles = useSelector((state) => state.featureToggles);
  const feeTokenFeatureEnabled = get(featureToggles, FEE_TOKEN_FEATURE_TOGGLE, FEATURE_TOGGLE_DEFAULTS[FEE_TOKEN_FEATURE_TOGGLE]);
  const feeModelInfo = getFeeModelInfo(token.version);

  return (
    <div className="token-general-info">
      <p className="mb-2"><strong>{t`UID:`} </strong>{token.uid}</p>
      <p className="mt-2 mb-2"><strong>{t`Type:`} </strong>{isNFT ? 'NFT' : 'Custom Token'}</p>
      <p className="mt-2 mb-2"><strong>{t`Name:`} </strong>{token.name}</p>
      <p className="mt-2 mb-2"><strong>{t`Symbol:`} </strong>{token.symbol}</p>
      {feeTokenFeatureEnabled && (
        <>
          <p className="mt-2 mb-2"><strong>{t`Fee Model:`} </strong>{feeModelInfo.label}</p>
          <p className="mt-2 mb-2">{feeModelInfo.description}</p>
        </>
      )}
      <p className="mt-2 mb-2"><strong>{t`Total supply:`} </strong>{numberUtils.prettyValue(totalSupply || 0n, isNFT ? 0 : decimalPlaces)} {token.symbol}</p>
      <p className="mt-2 mb-0"><strong>{t`Can mint new tokens:`} </strong>{canMint ? 'Yes' : 'No'}</p>
      <p className="mb-2 subtitle">{t`Indicates whether the token owner can create new tokens, increasing the total supply`}</p>
      <p className="mt-2 mb-0"><strong>{t`Can melt tokens:`} </strong>{canMelt ? 'Yes' : 'No'}</p>
      <p className="mb-2 subtitle">{t`Indicates whether the token owner can destroy tokens, decreasing the total supply`}</p>
      <p className="mt-2 mb-4"><strong>{t`Total number of transactions:`} </strong>{transactionsCount}</p>
      { children }
    </div>
  );
};
