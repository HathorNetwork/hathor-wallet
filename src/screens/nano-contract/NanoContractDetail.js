/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useContext, useEffect } from 'react';
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
import path from 'path-browserify';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { nanoContractDetailRequest, nanoContractDetailSetStatus, nanoContractUnregister } from '../../actions';
import { get } from 'lodash';
import { GlobalModalContext, MODAL_TYPES } from '../../components/GlobalModal';
import { getGlobalWallet } from '../../modules/wallet';
import { NANO_CONTRACT_DETAIL_STATUS } from '../../constants';


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
    nanoContractDetailState,
    blueprintsData,
    decimalPlaces,
  } = useSelector((state) => {
    return {
      nanoContracts: state.nanoContracts,
      nanoContractDetailState: state.nanoContractDetailState,
      blueprintsData: state.blueprintsData,
      decimalPlaces: state.serverInfo.decimalPlaces,
    }
  });

  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { nc_id: ncId } = useParams();
  const nc = nanoContracts[ncId];

  useEffect(() => {
    if (nc) {
      // Load data only if nano contract exists in redux,
      // otherwise it has just been unregistered
      dispatch(nanoContractDetailRequest(ncId));
    }

    return () => {
      // Move state to ready when unmounting
      dispatch(nanoContractDetailSetStatus({ status: NANO_CONTRACT_DETAIL_STATUS.READY }));
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
    const blueprintInformation = blueprintsData[nc.blueprintId];
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

  const renderBody = () => {
    if (nanoContractDetailState.status === NANO_CONTRACT_DETAIL_STATUS.LOADING || nanoContractDetailState.status === NANO_CONTRACT_DETAIL_STATUS.WAITING_TX_CONFIRMATION) {
      const message = nanoContractDetailState.status === NANO_CONTRACT_DETAIL_STATUS.WAITING_TX_CONFIRMATION ? t`Waiting for transaction to be confirmed...` : t`Loading data...`;
      return (
        <div className="d-flex flex-row align-items-center">
          <ReactLoading type='spin' width={24} height={24} color={colors.purpleHathor} delay={500} />
          <span className="ml-3">{message}</span>
        </div>
      );
    }

    if (nanoContractDetailState.status === NANO_CONTRACT_DETAIL_STATUS.ERROR) {
      return <p className='text-danger mb-4'>{nanoContractDetailState.error}</p>;
    }

    if (nanoContractDetailState.status !== NANO_CONTRACT_DETAIL_STATUS.SUCCESS) {
      return null;
    }

    return renderNCData();
  }

  const formatNCField = (field, value) => {
    const blueprintInformation = blueprintsData[nc.blueprintId];
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
    const data = nanoContractDetailState.state;
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
    const data = nanoContractDetailState.state;
    return Object.keys(data.fields).map((field) => {
      const value = get(data.fields[field], 'value', undefined);
      return <p key={field}><strong>{field}: </strong>{formatNCField(field, value)}</p>;
    });
  }

  const renderNanoMethods = () => {
    const blueprintInformation = blueprintsData[nc.blueprintId];
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
    const blueprintInformation = blueprintsData[nc.blueprintId];
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
        {nanoContractDetailState.state && <NanoContractHistory ncId={ncId} />}
      </div>
    </div>
  );
}

export default NanoContractDetail;