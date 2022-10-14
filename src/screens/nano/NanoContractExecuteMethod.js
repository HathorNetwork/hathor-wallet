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
import { transaction as transactionOld, constants, helpers, wallet as walletLib, BetTransactionBuilder, SendTransaction, Address, config, Input, Output, P2PKH } from '@hathor/wallet-lib';
import { HDPrivateKey, crypto } from 'bitcore-lib';
import { connect } from "react-redux";
import { saveNC } from '../../actions/index';
import InputNumber from '../../components/InputNumber';
import wallet from '../../utils/wallet';
import { replace, capitalize } from 'lodash';

const mapStateToProps = (state) => {
  return {
    nanoContract: state.nanoContract,
  };
};

/**
 * Execute a nano contract method
 *
 * @memberof Screens
 */
class NanoContractExecuteMethod extends React.Component {
  valueRef = React.createRef();

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

  /**
   * Prepare to create NC method execution transaction data after PIN is validated
   *
   * @param {String} pin PIN written by the user
   *
   * @return {hathorLib.SendTransaction} SendTransaction object
   */
  prepareSendTransaction = async (pin) => {
    const method = this.props.match.params.method;
    const network = config.getNetwork();

    const accessData = walletLib.getWalletAccessData();
    const encryptedPrivateKey = accessData.mainKey;
    const privateKeyStr = walletLib.decryptData(encryptedPrivateKey, pin);
    const key = HDPrivateKey(privateKeyStr)
    const derivedKey = key.deriveNonCompliantChild(0);
    const privateKey = derivedKey.privateKey;
    const pubkey = privateKey.publicKey.toBuffer();

    const address = this.refs.address.value;
    const addressObj = new Address(address, { network });
    const result = this.refs.result.value;

    const amountStr = (this.valueRef.current.value || "").replace(/,/g, '');
    //const tokensValue = this.isNFT() ? parseInt(valueStr) : wallet.decimalToInteger(valueStr);
    // TODO handle NFT as well
    const amount = wallet.decimalToInteger(amountStr);
    // TODO get token from NC data
    // XXX Improve how to get utxos
    const walletData = walletLib.getWalletData();
    const historyTxs = 'historyTransactions' in walletData ? walletData.historyTransactions : {};
    const ret = walletLib.prepareSendTokensData({outputs: [{ value: amount }]}, { uid: '00' }, true, historyTxs, []);

    // They will be used to sign tx
    const auxInputs = [];
    const auxOutputs = [];

    const inputs = ret.data.inputs;
    const outputsObj = [];
    for (const output of ret.data.outputs) {
      if (output.address) {
        const address = new Address(output.address, { network });
        // This will throw AddressError in case the adress is invalid
        address.validateAddress();
        const p2pkh = new P2PKH(address);
        const p2pkhScript = p2pkh.createScript()
        const outputObj = new Output(
          output.value,
          p2pkhScript,
          { tokenData: output.tokenData }
        );
        outputsObj.push(outputObj);

        auxOutputs.push({ address: output.address, value: output.value, tokenData: output.tokenData });
      }
    }

    const inputsObj = [];
    for (const input of inputs) {
      inputsObj.push(new Input(input.tx_id, input.index));

      auxInputs.push({ tx_id: input.tx_id, index: input.index, address: input.address });
    }

    const builder = new BetTransactionBuilder();
    const bet = builder.deposit(this.props.match.params.nc_id, pubkey, inputsObj, outputsObj, addressObj, result);
    const dataToSignHash = bet.getDataToSignHash();
    const sig = crypto.ECDSA.sign(dataToSignHash, privateKey, 'little').set({
      nhashtype: crypto.Signature.SIGHASH_ALL
    });
    bet.signature = sig.toDER();

    // Inputs signature
    const dataToSign = bet.getDataToSign();
    const auxData = { inputs: auxInputs, outputs: auxOutputs, version: constants.NANO_CONTRACTS_VERSION, tokens: [], weight: 1 };
    const newData = transactionOld.signTx(auxData, dataToSign, pin);

    for (let idx = 0; idx < newData.inputs.length; idx++) {
      inputsObj[idx].setData(newData.inputs[idx].data);
    }

    bet.prepareToSend();

    return new SendTransaction({ transaction: bet });
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

    const renderForm = () => {
      // TODO render input differently if token is an NFT
      if (method === 'make_a_bet') {
        return (
          <div>
            <div className="row">
              <div className="form-group col-6">
                <label>{t`Amount to bet`}</label>
                <InputNumber key="amount-to-bet" ref={this.valueRef} placeholder={helpers.prettyValue(0)} className="form-control col-2" />
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
      // TODO add other methods
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