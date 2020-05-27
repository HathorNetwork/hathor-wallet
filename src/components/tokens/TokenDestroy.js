/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import hathorLib from '@hathor/wallet-lib';
import TokenAction from './TokenAction';
import SpanFmt from '../SpanFmt';


/**
 * Component that renders the destroy authority output form in the token detail screen
 *
 * @memberof Components
 */
class TokenDestroy extends React.Component {
  /**
   * destroyQuantity {number} Holds the quantity written by the user on the input (need to use state to fill the modal data)
   */
  state = {
    destroyQuantity: 0,
  }

  /**
   * Execute destroy method
   *
   * @param {string} pin PIN user wrote on modal
   *
   * @return {Object} Object with promise and success message
   */
  prepareSendTransaction = (pin) => {
    const array = this.props.authorityOutputs;
    const data = [];
    // Get the number of outputs the user requested to destroy in the expected format
    for (let i=0; i<this.state.destroyQuantity; i++) {
      data.push({
        'tx_id': array[i].tx_id,
        'index': array[i].index,
        'address': array[i].decoded.address,
        'token': this.props.token.uid
      });
    }
    return hathorLib.tokens.destroyAuthority(data, pin);
  }

  getSuccessMessage = () => {
    const label = this.props.action === 'destroy-mint' ? t`Mint` : t`Melt`;
    return t`${label} outputs destroyed!`;
  }

  /**
   * Called when clicking to destroy mint outputs.
   * Validate if we have the quantity of outputs requested to destroy and open the PIN modal
   *
   * @return {string} Error message, in case of form invalid. Nothing, otherwise.
   */
  destroy = () => {
    if (this.state.destroyQuantity > this.props.authorityOutputs.length) {
      const type = this.props.action === 'destroy-mint' ? t`mint` : t`melt`;
      return `You only have ${this.props.authorityOutputs.length} ${type} ${hathorLib.helpers.plural(this.props.authorityOutputs.length, 'output', 'outputs')} to destroy.`;
    }
  }

  render() {
    const getDestroyBody = () => {
      const quantity = parseInt(this.state.destroyQuantity, 10);
      const type = this.props.action === 'destroy-mint' ? t`mint` : t`melt`;
      const plural = hathorLib.helpers.plural(quantity, 'output', 'outputs');

      return (
        <p><SpanFmt>{t`Are you sure you want to destroy **${quantity} ${type}** authority ${plural}?`}</SpanFmt></p>
      )
    }

    const renderForm = () => {
      return (
        <div className="row">
          <div className="form-group col-6">
            <label>How many {this.props.action === 'destroy-mint' ? 'mint' : 'melt'} outputs you want to destroy?</label>
            <input required type="number" className="form-control" min="1" step="1" ref={this.destroyQuantity} onChange={(e) => this.setState({ destroyQuantity: e.target.value })} />
          </div>
        </div>
      );
    }

    const title = `Destroy ${this.props.action === 'destroy-mint' ? t`Mint` : t`Melt`}`;

    return (
      <TokenAction
        renderForm={renderForm}
        validateForm={this.destroy}
        title={title}
        buttonName={t`Destroy`}
        pinBodyTop={getDestroyBody()}
        getSuccessMessage={this.getSuccessMessage}
        prepareSendTransaction={this.prepareSendTransaction}
        modalTitle={t`Destroying authorities`}
        {...this.props}
      />
    );
  }
}

export default TokenDestroy;
