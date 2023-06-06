/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import hathorLib from '@hathor/wallet-lib';
import TokenAction from './TokenAction';
import tokens from '../../utils/tokens';
import wallet from '../../utils/wallet';
import helpers from '../../utils/helpers';
import InputNumber from '../InputNumber';
import { connect } from 'react-redux';
import { get } from 'lodash';

const mapStateToProps = (state) => {
  return {
    wallet: state.wallet,
    tokenMetadata: state.tokenMetadata,
    useWalletService: state.useWalletService,
  };
};

/**
 * Component that renders the mint form in the token detail screen
 *
 * @memberof Components
 */
class TokenMint extends React.Component {
  constructor(props) {
    super(props);

    // Reference to create another mint checkbox
    this.createAnother = React.createRef();
    // Reference to choose address automatically checkbox
    this.chooseAddress = React.createRef();
    // Reference to address input
    this.address = React.createRef();
    // Reference to address input wrapper (to show/hide it)
    this.addressWrapper = React.createRef();

    /**
     * amount {number} Amount of tokens to create
     */
    this.state = { amount: null };
  }

  /**
   * Prepare transaction to execute mint method after form validation
   *
   * @param {String} pin PIN written by the user
   *
   * @return {Object} In case of success, an object with {success: true, sendTransaction, promise}, where sendTransaction is a
   * SendTransaction object that emit events while the tx is being sent and promise resolves when the sending is done
   * In case of error, an object with {success: false, message}
   */
  prepareSendTransaction = async (pin) => {
    const amountValue = this.isNFT() ? this.state.amount : wallet.decimalToInteger(this.state.amount);
    const address = this.chooseAddress.current.checked ? null : this.address.current.value;
    const transaction = await this.props.wallet.prepareMintTokensData(
      this.props.token.uid,
      amountValue,
      {
        address,
        createAnotherMint: this.createAnother.current.checked,
        pinCode: pin
      }
    );

    if (this.props.useWalletService) {
      return new hathorLib.SendTransactionWalletService(this.props.wallet, {
        transaction,
        pin,
      });
    }

    return new hathorLib.SendTransaction({ transaction, pin, network: this.props.wallet.getNetworkObject() });
  }

  /**
   * Return if token is an NFT
   */
  isNFT = () => {
    return helpers.isTokenNFT(get(this.props, 'token.uid'), this.props.tokenMetadata);
  }

  /**
   * Return a message to be shown in case of success
   */
  getSuccessMessage = () => {
    const amount = this.isNFT() ? this.state.amount : wallet.decimalToInteger(this.state.amount);
    const prettyAmountValue = helpers.renderValue(amount, this.isNFT());
    return t`${prettyAmountValue} ${this.props.token.symbol} minted!`;
  }

  /**
   * Method executed after user clicks on mint button. Validates the form.
   *
   * @return {string} Error message, in case of form invalid. Nothing, otherwise.
   */
  mint = () => {
    if (this.chooseAddress.current.checked === false && this.address.current.value === '') {
      return t`Address is required when not selected automatically`;
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

  /**
   * Handles amount input change
   */
  onAmountChange = (amount) => {
    this.setState({amount});
  }

  render() {
    const renderMintAddress = () => {
      return (
        <div className="d-flex flex-row align-items-center justify-content-start col-12 mb-3">
          <div className="d-flex flex-row align-items-center address-checkbox">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={this.chooseAddress} id="autoselectAddress" defaultChecked={true} onChange={this.handleCheckboxAddress} />
              <label className="form-check-label" htmlFor="autoselectAddress">
                {t`Automatically select address to receive new tokens`}
              </label>
            </div>
          </div>
          <div className="form-group col-6" ref={this.addressWrapper} style={{display: 'none'}}>
            <label>Destination address</label>
            <input ref={this.address} type="text" placeholder={t`Address`} className="form-control" />
          </div>
        </div>
      );
    }

    const renderInputNumber = () => {
      if (this.isNFT()) {
        return (
          <InputNumber
           required
           className="form-control"
           onValueChange={this.onAmountChange}
           placeholder="0"
           precision={0}
          />
        );
      } else {
        return (
          <InputNumber
           required
           className="form-control"
           onValueChange={this.onAmountChange}
           placeholder={hathorLib.numberUtils.prettyValue(0)}
          />
        );
      }
    }

    const renderForm = () => {
      return (
        <div>
          <div className="row">
            <div className="form-group col-3">
              <label>Amount</label>
              {renderInputNumber()}
              {this.isNFT() && <small className="text-muted">{t`This is an NFT token. The amount will be an integer number, without decimal places.`}</small>}
            </div>
            {renderMintAddress()}
          </div>
          <div className="form-group d-flex flex-row align-items-center">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={this.createAnother} id="keepMint" defaultChecked={true} />
              <label className="form-check-label" htmlFor="keepMint">
                {t`Create another mint output for you?`}
              </label>
              <p className="subtitle">{t`Leave it checked unless you know what you are doing`}</p>
            </div>
          </div>
        </div>
      )
    }

    const getAmountToCalculateDeposit = () => {
      if (this.isNFT()) {
        // The NFT amount will be an integer but to get the token deposit
        // we must use the decimal
        return this.state.amount / 100;
      } else {
        return this.state.amount;
      }
    }

    const depositPercent = this.props.wallet.storage.getTokenDepositPercentage();

    return (
      <TokenAction
       renderForm={renderForm}
       title={t`Mint tokens`}
       subtitle={`A deposit of ${depositPercent * 100}% in HTR of the mint amount is required`}
       deposit={`Deposit: ${tokens.getDepositAmount(getAmountToCalculateDeposit(), depositPercent)} HTR (${hathorLib.numberUtils.prettyValue(this.props.htrBalance)} HTR available)`}
       buttonName={t`Go`}
       validateForm={this.mint}
       getSuccessMessage={this.getSuccessMessage}
       prepareSendTransaction={this.prepareSendTransaction}
       modalTitle={t`Minting tokens`}
       {...this.props}
      />
    )
  }
}

export default connect(mapStateToProps)(TokenMint);
