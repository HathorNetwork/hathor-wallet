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


/**
 * Execute a nano contract method
 *
 * @memberof Screens
 */
function NanoContractExecuteMethod(props) {
  const location = useLocation();
  const data = location.state;
  const blueprintsData = useSelector(state => state.blueprintsData);
  const wallet = getGlobalWallet();
  const formExecuteMethodRef = useRef(null);
  const addressRef = useRef(null);
  // List of refs of the arguments form
  const formRefs = [];
  const dispatch = useDispatch();

  const [actionTypes, setActionTypes] = useState([]);
  // Map from index to select ref of actions
  const actionSelectRefs = useRef(null);
  // List of action refs
  // each element of the array has an object with refs
  const actionsRefs = useRef([]);

  useEffect(() => {
    actionsRefs.current = actionsRefs.current.slice(0, actionTypes.length);
  }, [actionTypes]);

  const navigate = useNavigate();

  const [loading, setLoading] = useState(false);

  const globalModalContext = useContext(GlobalModalContext);

  const getActionSelectArray = () => {
    if (!actionSelectRefs.current) {
      // Initialize the array on first usage.
      actionSelectRefs.current = [];
    }
    return actionSelectRefs.current;
  }

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
          title: data.ncId ? t`Executing Nano Contract Method` : t`Creating Nano Contract`,
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
    if (!data.ncId) {
      // If it's a nano contract creation, we must save this NC in redux and in the storage
      // we must also add the blueprint information in redux, if it's not there
      const address = addressRef.current.value;
      const ncData = {
        address,
        ncId: tx.hash,
        blueprintId: tx.nc_blueprint_id,
        blueprintName: data.blueprintInformation.name
      };
      dispatch(nanoContractRegisterSuccess(ncData));
      wallet.storage.registerNanoContract(tx.hash, ncData);
      if (!(tx.nc_blueprint_id in blueprintsData)) {
        dispatch(addBlueprintInformation(data.blueprintInformation));
      }
    }
    const ncId = data.ncId ? data.ncId : tx.hash;
    navigate(`/nano_contract/detail/${ncId}`);
  }

  /**
   */
  const prepareSendTransaction = async (pin) => {
    const ncData = {};
    let address;
    if (data.ncId) {
      address = data.address;
      ncData.ncId = data.ncId;
    } else {
      ncData.blueprintId = data.blueprintInformation.id;
      address = addressRef.current.value;
    }

    const argValues = [];
    const args = get(data.blueprintInformation.public_methods, `${data.method}.args`, []);
    for (let i=0; i<args.length; i++) {
      const value = formRefs[i].current.value;
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

      argValues.push(value);

    }

    ncData.args = argValues;

    const actions = [];
    for (const [index, actionType] of actionTypes.entries()) {
      const action = { type: actionType };
      const refs = actionsRefs.current[index];

      action.token = refs.token.current.value;
      action.amount = refs.amount.current.value;

      if (action === 'withdrawal') {
        action.address = refs.address.current.value;
      }

      actions.push(action);
    }

    ncData.actions = actions;

    return await wallet.createAndSendNanoContractTransaction(data.method, address, ncData, { pinCode: pin });
  }

  const renderInput = (name, type) => {
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

    let inputType;
    if (typeToRender === 'int' || typeToRender === 'float') {
      inputType = 'number';
    } else {
      inputType = 'text';
    }

    const ref = useRef(null);
    formRefs.push(ref);

    return (
      <div className="row" key={name}>
        <div className="form-group col-6">
          <label>{name}</label>
          <input required={!isOptional} ref={ref} type={inputType} className="form-control" />
        </div>
      </div>
    );
  }

  const renderMethodInputs = (method) => {
    const args = get(data.blueprintInformation.public_methods, `${method}.args`, []);
    return args.map(arg =>
      renderInput(arg.name, arg.type)
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
    if (data.ncId) {
      return <p><strong>Address To Sign: </strong>{data.address}</p>
    } else {
      return renderChooseAddress();
    }
  }

  const changeSelect = (index) => {
    const actionSelects = getActionSelectArray();
    const selectRef = actionSelects[index];

    actionTypes[index] = selectRef.value;
    setActionTypes([...actionTypes]);
  }

  const renderActionInputs = (index) => {
    const type = actionTypes[index];
    if (!type) {
      return null;
    }

    actionsRefs.current[index] = {};

    const renderCommon = () => {
      return (
        <div className="d-flex flex-grow-1">
          <div className="col-8">
            <label>{t`Token`}</label>
            <input required type="text" className="form-control" ref={el => actionsRefs.current[index].token = el} />
          </div>
          <div className="col-4">
            <label>{t`Amount`}</label>
            <InputNumber required placeholder={hathorLib.numberUtils.prettyValue(0)} className="form-control output-value" ref={el => actionsRefs.current[index].amount = el} />
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
              <input required type="text" className="form-control" ref={el => actionsRefs.current[index].address = el} />
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
    actionTypes.push("");
    setActionTypes([...actionTypes]);
  }

  const removeAction = (index) => {
    pullAt(actionTypes, [index]);
    const actionSelects = getActionSelectArray();
    pullAt(actionSelects, [index]);
    setActionTypes([...actionTypes]);
  }

  const renderActions = () => {
    return actionTypes.map((type, index) => {
      return (
        <div className="d-flex flex-row mb-4 actions-wrapper flex-wrap" key={index}>
          <div className="d-flex flex-column">
            <label>{t`Type`}</label>
            <select className="form-control pr-1 pl-1" value={type} ref={(node) => {
                      const actionSelects = getActionSelectArray();
                      if (node) {
                        actionSelects[index] = node;
                      }
                    }}
                    onChange={() => changeSelect(index)}>
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
      <h4 className="my-4">{data.ncId ? t`Execute Method` : t`Create Nano Contract`}</h4>
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
          <button type="button" className="mt-3 btn btn-hathor" onClick={executeMethod}>{data.ncId ? t`Execute Method` : t`Create`}</button>
        </form>
      </div>
    </div>
  );
}

export default NanoContractExecuteMethod;