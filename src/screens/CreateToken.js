/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import hathorLib from '@hathor/wallet-lib';
import { t } from 'ttag'
import { get } from 'lodash';
import { connect } from "react-redux";

import { walletRefreshSharedAddress } from '../actions';
import wallet from '../utils/wallet';
import tokens from '../utils/tokens';
import SpanFmt from '../components/SpanFmt';
import BackButton from '../components/BackButton';
import helpers from '../utils/helpers';
import { TOKEN_DEPOSIT_RFC_URL } from '../constants';
import InputNumber from '../components/InputNumber';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import { str2jsx } from '../utils/i18n';


const mapStateToProps = (state) => {
  const HTR_UID = hathorLib.constants.HATHOR_TOKEN_CONFIG.uid;
  const htrBalance = get(state.tokensBalance, `${HTR_UID}.data.available`, 0);

  return {
    htrBalance,
    wallet: state.wallet,
    useWalletService: state.useWalletService,
  };
};

const mapDispatchToProps = (dispatch) => ({
  walletRefreshSharedAddress: () => dispatch(walletRefreshSharedAddress()),
});

/**
 * Create a new token
 *
 * @memberof Screens
 */
class CreateToken extends React.Component {
  static contextType = GlobalModalContext;

  constructor(props) {
    super(props);

    this.address = React.createRef();
    this.inputWrapper = React.createRef();

    /**
     * errorMessage {string} Message to show when error happens on the form
     * name {string} Name of the created token
     * configurationString {string} Configuration string of the created token
     * amount {number} Amount of tokens to create
     */
    this.state = {
      errorMessage: '',
      name: '',
      configurationString: '',
      amount: null,
    };
  }

  /**
   * Validates if the create token form is valid
   */
  formValid = () => {
    const isValid = this.refs.formCreateToken.checkValidity();
    if (isValid) {
      if (this.refs.address.value === '' && !this.refs.autoselectAddress.checked) {
        this.setState({ errorMessage: t`Must choose an address or auto select` });
        return false;
      }

      // Validating maximum amount
      const tokensValue = wallet.decimalToInteger(this.state.amount)
      if (tokensValue > hathorLib.constants.MAX_OUTPUT_VALUE) {
        const max_output_value_str = hathorLib.numberUtils.prettyValue(hathorLib.constants.MAX_OUTPUT_VALUE);
        this.setState({ errorMessage: t`Maximum value to mint token is ${max_output_value_str}` });
        return false;
      }
      return true;
    } else {
      this.refs.formCreateToken.classList.add('was-validated')
    }
  }

  /**
   * Opens PIN modal if form is valid
   */
  onClickCreate = () => {
    if (!this.formValid()) {
      return;
    }

    this.setState({ errorMessage: '' });
    this.context.showModal(MODAL_TYPES.PIN, {
      onSuccess: ({pin}) => {
        this.context.showModal(MODAL_TYPES.SEND_TX, {
          pin,
          prepareSendTransaction: this.prepareSendTransaction,
          onSendSuccess: this.onTokenCreateSuccess,
          title: t`Creating token`,
        });
      }
    })
  }

  /**
   * Prepare create token transaction data after PIN is validated
   *
   * @param {String} pin PIN written by the user
   *
   * @return {hathorLib.SendTransaction} SendTransaction object
   */
  prepareSendTransaction = async (pin) => {
    // Get the address to send the created tokens
    let address = '';
    if (this.refs.autoselectAddress.checked) {
      address = (await this.props.wallet.getCurrentAddress({ markAsUsed: true })).address;
    } else {
      address = this.refs.address.value;
    }

    let transaction;
    try {
      transaction = await this.props.wallet.prepareCreateNewToken(
        this.refs.shortName.value,
        this.refs.symbol.value,
        wallet.decimalToInteger(this.state.amount),
        { address, pinCode: pin }
      );

      if (this.props.useWalletService) {
        return new hathorLib.SendTransactionWalletService(this.props.wallet, {
          transaction,
          outputs: transaction.outputs,
          pin,
        });
      }

      return new hathorLib.SendTransaction({
        transaction,
        pin,
        storage: this.props.wallet.storage,
      });
    } catch (e) {
      this.setState({ errorMessage: e.message });
    }
  }

  /**
   * Method executed if token is created with success
   *
   * @param {Object} tx Create token transaction data
   */
  onTokenCreateSuccess = async (tx) => {
    const name = this.refs.shortName.value;
    const symbol = this.refs.symbol.value;
    const token = {
      uid: tx.hash,
      name,
      symbol
    };

    // Update redux with added token
    await tokens.addToken(token.uid, name, symbol);

    // Must update the shared address, in case we have used one for the change
    this.props.walletRefreshSharedAddress();
    this.showAlert(token);
  }


