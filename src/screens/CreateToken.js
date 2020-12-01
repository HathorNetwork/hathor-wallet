/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import { t } from 'ttag'
import { str2jsx } from '../utils/i18n';

import wallet from '../utils/wallet';
import tokens from '../utils/tokens';
import SpanFmt from '../components/SpanFmt';
import ModalSendTx from '../components/ModalSendTx';
import ModalAlert from '../components/ModalAlert';
import { connect } from "react-redux";
import BackButton from '../components/BackButton';
import hathorLib from '@hathor/wallet-lib';
import colors from '../index.scss';
import helpers from '../utils/helpers';
import { TOKEN_DEPOSIT_RFC_URL } from '../constants';
import InputNumber from '../components/InputNumber';


const mapStateToProps = (state) => {
  const balance = hathorLib.wallet.calculateBalance(
    Object.values(state.historyTransactions),
    hathorLib.constants.HATHOR_TOKEN_CONFIG.uid
  );
  return {
    htrBalance: balance.available,
    historyTransactions: state.historyTransactions,
  };
};


/**
 * Create a new token
 *
 * @memberof Screens
 */
class CreateToken extends React.Component {
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
        const max_output_value_str = hathorLib.helpers.prettyValue(hathorLib.constants.MAX_OUTPUT_VALUE);
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
    $('#pinModal').modal('show');
  }

  /**
   * Prepare create token transaction data after PIN is validated
   *
   * @param {String} pin PIN written
   *
   * @return {hathorLib.SendTransaction} SendTransaction object
   */
  prepareSendTransaction = (pin) => {
    // Get the address to send the created tokens
    let address = '';
    if (this.refs.autoselectAddress.checked) {
      address = hathorLib.wallet.getAddressToUse();
    } else {
      address = this.refs.address.value;
    }

    const ret = hathorLib.tokens.createToken(
      address,
      this.refs.shortName.value,
      this.refs.symbol.value,
      wallet.decimalToInteger(this.state.amount),
      pin
    );

    if (ret.success) {
      return ret.sendTransaction;
    } else {
      this.setState({ errorMessage: ret.message });
    }
  }

  /**
   * Method executed if token is created with success
   *
   * @param {Object} tx Create token transaction data
   */
  onTokenCreateSuccess = (tx) => {
    const token = {
      uid: tx.hash,
      name: this.refs.shortName.value,
      symbol: this.refs.symbol.value
    };

    // Update redux with added token
    tokens.saveTokenRedux(token.uid);
    // Must update the shared address, in case we have used one for the change
    wallet.updateSharedAddress();
    this.showAlert(token);
  }


  /**
   * Method called after creating a token, then show an alert with explanation of the token
   *
   * @param {Object} token Object with {uid, name, symbol}
   */
  showAlert = (token) => {
    this.setState({ name: token.name, configurationString: hathorLib.tokens.getConfigurationString(token.uid, token.name, token.symbol) }, () => {
      $('#alertModal').modal('show');
    });
  }

  /**
   * Method called after clicking the button in the alert modal, then redirects to the wallet screen
   */
  alertButtonClick = () => {
    $('#alertModal').on('hidden.bs.modal', (e) => {
      this.props.history.push('/wallet/');
    });
    $('#alertModal').modal('hide');
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

  render = () => {
    const getAlertBody = () => {
      return (
        <div>
          <p>{t`Your token has been successfully created!`}</p>
          <p>{t`You can share the following configuration string with other people to let them use your brand new token.`}</p>
          <p><SpanFmt>{t`Remember to **make a backup** of this configuration string.`}</SpanFmt></p>
          <p><strong>{this.state.configurationString}</strong></p>
        </div>
      )
    }

    const htrDeposit = hathorLib.tokens.getDepositPercentage() * 100;

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
               placeholder={hathorLib.helpers.prettyValue(0)}
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
          <p>Deposit: {tokens.getDepositAmount(this.state.amount)} HTR ({hathorLib.helpers.prettyValue(this.props.htrBalance)} HTR available)</p>
          <button type="button" className="mt-3 btn btn-hathor" onClick={this.onClickCreate}>Create</button>
        </form>
        <p className="text-danger mt-3">{this.state.errorMessage}</p>
        <ModalSendTx prepareSendTransaction={this.prepareSendTransaction} onSendSuccess={this.onTokenCreateSuccess} title="Creating token" />
        <ModalAlert title={t`Token ${this.state.name} created`} body={getAlertBody()} handleButton={this.alertButtonClick} buttonName="Ok" />
      </div>
    );
  }
}

export default connect(mapStateToProps)(CreateToken);
