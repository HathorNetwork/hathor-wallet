/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { connect } from "react-redux";
import hathorLib from '@hathor/wallet-lib';


const mapStateToProps = (state) => {
  return { 
    selectedToken: state.selectedToken,
    tokens: state.tokens,
    tokensBalance: state.tokensBalance,
  };
};

/**
 * Component that render the balance of the selected token
 *
 * @memberof Components
 */
class WalletBalance extends React.Component {
  render = () => {
    const token = this.props.tokens.find((token) => token.uid === this.props.selectedToken);
    const symbol = token ? token.symbol : '';
    const balance = {
      available: token.uid in this.props.tokensBalance ? this.props.tokensBalance[token.uid].available : 0,
      locked: token.uid in this.props.tokensBalance ? this.props.tokensBalance[token.uid].locked : 0,
    }

    const renderBalance = () => {

      return (
        <div>
          <p><strong>{t`Total:`}</strong> {hathorLib.helpers.prettyValue(balance.available + balance.locked)} {symbol}</p>
          <p><strong>{t`Available:`}</strong> {hathorLib.helpers.prettyValue(balance.available)} {symbol}</p>
          <p><strong>{t`Locked:`}</strong> {hathorLib.helpers.prettyValue(balance.locked)} {symbol}</p>
        </div>
      );
    }

    return (
      <div>
        {balance && renderBalance()}
      </div>
    );
  }
};

export default connect(mapStateToProps)(WalletBalance);
