/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'
import BackButton from '../../components/BackButton';
import ModalSendTx from '../../components/ModalSendTx';
import $ from 'jquery';
import { Serializer, bufferUtils, scriptsUtils, transactionUtils, transaction as transactionOld, constants, helpersUtils, wallet as walletLib, BetTransactionBuilder, SendTransaction, Address, config, Input, Output, P2PKH, P2SH } from '@hathor/wallet-lib';
import { HDPrivateKey, crypto } from 'bitcore-lib';
import { connect } from "react-redux";
import { saveNC } from '../../actions/index';
import InputNumber from '../../components/InputNumber';
import wallet from '../../utils/wallet';
import { replace, capitalize } from 'lodash';
import buffer from 'buffer';

const mapStateToProps = (state) => {
  return {
    selectedNC: state.selectedNC,
    wallet: state.wallet,
  };
};

/**
 * Execute a nano contract method
 *
 * @memberof Screens
 */
class NanoContractExecuteMethod extends React.Component {
  valueRef = React.createRef();
  resultRef = React.createRef();

  /**
   * Opens PIN modal if form is valid
   */
  onExecuteMethod = () => {
    if (!this.formValid()) {
      return;
    }

    $('#pinModal').modal('show');
  }

  /**
   * Validates if the create NC form is valid
   */
  formValid = () => {
    const isValid = this.refs.formExecuteMethod.checkValidity();
    if (!isValid) {
      this.refs.formExecuteMethod.classList.add('was-validated')
    }

    // TODO validate max value

    return isValid;
  }

  prepareSendTransactionSetResult = async (pin) => {
    const ncId = this.props.match.params.nc_id;
    const ncAddress = this.props.selectedNC.address;
    const result = this.refs.result.value;
    const oracleScriptHex = this.props.selectedNC.nc_data.oracle;

    // TODO get this value from input if not an address of the wallet
    const oracleInputData = null;

    return this.props.wallet.setBetResult(ncId, ncAddress, result, oracleScriptHex, oracleInputData, { pinCode: pin });
  }

  prepareSendTransactionBet = async (pin) => {
    const ncId = this.props.match.params.nc_id;
    const ncAddress = this.props.selectedNC.address;
    const betAddress = this.refs.address.value;
    const result = this.refs.result.value;

    const amountStr = (this.valueRef.current.value || "").replace(/,/g, '');
    //const tokensValue = this.isNFT() ? parseInt(valueStr) : wallet.decimalToInteger(valueStr);
    // TODO handle NFT as well
    const amount = wallet.decimalToInteger(amountStr);

    // XXX Get token from nc
    return this.props.wallet.makeBet(ncId, ncAddress, betAddress, result, amount, '00', { pinCode: pin });
  }

  prepareSendTransactionWithdraw = async (pin) => {
    const ncId = this.props.match.params.nc_id;
    const ncAddress = this.props.selectedNC.address;

    const amountStr = (this.valueRef.current.value || "").replace(/,/g, '');
    //const tokensValue = this.isNFT() ? parseInt(valueStr) : wallet.decimalToInteger(valueStr);
    // TODO handle NFT as well
    const amount = wallet.decimalToInteger(amountStr);
    // TODO handle custom token
    const tokenData = 0;

    return this.props.wallet.makeWithdrawal(ncId, ncAddress, amount, tokenData, { pinCode: pin });
  }


  /**
   * Prepare to create NC method execution transaction data after PIN is validated
   *
   * @param {String} pin PIN written by the user
   *
   * @return {hathorLib.SendTransaction} SendTransaction object
   */
  prepareSendTransaction = async (pin) => {
    const method = this.props.match.params.method;

    if (method === 'make_a_bet') {
      return this.prepareSendTransactionBet(pin);
    }

    if (method === 'set-result') {
      return this.prepareSendTransactionSetResult(pin);
    }

    if (method === 'withdraw') {
      return this.prepareSendTransactionWithdraw(pin);
    }
  }

