/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useContext, useEffect, useState } from 'react';
import { t } from 'ttag'
import $ from 'jquery';
import ResetNavigationLink from '../../components/ResetNavigationLink';
import ReactLoading from 'react-loading';
import colors from '../../index.module.scss';
import ModalChangeAddress from '../../components/nano-contract/ModalChangeAddress';
import NanoContractHistory from '../../components/nano-contract/NanoContractHistory';
import helpers from '../../utils/helpers';
import nanoUtils from '../../utils/nanoContracts';
import hathorLib from '@hathor/wallet-lib';
import path from 'path';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { addBlueprintInformation, nanoContractUnregister } from '../../actions';
import { get } from 'lodash';
import { GlobalModalContext, MODAL_TYPES } from '../../components/GlobalModal';
import { getGlobalWallet } from "../../modules/wallet";


/**
 * Details of a Nano Contract
 *
 * @memberof Screens
 */
function NanoContractDetail() {
  const context = useContext(GlobalModalContext);
  const wallet = getGlobalWallet();

  const {
    nanoContracts,
    blueprintsData,
    tokenMetadata,
    decimalPlaces,
  } = useSelector((state) => {
    return {
      nanoContracts: state.nanoContracts,
      blueprintsData: state.blueprintsData,
      tokenMetadata: state.tokenMetadata,
      decimalPlaces: state.serverInfo.decimalPlaces,
    }
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { nc_id: ncId } = useParams();
  const nc = nanoContracts[ncId];
  let blueprintInformationAux = nc != null ? blueprintsData[nc.blueprintId] : null;

  // loading {boolean} Bool to show/hide loading element
  const [loading, setLoading] = useState(true);
  // data {Object} Nano contract loaded data
  const [data, setData] = useState(null);
  // blueprintInformation {Object} Blueprint information data
  const [blueprintInformation, setBlueprintInformation] = useState(blueprintInformationAux);
  // errorMessage {string} Message to show when error happens on the form
  const [errorMessage, setErrorMessage] = useState('');
  // waitingConfirmation {boolean} If transaction was loading and is waiting first block confirmation
  const [waitingConfirmation, setWaitingConfirmation] = useState(false);
  // txIsValid {boolean} If transaction is a valid nano contract creation tx that is already confirmed by a block
  const [txIsValid, setTxIsValid] = useState(false);

  useEffect(() => {
    if (nc) {
      // Load data only if nano contract exists in redux,
      // otherwise it has just been unregistered
      validateAndLoad();
    }
  }, []);

  /**
   * Method executed when link to execute a method is clicked
   *
   * @param {Object} e Event emitted by the link clicked
   * @param {String} method Method to be executed
   */
  const executeMethod = (e, method) => {
    e.preventDefault();
    navigate('/nano_contract/execute_method/', {
      state: {
        method,
        blueprintInformation,
        ncId,
      },
    });
  }

  /**
   * Method executed when link to change the address is clicked
   *
   * @param {Object} e Event emitted by the link clicked
   */
  const changeAddress = (e) => {
    e.preventDefault();
    context.showModal(MODAL_TYPES.NANOCONTRACT_CHANGE_ADDRESS, {
      nanoContractID: ncId
    });
  }

  /**
   * Method executed when link to unregister nano is clicked
   *
   * @param {Object} e Event emitted by the link clicked
   */
  const unregister = (e) => {
    e.preventDefault();
    context.showModal(MODAL_TYPES.NANOCONTRACT_CONFIRM_UNREGISTER, {
      ncId,
      success: async () => {
        dispatch(nanoContractUnregister(ncId));
        await wallet.storage.unregisterNanoContract(ncId);
        navigate('/nano_contract/');
      },
    });
  }

  /**
   * Validates if the transaction is a valid nano contract creation tx
   * and if it's confirmed by a block already.
   *
   * If everything is ok, calls loadData, otherwise calls itself again
   * in 5s if it's waiting for a block confirmation
   *
   * We need this because the state and history are only loaded when the tx is confirmed
   */
  const validateAndLoad = async () => {
    setLoading(true);
    let response;
    try {
      response = await wallet.getFullTxById(ncId);
    } catch (e) {
      // invalid tx
      setErrorMessage(t`Transaction is invalid.`);
      setLoading(false);
      return;
    }

    const isVoided = response.meta.voided_by.length > 0;
    if (isVoided) {
      setErrorMessage(t`Transaction is voided.`);
      setLoading(false);
      return;
    }

    const isNanoContractCreate = nanoUtils.isNanoContractCreate(response.tx);
    if (!isNanoContractCreate) {
      setErrorMessage(t`Transaction must be a nano contract creation.`);
      setLoading(false);
      return;
    }

    const isConfirmed = response.meta.first_block !== null;
    if (!isConfirmed) {
      // Wait for transaction to be confirmed
      setWaitingConfirmation(true);
      setTimeout(validateAndLoad, 5000);
      return;
    }

    setWaitingConfirmation(false);
    setTxIsValid(true);
    return loadData();
  }

  const loadData = async () => {
    try {
      await loadBlueprintInformation();
      await loadNCData();
    } finally {
      setLoading(false);
    }
  }

  const loadBlueprintInformation = async () => {
    if (blueprintInformationAux) {
      return;
    }

    try {
      const blueprintInformationResponse = await hathorLib.ncApi.getBlueprintInformation(nc.blueprintId);
      // We need this blueprint information response to call the following get state
      // The set state is not sync, so we need to store it in a common variable to be used in the next call
      blueprintInformationAux = blueprintInformationResponse;
      setBlueprintInformation(blueprintInformationResponse);
      // Store in redux, so it can be reused by other nano contracts
      dispatch(addBlueprintInformation(blueprintInformationResponse));
    } catch(e) {
      // Error in request
      setErrorMessage(t`Error getting blueprint details.`);
    };
  }

  const loadNCData = async () => {
    setData(null);
    try {
      const state = await hathorLib.ncApi.getNanoContractState(ncId, Object.keys(blueprintInformationAux.attributes), ['__all__'], []);
      setData(state);
    } catch(e) {
      // Error in request
      setErrorMessage(t`Error getting nano contract state.`);
    };
  }

  const renderBody = () => {
    if (loading) {
      const message = waitingConfirmation ? t`Waiting for transaction to be confirmed...` : t`Loading data...`
      return (
        <div className="d-flex flex-row align-items-center">
          <ReactLoading type='spin' width={24} height={24} color={colors.purpleHathor} delay={500} />
          <span className="ml-3">{message}</span>
        </div>
      );
    }

    if (errorMessage) {
      return <p className='text-danger mb-4'>{errorMessage}</p>;
    }

    return renderNCData();
  }

  const formatNCField = (field, value) => {
    if (value === undefined) {
      // Error getting field
      // Since we are using the attributes from the blueprint information API to
      // get the state, we know that the fields exist. If value is undefined, it
      // means they are dict fields, which we should just show the types of them for now
      return get(blueprintInformation.attributes, field);
    }

    if (value == null) {
      // If value is null or undefined, we show empty string
      return null;
    }

    // Get type of value but removing possible optional mark (?) to format the value correctly
    const type = blueprintInformation.attributes[field].replace('?', '');

    if (type === 'Timestamp') {
      return hathorLib.dateUtils.parseTimestamp(value);
    }

    if (type === 'Amount') {
      return hathorLib.numberUtils.prettyValue(value, decimalPlaces);
    }

    return value;
  }

  /**
   * Method called when user clicked on the token in the balance list
   *
   * @param {Object} e Event for the click
   * @param {string} token Token uid clicked
   */
  const goToExplorer = (e, token) => {
    e.preventDefault();
    const url = path.join(helpers.getExplorerURL(), `/token_detail/${token}`);
    helpers.openExternalURL(url);
  }

  /**
   * Method called when user clicked the link to go to the nano list
   */
  const goToRegisteredList = () => {
    navigate('/nano_contract/');
  }

  const renderNanoBalances = () => {
    return Object.entries(data.balances).map(([tokenUid, amount]) => {
      return (
        <div key={tokenUid} className="d-flex flex-column nc-token-balance">
          <p><strong>Token: </strong>{tokenUid === hathorLib.constants.NATIVE_TOKEN_UID ? tokenUid : <a href="true" onClick={(e) => goToExplorer(e, tokenUid)}>{tokenUid}</a>}</p>
          <p><strong>Amount: </strong>{hathorLib.numberUtils.prettyValue(amount.value, decimalPlaces)}</p>
        </div>
      );
    });
  }

  const renderNanoAttributes = () => {
    return Object.keys(data.fields).map((field) => {
      const value = get(data.fields[field], 'value', undefined);
      return <p key={field}><strong>{field}: </strong>{formatNCField(field, value)}</p>;
    });
  }

  const renderNanoMethods = () => {
    const publicMethods = get(blueprintInformation, 'public_methods', {});
    return Object.keys(publicMethods).filter((method) =>
      method !== hathorLib.constants.NANO_CONTRACTS_INITIALIZE_METHOD
    ).map((method) => {
      return (
        <li key={method}>
          <a href="true" onClick={(e) => executeMethod(e, method)}>{method}</a>
        </li>
      );
    });
  }

  const renderNCData = () => {
    return (
      <div className="nc-detail-wrapper">
        <p><strong>Blueprint: </strong>{blueprintInformation.name}</p>
        <p><strong>Address: </strong>{nc.address} (<a href="true" onClick={changeAddress}>{t`Change`}</a>)</p>
        {renderNanoAttributes()}
        <hr />
        <div>
          <p className="text-center mb-4"><strong>Balances:</strong></p>
          <div className="d-flex flex-column mt-3">
            {renderNanoBalances()}
          </div>
        </div>
        <hr />
        <div>
          <p className="text-center mb-4"><strong>Available methods:</strong></p>
          <ul className="three-column-list mt-3">
            {renderNanoMethods()}
          </ul>
        </div>
      </div>
    );
  }

  if (!nc) return null;

  return (
    <div className="content-wrapper">
      <ResetNavigationLink name={t`Go to list`} to={goToRegisteredList} />
      <h3 className="mt-4">{t`Nano Contract Detail`}</h3>
      <div className="mt-5">
        <p><strong>ID: </strong>{ncId} <span className="ml-1">(<a href="true" onClick={unregister}>{t`Unregister`}</a>)</span></p>
        <div className="d-flex flex-row justify-content-center mt-5 pb-4">
          {renderBody()}
        </div>
        {txIsValid && <NanoContractHistory ncId={ncId} />}
      </div>
    </div>
  );
}

export default NanoContractDetail;