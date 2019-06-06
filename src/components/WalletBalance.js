/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { connect } from "react-redux";
import hathorLib from '@hathor/wallet-lib';


const mapStateToProps = (state) => {
  return { selectedToken: state.selectedToken, tokens: state.tokens };
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

    const renderBalance = () => {
      const renderTokenButtons = () => {
        return (
          <div className='ml-3'>
            <i className="fa fa-info-circle pointer" title="Open token information" onClick={() => this.props.history.push(`/token_detail/${token.uid}`)}></i>
          </div>
        );
      }

      return (
        <div>
          <div className='token-wrapper d-flex flex-row align-items-center mb-3'>
            <p className='token-name mb-0'>
              <strong>{token ? token.name : ''}</strong>
            </p>
            {this.props.selectedToken !== hathorLib.constants.HATHOR_TOKEN_CONFIG.uid && renderTokenButtons()}
          </div>
          <p><strong>Total:</strong> {hathorLib.helpers.prettyValue(this.props.balance.available + this.props.balance.locked)} {symbol}</p>
          <p><strong>Available:</strong> {hathorLib.helpers.prettyValue(this.props.balance.available)} {symbol}</p>
          <p><strong>Locked:</strong> {hathorLib.helpers.prettyValue(this.props.balance.locked)} {symbol}</p>
        </div>
      );
    }

    return (
      <div>
        {this.props.balance && renderBalance()}
      </div>
    );
  }
};

export default connect(mapStateToProps)(WalletBalance);
