/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import hathorLib from '@hathor/wallet-lib';
import helpers from '../../utils/helpers';
import TokenAction from './TokenAction';
import SpanFmt from '../SpanFmt';
import { connect } from "react-redux";

const mapStateToProps = (state) => {
  return {
    wallet: state.wallet,
    useWalletService: state.useWalletService,
  };
};


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
   * Prepare transaction to execute the destroy method
   *
   * @param {String} pin PIN written by the user
   *
   * @return {Object} In case of success, an object with {success: true, sendTransaction, promise}, where sendTransaction is a
   * SendTransaction object that emit events while the tx is being sent and promise resolves when the sending is done
   * In case of error, an object with {success: false, message}
   */
  prepareSendTransaction = async (pin) => {
    const type = this.props.action === 'destroy-mint' ? 'mint' : 'melt';

    const transaction = await this.props.wallet.prepareDestroyAuthorityData(
      this.props.token.uid,
      type,
      this.state.destroyQuantity,
      { pinCode: pin },
    );

    if (this.props.useWalletService) {
      return new hathorLib.SendTransactionWalletService(this.props.wallet, {
        transaction,
        pin,
      });
    }

    return new hathorLib.SendTransaction({ transaction, pin, storage: this.props.wallet.storage });
  }

  /**
   * Return a message to be shown in case of success
   */
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
    if (this.state.destroyQuantity > this.props.authoritiesLength) {
      const authoritiesLength = this.props.authoritiesLength;
      const type = this.props.action === 'destroy-mint' ? t`mint` : t`melt`;
      const plural = helpers.plural(this.props.authoritiesLength, 'output', 'outputs');
      return t`You only have ${authoritiesLength} ${type} ${plural} to destroy.`;
    }
  }

  render() {
    const getDestroyBody = () => {
      const quantity = parseInt(this.state.destroyQuantity, 10);
      const type = this.props.action === 'destroy-mint' ? t`mint` : t`melt`;
      const plural = helpers.plural(quantity, 'output', 'outputs');

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

export default connect(mapStateToProps)(TokenDestroy);
