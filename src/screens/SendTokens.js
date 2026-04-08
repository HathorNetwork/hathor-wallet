/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
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
import { IPC_RENDERER, LEDGER_TX_CUSTOM_TOKEN_LIMIT, colors } from '../constants';
import ReactLoading from 'react-loading';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import LOCAL_STORE from '../storage';
import { useNavigate } from 'react-router-dom';
import { getGlobalWallet } from "../modules/wallet";
import { OutputType } from '@hathor/wallet-lib/lib/wallet/types';
import { SendDataOutputOne } from '../components/SendDataOutputOne';
import { uniqueId } from 'lodash';
import { useTokensDetails } from '../hooks/useTokenDetails';

/** @typedef {0|1} LEDGER_MODAL_STATE */
const LEDGER_MODAL_STATE = {
  WAITING_APPROVAL: 0,
  LEDGER_APPROVED: 1,
}

/**
 * Screen used to send tokens to another wallet.
 * Can send more than one token in the same transaction.
 *
 * @memberof Screens
 */
function SendTokens() {
  const globalModalContext = useContext(GlobalModalContext);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Redux state
  const { selectedToken, tokens, metadataLoaded, useWalletService, tokensBalance, decimalPlaces } = useSelector(
    (state) => {
      return {
        selectedToken: state.selectedToken,
        tokens: state.tokens,
        metadataLoaded: state.metadataLoaded,
        useWalletService: state.useWalletService,
        tokensBalance: state.tokensBalance,
        decimalPlaces: state.serverInfo.decimalPlaces,
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
  /** dataOutputs {Array} Array of data output added by the user */
  const [dataOutputs, setDataOutputs] = useState([]);
  /** tokenFees {Object} Map of token UID to calculated fee */
  const [tokenFees, setTokenFees] = useState({});
  /** tokenChangeOutputs {Object} Map of tokenUid -> changeOutput ({ address, value, token }) */
  const [tokenChangeOutputs, setTokenChangeOutputs] = useState({});
  /** feeError {string} Error message if insufficient HTR for fees */
  const [feeError, setFeeError] = useState('');

  // Create refs
  const formSendTokensRef = useRef();
  const references = useRef([React.createRef()]);
  /**
   * Instance of SendTransaction containing tx data specifically for Ledger signing
   * @type MutableRefObject<SendTransaction>
   */
  const sendTransactionRef = useRef(null);
  /**
   * It contains a map of data output ref values by its unique ID.
   * @type MutableRefObject<{ [uniqueRefId: string]: MutableRefObject }>
   */
  const dataOutputRefs = useRef({});


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

  // Fetch token details (including version) for any token in txTokens that lacks it.
  useTokensDetails(txTokens.map(t => t.uid));

  /**
   * Validate if user has enough HTR to pay total fee.
   * Returns an error message string, or empty string if balance is sufficient.
   */
  const validateFeeBalance = useCallback(() => {
    const fees = Object.values(tokenFees);
    if (fees.length === 0) {
      return '';
    }

    const totalFee = fees.reduce((a, b) => a + b, 0n);

    if (totalFee > 0n) {
      const htrBalance = tokensBalance[hathorLib.constants.NATIVE_TOKEN_UID]?.data?.available || 0n;

      // Sum outgoing HTR being sent to recipients
      let outgoingHTR = 0n;
      for (const ref of references.current) {
        const instance = ref.current;
        if (!instance?.state?.selected) continue;
        if (instance.state.selected.uid === hathorLib.constants.NATIVE_TOKEN_UID) {
          const outputs = instance.getOutputsForFeeCalculation();
          for (const output of outputs) {
            outgoingHTR += output.value;
          }
        }
      }

      if (htrBalance < totalFee + outgoingHTR) {
        const requiredAmount = hathorLib.numberUtils.prettyValue(totalFee + outgoingHTR, decimalPlaces);
        return t`Insufficient HTR balance to complete the transaction. It requires ${requiredAmount} for outputs and network fee`;
      }
    }

    return '';
  }, [tokenFees, tokensBalance]);

  /**
   * Check if user has enough HTR to pay total fee
   */
  useEffect(() => {
    setFeeError(validateFeeBalance());
  }, [validateFeeBalance]);

  /**
   * Handle the response of a send tx call to Ledger.
   *
   * @param {IpcRendererEvent} _event May be used to reply to the event
   * @param {Object} arg Data returned from the send tx call
   */
  const handleTxSent = (_event, arg) => {
    if (arg.success) {
      getSignatures(sendTransactionRef.current);
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
      onLedgerSuccess(arg.data, sendTransactionRef.current);
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
      const tokenList = txTokens.filter(t => arg.data.includes(t.uid));
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
  const validateFormData = () => {
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
  const getFormData = () => {
    let data = {'inputs': [], 'outputs': [], 'tokens': []};
    for (const ref of references.current) {
      const instance = ref.current;
      let dataOne = instance.getData();
      if (!dataOne) return;
      data['inputs'] = [...data['inputs'], ...dataOne['inputs']];
      data['outputs'] = [...data['outputs'], ...dataOne['outputs']];
    }
    // if there is any data output, add it to transaction's outputs
    if (dataOutputs.length) {
      dataOutputs.forEach((uId) => {
        data.outputs.push({
          type: OutputType.DATA,
          data: String(dataOutputRefs.current[uId].current.value),
        });
      });
    }
    return data;
  }

  /**
   * Add signature to each input and execute send transaction
   * @param {String[]} signatures Array of serialized signatures to be injected on the tx
   * @param {SendTransaction} sendTransaction Object containing the unsigned tx data
   */
  const onLedgerSuccess = async (signatures, sendTransaction) => {
    try {
      // Prepare data and submit job to tx mining API
      const arr = [];
      for (let i=0;i<signatures.length;i++) {
        arr.push(Buffer.from(signatures[i]));
      }
      await sendTransaction.prepareTxFrom(arr);

      globalModalContext.showModal(MODAL_TYPES.ALERT, {
        id: 'ledgerAlertModal',
        title: t`Validate outputs on Ledger`,
        body: renderAlertBody(LEDGER_MODAL_STATE.LEDGER_APPROVED, sendTransaction),
        showFooter: false,
      });
    } catch(e) {
      handleSendError(e);
    }
  }

  /**
   * Execute ledger get signatures
   * @param {SendTransaction} sendTransaction instance to build the tx data from
   */
  const getSignatures = (sendTransaction) => {
    const txData = sendTransaction.fullTxData;
    ledger.getSignatures(
      Object.assign({}, txData),
      wallet,
    );
  }

  /**
   * Method executed when tx is sent with success (Ledger flow)
   *
   * @param {Object} tx Transaction sent data
   */
  const onSendSuccess = (tx) => {
    globalModalContext.hideModal();

    // Must update the shared address, in case we have used one for the change
    dispatch(walletRefreshSharedAddress());
    navigate('/wallet/');
  }

  /**
   * Method executed when there is an error sending the tx
   *
   * @param {String} message Error message
   */
  const onSendError = (message) => {
    globalModalContext.hideModal();
    setErrorMessage(message);
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
    let txData = getFormData();
    // Wallet Service currently does not support Ledger, so we default to the regular SendTransaction
    const sendTransactionObj = new hathorLib.SendTransaction({
      outputs: txData.outputs,
      inputs: txData.inputs,
      storage: wallet.storage,
    });

    try {
      // Errors may happen in this step ( ex.: insufficient amount of tokens )
      txData = await sendTransactionObj.prepareTxData();
    }
    catch (e) {
      setErrorMessage(e.message);
      return;
    }

    const changeInfo = [];
    for (const [outputIndex, output] of txData.outputs.entries()) {
      if (output.isChange) {
        changeInfo.push({
          outputIndex,
          keyIndex: await wallet.getAddressIndex(output.address),
        });
      }
    }

    const useOldProtocol = !versionUtils.isLedgerCustomTokenAllowed();

    const network = wallet.getNetworkObject();

    // Store the SendTransaction instance on the variable exclusive to Ledger event handlers
    sendTransactionRef.current = sendTransactionObj;
    ledger.sendTx(txData, changeInfo, useOldProtocol, network);
    globalModalContext.showModal(MODAL_TYPES.ALERT, {
      title: t`Validate outputs on Ledger`,
      body: renderAlertBody(LEDGER_MODAL_STATE.WAITING_APPROVAL),
      showFooter: false,
    });
  }

  /**
   * Validates form, prepares modal data, and shows the Transaction Overview modal.
   */
  const beforeSend = () => {
    const isValid = validateFormData();
    if (!isValid) return;

    let data = getFormData();
    if (!data) return;

    setErrorMessage('');

    try {
      if (!LOCAL_STORE.isHardwareWallet()) {
        // Flush any pending debounced fee calculations so state is up to date
        for (const ref of references.current) {
          ref.current?.debouncedCalculateFee?.flush();
        }

        // Calculate total fee
        const totalFee = Object.values(tokenFees).reduce((a, b) => a + b, 0n);

        // Build flat output list for the modal
        const modalOutputs = [];

        for (const output of data.outputs) {
          if (output.type === OutputType.DATA) {
            modalOutputs.push({ type: 'data', data: String(output.data) });
          } else {
            const tokenConfig = txTokens.find(tk => tk.uid === output.token);
            modalOutputs.push({
              address: output.address,
              value: output.value,
              tokenUid: output.token,
              tokenSymbol: tokenConfig?.symbol || '???',
              isChangeOutput: false,
            });
          }
        }

        // Append change outputs
        for (const co of Object.values(tokenChangeOutputs)) {
          const tokenConfig = txTokens.find(tk => tk.uid === co.token);
          modalOutputs.push({
            address: co.address,
            value: co.value,
            tokenUid: co.token,
            tokenSymbol: tokenConfig?.symbol || '???',
            isChangeOutput: true,
          });
        }

        // Show Transaction Overview modal (handles full send flow internally)
        globalModalContext.showModal(MODAL_TYPES.TRANSACTION_OVERVIEW, {
          outputs: modalOutputs,
          totalFee,
          decimalPlaces,
          prepareSendTransaction: (pin) => prepareSendTransaction(pin, data),
          onSendSuccess: (tx) => handleSendSuccess(tx, data),
          onCancel: () => globalModalContext.hideModal(),
        });
      } else {
        beforeSendLedger();
      }
    } catch (e) {
      handleSendError(e);
    }
  };

  /**
   * Prepare data before sending tx to be mined and after user writes PIN
   *
   * @param {String} pin PIN written by the user
   * @param {Object} data Form data with outputs and inputs
   *
   * @return {SendTransaction} SendTransaction object, in case of success, null otherwise
   */
  const prepareSendTransaction = async (pin, data) => {
    if (useWalletService) {
      await wallet.validateAndRenewAuthToken(pin);
      return new hathorLib.SendTransactionWalletService(wallet, {
        outputs: data.outputs,
        inputs: data.inputs,
        pin,
      });
    }

    return new hathorLib.SendTransaction({ outputs: data.outputs, inputs: data.inputs, pin, storage: wallet.storage });
  };

  /**
   * Handle successful transaction send
   */
  const handleSendSuccess = (tx, data) => {
    const regularOutputs = data.outputs
      .filter((o) => o.type !== OutputType.DATA)
      .map((o) => ({ address: o.address, value: o.value, token: o.token }));
    const grouped = groupOutputsByToken(regularOutputs);
    const tokensSent = grouped.map((group) => ({
      symbol: group.token.symbol,
      amount: group.total,
    }));

    // Must update the shared address, in case we have used one for the change
    dispatch(walletRefreshSharedAddress());

    globalModalContext.showModal(MODAL_TYPES.SEND_SUCCESS, {
      tx,
      tokensSent,
      decimalPlaces,
      onClose: () => {
        globalModalContext.hideModal();
        resetForm();
      },
      onViewDetails: () => {
        console.log('View tx details:', tx.hash, tx);
        globalModalContext.hideModal();
        navigate(`/transaction/${tx.hash}`);
      },
    });
  };

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
   * Clean up fee and change output data for a given token.
   * Used when removing a token or switching to a different token.
   *
   * @param {string} tokenUid - The token UID to clean up
   */
  const cleanupTokenFeeData = (tokenUid) => {
    setTokenFees((prev) => {
      const { [tokenUid]: removed, ...rest } = prev;
      return rest;
    });
    setTokenChangeOutputs((prev) => {
      const { [tokenUid]: removed, ...rest } = prev;
      return rest;
    });
  };

  /**
   * Handle fee and change output updates from child components
   *
   * @param {string} tokenUid - The token UID
   * @param {bigint} fee - The calculated fee
   * @param {Object|null} changeOutput - The change output { address, value, token } or null
   */
  const handleFeeChange = (tokenUid, fee, changeOutput) => {
    setTokenFees(prev => ({ ...prev, [tokenUid]: fee }));
    setTokenChangeOutputs(prev => {
      if (changeOutput) {
        return { ...prev, [tokenUid]: changeOutput };
      }
      const { [tokenUid]: removed, ...rest } = prev;
      return rest;
    });
  };

  /**
   * Reset form to initial state after successful send
   */
  const resetForm = () => {
    setTxTokens([...getSelectedToken()]);
    setDataOutputs([]);
    setTokenFees({});
    setTokenChangeOutputs({});
    setFeeError('');
    setErrorMessage('');
    references.current = [React.createRef()];
    dataOutputRefs.current = {};
  };

  /**
   * Group outputs by token for display in the transaction overview modal.
   * Returns an array of { token, outputs, total } where total only includes
   * non-change outputs.
   *
   * @param {Array} allOutputs - Combined user outputs and change outputs
   * @returns {Array<{ token: Object, outputs: Array, total: bigint }>}
   */
  const groupOutputsByToken = (allOutputs) => {
    const groups = new Map();

    for (const output of allOutputs) {
      const tokenUid = output.token;
      if (!groups.has(tokenUid)) {
        const tokenConfig = txTokens.find((t) => t.uid === tokenUid);
        groups.set(tokenUid, {
          token: tokenConfig,
          outputs: [],
          total: 0n,
        });
      }
      const group = groups.get(tokenUid);
      group.outputs.push(output);
      // Only add to total if not a change output
      if (!output.isChangeOutput) {
        group.total += BigInt(output.value);
      }
    }

    return Array.from(groups.values());
  };

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
    const oldToken = txTokens[index];

    // Clean up fee and change output for old token when switching to a different token
    if (oldToken && oldToken.uid !== selected.uid) {
      cleanupTokenFeeData(oldToken.uid);
    }

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
    const removedToken = txTokens[index];

    cleanupTokenFeeData(removedToken.uid);

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

  /**
   * Renders the body for the ledger alert modal.
   * Depending on the parameters, it can:
   * - Render instructions on how to approve the tx on ledger or;
   * - Trigger the transaction sending process and render a tx monitoring component
   * @param {LEDGER_MODAL_STATE} modalState Defines how the modal will be rendered
   * @param {SendTransaction} [sendTransactionObj] Reference to tx already signed by Ledger, that will be sent
   */
  const renderAlertBody = (modalState, sendTransactionObj) => {
    if (modalState === LEDGER_MODAL_STATE.WAITING_APPROVAL) {
      return (
        <div>
          <p>{t`Please go to you Ledger and validate each output of your transaction. Press both buttons in case the output is correct.`}</p>
          <p>{t`In the end, a final screen will ask you to confirm sending the transaction.`}</p>
        </div>
      );
    } else if (modalState === LEDGER_MODAL_STATE.LEDGER_APPROVED) {
      return (
        <div className="d-flex flex-row">
          <SendTxHandler sendTransaction={sendTransactionObj} onSendSuccess={onSendSuccess} onSendError={onSendError} />
          <ReactLoading type='spin' color={colors.purpleHathor} width={24} height={24} delay={200} />
        </div>
      )
    } else {
      throw new Error('Invalid modal state');
    }
  }

  const renderOnePage = () => {
    return txTokens.map((token, index) => {
      return (
        <SendTokensOne
          key={`${token.uid}-${index}`}
          ref={references.current[index]}
          config={token}
          index={index}
          selectedTokens={txTokens}
          tokens={tokens}
          tokenSelectChange={tokenSelectChange}
          removeToken={removeToken}
          updateState={updateState}
          onFeeChange={handleFeeChange}
        />
      );
    });
  }

  const addDataOutput = () => {
    const uId = uniqueId('data_output');
    setDataOutputs([...dataOutputs, uId]);
    dataOutputRefs.current[uId] = React.createRef();
  };

  const removeDataOutput = (index) => {
    delete dataOutputRefs.current[dataOutputs[index]];
    setDataOutputs([
      ...dataOutputs.slice(0,index),
      ...dataOutputs.slice(index+1,dataOutputs.length),
    ]);
  };

  /**
   * It renders a list of data output as cards.
   */
  const renderDataOutputs = () => (
    dataOutputs.map((uId, index) => (
      <SendDataOutputOne
        key={uId}
        dataInputRef={dataOutputRefs.current[uId]}
        index={index}
        remove={removeDataOutput}
      />
    ))
  );

  const renderPage = () => {
    if (!metadataLoaded) {
      return <p>{t`Loading metadata...`}</p>
    }

    return (
      <div>
        <form ref={formSendTokensRef} id="formSendTokens">
          {renderOnePage()}
          {renderDataOutputs()}
          {feeError && <p className="text-danger mt-3">{feeError}</p>}
          <div className="mt-5">
            <button
              type="button"
              className="btn btn-secondary mr-4"
              onClick={addAnotherToken}
            >
              {t`Add another token`}
            </button>
            <button
              type="button"
              className="btn btn-secondary mr-4"
              onClick={addDataOutput}
            >
              {t`Add data output`}
            </button>
            <button
              type="button"
              className="btn btn-hathor"
              onClick={onSendTokensClicked}
              disabled={!!feeError}
            >
              {t`Send Tokens`}
            </button>
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
