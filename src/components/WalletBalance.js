/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { connect } from "react-redux";
import helpers from '../utils/helpers';
import { get } from 'lodash';
import { numberUtils } from '@hathor/wallet-lib';


const mapStateToProps = (state) => {
  return {
    selectedToken: state.selectedToken,
    tokens: state.tokens,
    tokensBalance: state.tokensBalance,
    tokenMetadata: state.tokenMetadata,
    decimalPlaces: state.serverInfo.decimalPlaces,
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

    const tokenBalance = get(this.props.tokensBalance, `${token.uid}.data`, { available: 0n, locked: 0n });
    const balance = {
      available: tokenBalance.available,
      locked: tokenBalance.locked,
    };

    const isNFT = helpers.isTokenNFT(get(this.props, 'selectedToken'), this.props.tokenMetadata);

    const renderBalance = () => {
      return (
        <div>
          <p><strong>{t`Total:`}</strong> {numberUtils.prettyValue(balance.available + balance.locked, isNFT ? 0 : this.props.decimalPlaces)} {symbol}</p>
          <p><strong>{t`Available:`}</strong> {numberUtils.prettyValue(balance.available, isNFT ? 0 : this.props.decimalPlaces)} {symbol}</p>
          <p><strong>{t`Locked:`}</strong> {numberUtils.prettyValue(balance.locked, isNFT ? 0 : this.props.decimalPlaces)} {symbol}</p>
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
