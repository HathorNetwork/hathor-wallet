/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useContext, useEffect, useState } from 'react';
import { t } from 'ttag'
import $ from 'jquery';
import BackButton from '../../components/BackButton';
import ReactLoading from 'react-loading';
import colors from '../../index.module.scss';
import ModalChangeAddress from '../../components/nano/ModalChangeAddress';
import helpers from '../../utils/helpers';
import hathorLib from '@hathor/wallet-lib';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { addBlueprintInformation } from '../../actions';
import { get } from 'lodash';
import { GlobalModalContext, MODAL_TYPES } from '../../components/GlobalModal';


/**
 * Details of a Nano Contract
 *
 * @memberof Screens
 */
function NanoContractDetail() {
  const context = useContext(GlobalModalContext);

  const { nanoContracts, blueprintsData, tokenMetadata } = useSelector((state) => {
    return {
      nanoContracts: state.nanoContracts,
      blueprintsData: state.blueprintsData,
      tokenMetadata: state.tokenMetadata
    }
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { nc_id: ncId } = useParams();
  const nc = nanoContracts[ncId];
  let blueprintInformationAux = blueprintsData[nc.blueprintId];

  // loading {boolean} Bool to show/hide loading element
  const [loading, setLoading] = useState(true);
  // data {Object} Nano contract loaded data
  const [data, setData] = useState(null);
  // blueprintInformation {Object} Blueprint information data
  const [blueprintInformation, setBlueprintInformation] = useState(blueprintInformationAux);
  // errorMessage {string} Message to show when error happens on the form
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadData();
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

  const loadData = async () => {
    await loadBlueprintInformation();
    await loadNCData();
  }

  const loadBlueprintInformation = async () => {
    if (blueprintInformationAux) {
      return;
    }

    setLoading(true);
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
    setLoading(true);
    setData(null);
    try {
      const state = await hathorLib.ncApi.getNanoContractState(ncId, Object.keys(blueprintInformationAux.attributes), [], []);
      setData(state);
    } catch(e) {
      // Error in request
      setErrorMessage(t`Error getting nano contract state.`);
    } finally {
      setLoading(false);
    };
  }

  const renderBody = () => {
    if (loading) {
      return <ReactLoading type='spin' color={colors.purpleHathor} delay={500} />;
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

    // Some fields should be better parsed, e.g., timestamp, address
    // however we don't have a simple and generic way to knowing it
    // this was discussed and we will have this in the future, so
    // for now we keep this UI and when we have this feature in the
    // hathor-core, we can improve the user UI
    return value === null ? ' - ' : value;
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
      method !== 'initialize'
    ).map((method) => {
      return (
        <div key={method}>
          <a href="true" onClick={(e) => executeMethod(e, method)}>{method}</a>
        </div>
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
          <p className="text-center mb-4"><strong>Available methods:</strong></p>
          <div className="d-flex flex-row justify-content-around mt-3">
            {renderNanoMethods()}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="content-wrapper">
      <BackButton />
      <h3 className="mt-4">{t`Nano Contract Detail`}</h3>
      <div className="mt-5">
        <p><strong>ID: </strong>{ncId}</p>
        <div className="d-flex flex-row justify-content-center mt-5 pb-4">
          {renderBody()}
        </div>
      </div>
    </div>
  );
}

export default NanoContractDetail;