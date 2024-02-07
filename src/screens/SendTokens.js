/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useContext, useEffect, useRef, useState } from 'react';
import { t } from 'ttag';
import SendTokensOne from '../components/SendTokensOne';
import { useDispatch, useSelector } from 'react-redux';
import BackButton from '../components/BackButton';
import hathorLib from '@hathor/wallet-lib';
import { walletRefreshSharedAddress } from '../actions';
import SendTxHandler from '../components/SendTxHandler';
import ledger, { LedgerError } from '../utils/ledger';
import tokensUtils from '../utils/tokens';
import versionUtils from '../utils/version';
import { IPC_RENDERER, LEDGER_TX_CUSTOM_TOKEN_LIMIT } from '../constants';
import ReactLoading from 'react-loading';
import colors from '../index.scss';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import LOCAL_STORE from '../storage';
import { useHistory } from 'react-router-dom';
import { getGlobalWallet } from "../services/wallet.service";

/**
 * Screen used to send tokens to another wallet.
 * Can send more than one token in the same transaction.
 *
 * @memberof Screens
 */
function SendTokens() {
  const globalModalContext = useContext(GlobalModalContext);

  const dispatch = useDispatch();
  const history = useHistory();

  // Redux state
  const { selectedToken, tokens, metadataLoaded, useWalletService } = useSelector(
    (state) => {
      return {
        selectedToken: state.selectedToken,
        tokens: state.tokens,
        metadataLoaded: state.metadataLoaded,
        useWalletService: state.useWalletService,
      };
    });
  const wallet = getGlobalWallet();
  /**
   * Get the full object for the selected token on the TokenBar.
   *
   * @returns {Object} Selected Token object
   */
  const getSelectedToken = () => {
    return tokens.filter(t => t.uid === selectedToken)
  }

  // State
  /** errorMessage {string} Message to be shown in case of error in form */
  const [errorMessage, setErrorMessage] = useState('');
  /** txTokens {Array} Array of tokens configs already added by the user (start with only hathor) */
  const [txTokens, setTxTokens] = useState([...getSelectedToken()]);
  /** ledgerStep {number} When sending tx with ledger we have a step that needs user physical input,
   *                      then we move to next step */
  const [ledgerStep, setLedgerStep] = useState(0);

  // Create refs
  const formSendTokensRef = useRef();
  const references = useRef([React.createRef()]);

  // Convert componentDidMount and componentWillUnmount
  useEffect(() => {
    if (IPC_RENDERER) {
      IPC_RENDERER.on('ledger:txSent', handleTxSent);
      IPC_RENDERER.on('ledger:signatures', handleSignatures);
      IPC_RENDERER.on('ledger:tokenDataSent', handleSendToken);
    }

    // Equivalent to componentWillUnmount
    return () => {
      if (IPC_RENDERER) {
        IPC_RENDERER.removeAllListeners('ledger:txSent');
        IPC_RENDERER.removeAllListeners('ledger:signatures');
        IPC_RENDERER.removeAllListeners('ledger:tokenDataSent');
      }
    };
  }, []);

  // Partial transaction data while retrieving inputs and building the SendTransaction object
  let newTxData = null;

  // Send transaction object used when sending tx with ledger
  let sendTransaction = null;

  /**
   * Handle the response of a send tx call to Ledger.
   *
   * @param {IpcRendererEvent} _event May be used to reply to the event
   * @param {Object} arg Data returned from the send tx call
   */
  const handleTxSent = (_event, arg) => {
    if (arg.success) {
      getSignatures();
    } else {
      handleSendError(new LedgerError(arg.error.message));
    }
  }

  /**
   * Handle the response of a get signatures call to Ledger.
   *
   * @param {IpcRendererEvent} _event May be used to reply to the event
   * @param {Object} arg Data returned from the get signatures call
   */
  const handleSignatures = (_event, arg) => {
    if (arg.success) {
      onLedgerSuccess(arg.data);
    } else {
      handleSendError(new LedgerError(arg.error.message));
    }
  }

  /**
   * Handle the response of a send token data call to Ledger.
   * Will list all tokens that failed verification, if all pass then start sign tx
   *
   * @param {IpcRendererEvent} _event May be used to reply to the event
   * @param {Object} arg Data returned from the send token data call
   */
  const handleSendToken = (_event, arg) => {
    // If a token does not pass:
    // modal to warn and either sign or cancel (use component)
    if (arg.success) {
      // arg.data is a list of failed uids
      if (arg.data.length === 0) {
        // send cached data
        executeSendLedger();
        return;
      }
      // some token was invalid, it will be on arg, which ones
      const tokenList = txTokens.filter(t => arg.data.includes(t.uid)) // TODO: Double check if state is updated
      globalModalContext.showModal(MODAL_TYPES.ALERT, {
        id: 'ledgerAlertModal',
        title: t`Invalid custom tokens`,
        buttonName: t`Close`,
        body: renderAlertTokenList(tokenList),
      })
    } else {
      handleSendError(new LedgerError(arg.error.message));
    }
  }

  /**
   * Check if form is valid and update the DOM class accordingly
   *
   * @return {boolean}
   */
  const validateData = () => {
    const isValid = formSendTokensRef.current.checkValidity();
    if (isValid === false) {
      formSendTokensRef.current.classList.add('was-validated');
    } else {
      formSendTokensRef.current.classList.remove('was-validated');
    }
    return isValid;
  }

  /**
   * Get inputs and outputs data from child components
   * Each child component holds inputs/outputs for one token
   *
   * @return {Object} Object holding all inputs and outputs {'inputs': [...], 'outputs': [...]}
   */
  const getData = () => {
    let data = {'inputs': [], 'outputs': [], 'tokens': []};
    for (const ref of references.current) {
      const instance = ref.current;
      let dataOne = instance.getData();
      if (!dataOne) return;
      data['inputs'] = [...data['inputs'], ...dataOne['inputs']];
      data['outputs'] = [...data['outputs'], ...dataOne['outputs']];
    }
    return data;
  }

  /**
   * Add signature to each input and execute send transaction
   */
  const onLedgerSuccess = async (signatures) => {
    try {
      // Prepare data and submit job to tx mining API
      const arr = [];
      for (let i=0;i<signatures.length;i++) {
        arr.push(Buffer.from(signatures[i]));
      }
      await sendTransaction.prepareTxFrom(arr);
      setLedgerStep(1);

      globalModalContext.showModal(MODAL_TYPES.ALERT, {
        id: 'ledgerAlertModal',
        title: t`Validate outputs on Ledger`,
        body: renderAlertBody(),
        showFooter: false,
      });
    } catch(e) {
      handleSendError(e);
    }
  }

  /**
   * Execute ledger get signatures
   */
  const getSignatures = () => {
    ledger.getSignatures(
      Object.assign({}, newTxData),
      wallet,
    );
  }

  /**
   * Method executed when tx is sent with success
   *
   * @param {Object} tx Transaction sent data
   */
  const onSendSuccess = (tx) => {
    globalModalContext.hideModal();

    // Must update the shared address, in case we have used one for the change
    dispatch(walletRefreshSharedAddress());
    history.push('/wallet/');
  }

  /**
   * Method executed when there is an error sending the tx
   *
   * @param {String} message Error message
   */
  const onSendError = (message) => {
    globalModalContext.hideModal();
    setErrorMessage(message);
    setLedgerStep(0);
  }

  /**
   * Method executed before sending a tx to be signed by Ledger
   *
   * Checks if we have any custom token, if not we just send to sign
   * If we have custom tokens we must send all tokens first
   * When all tokens are sent we should send the tx to sign
   */
  const beforeSendLedger = () => {
    // remove HTR if present
    const _txTokens = txTokens.filter(t => !hathorLib.tokensUtils.isHathorToken(t.uid));

    if (_txTokens.length === 0) {
      // no custom tokens, just send
      executeSendLedger();
      return;
    }
    // get all custom tokens, and include the signatures
    const tokenSignatures = tokensUtils.getTokenSignatures();
    const missingSigs = _txTokens.filter(t => !tokenSignatures.hasOwnProperty(t.uid));
    if (missingSigs.length !== 0) {
      // there are tokens without signatures, missingSigs
      // set tittle and content
      globalModalContext.showModal(MODAL_TYPES.ALERT, {
        id: 'ledgerAlertModal',
        title: t`Unverified custom tokens`,
        body: renderAlertTokenList(missingSigs),
        buttonName: t`Close`,
      });
      return;
    }

    const tokenSigs = _txTokens.map(t => {
      return {
        uid: t.uid,
        symbol: t.symbol,
        name: t.name,
        signature: tokenSignatures[t.uid],
      };
    });

    ledger.sendTokens(tokenSigs);
  }

  /**
   * Method executed to send transaction on ledger
   * It opens the ledger modal to wait for user action on the device
   */
  const executeSendLedger = async () => {
    // Wallet Service currently does not support Ledger, so we default to the regular SendTransaction
    sendTransaction = new hathorLib.SendTransaction({
      outputs: newTxData.outputs,
      inputs: newTxData.inputs,
      storage: wallet.storage,
    });

    try {
      // Errors may happen in this step ( ex.: insufficient amount of tokens )
      newTxData = await sendTransaction.prepareTxData();
    }
    catch (e) {
      setErrorMessage(e.message);
      setLedgerStep(0);
      return;
    }

    const changeInfo = [];
    for (const [outputIndex, output] of newTxData.outputs.entries()) {
      if (output.isChange) {
        changeInfo.push({
          outputIndex,
          keyIndex: await wallet.getAddressIndex(output.address),
        });
      }
    }

    const useOldProtocol = !versionUtils.isLedgerCustomTokenAllowed();

    const network = wallet.getNetworkObject();
    ledger.sendTx(newTxData, changeInfo, useOldProtocol, network);
    globalModalContext.showModal(MODAL_TYPES.ALERT, {
      title: t`Validate outputs on Ledger`,
      body: renderAlertBody(),
      showFooter: false,
    });
  }

  /**
   * Method executed when user validates its PIN on the modal
   * Checks if the form is valid, get data from child components, complete the transaction and execute API request
   */
  const beforeSend = () => {
    const isValid = validateData();
    if (!isValid) return;
    let data = getData();
    if (!data) return;
    setErrorMessage('');
    try {
      newTxData = data;
      if (!LOCAL_STORE.isHardwareWallet()) {
        globalModalContext.showModal(MODAL_TYPES.PIN, {
          onSuccess: ({pin}) => {
            globalModalContext.showModal(MODAL_TYPES.SEND_TX, {
              pin,
              prepareSendTransaction: prepareSendTransaction,
              onSendSuccess: onSendSuccess,
              onSendError: onSendError,
              title: t`Sending transaction`,
            });
          }
        })
      } else {
        beforeSendLedger();
      }
    } catch(e) {
      handleSendError(e);
    }
  }

  /**
   * Prepare data before sending tx to be mined and after user writes PIN
   *
   * @param {String} pin PIN written by the user
   *
   * @return {SendTransaction} SendTransaction object, in case of success, null otherwise
   */
  const prepareSendTransaction = async (pin) => {
    if (useWalletService) {
      return new hathorLib.SendTransactionWalletService(wallet, {
        outputs: newTxData.outputs,
        inputs: newTxData.inputs,
        pin,
      });
    }

    return new hathorLib.SendTransaction({ outputs: newTxData.outputs, inputs: newTxData.inputs, pin, storage: wallet.storage });
  }

  /**
   * Handle error when executing sendTransaction method of the lib
   */
  const handleSendError = (e) => {
    if (e instanceof hathorLib.errors.AddressError ||
        e instanceof hathorLib.errors.OutputValueError ||
        e instanceof hathorLib.errors.ConstantNotSet ||
        e instanceof hathorLib.errors.MaximumNumberOutputsError ||
        e instanceof hathorLib.errors.MaximumNumberInputsError ||
        e instanceof LedgerError) {
      globalModalContext.hideModal();
      setErrorMessage(e.message);
      setLedgerStep(0);
    } else {
      // Unhandled error
      throw e;
    }
  }

  /**
   * Update class state
   *
   * @param {Object} newState New state for the class
   * @param {String} newState.errorMessage Error message
   */
  const updateState = (newState) => {
    // The only state that SendTokensOne expects to update with this callback is the errorMessage
    setErrorMessage(newState.errorMessage)
  }

  /**
   * Executed when user clicks to add another token to this transaction
   * Checks if still have a known token available that is not selected yet
   * Create a new child reference with this new token
   */
  const addAnotherToken = () => {
    if (LOCAL_STORE.isHardwareWallet()) {
      if (!versionUtils.isLedgerCustomTokenAllowed()) {
        // Custom token not allowed for this Ledger version
        globalModalContext.showModal(MODAL_TYPES.ALERT_NOT_SUPPORTED, {
          children: (
            <div>
              <p>{t`Unfortunately this feature is not supported with the Hathor app version on your Ledger device. If you need this feature, you can use it by installing the most recent Hathor app.`}</p>
            </div>
          )
        })
        return;
      }
      if (txTokens.filter(t => !hathorLib.tokensUtils.isHathorToken(t.uid)).length === LEDGER_TX_CUSTOM_TOKEN_LIMIT) {
        // limit is 10 custom tokens per tx
        const modalBody = <p>{t`Ledger has a limit of ${LEDGER_TX_CUSTOM_TOKEN_LIMIT} different tokens per transaction.`}</p>
        globalModalContext.showModal(MODAL_TYPES.ALERT, {
          id: 'ledgerAlertModal',
          title: t`Token limit reached`,
          body: modalBody,
          buttonName: t`Close`,
        });
        return;
      }
    }

    if (txTokens.length === tokens.length) {
      setErrorMessage(t`All your tokens were already added`);
      return;
    }

    // Among all the token options we choose the first one that is not already selected
    const newToken = tokens.find((token) => {
      return txTokens.find((txToken) =>
        txToken.uid === token.uid
      ) === undefined
    });

    references.current.push(React.createRef());
    setTxTokens([...txTokens, newToken]);
  }

  /**
   * Called when the select of a new token has changed
   * Used to change the selects in all other child components because the selected token can't be selected anymore
   *
   * @param {Object} selected Config of token that was selected {'name', 'symbol', 'uid'}
   * @param {number} index Index of the child component
   */
  const tokenSelectChange = (selected, index) => {
    const newTxTokens = [...txTokens];
    newTxTokens[index] = selected;
    setTxTokens(newTxTokens);
  }

  /**
   * Called when user removes a child component (removes a token)
   *
   * @param {number} index Index of the child component
   */
  const removeToken = (index) => {
    const newTxTokens = [...txTokens];
    newTxTokens.splice(index, 1);
    setTxTokens(newTxTokens);
    references.current.splice(index, 1);
  }

  /**
   * Called when user clicks on send tokens button
   * Open pin modal if software wallet and execute send otherwise
   */
  const onSendTokensClicked = () => {
    beforeSend();
  }

  const renderAlertTokenList = (tokenList) => {
    const rows = tokenList.map(t => <li key={t.uid}><p>{t.name} ({t.symbol})</p></li>)
    return <ul>{rows}</ul>
  }

  const renderAlertBody = () => {
    if (ledgerStep === 0) {
      return (
        <div>
          <p>{t`Please go to you Ledger and validate each output of your transaction. Press both buttons in case the output is correct.`}</p>
          <p>{t`In the end, a final screen will ask you to confirm sending the transaction.`}</p>
        </div>
      );
    } else {
      return (
        <div className="d-flex flex-row">
          <SendTxHandler sendTransaction={sendTransaction} onSendSuccess={onSendSuccess} onSendError={onSendError} />
          <ReactLoading type='spin' color={colors.purpleHathor} width={24} height={24} delay={200} />
        </div>
      )
    }
  }

  const renderOnePage = () => {
    return txTokens.map((token, index) => {
      return <SendTokensOne key={`${token.uid}-${index}`}
                            ref={references.current[index]}
                            config={token}
                            index={index}
                            selectedTokens={txTokens}
                            tokens={tokens}
                            tokenSelectChange={tokenSelectChange}
                            removeToken={removeToken}
                            updateState={updateState}
      />
    });
  }

  const renderPage = () => {
    if (!metadataLoaded) {
      return <p>{t`Loading metadata...`}</p>
    }

    return (
      <div>
        <form ref={formSendTokensRef} id="formSendTokens">
          {renderOnePage()}
          <div className="mt-5">
            <button type="button" className="btn btn-secondary mr-4" onClick={addAnotherToken}>{t`Add another token`}</button>
            <button type="button" className="btn btn-hathor" onClick={onSendTokensClicked}>{t`Send Tokens`}</button>
          </div>
        </form>
        <p className="text-danger mt-3 white-space-pre-wrap">{errorMessage}</p>
      </div>
    );
  }

  return (
    <div className="content-wrapper flex align-items-center">
      <BackButton />
      <h3 className="mt-4 mb-4">{t`Send Tokens`}</h3>
      {renderPage()}
    </div>
  );
}

export default SendTokens;
