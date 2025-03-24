/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect } from 'react';
import { t } from 'ttag';
import { get } from 'lodash';
import { useDispatch, useSelector } from 'react-redux';
import { types, setNewNanoContractStatusReady } from '../../../actions';
import helpers from '../../../utils/helpers';
import nanoUtils from '../../../utils/nanoContracts';
import { NanoContractActions } from '../NanoContractActions';
import AddressList from '../../AddressList';
import { NANO_UPDATE_ADDRESS_LIST_COUNT } from '../../../constants';

export function SendNanoContractTxModal({ data, onAccept, onReject }) {
  const dispatch = useDispatch();
  const blueprintInfo = useSelector((state) => state.blueprintsData[data?.data?.blueprintId]);
  const nanoContracts = useSelector((state) => state.nanoContracts);
  const decimalPlaces = useSelector((state) => state.serverInfo.decimalPlaces);
  const firstAddress = useSelector((state) => state.reown.firstAddress);
  const [selectedAddress, setSelectedAddress] = useState(firstAddress);
  const [isSelectingAddress, setIsSelectingAddress] = useState(false);

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      // Reset nano contract state to ready when the modal is closed
      dispatch(setNewNanoContractStatusReady());
    };
  }, [dispatch]);

  useEffect(() => {
    if (data?.data?.blueprintId) {
      dispatch({ 
        type: types.BLUEPRINT_FETCH_REQUESTED, 
        payload: data.data.blueprintId
      });
    }
  }, [data?.data?.blueprintId]);

  const renderArgumentsSection = () => {
    if (!data?.data?.args || !blueprintInfo) {
      return null;
    }

    const methodInfo = blueprintInfo.public_methods?.[data.data.method];
    const methodInfoArgs = get(methodInfo, 'args', []);
    const dataArgs = get(data.data, 'args', []);
    const argEntries = dataArgs.map((arg, idx) => [
      methodInfoArgs[idx]?.name || t`Position ${idx}`,
      arg,
      methodInfoArgs[idx]?.type
    ]);

    return (
      <>
        <h6 className="mb-3">{t`Arguments`}</h6>
        <div className="card">
          <div className="card-body p-0">
            <table className="table table-sm mb-0">
              <tbody>
                {argEntries.map(([argName, value, argType]) => (
                  <tr key={argName}>
                    <td className="border-top-0 pl-3" style={{width: '30%'}}>
                      <strong>{argName}</strong>
                      {argType && <small className="text-muted d-block">{argType}</small>}
                    </td>
                    <td className="border-top-0 text-monospace" style={{wordBreak: 'break-all'}}>
                      {nanoUtils.formatNCArgValue(value, argType, decimalPlaces)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </>
    );
  };

  const handleAddressSelect = (address) => {
    setSelectedAddress(address);
    setIsSelectingAddress(false);
  };

  const openAddressSelector = () => {
    setIsSelectingAddress(true);
  };

  const handleAddressSelectionCancel = () => {
    setIsSelectingAddress(false);
  };

  const handleAccept = () => {
    // Create a new object with all the data and the selected address
    const ncData = {
      ...data.data,
      caller: selectedAddress,
    };
    onAccept(ncData);
  };

  // Address selection mode content
  if (isSelectingAddress) {
    return (
      <>
        <div className="modal-header">
          <h5 className="modal-title">{t`Select Address`}</h5>
          <button type="button" className="close" onClick={handleAddressSelectionCancel}>
            <span aria-hidden="true">&times;</span>
          </button>
        </div>
        <div className="modal-body">
          <p>{t`Select the address that will be used to sign the transaction`}</p>
          <AddressList
            showNumberOfTransaction={false}
            onAddressClick={handleAddressSelect}
            count={NANO_UPDATE_ADDRESS_LIST_COUNT}
            isModal={true}
          />
        </div>
        <div className="modal-footer">
          <button type="button" className="btn btn-secondary" onClick={handleAddressSelectionCancel}>
            {t`Cancel`}
          </button>
        </div>
      </>
    );
  }

  // Normal mode content
  return (
    <>
      <div className="modal-header">
        <h5 className="modal-title">{t`NEW NANO CONTRACT TRANSACTION`}</h5>
        <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={onReject}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div className="modal-body">
        <div className="d-flex align-items-center mb-3">
          {data.dapp.icon && <img src={data.dapp.icon} alt="dApp icon" className="mr-3" style={{ width: 48, height: 48 }} />}
          <div>
            <h6 className="mb-1">{data.dapp.proposer}</h6>
            <small className="text-muted">{data.dapp.url}</small>
          </div>
        </div>

        {/* Blueprint Information Card */}
        <div className="card mb-4">
          <div className="card-body">
            {data.data.ncId && (
              <div className="mb-3">
                <strong>{t`Nano Contract ID`}</strong>
                <div className="text-monospace">
                  {helpers.truncateText(data.data.ncId, 8, 4)}
                  <button 
                    className="btn btn-link btn-sm p-0 ml-2" 
                    onClick={() => navigator.clipboard.writeText(data.data.ncId)}
                  >
                    <i className="fa fa-copy"></i>
                  </button>
                </div>
              </div>
            )}

            <div className="mb-3">
              <strong>{t`Blueprint ID`}</strong>
              <div className="text-monospace">
                {data.data.blueprintId}
                <button 
                  className="btn btn-link btn-sm p-0 ml-2" 
                  onClick={() => navigator.clipboard.writeText(data.data.blueprintId)}
                >
                  <i className="fa fa-copy"></i>
                </button>
              </div>
            </div>

            <div className="mb-3">
              <strong>{t`Blueprint Name`}</strong>
              <div>{blueprintInfo?.name || '-'}</div>
            </div>

            <div className="mb-3">
              <strong>{t`Blueprint Method`}</strong>
              <div>{data.data.method}</div>
            </div>

            <div className="mb-3">
              <strong>{t`Caller`}</strong>
              <div className="d-flex align-items-center">
                <div className="text-monospace flex-grow-1">{selectedAddress || '-'}</div>
                <button 
                  className="btn btn-link btn-sm p-0 ml-2" 
                  onClick={openAddressSelector}
                  title={t`Select Address`}
                >
                  <i className="fa fa-pencil" style={{ fontSize: '1.2rem' }}></i>
                </button>
              </div>
            </div>

            {data.data.ncId && !nanoContracts[data.data.ncId] && (
              <div className="alert alert-info mt-3 mb-0">
                <i className="fa fa-info-circle mr-2"></i>
                {t`This nano contract is not registered in your wallet. Would you like to register it?`}
                <div className="mt-2">
                  <button 
                    className="btn btn-sm btn-outline-primary" 
                    onClick={() => dispatch({ 
                      type: types.NANOCONTRACT_REGISTER_REQUEST, 
                      payload: { 
                        ncId: data.data.ncId, 
                        address: selectedAddress 
                      }
                    })}
                    disabled={!selectedAddress}
                  >
                    {t`Register Nano Contract`}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Arguments Section */}
        {data.data.args && data.data.args.length > 0 && renderArgumentsSection()}

        {/* Actions Section */}
        <NanoContractActions
          ncActions={data.data.actions}
          tokens={data.data.tokens}
          error={data.data.tokens?.error}
        />
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onReject} data-dismiss="modal">{t`Reject`}</button>
        <button 
          type="button" 
          className="btn btn-hathor" 
          onClick={handleAccept}
        >
          {t`Accept Transaction`}
        </button>
      </div>
    </>
  );
} 
