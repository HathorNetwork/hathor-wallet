/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import ModalSendTx from '../components/ModalSendTx';
import SendTokensOne from '../components/SendTokensOne';
import { connect } from "react-redux";
import BackButton from '../components/BackButton';
import hathorLib from '@hathor/wallet-lib';
import wallet from '../utils/wallet';
import ModalAlertNotSupported from '../components/ModalAlertNotSupported';
import ModalAlert from '../components/ModalAlert';
import ledger, { LedgerError } from '../utils/ledger';
import { MIN_JOB_ESTIMATION, MIN_POLL, IPC_RENDERER } from '../constants';


const mapStateToProps = (state) => {
  return { tokens: state.tokens };
};


/**
 * Screen used to send tokens to another wallet.  
 * Can send more than one token in the same transaction.
 *
 * @memberof Screens
 */
class SendTokens extends React.Component {
  constructor(props) {
    super(props);

    // Holds the children components references
    this.references = [React.createRef()];

    // Data pending to be sent while waiting ledger signatures
    this.pendingData = null;

    // Save prepared data while tx is being mined, so we can update with nonce and parents later
    this.data = null;

    /**
     * errorMessage {string} Message to be shown in case of error in form
     * pin {string} PIN that user writes in the modal
     * txTokens {Array} Array of tokens configs already added by the user (start with only hathor)
     * ledgerStep {number} When sending tx with ledger we have a step that needs user physical input, then we move to next step
     */
    this.state = {
      errorMessage: '',
      pin: '',
      txTokens: [hathorLib.constants.HATHOR_TOKEN_CONFIG],
      ledgerStep: 0,
      data: null,
    };
  }

  componentDidMount() {
    if (IPC_RENDERER) {
      IPC_RENDERER.on("ledger:txSent", this.handleTxSent);
      IPC_RENDERER.on("ledger:signatures", this.handleSignatures);
    }
  }

  componentWillUnmount() {
    if (IPC_RENDERER) {
      IPC_RENDERER.removeAllListeners("ledger:txSent");
      IPC_RENDERER.removeAllListeners("ledger:signatures");
    }
  }

  /**
   * Handle the response of a send tx call to Ledger. 
   *
   * @param {IpcRendererEvent} event May be used to reply to the event
   * @param {Object} arg Data returned from the send tx call
   */
  handleTxSent = (event, arg) => {
    if (arg.success) {
      this.getSignatures();
    } else {
      this.handleSendError(new LedgerError(arg.error.message));
    } 
  }

  /**
   * Handle the response of a get signatures call to Ledger. 
   *
   * @param {IpcRendererEvent} event May be used to reply to the event
   * @param {Object} arg Data returned from the get signatures call
   */
  handleSignatures = (event, arg) => {
    if (arg.success) {
      this.onLedgerSuccess(arg.data);
    } else {
      this.handleSendError(new LedgerError(arg.error.message));
    }
  }

  /**
   * Check if form is valid
   *
   * @return {boolean}
   */
  validateData = () => {
    const isValid = this.refs.formSendTokens.checkValidity();
    if (isValid === false) {
      this.refs.formSendTokens.classList.add('was-validated');
    } else {
      this.refs.formSendTokens.classList.remove('was-validated');
    }
    return isValid;
  }

  /**
   * Get inputs and outputs data from child components  
   * Each child component holds inputs/outputs for one token
   *
   * @return {Object} Object holding all inputs and outputs {'inputs': [...], 'outputs': [...]}
   */
  getData = () => {
    let data = {'inputs': [], 'outputs': []};
    for (const ref of this.references) {
      const instance = ref.current;
      let dataOne = instance.getData();
      if (!dataOne) return;
      dataOne = instance.handleInitialData(dataOne);
      if (!dataOne) return;
      data['inputs'] = [...data['inputs'], ...dataOne['inputs']];
      data['outputs'] = [...data['outputs'], ...dataOne['outputs']];
    }
    return data;
  }

  /**
   * Add signature to each input and execute send transaction
   */
  onLedgerSuccess = (signatures) => {
    const data = this.pendingData;
    const keys = hathorLib.wallet.getWalletData().keys;
    for (const [index, input] of data.inputs.entries()) {
      const signature = Buffer.from(signatures[index]);
      const keyIndex = keys[input.address].index;
      const pubKey = hathorLib.wallet.getPublicKey(keyIndex);
      input['data'] = hathorLib.transaction.createInputData(signature, pubKey);
    }
    try {
      // Prepare data and submit job to tx mining API
      this.data = hathorLib.transaction.prepareData(data, null, {getSignature: false, completeTx: false});
      this.handleJobSubmit();
    } catch(e) {
      this.handleSendError(e);
    }
  }

  /**
   * Execute ledger get signatures
   */
  getSignatures = () => {
    this.setState({ ledgerStep: 1 });
    const keys = hathorLib.wallet.getWalletData().keys;
    ledger.getSignatures(Object.assign({}, this.pendingData), keys);
  }

  onTxSent = (response) => {
    $('#alertModal').modal('hide');
    if (response.success) {
      // Must update the shared address, in case we have used one for the change
      wallet.updateSharedAddress();
      this.props.history.push('/wallet/');
    } else {
      this.setState({ errorMessage: response.message, loading: false, ledgerStep: 0 });
    }
  }

  showLedgerModal = () => {
    // Complete data with default values
    hathorLib.transaction.completeTx(data);

    // Find if tx has change output
    const changeIndex = data.outputs.findIndex((v) => v.isChange === true);
    let changeKeyIndex = null;
    if (changeIndex > -1) {
      // Find index path that generated the output address
      const changeOutput = data.outputs[changeIndex];
      const keys = hathorLib.wallet.getWalletData().keys;
      changeKeyIndex = keys[changeOutput.address].index;
    }

    this.pendingData = data;
    ledger.sendTx(data, changeIndex, changeKeyIndex);
    $('#alertModal').modal('show');
  }

