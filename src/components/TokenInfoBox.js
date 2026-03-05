/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { get } from 'lodash';
import { numberUtils, TokenInfoVersion } from '@hathor/wallet-lib';
import { useSelector } from 'react-redux';
import helpers from '../utils/helpers';
import tokens from '../utils/tokens';

export default function TokenInfoBox ({
  token,
  totalSupply,
  canMint,
  canMelt,
  transactionsCount,
  tokenMetadata,
  children,
  tokenVersion,
}) {
  const isNFT = helpers.isTokenNFT(get(token, 'uid'), tokenMetadata || {});
  const decimalPlaces = useSelector((state) => state.serverInfo.decimalPlaces);

  const tokenVersionLabel = () => {
    if (tokenVersion === TokenInfoVersion.DEPOSIT) {
      return t`This token was created with a 1% HTR deposit. No network fees are charged for transfers.`;
    }
    if (tokenVersion === TokenInfoVersion.FEE) {
      return t`This token was created with a 1% HTR deposit. No network fees are charged for transfers.`;
    }
    return t`Unknown`;
  }

  return (
    <div className="token-general-info">
      <p className="mb-2"><strong>{t`UID:`} </strong>{token.uid}</p>
      <p className="mt-2 mb-2"><strong>{t`Type:`} </strong>{isNFT ? 'NFT' : 'Custom Token'}</p>
      <p className="mt-2 mb-2"><strong>{t`Fee model:`} </strong>{tokens.getFeeModelLabel(tokenVersion)}</p>
      <p className="mb-2 subtitle">{t`This token was created with a 1% HTR deposit. No network fees are charged for transfers.`}</p>
      <p className="mt-2 mb-2"><strong>{t`Name:`} </strong>{token.name}</p>
      <p className="mt-2 mb-2"><strong>{t`Symbol:`} </strong>{token.symbol}</p>
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