  /**
   * Method called after creating a token, then show an alert with explanation of the token
   *
   * @param {Object} token Object with {uid, name, symbol}
   */
  showAlert = (token) => {
    this.setState({ name: token.name, configurationString: hathorLib.tokensUtils.getConfigurationString(token.uid, token.name, token.symbol) }, () => {
      this.context.showModal(MODAL_TYPES.ALERT, {
        title: t`Token ${this.state.name} created`,
        body: this.getAlertBody(),
        handleButton: this.alertButtonClick,
        buttonName: 'Ok',
      });
    });
  }

  /**
   * Method called after clicking the button in the alert modal, then redirects to the wallet screen
   */
  alertButtonClick = () => {
    this.context.hideModal();
    this.props.history.push('/wallet/');
  }

  /**
   * Shows/hides address field depending on the checkbox click
   *
   * @param {Object} e Event for the address checkbox input change
   */
  handleCheckboxAddress = (e) => {
    const value = e.target.checked;
    if (value) {
      $(this.address.current).hide(400);
    } else {
      $(this.address.current).show(400);
    }
  }

  /**
   * Shows/hides input field depending on the checkbox click
   *
   * @param {Object} e Event for the inputWrapper checkbox input change
   */
  handleCheckboxInput = (e) => {
    const value = e.target.checked;
    if (value) {
      $(this.inputWrapper.current).hide(400);
    } else {
      $(this.inputWrapper.current).show(400);
    }
  }

  /**
   * Handles amount input change
   */
  onAmountChange = (amount) => {
    this.setState({amount});
  }

  /**
   * Method called when user clicked to see the token deposit RFC
   *
   * @param {Object} e Event for the click
   */
  goToRFC = (e) => {
    e.preventDefault();
    helpers.openExternalURL(TOKEN_DEPOSIT_RFC_URL);
  }

  getAlertBody = () => {
    return (
      <div>
        <p>{t`Your token has been successfully created!`}</p>
        <p>{t`You can share the following configuration string with other people to let them use your brand new token.`}</p>
        <p><SpanFmt>{t`Remember to **make a backup** of this configuration string.`}</SpanFmt></p>
        <p><strong>{this.state.configurationString}</strong></p>
      </div>
    )
  }

  render = () => {
    const depositPercent = this.props.wallet.storage.getTokenDepositPercentage();
    const htrDeposit = depositPercent * 100;

    return (
      <div className="content-wrapper">
        <BackButton {...this.props} />
        <h3 className="mt-4">Create Token</h3>
        <p className="mt-5">{t`Here you will create a new customized token. After the creation, you will be able to send this new token to other addresses.`}</p>
        <p>{t`Custom tokens share the address space with all other tokens, including HTR. This means that you can send and receive tokens using any valid address.`}</p>
        <p>{t`Remember to make a backup of your new token's configuration string. You will need to send it to other people to allow them to use your new token.`}</p>
        <p>
          {str2jsx(
            t`When creating and minting tokens, a |bold:deposit of ${htrDeposit}%| in HTR is required. If these tokens are later melted, this HTR deposit will be returned. Read more about it |link:here|.`,
            {
              bold: (x, i) => <strong key={i}>{x}</strong>,
              link: (x, i) => <a key={i} href="true" onClick={this.goToRFC}>{x}</a>,
            }
          )}
        </p>
        <hr className="mb-5 mt-5"/>
        <form ref="formCreateToken" id="formCreateToken">
          <div className="row">
            <div className="form-group col-6">
              <label>{t`Short name`}</label>
              <input required ref="shortName" placeholder={t`MyCoin`} type="text" className="form-control" />
            </div>
            <div className="form-group col-3">
              <label>{t`Symbol`}</label>
              <input required ref="symbol" placeholder={t`MYC (2-5 characters)`} type="text" minLength={2} maxLength={5} className="form-control" />
            </div>
          </div>
          <div className="row">
            <div className="form-group col-4">
              <label>{t`Amount`}</label>
              <InputNumber
               required
               className="form-control"
               onValueChange={this.onAmountChange}
               placeholder={hathorLib.numberUtils.prettyValue(0)}
              />
            </div>
            <div className="form-group d-flex flex-row align-items-center address-checkbox">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" ref="autoselectAddress" id="autoselectAddress" defaultChecked={true} onChange={this.handleCheckboxAddress} />
                <label className="form-check-label" htmlFor="autoselectAddress">
                  {t`Select address automatically`}
                </label>
              </div>
            </div>
            <div className="form-group col-5" ref={this.address} style={{display: 'none'}}>
              <label>{t`Destination address`}</label>
              <input ref="address" type="text" placeholder={t`Address`} className="form-control" />
            </div>
          </div>
          <p>Deposit: {tokens.getDepositAmount(this.state.amount, depositPercent)} HTR ({hathorLib.numberUtils.prettyValue(this.props.htrBalance)} HTR available)</p>
          <button type="button" className="mt-3 btn btn-hathor" onClick={this.onClickCreate}>Create</button>
        </form>
        <p className="text-danger mt-3">{this.state.errorMessage}</p>
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(CreateToken);
