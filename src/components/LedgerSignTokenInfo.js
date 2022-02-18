/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';

/**
 * Component to show token information for Ledger operations
 *
 * @memberof Components
 */
function LedgerSignTokenInfo({token}) {

  const renderTokenUid = () => {
    return (
      <div>
        <p className="mb-2"><strong>{t`UID:`}</strong></p>
        <p className="mb-2">{token.uid.slice(0, 32)}</p>
        <p className="mb-2">{token.uid.slice(32, 64)}</p>
      </div>
    );
  }

  const renderTokenInfo = () => {
    return (
      <div className="token-general-info">
        <p className="mt-2 mb-2"><strong>{t`Symbol:`} </strong>{token.symbol}</p>
        <p className="mt-2 mb-2"><strong>{t`Name:`} </strong>{token.name}</p>
        {renderTokenUid()}
      </div>
    );
  }


  if (!token) return null;

  return (
    <div className="flex align-items-center">
      <div className='d-flex flex-column align-items-start justify-content-between token-detail-top'>
        <div className='d-flex flex-column justify-content-between mr-3'>
          {renderTokenInfo()}
        </div>
      </div>
    </div>
  )
}

export default LedgerSignTokenInfo;
