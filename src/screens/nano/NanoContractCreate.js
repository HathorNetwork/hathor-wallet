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
import { bufferUtils, wallet, BetTransactionBuilder, dateFormatter, SendTransaction } from '@hathor/wallet-lib';
import { HDPrivateKey, crypto } from 'bitcore-lib';
import { connect } from "react-redux";
import { saveNC, saveNCHistory } from '../../actions/index';

const mapDispatchToProps = dispatch => {
  return {
    saveNC: (id, blueprint, address) => dispatch(saveNC(id, blueprint, address)),
    saveNCHistory: (id, history) => dispatch(saveNCHistory(id, history)),
  };
};

const mapStateToProps = (state) => {
  return {
    wallet: state.wallet,
  };
}

/**
 * Create a new Nano Contract
 *
 * @memberof Screens
 */
class NanoContractCreate extends React.Component {
  /**
   * Opens PIN modal if form is valid
   */
  onClickCreate = () => {
    if (!this.formValid()) {
      return;
    }

    $('#pinModal').modal('show');
  }

  /**
   * Validates if the create NC form is valid
   */
  formValid = () => {
    const isValid = this.refs.formCreateNC.checkValidity();
    if (!isValid) {
      this.refs.formCreateNC.classList.add('was-validated')
    }

    return isValid;
  }

  /**
   * Prepare create NC transaction data after PIN is validated
   *
   * @param {String} pin PIN written by the user
   *
   * @return {hathorLib.SendTransaction} SendTransaction object
   */
  prepareSendTransaction = async (pin) => {
    const accessData = wallet.getWalletAccessData();
    const encryptedPrivateKey = accessData.mainKey;
    const privateKeyStr = wallet.decryptData(encryptedPrivateKey, pin);
    const key = HDPrivateKey(privateKeyStr)
    // We create and register the Nano Contracts associated with address at index 0 by default
    const derivedKey = key.deriveNonCompliantChild(0);
    const privateKey = derivedKey.privateKey;
    const pubkey = privateKey.publicKey.toBuffer();

    const oracleScript = bufferUtils.hexToBuffer(this.refs.oracle.value); // TODO handle hex invalid error
    const tokenId = this.refs.token.value;
    const dateLastDeposit = dateFormatter.dateToTimestamp(new Date(this.refs.dateLastDeposit.value));

    const builder = new BetTransactionBuilder();
    const bet = builder.createBetNC(pubkey, oracleScript, tokenId, dateLastDeposit);
    const dataToSignHash = bet.getDataToSignHash();
    const sig = crypto.ECDSA.sign(dataToSignHash, privateKey, 'little').set({
      nhashtype: crypto.Signature.SIGHASH_ALL
    });
    bet.signature = sig.toDER();
    bet.prepareToSend();

    return new SendTransaction({ transaction: bet });
  }

  /**
   * Method executed if NC is created with success
   *
   * @param {Object} tx Created NC tx
   */
  onNCCreateSuccess = (tx) => {
    const address0 = this.props.wallet.getAddressAtIndex(0);
    this.props.saveNC(tx.hash, { name: 'Bet', id: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595' }, address0);
    this.props.saveNCHistory(tx.hash, [tx]);
    this.props.history.goBack();
  }

  render() {
    return (
      <div className="content-wrapper">
        <BackButton {...this.props} />
        <h3 className="mt-4">{t`Blueprint: Bet`}</h3>
        <div>
          <form ref="formCreateNC" id="formCreateNC">
            <div className="row">
              <div className="form-group col-6">
                <label>{t`Token UID`}</label>
                <input required ref="token" placeholder={t`00`} type="text" className="form-control" />
              </div>
            </div>
            <div className="row">
              <div className="form-group col-6">
                <label>{t`Oracle`}</label>
                <input required ref="oracle" placeholder={t`Oracle script in hex`} type="text" className="form-control" />
              </div>
            </div>
            <div className="row">
              <div className="form-group col-6">
                <label>{t`Date of the last deposit`}</label>
                <input required ref="dateLastDeposit" type="datetime-local" placeholder={t`Date and time in GMT`} step="1" className="form-control" />
              </div>
            </div>
            <button type="button" className="mt-3 btn btn-hathor" onClick={this.onClickCreate}>Create</button>
          </form>
        </div>
        <ModalSendTx prepareSendTransaction={this.prepareSendTransaction} onSendSuccess={this.onNCCreateSuccess} title="Creating Nano Contract" />
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(NanoContractCreate);
