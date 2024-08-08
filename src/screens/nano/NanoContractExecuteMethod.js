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
import ReactLoading from 'react-loading';
import hathorLib from '@hathor/wallet-lib';
import { useNavigate, useLocation } from 'react-router-dom';
import { get, pullAt } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { GlobalModalContext, MODAL_TYPES } from '../../components/GlobalModal';
import { nanoContractRegisterSuccess, addBlueprintInformation } from '../../actions/index';
import { getGlobalWallet } from "../../modules/wallet";
import walletUtils from '../../utils/wallet';
import helpers from '../../utils/helpers';


/**
 * Execute a nano contract method
 *
 * @memberof Screens
 */
function NanoContractExecuteMethod(props) {
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

  // This will store each action in an array of objects
  // { type, token, amount, address }
  const [actions, setActions] = useState([]);
  const [loading, setLoading] = useState(false);
  const globalModalContext = useContext(GlobalModalContext);

  const executeMethod = () => {
    const isValid = formExecuteMethodRef.current.checkValidity();
    if (!isValid) {
      formExecuteMethodRef.current.classList.add('was-validated')
      return;
    }

    globalModalContext.showModal(MODAL_TYPES.PIN, {
      onSuccess: ({pin}) => {
        globalModalContext.showModal(MODAL_TYPES.SEND_TX, {
          pin,
          prepareSendTransaction,
          onSendSuccess: onMethodExecuted,
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
   */
  const prepareSendTransaction = async (pin) => {
    const ncData = {};
    let address;
    if (isCreateNanoContract) {
      ncData.blueprintId = data.blueprintInformation.id;
      address = addressRef.current.value;
    } else {
      address = addressToSign;
      ncData.ncId = data.ncId;
    }

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
        const timestamp = Date.parse(value) / 1000;
        argValues.push(timestamp);
        continue;
      }

      if (typeToCheck === 'Amount') {
        const amountValue = walletUtils.decimalToInteger(value, decimalPlaces);
        argValues.push(amountValue);
        continue;
      }

      argValues.push(value);
    }

    ncData.args = argValues;

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
   */
  const isNFT = (token) => {
    return helpers.isTokenNFT(token, tokenMetadata);
  }

  /**
   * Method executed when link to select an address to sign is clicked
   *
   * @param {Object} ref Input reference
   * @param {Object} e Event emitted by the link clicked
   */
  const onSelectAddressToSign = (ref, e) => {
    e.preventDefault();
    globalModalContext.showModal(MODAL_TYPES.NANOCONTRACT_SELECT_ADDRESS_TO_SIGN, {
      success: (value) => {
        ref.current.value = value;
      },
    });
  }

  const renderTokenOptions = () => {
    return registeredTokens.map((token) => {
      return <option value={token.uid} key={token.uid}>{token.name} ({token.symbol})</option>;
    })
  }

  const renderTokenSelect = (ref, required, onChange) => {
    return (
      <select ref={ref} required={required} className="form-control" onChange={onChange}>
        <option value='' key=''> - </option>
        {renderTokenOptions()}
      </select>
    );
  }

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

    // TODO Validation
    // 'VertexId': hexadecimal
    // 'TxOutputScript': hexadecimal
    // 'Address': address base58
    // 'TokenUid': select with token_uid hexadecimal
    // 'Amount': amount depending on decimal places
    // 'Timestamp': no validation, only get timestamp from date input
    let inputType;
    if (type === 'int' || type === 'float') {
      inputType = 'number';
    } else if (type === 'Timestamp') {
      inputType = 'datetime-local';
    } else {
      inputType = 'text';
    }

    return <input required={!isOptional} ref={ref} type={inputType} className="form-control" />;
  }

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

    if (type.startsWith('SignedData')) {
      typeToRender = 'str';
    }

    const ref = useRef(null);
    formRefs.push(ref);

    return (
      <div className="row" key={name}>
        <div className="form-group col-6">
          <label>{name} {!isOptional && '*'}</label>
          {renderInput(typeToRender, isOptional, ref)}
          { isSignedData && <div className="mt-2"><a href="true" onClick={e => onSelectAddressToSign(ref, e)}>{t`Select address to sign`}</a></div> }
        </div>
      </div>
    );
  }

  const renderMethodInputs = (method) => {
    const args = get(data.blueprintInformation.public_methods, `${method}.args`, []);
    return args.map(arg =>
      renderInputDiv(arg.name, arg.type)
    );
  }

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

  const renderAddressInForm = () => {
    if (isCreateNanoContract) {
      return renderChooseAddress();
    } else {
      return <p><strong>Address To Sign: </strong>{addressToSign}</p>
    }
  }

  const onActionValueChange = (index, key, value) => {
    actions[index][key] = value;
    setActions([...actions]);
  }

  const renderActionInputs = (index) => {
    const type = actions[index].type;
    if (!type) {
      return null;
    }

    const token = actions[index].token;
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
          <button type="button" className="form-control text-danger remove-action-btn" onClick={() => removeAction(index)}>{t`Remove`}</button>
        </div>
      )
    }

    if (type === "withdrawal") {
      return (
        <>
          <div className="d-flex flex-grow-1">
            {renderCommon()}
            {renderRemoveButton()}
          </div>
          <div className="d-flex w-50 mt-3">
            <div className="d-flex flex-column flex-grow-1">
              <label>{t`Address`}</label>
              <input required type="text" className="form-control" onChange={e => onActionValueChange(index, 'address', e.target.value)} />
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

  const addAction = (e) => {
    e.preventDefault();
    actions.push({});
    setActions([...actions]);
  }

  const removeAction = (index) => {
    pullAt(actions, [index]);
    setActions([...actions]);
  }

  const renderActions = () => {
    return actions.map((action, index) => {
      return (
        <div className="d-flex flex-row mb-4 actions-wrapper flex-wrap" key={index}>
          <div className="d-flex flex-column">
            <label>{t`Type`}</label>
            <select className="form-control pr-1 pl-1" value={action.type} onChange={e => onActionValueChange(index, 'type', e.target.value)}>
              <option value=""> -- </option>
              <option value="deposit">Deposit</option>
              <option value="withdrawal">Withdrawal</option>
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
          {loading && <ReactLoading type='spin' color={colors.purpleHathor} width={32} height={32} />}
          <button type="button" className="mt-3 btn btn-hathor" onClick={executeMethod}>{isCreateNanoContract ? t`Create` : t`Execute Method`}</button>
        </form>
      </div>
    </div>
  );
}

export default NanoContractExecuteMethod;