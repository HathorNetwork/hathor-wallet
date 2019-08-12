/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import wallet from '../utils/wallet';
import tokens from '../utils/tokens';
import ReactLoading from 'react-loading';
import ModalPin from '../components/ModalPin';
import ModalAlert from '../components/ModalAlert';
import { connect } from "react-redux";
import BackButton from '../components/BackButton';
import hathorLib from '@hathor/wallet-lib';

const mapStateToProps = (state) => {
  return {
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
     * loading {boolean} While waiting for server response, loading is true and show a spinner
     * pin {string} PIN that user writes in the modal
     * name {string} Name of the created token
     * configurationString {string} Configuration string of the created token
     */
    this.state = {
      errorMessage: '',
      loading: false,
      pin: '',
      name: '',
      configurationString: ''
    };
  }

  /**
   * Method used to save what user wrote on PIN input in the modal
   *
   * @param {Object} e Event for the PIN input change
   */
  handleChangePin = (e) => {
    this.setState({ pin: e.target.value });
  }

  /**
   * Validates if the create token form is valid
   */
  formValid = () => {
    const isValid = this.refs.formCreateToken.checkValidity();
    if (isValid) {
      if (this.refs.address.value === '' && !this.refs.autoselectAddress.checked) {
        this.setState({ errorMessage: 'Must choose an address or auto select' });
        return false;
      }

      // Validating maximum amount
      const tokensValue = this.refs.amount.value*(10**hathorLib.constants.DECIMAL_PLACES);
      if (tokensValue > hathorLib.constants.MAX_OUTPUT_VALUE) {
        this.setState({ errorMessage: `Maximum value to mint token is ${hathorLib.helpers.prettyValue(hathorLib.constants.MAX_OUTPUT_VALUE)}` });
        return false;
      }
      return true;
    } else {
      this.refs.formCreateToken.classList.add('was-validated')
    }
  }

  /**
   * Executes tokens creation. Runs after user entered pin on the pin modal
   */
  createToken = () => {
    $('#pinModal').modal('hide');
    if (!this.formValid()) {
      return;
    }
    this.setState({ errorMessage: '', loading: true });
    // Get the address to send the created tokens
    let address = '';
    if (this.refs.autoselectAddress.checked) {
      address = hathorLib.wallet.getAddressToUse();
    } else {
      address = this.refs.address.value;
    }

    const retPromise = hathorLib.tokens.createToken(
      address,
      this.refs.shortName.value,
      this.refs.symbol.value,
      parseInt(this.refs.amount.value*(10**hathorLib.constants.DECIMAL_PLACES), 10),
      this.state.pin
    );
    retPromise.then((token) => {
      // Update redux with added token
      tokens.saveTokenRedux(token.uid);
      // Must update the shared address, in case we have used one for the change
      wallet.updateSharedAddress();
      this.showAlert(token);
    }, (message) => {
      this.setState({ loading: false, errorMessage: message });
    });
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
      this.setState({ loading: false });
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

  render = () => {
    const isLoading = () => {
      return (
        <div className="d-flex flex-row">
          <p className="mr-3">Please, wait while we create your token</p>
          <ReactLoading type='spin' color='#0081af' width={24} height={24} delay={200} />
        </div>
      )
    }

    const getAlertBody = () => {
      return (
        <div>
          <p>Your token has been successfully created!</p>
          <p>You can share the following configuration string with other people to let them use your brand new token.</p>
          <p>Remember to <strong>make a backup</strong> of this configuration string.</p>
          <p><strong>{this.state.configurationString}</strong></p>
        </div>
      )
    }

    return (
      <div className="content-wrapper">
        <BackButton {...this.props} />
        <h3 className="mt-4">Create Token</h3>
        <p className="mt-5">Here you will create a new customized token. After the creation, you will be able to send this new token to other addresses.</p>
        <p>Custom tokens share the address space with all other tokens, including HTR. This means that you can send and receive tokens using any valid address.</p>
        <p>Remember to make a backup of your new token's configuration string. You will need to send it to other people to allow them to use your new token.</p>
        <p>When creating and minting tokens, a <strong>deposit of {hathorLib.tokens.depositPercentage * 100}%</strong> in HTR is required. This will be returned when these tokens are later melted.</p>
        <hr className="mb-5 mt-5"/>
        <form ref="formCreateToken" id="formCreateToken">
          <div className="row">
            <div className="form-group col-6">
              <label>Short name</label>
              <input required ref="shortName" placeholder="MyCoin" type="text" className="form-control" />
            </div>
            <div className="form-group col-3">
              <label>Symbol</label>
              <input required ref="symbol" placeholder="MYC (max 5 characters)" type="text" pattern="\w{1,5}" className="form-control" />
            </div>
          </div>
          <div className="row">
            <div className="form-group col-4">
              <label>Amount</label>
              <input required type="number" ref="amount" step={hathorLib.helpers.prettyValue(1)} min={hathorLib.helpers.prettyValue(1)} placeholder={hathorLib.helpers.prettyValue(0)} className="form-control" />
            </div>
            <div className="form-group d-flex flex-row align-items-center address-checkbox">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" ref="autoselectAddress" id="autoselectAddress" defaultChecked={true} onChange={this.handleCheckboxAddress} />
                <label className="form-check-label" htmlFor="autoselectAddress">
                  Select address automatically
                </label>
              </div>
            </div>
            <div className="form-group col-5" ref={this.address} style={{display: 'none'}}>
              <label>Destination address</label>
              <input ref="address" type="text" placeholder="Address" className="form-control" />
            </div>
          </div>
          <button type="button" disabled={this.state.loading} className="mt-3 btn btn-hathor" data-toggle="modal" data-target="#pinModal">Create</button>
        </form>
        <p className="text-danger mt-3">{this.state.errorMessage}</p>
        {this.state.loading ? isLoading() : null}
        <ModalPin execute={this.createToken} handleChangePin={this.handleChangePin} />
        <ModalAlert title={`Token ${this.state.name} created`} body={getAlertBody()} handleButton={this.alertButtonClick} buttonName="Ok" />
      </div>
    );
  }
}

export default connect(mapStateToProps)(CreateToken);
