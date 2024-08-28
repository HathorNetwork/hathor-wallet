/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useContext, useEffect, useRef, useState } from 'react';
import { t } from 'ttag'
import BackButton from '../../components/BackButton';
import InputNumber from '../../components/InputNumber';
import colors from '../../index.module.scss';
import hathorLib from '@hathor/wallet-lib';
import { useNavigate, useLocation } from 'react-router-dom';
import { get, pullAt } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { GlobalModalContext, MODAL_TYPES } from '../../components/GlobalModal';
import { nanoContractRegisterSuccess, addBlueprintInformation } from '../../actions/index';
import { getGlobalWallet } from "../../modules/wallet";
import walletUtils from '../../utils/wallet';
import helpers from '../../utils/helpers';

// We should export library types
const NanoContractActionType = {
  DEPOSIT: 'deposit',
  WITHDRAWAL: 'withdrawal',
};

/**
 * Execute a nano contract method
 *
 * This component renders a generic form to create a nano contract transaction
 *
 * Using the blueprint information from the full node and the method to be executed
 * the screen knows which arguments and its types are expected for this method execution.
 *
 * With this, we render the form, so the required (and optional) arguments are filled.
 *
 * Apart from arguments, a nano contract transaction might have actions. We currently
 * don't have a way to know if a method requires actions, so we can't validate that. 
 * So we leave for the user to add as many actions as he needs/wants.
 *
 * Adding a wrong amount of actions (or the wrong type) will make the transaction fail
 * in the full node, so the user must know this before going to this screen.
 * 
 * In the future we should have a way to validate this.
 *
 * @memberof Screens
 */
