/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import hathorLib from '@hathor/wallet-lib';
import TokenAction from './TokenAction';


/**
 * Component that renders the mint form in the token detail screen
 *
 * @memberof Components
 */
class TokenMint extends React.Component {
  constructor(props) {
    super(props);

    // Reference to amount input
    this.amount = React.createRef();
    // Reference to create another mint checkbox
    this.createAnother = React.createRef();
    // Reference to choose address automatically checkbox
    this.chooseAddress = React.createRef();
    // Reference to address input
    this.address = React.createRef();
    // Reference to address input wrapper (to show/hide it)
    this.addressWrapper = React.createRef();
  }

  /**
   * Execute mint method after form validation
   *
   * @param {string} pin PIN user wrote on modal
   *
   * @return {Object} Object with promise and success message to be shown
   */
  executeMint = (pin) => {
    const amountValue = this.amount.current.value*(10**hathorLib.constants.DECIMAL_PLACES);
    const output = this.props.mintOutputs[0];
    const address = this.chooseAddress.current.checked ? hathorLib.wallet.getAddressToUse() : this.address.current.value;
    const promise = hathorLib.tokens.mintTokens(
      output.tx_id,
      output.index,
      output.decoded.address,
      this.props.token.uid,
      address,
      amountValue,
      pin,
      {
        createAnotherMint: this.createAnother.current.checked
      }
    );
    return { promise, message: `${hathorLib.helpers.prettyValue(amountValue)} ${this.props.token.symbol} minted!` };
  }

  /**
   * Method executed after user clicks on mint button. Validates the form.
   *
   * @return {string} Error message, in case of form invalid. Nothing, otherwise.
   */
  mint = () => {
    if (this.chooseAddress.current.checked === false && this.address.current.value === '') {
      return 'Address is required when not selected automatically';
    }
  }

  /**
   * Shows/hides address field depending on the checkbox click
   *
   * @param {Object} e Event for the address checkbox input change
   */
  handleCheckboxAddress = (e) => {
    const value = e.target.checked;
    if (value) {
      $(this.addressWrapper.current).hide(400);
    } else {
      $(this.addressWrapper.current).show(400);
    }
  }

  render() {
    const renderMintAddress = () => {
      return (
        <div className="d-flex flex-row align-items-center justify-content-start col-9">
          <div className="d-flex flex-row align-items-center address-checkbox">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={this.chooseAddress} id="autoselectAddress" defaultChecked={true} onChange={this.handleCheckboxAddress} />
              <label className="form-check-label" htmlFor="autoselectAddress">
                Select address automatically
              </label>
            </div>
          </div>
          <div className="form-group col-8" ref={this.addressWrapper} style={{display: 'none'}}>
            <label>Destination address</label>
            <input ref={this.address} type="text" placeholder="Address" className="form-control" />
          </div>
        </div>
      );
    }

    const renderForm = () => {
      return (
        <div>
          <div className="row">
            <div className="form-group col-3">
              <label>Amount</label>
              <input required type="number" ref={this.amount} step={hathorLib.helpers.prettyValue(1)} min={hathorLib.helpers.prettyValue(1)} placeholder={hathorLib.helpers.prettyValue(0)} className="form-control" />
            </div>
            {renderMintAddress()}
          </div>
          <div className="form-group d-flex flex-row align-items-center">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={this.createAnother} id="keepMint" defaultChecked={true} />
              <label className="form-check-label" htmlFor="keepMint">
                Create another mint output for you?
              </label>
            </div>
          </div>
        </div>
      )
    }

    return <TokenAction renderForm={renderForm} title='Mint tokens' buttonName='Go' validateForm={this.mint} onPinSuccess={this.executeMint} {...this.props} />
  }
}

export default TokenMint;
