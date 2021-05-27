/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import TokenHistory from '../components/TokenHistory';
import { WALLET_HISTORY_COUNT } from '../constants';


/**
 * Component that renders the history of the wallet (use the TokenHistory component)
 *
 * @memberof Components
 */
const WalletHistory = (props) => {
  return (
    <div>
      <div className="d-flex flex-column mt-5">
        <h4><strong>{t`Transaction history`}</strong></h4>
        <TokenHistory count={WALLET_HISTORY_COUNT} selectedToken={props.selectedToken} showPage={true} />
      </div>
    </div>
  );
}

export default WalletHistory;
