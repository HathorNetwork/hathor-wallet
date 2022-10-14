/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useState } from 'react';
import { t } from 'ttag'
import $ from 'jquery';
import BackButton from '../../components/BackButton';
import ReactLoading from 'react-loading';
import colors from '../../index.scss';
import ModalChangeAddress from '../../components/nano/ModalChangeAddress';
import helpers from '../../utils/helpers';
import hathorLib from '@hathor/wallet-lib';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import { get } from 'lodash';


/**
 * Details of a Nano Contract
 *
 * @memberof Screens
 */
function NanoContractDetail(props) {

  const { nanoContracts, tokenMetadata } = useSelector((state) => {
    return {
      nanoContracts: state.nanoContracts,
      tokenMetadata: state.tokenMetadata
    }
  });

  const dispatch = useDispatch();
  const history = useHistory();
  const ncId = props.match.params.nc_id;
  const nc = nanoContracts[ncId];

  // loading {boolean} Bool to show/hide loading element
  const [loading, setLoading] = useState(true);
  // data {Object} Nano contract loaded data
  const [data, setData] = useState(null);
  // errorMessage {string} Message to show when error happens on the form
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    loadNCData();
  }, []);

  /**
   * Method executed when link to execute a method is clicked
   *
   * @param {Object} e Event emitted by the link clicked
   * @param {String} method Method to be executed
   */
  const executeMethod = (e, method) => {
    e.preventDefault();
    history.push({
      pathname: '/nano_contract/execute_method/',
      state: {
        blueprintInformation: nc.blueprint,
        method,
        ncId,
        address: nc.address,
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
    $('#changeAddressModal').modal('show');
  }

  const loadNCData = async () => {
    setLoading(true);
    setData(null);
    try {
      const state = await hathorLib.ncApi.getNanoContractState(ncId, Object.keys(nc.blueprint.attributes), [], []);
      setLoading(false);
      setData(state);
    } catch(e) {
      // Error in request
      setLoading(false);
      setErrorMessage(t`Error getting nano contract state.`);
    };
  }

  const onAddressChanged = (newAddress) => {
    loadNCData(newAddress);
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

  const renderNanoAttributes = () => {
    return Object.keys(data.fields).map((field) => {
      const value = get(data.fields[field], 'value', null);
      if (!value) {
        // Error getting field
        // TODO dict fields are coming with error, we should send the request with the
        // specific key to filter the dict field
        return null;
      }

      // Some fields should be better parsed, e.g., timestamp, address
      // however we don't have a simple and generic way to knowing it
      // this was discussed and we will have this in the future, so
      // for now we keep this UI and when we have this feature in the
      // hathor-core, we can improve the user UI
      return <p key={field}><strong>{field}: </strong>{value}</p>;
    });
  }

  const renderNanoMethods = () => {
    return Object.keys(nc.blueprint.public_methods).filter((method) =>
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
        <p><strong>Blueprint: </strong>{nc.blueprint.name}</p>
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
        <p><strong>ID: </strong>{nc.id}</p>
        <div className="d-flex flex-row justify-content-center mt-5">
          {renderBody()}
        </div>
      </div>
      <ModalChangeAddress nanoContractID={ncId} onAddressChanged={onAddressChanged} />
    </div>
  );
}

export default NanoContractDetail;