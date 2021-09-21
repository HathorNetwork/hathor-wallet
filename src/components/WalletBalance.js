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
import helpers from '../utils/helpers';


const mapStateToProps = (state) => {
  return { 
    selectedToken: state.selectedToken,
    tokens: state.tokens,
    tokensBalance: state.tokensBalance,
    tokenMetadata: state.tokenMetadata,
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

    const isNFT = this.props.selectedToken in this.props.tokenMetadata && this.props.tokenMetadata[this.props.selectedToken].nft;

    const renderBalance = () => {
      return (
        <div>
          <p><strong>{t`Total:`}</strong> {helpers.renderValue(balance.available + balance.locked, isNFT)} {symbol}</p>
          <p><strong>{t`Available:`}</strong> {helpers.renderValue(balance.available, isNFT)} {symbol}</p>
          <p><strong>{t`Locked:`}</strong> {helpers.renderValue(balance.locked, isNFT)} {symbol}</p>
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
