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
import wallet from '../../utils/wallet';
import helpers from '../../utils/helpers';
import InputNumber from '../InputNumber';
import ReactLoading from 'react-loading';
import { connect } from 'react-redux';
import { get } from 'lodash';
import { TOKEN_DOWNLOAD_STATUS } from '../../sagas/tokens';
import colors from '../../index.scss';

const mapStateToProps = (state) => {
  return {
    wallet: state.wallet,
    tokenMetadata: state.tokenMetadata,
    useWalletService: state.useWalletService,
  };
};


/**
 * Component that renders the melt form in the token detail screen
 *
 * @memberof Components
 */
class TokenMelt extends React.Component {
  /**
   * amount {number} Amount of tokens to melt
   */
  state = { amount: 0 };

  constructor(props) {
    super(props);

    // Reference to amount input
    this.amount = React.createRef();
    // Reference to create another melt output checkbox
    this.createAnother = React.createRef();
  }

  /**
   * Prepare transaction to execute melt method after form validation
   *
   * @param {String} pin PIN written by the user
   *
   * @return {Object} In case of success, an object with {success: true, sendTransaction, promise}, where sendTransaction is a
   * SendTransaction object that emit events while the tx is being sent and promise resolves when the sending is done
   * In case of error, an object with {success: false, message}
   */
  prepareSendTransaction = async (pin) => {
    const amountValue = this.isNFT() ? this.state.amount : wallet.decimalToInteger(this.state.amount);
    const transaction = await this.props.wallet.prepareMeltTokensData(
      this.props.token.uid,
      amountValue,
      {
        createAnotherMelt: this.createAnother.current.checked,
        pinCode: pin
      }
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
    return t`${prettyAmountValue} ${this.props.token.symbol} melted!`;
  }

  /**
   * Method executed after user clicks on melt button.
   * Validates the form and then opens the PIN modal
   *
   * @return {string} Error message, in case of form invalid. Nothing, otherwise.
   */
  melt = () => {
    const amountValue = this.isNFT() ? this.state.amount : wallet.decimalToInteger(this.state.amount);
    const walletAmount = get(this.props.tokenBalance, 'data.available', 0);

    if (amountValue > walletAmount) {
      const prettyWalletAmount = helpers.renderValue(walletAmount, this.isNFT());
      return t`The total amount you have is only ${prettyWalletAmount}.`;
    }
  }

  /**
   * Handles amount input change
   */
  onAmountChange = (amount) => {
    this.setState({amount});
  }

  render() {
    const renderInputNumber = () => {
      if (this.isNFT()) {
        return (
          <InputNumber
           required
           ref={this.amount}
           placeholder="0"
           className="form-control"
           precision={0}
           onValueChange={this.onAmountChange}
          />
        )
      } else {
        return (
          <InputNumber
           required
           ref={this.amount}
           placeholder={hathorLib.numberUtils.prettyValue(0)}
           className="form-control"
           onValueChange={this.onAmountChange}
          />
        )
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

    if (this.props.tokenBalance.status === TOKEN_DOWNLOAD_STATUS.LOADING) {
      return (
        <ReactLoading
          type='spin'
          color={colors.purpleHathor}
          width={32}
          height={32}
          delay={200}
        />
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

export default connect(mapStateToProps)(TokenMelt);
