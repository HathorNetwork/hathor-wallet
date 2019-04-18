/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
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
      <div className="d-flex flex-column">
        <h4><strong>Transaction history</strong></h4>
        <TokenHistory history={props.historyTransactions} count={WALLET_HISTORY_COUNT} selectedToken={props.selectedToken} showPage={true} />
      </div>
    </div>
  );
}

export default WalletHistory;
