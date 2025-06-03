/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from 'react';
import { t } from 'ttag';
import { useDispatch, useSelector } from 'react-redux';
import { setNewNanoContractStatusReady, types } from '../../../actions';
import hathorLib from '@hathor/wallet-lib';
import helpers from '../../../utils/helpers';
import nanoUtils from '../../../utils/nanoContracts';
import { NanoContractActions } from '../NanoContractActions';
import NanoContractRequestData from '../NanoContractRequestData';
import CreateTokenRequestData from '../CreateTokenRequestData';

/**
 * Component for Blueprint Information Card
 */
const BlueprintInfoCard = ({ nanoContract, blueprintInfo }) => (
  <div className="card mb-4">
    <div className="card-body">
      <div className="mb-3">
        <strong>{t`Blueprint ID`}</strong>
        <div className="text-monospace">
          {nanoContract.blueprintId || 'N/A'}
          {nanoContract.blueprintId && (
            <button 
              className="btn btn-link btn-sm p-0 ml-2" 
              onClick={() => navigator.clipboard.writeText(nanoContract.blueprintId)}
            >
              <i className="fa fa-copy"></i>
            </button>
          )}
        </div>
      </div>

      <div className="mb-3">
        <strong>{t`Blueprint Name`}</strong>
        <div>{blueprintInfo?.name || '-'}</div>
      </div>

      {nanoContract.method && (
        <div className="mb-3">
          <strong>{t`Blueprint Method`}</strong>
          <div>{nanoContract.method}</div>
        </div>
      )}
      
      {nanoContract.ncId && (
        <div className="mb-3">
          <strong>{t`Nano Contract ID`}</strong>
          <div className="text-monospace">{nanoContract.ncId || 'New Contract'}</div>
        </div>
      )}
    </div>
  </div>
);

/**
 * Component for Arguments Table
 */
const ArgumentsTable = ({ args, methodInfo, decimalPlaces }) => {
  if (!args || !args.length) return null;
  
  const methodInfoArgs = methodInfo?.args || [];

  return (
    <div className="mb-4">
      <h6 className="font-weight-bold mb-3">{t`Arguments`}</h6>
      <div className="card">
        <div className="card-body p-0">
          <table className="table table-sm mb-0">
            <tbody>
              {args.map((arg, index) => {
                const argName = methodInfoArgs[index]?.name || t`Position ${index}`;
                const argType = methodInfoArgs[index]?.type;
                return (
                  <tr key={index}>
                    <td className="border-top-0 pl-3" style={{width: '30%'}}>
                      <strong>{argName}</strong>
                      {argType && <small className="text-muted d-block">{argType}</small>}
                    </td>
                    <td className="border-top-0 text-monospace" style={{wordBreak: 'break-all'}}>
                      {nanoUtils.formatNCArgValue(arg, argType, decimalPlaces)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

/**
 * Component for Token Data Card
 */
const TokenDataCard = ({ token, decimalPlaces }) => (
  <div className="mb-4">
    <h6 className="font-weight-bold mb-3">{t`Create Token Data`}</h6>
    <div className="card">
      <div className="card-body">
        <CreateTokenRequestData data={token} />
      </div>
    </div>
  </div>
);

/**
 * Component for dApp Info
 */
const DAppInfo = ({ dapp }) => (
  <div className="d-flex align-items-center mb-4">
    {dapp?.icon && (
      <img 
        src={dapp.icon} 
        alt="dApp icon" 
        className="mr-3" 
        style={{ width: 48, height: 48 }} 
      />
    )}
    <div>
      <h6 className="font-weight-bold mb-0">{dapp?.proposer || "Unknown"}</h6>
      <small className="text-primary">{dapp?.chain || ""}</small>
    </div>
  </div>
);

/**
 * Modal for handling combined nano contract creation and token creation requests from dApps
 * 
 * @param {Object} data Data about the session and nano contract/token to be created
 * @param {Function} onAccept Function to call when the user accepts the request
 * @param {Function} onReject Function to call when the user rejects the request
 */
export function CreateNanoContractCreateTokenTxModal({ data, onAccept, onReject }) {
  const dispatch = useDispatch();
   
  // Extract data from the request payload
  const requestData = data?.data || {};
  // The field is actually "nano", not "nanoContract"
  const nanoContract = requestData.nano || {};
   
  // Select from Redux store
  const { decimalPlaces, blueprintInfo } = useSelector((state) => ({
    decimalPlaces: state.serverInfo.decimalPlaces || 2,
    blueprintInfo: state.blueprintsData[nanoContract.blueprintId]
  }));

  // Log data for debugging
  useEffect(() => {
    console.log('CreateNanoContractCreateTokenTx - Full data:', data);
    console.log('CreateNanoContractCreateTokenTx - Nano Contract:', nanoContract);
    console.log('CreateNanoContractCreateTokenTx - Blueprint ID:', nanoContract.blueprintId);
  }, [data, nanoContract]);

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      // Reset nano contract creation state to ready when the modal is closed
      dispatch(setNewNanoContractStatusReady());
    };
  }, [dispatch]);

  // Fetch blueprint information if needed
  useEffect(() => {
    if (nanoContract.blueprintId) {
      dispatch({ 
        type: types.BLUEPRINT_FETCH_REQUESTED, 
        payload: nanoContract.blueprintId
      });
    }
  }, [nanoContract.blueprintId, dispatch]);

  // Extract token data
  const token = requestData.token || {};

  // Handle accept action
  const handleAccept = () => {
    // We must structure the response data in the expected format
    const responseData = {
      nanoContract: nanoContract,
      token: token
    };
    
    onAccept(responseData);
  };

  return (
    <>
      <div className="modal-header">
        <h5 className="modal-title">{t`CREATE NANO CONTRACT & TOKEN`}</h5>
        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div className="modal-body p-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        {/* dApp Info */}
        <DAppInfo dapp={data.dapp} />
        
        <p className="font-weight-bold mb-3">{t`Review your transaction from this dApp`}</p>
        <p className="text-muted small mb-4">{t`Stay vigilant and protect your data from potential phishing attempts.`}</p>
        
        {/* Blueprint Information Card */}
        <BlueprintInfoCard nanoContract={nanoContract} blueprintInfo={blueprintInfo} />
        
        {/* Arguments Section */}
        <ArgumentsTable 
          args={nanoContract.args} 
          methodInfo={blueprintInfo?.public_methods?.[nanoContract.method]} 
          decimalPlaces={decimalPlaces} 
        />
        
        {/* Actions Section */}
        {nanoContract.actions && nanoContract.actions.length > 0 && (
          <div className="mb-4">
            <h6 className="font-weight-bold mb-3">{t`Action List`}</h6>
            <NanoContractActions
              ncActions={nanoContract.actions}
              tokens={nanoContract.tokens}
              error={nanoContract.tokens?.error}
            />
          </div>
        )}
        
        {/* Token Section */}
        <TokenDataCard token={token} decimalPlaces={decimalPlaces} />
      </div>
      <div className="modal-footer">
        <button 
          type="button" 
          className="btn btn-secondary" 
          onClick={onReject} 
          data-dismiss="modal"
        >
          {t`Reject`}
        </button>
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