function NanoContractExecuteMethod() {
  const location = useLocation();
  const data = location.state;
  const isCreateNanoContract = data.method === hathorLib.constants.NANO_CONTRACTS_INITIALIZE_METHOD && data.ncId == null;
  const {
    nanoContracts,
    blueprintsData,
    tokenMetadata,
    decimalPlaces,
    registeredTokens,
  } = useSelector((state) => {
    return {
      nanoContracts: state.nanoContracts,
      blueprintsData: state.blueprintsData,
      tokenMetadata: state.tokenMetadata,
      decimalPlaces: state.serverInfo.decimalPlaces,
      registeredTokens: state.tokens,
    }
  });

  let addressToSign = null;
  if (!isCreateNanoContract) {
    // The nano must be registered in the wallet with an address
    addressToSign = nanoContracts[data.ncId].address;
  }

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const wallet = getGlobalWallet();

  const formExecuteMethodRef = useRef(null);
  const addressRef = useRef(null);
  // List of refs of the arguments form
  const formRefs = [];

  // {string} If there is an error message when sending
  const [errorMessage, setErrorMessage] = useState('');

  // This will store each action in an array of objects
  // { type, token, amount, address }
  const [actions, setActions] = useState([]);
  const globalModalContext = useContext(GlobalModalContext);

  // We must store the ref of action addresses because we use for the validation
  const actionAddressesRef = useRef([]);

  /**
   * Method executed when user clicks to execute the method
   * We validate the arguments form and open the PIN modal
   */
  const executeMethod = () => {
    let hasError = false;

    /**
     * Helper method to validate address and set custom validity in the refs
     *
     * @param {string} value Value from the address input
     * @param {Object} ref Input reference to set custom validity
     */
    const validateAddress = (value, ref) => {
      // Optional values were already handled
      if (!value) {
        hasError = true;
        ref.setCustomValidity(t`Address is required.`);
        return;
      }

      const addressObj = new hathorLib.Address(value, { network: wallet.getNetworkObject() });
      if (addressObj.isValid()) {
        ref.setCustomValidity('');
        return;
      }

      ref.setCustomValidity(t`Invalid address.`);
      hasError = true;
    }

    // The Address regex can be achieved but it's not good for readability or maintenance
    // then I prefer to validate all Address inputs here
    // First I validate the Address inputs in the arguments list, then I validate the addresses
    // in the withdrawal actions
    const args = get(data.blueprintInformation.public_methods, `${data.method}.args`, []);
    for (let i=0; i<args.length; i++) {
      const splittedType = args[i].type.split('?');
      const isOptional = splittedType.length === 2;
      // Skip optional arguments that are null
      if (isOptional && value == null) {
        continue;
      }

      const typeToCheck = splittedType[0];
      if (typeToCheck !== 'Address') {
        continue;
      }
      const addressInputValue = formRefs[i].current.value;
      validateAddress(addressInputValue, formRefs[i].current);
    }

    for (let i=0; i<actions.length; i++) {
      const action = actions[i];
      // Only withdrawal actions have address
      if (action.type !== NanoContractActionType.WITHDRAWAL) {
        continue;
      }

      validateAddress(action.address, actionAddressesRef.current[i]);
    }

    // If it's a nano contract creation, the address to sign also must be validated
    if (isCreateNanoContract) {
      validateAddress(addressRef.current.value, addressRef.current);
    }

    // Check form with required and pattern html input parameters
    // This check must be the last because we clean the setCustomValidity
    // of the address fields above in case they are valid now
    const isValid = formExecuteMethodRef.current.checkValidity();
    if (!isValid) {
      formExecuteMethodRef.current.classList.add('was-validated')
      hasError = true;
    }

    if (hasError) {
      return;
    }

    // Here the form is valid, so we show the PIN modal to send the tx
    globalModalContext.showModal(MODAL_TYPES.PIN, {
      onSuccess: ({pin}) => {
        globalModalContext.showModal(MODAL_TYPES.SEND_TX, {
          pin,
          prepareSendTransaction,
          onSendSuccess: onMethodExecuted,
          onSendError: setErrorMessage,
          title: isCreateNanoContract ? t`Creating Nano Contract` : t`Executing Nano Contract Method`,
        });
      }
    })
  }

  /**
   * Method executed if transaction with nano contract method execution succeeds
   *
   * @param {Object} tx Nano contract transaction created
   */
  const onMethodExecuted = (tx) => {
    if (isCreateNanoContract) {
      // If it's a nano contract creation, we must save this NC in redux and in the storage
      // we must also add the blueprint information in redux, if it's not there
      const address = addressRef.current.value;
      const ncData = {
        address,
        ncId: tx.hash,
        blueprintId: data.blueprintInformation.id,
        blueprintName: data.blueprintInformation.name
      };
      dispatch(nanoContractRegisterSuccess(ncData));
      wallet.storage.registerNanoContract(tx.hash, ncData);
      if (!(tx.nc_blueprint_id in blueprintsData)) {
        dispatch(addBlueprintInformation(data.blueprintInformation));
      }
    }
    const ncId = isCreateNanoContract ? tx.hash : data.ncId;
    navigate(`/nano_contract/detail/${ncId}`);
  }

  /**
   * This is the method that will be executed after the user types the PIN
   * It will prepare and send the nano contract transaction
   *
   * @param {string} pin PIN typed by the user
   */
  const prepareSendTransaction = async (pin) => {
    const ncData = {};
    let address;
    // If it's a nano contract creation, we get the address from the input
    // otherwise we get it from the registered data in redux
    if (isCreateNanoContract) {
      ncData.blueprintId = data.blueprintInformation.id;
      address = addressRef.current.value;
    } else {
      address = addressToSign;
      ncData.ncId = data.ncId;
    }

    // First we get all the argument values and parse the input values to the expected type
    const argValues = [];
    const args = get(data.blueprintInformation.public_methods, `${data.method}.args`, []);
    for (let i=0; i<args.length; i++) {
      let value = formRefs[i].current.value;
      // Check optional type
      // Optional fields end with ?
      const splittedType = args[i].type.split('?');
      const isOptional = splittedType.length === 2;
      if (isOptional && !value) {
        // It's an optional field and the data is null, so it's fine
        argValues.push(null);
        continue;
      }
      let typeToCheck = splittedType[0];
      if (typeToCheck === 'int') {
        argValues.push(parseInt(value, 10));
        continue;
      }

      if (typeToCheck === 'float') {
        argValues.push(parseFloat(value));
        continue;
      }

      if (typeToCheck === 'Timestamp') {
        const timestamp = hathorLib.dateUtils.dateToTimestamp(new Date(value))
        argValues.push(timestamp);
        continue;
      }

      if (typeToCheck === 'Amount') {
        const amountValue = walletUtils.decimalToInteger(value, decimalPlaces);
        argValues.push(amountValue);
        continue;
      }

      // All other types we expect as strings
      argValues.push(value);
    }

    ncData.args = argValues;

    // Then we get the list of actions
    const actionsData = [];
    for (const action of actions) {
      if (!action.type) {
        // We will skip if the user has just added an empty action
        continue;
      }

      const amountValue = isNFT(action.token) ? action.amount : walletUtils.decimalToInteger(action.amount, decimalPlaces);
      action.amount = amountValue;

      actionsData.push(action);
    }

    ncData.actions = actionsData;

    return await wallet.createNanoContractTransaction(data.method, address, ncData, { pinCode: pin });
  }

  /**
   * Return if token is an NFT
   *
   * @param {string} token Token uid to check if it's NFT
   */
  const isNFT = (token) => {
    return helpers.isTokenNFT(token, tokenMetadata);
  }

  /**
   * This renders all the options of the token select for a tokenUid argument
   */
  const renderTokenOptions = () => {
    return registeredTokens.map((token) => {
      return <option value={token.uid} key={token.uid}>{token.name} ({token.symbol})</option>;
    })
  }

  /**
   * If an argument of the method is a token uid, we show a select
   * with all tokens registered in the wallet
   *
   * @param {Object} ref React reference object
   * @param {boolean} required If this argument is required
   * @param {Function} onChange Method called when the select changes
   */
  const renderTokenSelect = (ref, required, onChange) => {
    return (
      <select ref={ref} required={required} className="form-control" onChange={onChange}>
        <option value='' key=''> - </option>
        {renderTokenOptions()}
      </select>
    );
  }

  /**
   * Method that has the logic to render the input for each argument
   *
   * Amount argument is an InputNumber
   * TokenUid will show a select with registered tokens
   * int and float are simple numbers
   * Timestamp will have a datetime-local
   * The rest will be a text input
   *
   * @param {string} type Argument type to render the input
   * @param {boolean} isOptional If this argument is optional
   * @param {Object} ref React reference object
   */
  const renderInput = (type, isOptional, ref) => {
    if (type === 'Amount') {
      return <InputNumber
              required={!isOptional}
              requirePositive={true}
              ref={ref}
              className="form-control output-value"
              placeholder={hathorLib.numberUtils.prettyValue(0, decimalPlaces)}
            />
    }

    if (type === 'TokenUid') {
      return renderTokenSelect(ref, !isOptional);
    }

    let inputType;
    switch(type) {
      case 'int':
      case 'float':
        inputType = 'number';
        break;
      case 'Timestamp':
        inputType = 'datetime-local';
        break;
      default:
        inputType = 'text';
    }

    let pattern = null;
    // Arguments VertexId, ContractId must be a 64 chars hexadecimal string
    if (type === 'VertexId' || type === 'ContractId') {
      pattern = "[a-fA-F0-9]{64}";
    }

    // TxOutputScript and bytes must be in hexadecimal
    if (type === 'bytes' || type === 'TxOutputScript') {
      pattern = "[a-fA-F0-9]+";
    }

    return <input required={!isOptional} ref={ref} type={inputType} pattern={pattern} className="form-control" />;
  }

  /**
   * Renders the div that contains the argument input
   *
   * @param {string} name Argument name
   * @param {string} type Argument type to render the input
   */
  const renderInputDiv = (name, type) => {
    // Check optional type
    // Optional fields end with ?
    const splittedType = type.split('?');
    const isOptional = splittedType.length === 2;
    let typeToRender = splittedType[0];
    if (type === 'bytes') {
      // Bytes arguments are sent in hex
      typeToRender = 'str';
    }

    // SignedData values are strings
    if (type.startsWith('SignedData')) {
      typeToRender = 'str';
    }

    // Create a new ref for this argument to be used in the input and adds it to the array of refs
    const ref = useRef(null);
    formRefs.push(ref);

    return (
      <div className="row" key={name}>
        <div className="form-group col-6">
          <label>{name} {!isOptional && '*'}</label>
          {renderInput(typeToRender, isOptional, ref)}
        </div>
      </div>
    );
  }

  /**
   * Renders all the inputs for the blueprint method that will be executed
   *
   * @param {string} method Method that will be executed
   */
  const renderMethodInputs = (method) => {
    const args = get(data.blueprintInformation.public_methods, `${method}.args`, []);
    return args.map(arg =>
      renderInputDiv(arg.name, arg.type)
    );
  }

  /**
   * If it's a nano contract creation (initialize method)
   * we must ask the user to select an address
   */
  const renderChooseAddress = () => {
    return (
      <div className="row">
        <div className="form-group col-6">
          <label>Address to Sign</label>
          <input required ref={addressRef} type="text" className="form-control" />
        </div>
      </div>
    );
  }

  /**
   * Shows select address or the registered address, in case it's not initialize
   */
  const renderAddressInForm = () => {
    if (isCreateNanoContract) {
      return renderChooseAddress();
    } else {
      return <p><strong>Address To Sign: </strong>{addressToSign}</p>
    }
  }

  /**
   * This method is executed when any value of any action attribute changes
   * It updates the state array of actions
   *
   * @param {number} index Index of the action that was changed
   * @param {string} key Key attribute that was changed
   * @param {string} value The new value of the attribute
   */
  const onActionValueChange = (index, key, value) => {
    const newActions = [...actions];
    newActions[index][key] = value;
    setActions(newActions);
  }

  /**
   * Renders the input for each action depending if it's withdrawal or deposit
   *
   * @param {number} index Index of the action to render
   */
  const renderActionInputs = (index) => {
    const type = actions[index].type;
    if (!type) {
      return null;
    }

    // I start the ref as null, then I set it in the input if it's a withdrawal
    actionAddressesRef.current[index] = null;

    const token = actions[index].token;
    // Depending on the token, the input for the amount changes because it might be an NFT
    const nft = isNFT(token);
    let inputNumberProps;
    if (nft) {
      inputNumberProps = {
        placeholder: '0',
        precision: 0,
      };
    } else {
      inputNumberProps = {
        placeholder: hathorLib.numberUtils.prettyValue(0, decimalPlaces)
      };
    }

    const renderCommon = () => {
      return (
        <div className="d-flex flex-grow-1">
          <div className="col-8">
            <label>{t`Token`}</label>
            {renderTokenSelect(null, true, (e) => onActionValueChange(index, 'token', e.target.value))}
          </div>
          <div className="col-4">
            <label>{t`Amount`}</label>
            <InputNumber
              required
              requirePositive={true}
              onValueChange={amount => onActionValueChange(index, 'amount', amount)}
              className="form-control output-value"
              {...inputNumberProps}
            />
          </div>
        </div>
      );
    };

    const renderRemoveButton = () => {
      return (
        <div className="align-items-end d-flex">
          <button
            type="button"
            className="form-control text-danger remove-action-btn"
            onClick={() => removeAction(index)}
          >
            {t`Remove`}
          </button>
        </div>
      )
    }

    if (type === NanoContractActionType.WITHDRAWAL) {
      return (
        <>
          <div className="d-flex flex-grow-1">
            {renderCommon()}
            {renderRemoveButton()}
          </div>
          <div className="d-flex w-50 mt-3">
            <div className="d-flex flex-column flex-grow-1">
              <label>{t`Address`}</label>
              <input
                required
                type="text"
                // We don't know how many actions will be added to the nano contract transaction
                // and we must store the addresses refs to validate them before creating the transaction.
                // To achieve this, we store each actionAddressRef in an array (if it's a deposit, it
                // will be undefined), so we can easily get them and validate each value
                ref={ref => {
                  actionAddressesRef.current[index] = ref
                }}
                className="form-control"
                onChange={e => onActionValueChange(index, 'address', e.target.value)}
              />
            </div>
          </div>
        </>
      );
    }

    return (
      <div className="d-flex flex-grow-1">
        {renderCommon()}
        {renderRemoveButton()}
      </div>
    );
  }

  /**
   * Method executed when user clicks the link to add a new action
   * It adds an empty action to the actions list
   *
   * @param {Event} e Event triggered by the anchor click
   */
  const addAction = (e) => {
    e.preventDefault();
    const newActions = [...actions, {}];
    setActions(newActions);
  }

  /**
   * Method executed when user clicks the button to remove an action
   * It removes the action from the list and updates the state
   *
   * @param {number} index Index of the action to be removed
   */
  const removeAction = (index) => {
    const newActions = [...actions];
    pullAt(newActions, [index]);
    setActions(newActions);
  }

  /**
   * Render the actions from the array in the state
   */
  const renderActions = () => {
    return actions.map((action, index) => {
      return (
        <div className="d-flex flex-row mb-4 actions-wrapper flex-wrap" key={index}>
          <div className="d-flex flex-column">
            <label>{t`Type`}</label>
            <select className="form-control pr-1 pl-1" value={action.type} onChange={e => onActionValueChange(index, 'type', e.target.value)}>
              <option value=""> -- </option>
              <option value={NanoContractActionType.DEPOSIT}>Deposit</option>
              <option value={NanoContractActionType.WITHDRAWAL}>Withdrawal</option>
            </select>
          </div>
          {renderActionInputs(index)}
        </div>
      );
    });
  }

  return (
    <div className="content-wrapper">
      <BackButton />
      <h4 className="my-4">{isCreateNanoContract ? t`Create Nano Contract` : t`Execute Method`}</h4>
      <div>
        <form ref={formExecuteMethodRef} id="formExecuteMethod">
          <p><strong>Method: </strong>{data.method}</p>
          {renderAddressInForm()}
          <label className="mb-3 mt-3"><strong>Method Parameters</strong></label>
          {renderMethodInputs(data.method)}
          <div className="d-flex flex-row mb-4">
            <a href="true" onClick={addAction}>{t`Add action`}</a>
          </div>
          <div className="d-flex flex-column">
            {renderActions()}
          </div>
          <button type="button" className="mt-3 btn btn-hathor" onClick={executeMethod}>{isCreateNanoContract ? t`Create` : t`Execute Method`}</button>
          { errorMessage && <p className="text-danger mt-3 white-space-pre-wrap">{errorMessage}</p> }
        </form>
      </div>
    </div>
  );
}

export default NanoContractExecuteMethod;