  /**
   * Method executed when user validates its PIN on the modal  
   * Checks if the form is valid, get data from child components, complete the transaction and execute API request
   */
  beforeSend = () => {
    const isValid = this.validateData();
    if (!isValid) return;
    let data = this.getData();
    if (!data) return;
    data.tokens = hathorLib.tokens.filterTokens(this.state.txTokens, hathorLib.constants.HATHOR_TOKEN_CONFIG).map((token) => token.uid);
    this.setState({ errorMessage: '' });
    try {
      if (hathorLib.wallet.isSoftwareWallet()) {
        this.setState({ data }, () => {
          $('#pinModal').modal('show');
        });
      } else {
        this.executeSend(data);
      }
    } catch(e) {
      this.handleSendError(e);
    }
  }

  prepareSendTransaction = (pin) => {
    try {
      const data = hathorLib.transaction.prepareData(this.state.data, pin);
      return new hathorLib.SendTransaction({data});
    } catch(e) {
      this.handleSendError(e);
      return null;
    }
  }

  /**
   * Handle error when executing sendTransaction method of the lib
   */
  handleSendError = (e) => {
    if (e instanceof hathorLib.errors.AddressError ||
        e instanceof hathorLib.errors.OutputValueError ||
        e instanceof hathorLib.errors.ConstantNotSet ||
        e instanceof hathorLib.errors.MaximumNumberOutputsError ||
        e instanceof hathorLib.errors.MaximumNumberInputsError ||
        e instanceof LedgerError) {
      $('#alertModal').modal('hide');
      this.setState({ errorMessage: e.message, loading: false, ledgerStep: 0 });
    } else {
      // Unhandled error
      throw e;
    }
  }

  /**
   * Update class state
   *
   * @param {Object} newState New state for the class
   */
  updateState = (newState) => {
    this.setState(newState);
  }

  /**
   * Executed when user clicks to add another token to this transaction  
   * Checks if still have a known token available that is not selected yet  
   * Create a new child reference with this new token
   */
  addAnotherToken = () => {
    if (hathorLib.wallet.isHardwareWallet()) {
      $('#notSupported').modal('show');
      return;
    }

    if (this.state.txTokens.length === this.props.tokens.length) {
      this.setState({ errorMessage: t`All your tokens were already added` });
      return;
    }

    // Among all the token options we choose the first one that is not already selected
    const newToken = this.props.tokens.find((token) => {
      return this.state.txTokens.find((txToken) =>
        txToken.uid === token.uid
      ) === undefined
    });

    this.references.push(React.createRef());
    const txTokens = [...this.state.txTokens, newToken];
    this.setState({ txTokens });
  }

  /**
   * Called when the select of a new token has changed  
   * Used to change the selects in all other child components because the selected token can't be selected anymore
   *
   * @param {Object} selected Config of token that was selected {'name', 'symbol', 'uid'}
   * @param {number} index Index of the child component
   */
  tokenSelectChange = (selected, index) => {
    let txTokens = [...this.state.txTokens];
    txTokens[index] = selected;
    this.setState({ txTokens });
  }

  /**
   * Called when user removes a child component (removes a token)
   *
   * @param {number} index Index of the child component
   */
  removeToken = (index) => {
    let txTokens = [...this.state.txTokens];
    txTokens.splice(index, 1);
    this.setState({ txTokens });
    this.references.splice(index, 1);
  }

  /**
   * Called when user clicks on send tokens button
   * Open pin modal if software wallet and execute send otherwise
   */
  onSendTokensClicked = () => {
    this.beforeSend();
  }

  render = () => {
    const renderOnePage = () => {
      return this.state.txTokens.map((token, index) => {
        return <SendTokensOne key={`${token.uid}-${index}`} ref={this.references[index]} config={token} index={index} selectedTokens={this.state.txTokens} tokens={this.props.tokens} tokenSelectChange={this.tokenSelectChange} removeToken={this.removeToken} updateState={this.updateState} />
      });
    }

    const renderPage = () => {
      return (
        <div>
          <form ref="formSendTokens" id="formSendTokens">
            {renderOnePage()}
            <div className="mt-5">
              <button type="button" className="btn btn-secondary mr-4" onClick={this.addAnotherToken} disabled={this.state.loading}>{t`Add another token`}</button>
              <button type="button" className="btn btn-hathor" disabled={this.state.loading} onClick={this.onSendTokensClicked}>{t`Send Tokens`}</button>
            </div>
          </form>
          <p className="text-danger mt-3 white-space-pre-wrap">{this.state.errorMessage}</p>
        </div>
      );
    }

    const renderAlertBody = () => {
      if (this.state.ledgerStep === 0) {
        return (
          <div>
            <p>{t`Please go to you Ledger and validate each output of your transaction. Press both buttons in case the output is correct.`}</p>
            <p>{t`In the end, a final screen will ask you to confirm sending the transaction.`}</p>
          </div>
        );
      } else {
        // TODO add send tx handler here
        return null;
      }
    }

    return (
      <div className="content-wrapper flex align-items-center">
        <BackButton {...this.props} />
        <h3 className="mt-4 mb-4">{t`Send Tokens`}</h3>
        {renderPage()}
        <ModalSendTx prepareSendTransaction={this.prepareSendTransaction} onTxSent={this.onTxSent} title={t`Sending transaction`} />
        <ModalAlertNotSupported />
        <ModalAlert title={t`Validate outputs on Ledger`} showFooter={false} body={renderAlertBody()} />
      </div>
    );
  }
}

export default connect(mapStateToProps)(SendTokens);
