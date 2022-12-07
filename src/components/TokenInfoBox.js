/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { get } from 'lodash';
import helpers from '../utils/helpers';

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

  return (
    <div className="token-general-info">
      <p className="mb-2"><strong>{t`UID:`} </strong>{token.uid}</p>
      <p className="mt-2 mb-2"><strong>{t`Type:`} </strong>{isNFT ? 'NFT' : 'Custom Token'}</p>
      <p className="mt-2 mb-2"><strong>{t`Name:`} </strong>{token.name}</p>
      <p className="mt-2 mb-2"><strong>{t`Symbol:`} </strong>{token.symbol}</p>
      <p className="mt-2 mb-2"><strong>{t`Total supply:`} </strong>{helpers.renderValue(totalSupply, isNFT)} {token.symbol}</p>
      <p className="mt-2 mb-0"><strong>{t`Can mint new tokens:`} </strong>{canMint ? 'Yes' : 'No'}</p>
      <p className="mb-2 subtitle">{t`Indicates whether the token owner can create new tokens, increasing the total supply`}</p>
      <p className="mt-2 mb-0"><strong>{t`Can melt tokens:`} </strong>{canMelt ? 'Yes' : 'No'}</p>
      <p className="mb-2 subtitle">{t`Indicates whether the token owner can destroy tokens, decreasing the total supply`}</p>
      <p className="mt-2 mb-4"><strong>{t`Total number of transactions:`} </strong>{transactionsCount}</p>
      { children }
    </div>
  );
};
