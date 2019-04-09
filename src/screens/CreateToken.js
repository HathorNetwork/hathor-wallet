/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import dateFormatter from '../utils/date';
import helpers from '../utils/helpers';
import { Decimal } from 'decimal.js-light';
import wallet from '../utils/wallet';
import ReactLoading from 'react-loading';
import tokens from '../utils/tokens';
import { HATHOR_TOKEN_CONFIG, HATHOR_TOKEN_INDEX } from '../constants';
import ModalPin from '../components/ModalPin'
import { connect } from "react-redux";
import BackButton from '../components/BackButton';

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
    this.inputCheckbox = React.createRef();
    this.txId = React.createRef();
    this.index = React.createRef();

    /**
     * errorMessage {string} Message to show when error happens on the form
     * loading {boolean} While waiting for server response, loading is true and show a spinner
     * pin {string} PIN that user writes in the modal
     */
    this.state = {
      errorMessage: '',
      loading: false,
      pin: ''
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
      return true;
    } else {
      this.refs.formCreateToken.classList.add('was-validated')
    }
  }

  /*
   * Getting Hathor input and output to generate the new token
   */
  getHathorData = () => {
    let input = null;
    let amount = new Decimal(0);
    if (this.inputCheckbox.current.checked) {
      // Select inputs automatically
      const inputs = wallet.getInputsFromAmount(this.props.historyTransactions, new Decimal(helpers.minimumAmount()), HATHOR_TOKEN_CONFIG.uid);
      if (inputs.inputs.length === 0) {
        this.setState({ errorMessage: 'You don\'t have any available hathor token to create a new token' });
        return null;
      } else if (inputs.inputs.length > 1) {
        this.setState({ errorMessage: 'Error getting inputs automatically' });
        return null;
      }
      input = inputs.inputs[0];
      amount = inputs.inputsAmount;
    } else {
      const txId = this.txId.current.value;
      const index = this.index.current.value;
      if (txId === '' || index === '') {
        this.setState({ errorMessage: 'Tx id and index are required when manually choosing input' });
        return null;
      }

      const utxo = wallet.checkUnspentTxExists(this.props.historyTransactions, txId, index, HATHOR_TOKEN_CONFIG.uid);
      if (!utxo.exists) {
        // Input does not exist in unspent txs
        this.setState({ errorMessage: utxo.message });
        return null;
      }

      const output = utxo.output;
      if (!wallet.canUseUnspentTx(output)) {
        this.setState({ errorMessage: `Output [${txId}, ${index}] is locked until ${dateFormatter.parseTimestamp(output.decoded.timelock)}` });
        return null;
      }

      input = {'tx_id': txId, 'index': index, 'token': HATHOR_TOKEN_CONFIG.uid, 'address': output.decoded.address};
      amount = new Decimal(output.value);
    }
    // Change output for Hathor because the whole input will go as change
    const outputChange = wallet.getOutputChange(amount, HATHOR_TOKEN_INDEX);
    return {'input': input, 'output': outputChange};
  }

  /**
   * Method execute after user verifies the action in the PIN modal and closes the modal and executes token creation
   */
  createToken = () => {
    $('#pinModal').modal('hide');
    if (!this.formValid()) {
      return;
    }
    const hathorData = this.getHathorData();
    if (!hathorData) return;
    this.setState({ errorMessage: '', loading: true });
    // Get the address to send the created tokens
    let address = '';
    if (this.refs.autoselectAddress.checked) {
      address = wallet.getAddressToUse();
    } else {
      address = this.refs.address.value;
    }
    const promise = new Promise((resolve, reject) => {
      const retPromise = tokens.createToken(hathorData.input, hathorData.output, address, this.refs.shortName.value, this.refs.symbol.value, this.refs.amount.value, this.state.pin);
      retPromise.then(() => {
        resolve();
      }, (message) => {
        reject(message);
      });
    });

    promise.then(() => {
      this.setState({ loading: false });
      this.props.history.push('/wallet/');
    }, (message) => {
      this.setState({ loading: false, errorMessage: message });
    });
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

    return (
      <div className="content-wrapper">
        <BackButton {...this.props} />
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
              <input required type="number" ref="amount" step={helpers.prettyValue(1)} min={helpers.prettyValue(1)} placeholder={helpers.prettyValue(0)} className="form-control" />
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
            <div className="form-group d-flex flex-row align-items-center col-12">
              <div className="form-check">
                <input className="form-check-input" type="checkbox" ref={this.inputCheckbox} id="autoselectInput" defaultChecked={true} onChange={this.handleCheckboxInput} />
                <label className="form-check-label" htmlFor="autoselectInput">
                  Select input automatically
                </label>
              </div>
            </div>
          </div>
          <div className="form-group input-group mb-3 inputs-wrapper" ref={this.inputWrapper} style={{display: 'none'}}>
            <input type="text" placeholder="Tx id" ref={this.txId} className="form-control input-id col-6" />
            <input type="text" placeholder="Index" ref={this.index} className="form-control input-index col-1 ml-3" />
          </div>
          <button type="button" disabled={this.state.loading} className="btn btn-hathor" data-toggle="modal" data-target="#pinModal">Create</button>
        </form>
        <p className="text-danger mt-3">{this.state.errorMessage}</p>
        {this.state.loading ? isLoading() : null}
        <ModalPin execute={this.createToken} handleChangePin={this.handleChangePin} />
      </div>
    );
  }
}

export default connect(mapStateToProps)(CreateToken);