  isOracleScriptMyAddress = () => {
    const parsedScript = this.props.wallet.parseOracleScript(this.props.selectedNC.nc_data.oracle);

    // If script couldn't be parsed, not my address
    if (parsedScript === null) {
      return false;
    }

    // If script is not P2PKH and not P2SH, not my address
    if (!(parsedScript instanceof P2PKH || parsedScript instanceof P2SH)) {
      return false;
    }

    return this.props.wallet.isAddressMine(parsedScript.address.base58);
  }

  /**
   * Method executed if NC method is executed with success
   *
   * @param {Object} tx Tx created from method execution
   */
  onMethodExecuted = (tx) => {
    this.props.history.goBack();
  }

  render() {
    const method = this.props.match.params.method;

    const renderBet = () => {
      // TODO render input differently if token is an NFT
      return (
        <div>
          <div className="row">
            <div className="form-group col-6">
              <label>{t`Amount to bet`}</label>
              <InputNumber key="amount-to-bet" ref={this.valueRef} placeholder={helpersUtils.prettyValue(0)} className="form-control col-2" />
            </div>
          </div>
          <div className="row">
            <div className="form-group col-6">
              <label>{t`Bet result`}</label>
              <input required ref="result" type="text" className="form-control" />
            </div>
          </div>
          <div className="row">
            <div className="form-group col-6">
              <label>{t`Address`}</label>
              <input required ref="address" type="text" placeholder={t`Address to withdraw in case of success`} className="form-control" />
            </div>
          </div>
        </div>
      );
    }

    const renderOracleSignatureMyAddress = () => {
      return (
        <div className="form-group col-6">
          <label>{t`Oracle signature`}</label>
          <p>{t`The oracle script is an address of this wallet, the result will be signed automatically.`}</p>
        </div>
      );
    }

    const renderOracleCustomScript = () => {
      return (
        <div className="form-group col-6">
          <label>{t`Oracle signed input`}</label>
          <input required ref="oracleSignedInput" type="text" placeholder={t`The signed input result to check with the oracle script`} className="form-control" />
        </div>
      );
    }

    const renderSetResult = () => {
      return (
        <div>
          <div className="row">
            <div className="form-group col-6">
              <label>{t`Final result`}</label>
              <input required ref={this.resultRef} type="text" className="form-control" />
            </div>
          </div>
          <div className="row">
            {this.isOracleScriptMyAddress() ? renderOracleSignatureMyAddress() : renderOracleCustomScript()}
          </div>
        </div>
      );
    }

    const renderWithdraw = () => {
      // TODO render input differently if token is an NFT
      // TODO show correct available amount to withdraw
      return (
        <div>
          <div className="row">
            <div className="form-group col-12">
              <label>{t`Amount available to withdraw: `}100.00</label>
            </div>
          </div>
          <div className="row">
            <div className="form-group col-6">
              <label>{t`Amount to withdraw`}</label>
              <InputNumber key="amount-to-bet" ref={this.valueRef} placeholder={helpersUtils.prettyValue(0)} className="form-control col-2" />
            </div>
          </div>
        </div>
      );
    }

    const renderForm = () => {
      if (method === 'make_a_bet') {
        return renderBet();
      }

      if (method === 'set-result') {
        return renderSetResult();
      }

      if (method === 'withdraw') {
        return renderWithdraw();
      }
    }

    const prettyMethod = (method) => {
      return capitalize(replace(method, /_|-/g, ' '));
    }

    return (
      <div className="content-wrapper">
        <BackButton {...this.props} />
        <h4 className="mt-4">{t`Method: `} {prettyMethod(method)}</h4>
        <div>
          <form ref="formExecuteMethod" id="formExecuteMethod">
            {renderForm()}
            <button type="button" className="mt-3 btn btn-hathor" onClick={this.onExecuteMethod}>Execute</button>
          </form>
        </div>
        <ModalSendTx prepareSendTransaction={this.prepareSendTransaction} onSendSuccess={this.onMethodExecuted} title="Executing method" />
      </div>
    );
  }
}

export default connect(mapStateToProps)(NanoContractExecuteMethod);