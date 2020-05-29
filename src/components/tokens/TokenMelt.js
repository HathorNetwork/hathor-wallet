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


/**
 * Component that renders the melt form in the token detail screen
 *
 * @memberof Components
 */
class TokenMelt extends React.Component {
  constructor(props) {
    super(props);

    // Reference to amount input
    this.amount = React.createRef();
    // Reference to create another melt output checkbox
    this.createAnother = React.createRef();
  }

  /**
   * Return the amount value to be melted
   */
  getAmountValue = () => {
    return this.amount.current.value*(10**hathorLib.constants.DECIMAL_PLACES);
  }

  /**
   * Prepare transaction to execute melt method after form validation
   *
   * @param {string} pin PIN user wrote on modal
   *
   * @return {Object} In case of success, an object with {success: true, sendTransaction, promise}, where sendTransaction is a
   * SendTransaction object that emit events while the tx is being sent and promise resolves when the sending is done
   * In case of error, an object with {success: false, message}
   */
  prepareSendTransaction = (pin) => {
    const amountValue = this.getAmountValue();
    const output = this.props.meltOutputs[0];
    return hathorLib.tokens.meltTokens(
      {tx_id: output.tx_id, index: output.index, address: output.decoded.address},
      this.props.token.uid,
      amountValue,
      pin,
      this.createAnother.current.checked
    );
  }

  /**
   * Return a message to be shown in case of success
   */
  getSuccessMessage = () => {
    const prettyAmountValue = hathorLib.helpers.prettyValue(this.getAmountValue());
    return t`${prettyAmountValue} ${this.props.token.symbol} melted!`;
  }

  /**
   * Method executed after user clicks on melt button.
   * Validates the form and then opens the PIN modal
   *
   * @return {string} Error message, in case of form invalid. Nothing, otherwise.
   */
  melt = () => {
    const amountValue = this.amount.current.value*(10**hathorLib.constants.DECIMAL_PLACES);
    if (amountValue > this.props.walletAmount) {
      const prettyWalletAmount = hathorLib.helpers.prettyValue(this.props.walletAmount);
      return t`The total amount you have is only ${prettyWalletAmount}.`;
    }
  }

  render() {
    const renderForm = () => {
      return (
        <div>
          <div className="row">
            <div className="form-group col-3">
              <label>Amount</label>
              <input required type="number" ref={this.amount} step={hathorLib.helpers.prettyValue(1)} min={hathorLib.helpers.prettyValue(1)} placeholder={hathorLib.helpers.prettyValue(0)} className="form-control" />
            </div>
          </div>
          <div className="form-group d-flex flex-row align-items-center">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={this.createAnother} id="keepMint" defaultChecked={true} />
              <label className="form-check-label" htmlFor="keepMint">
                {t`Create another melt output for you?`}
              </label>
              <p className="subtitle">{t`Leave it checked unless you know what you are doing`}</p>
            </div>
          </div>
        </div>
      )
    }

    return (
      <TokenAction
        renderForm={renderForm}
        title={t`Melt tokens`}
        buttonName={t`Go`}
        validateForm={this.melt}
        getSuccessMessage={this.getSuccessMessage}
        prepareSendTransaction={this.prepareSendTransaction}
        modalTitle={t`Melting tokens`}
        {...this.props}
      />
    );
  }
}

export default TokenMelt;
