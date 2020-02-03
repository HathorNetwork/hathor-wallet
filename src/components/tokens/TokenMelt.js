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
   * Execute melt method after form validation
   *
   * @param {string} pin PIN user wrote on modal
   *
   * @return {Object} Object with promise (can be null in case of error) and message (success or error message)
   */
  executeMelt = (pin) => {
    const amountValue = this.amount.current.value*(10**hathorLib.constants.DECIMAL_PLACES);
    const output = this.props.meltOutputs[0];
    const promise = hathorLib.tokens.meltTokens(
      {tx_id: output.tx_id, index: output.index, address: output.decoded.address},
      this.props.token.uid,
      amountValue,
      pin,
      this.createAnother.current.checked
    );
    if (promise === null) {
      return { promise: null, message: t`Can't find outputs to melt the amount requested.` };
    } else {
      const prettyAmountValue = hathorLib.helpers.prettyValue(amountValue);
      return { promise, message: t`${prettyAmountValue} ${this.props.token.symbol} melted!` };
    }
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

    return <TokenAction renderForm={renderForm} title={t`Melt tokens`} buttonName={t`Go`} validateForm={this.melt} onPinSuccess={this.executeMelt} {...this.props} />
  }
}

export default TokenMelt;
