/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useState, useMemo } from 'react';
import { t } from 'ttag';
import { useDispatch, useSelector } from 'react-redux';
import { get } from 'lodash';
import { types } from '../../actions';
import helpers from '../../utils/helpers';
import { getGlobalWallet } from '../../modules/wallet';
import { NanoContractActions } from './NanoContractActions';

export const ReownModalTypes = {
  CONNECT: 'CONNECT',
  SIGN_MESSAGE: 'SIGN_MESSAGE',
  SIGN_ORACLE_DATA: 'SIGN_ORACLE_DATA',
  SEND_NANO_CONTRACT_TX: 'SEND_NANO_CONTRACT_TX',
  CREATE_TOKEN: 'CREATE_TOKEN',
};

/**
 * Get method info from registered blueprint data.
 *
 * @param {{
 *   data: Object;
 * }} blueprint The blueprint info object
 * @param {string} method The method name to get info from blueprint public methods
 *
 * @returns {Object}
 */
function getMethodInfoFromBlueprint(blueprint, method) {
  return get(blueprint, `public_methods.${method}`, null);
}

/**
 * Get the fallback entries for the method arguments.
 *
 * @param {string[]} args A list of argument value
 *
 * @returns {[argName: string, value: string][]}
 */
function getFallbackArgEntries(args) {
  return args.map((arg, idx) => [t`Position ${idx}`, arg]);
}

export function ReownModal({ manageDomLifecycle, data, type, onAcceptAction, onRejectAction }) {
  const modalDomId = 'reownModal';
  const dispatch = useDispatch();
  const [firstAddress, setFirstAddress] = useState('');
  const blueprintInfo = useSelector((state) => state.blueprintsData[data?.data?.blueprintId]);
  const nanoContracts = useSelector((state) => state.nanoContracts);

  // Get argument entries with names and types from blueprint info
  const argEntries = useMemo(() => {
    if (!data?.data?.args || !blueprintInfo) {
      return [];
    }

    console.log('Blueprint info: ', blueprintInfo, data.data.method);
    const methodInfo = getMethodInfoFromBlueprint(blueprintInfo, data.data.method);
    console.log('method info:', methodInfo);
    if (methodInfo) {
      return data.data.args.map((arg, idx) => [
        methodInfo.args[idx].name,
        arg,
        methodInfo.args[idx].type
      ]);
    }

    // Fallback to position-based names
    return getFallbackArgEntries(data.data.args);
  }, [data?.data?.method, data?.data?.args, blueprintInfo]);

  useEffect(() => {
    manageDomLifecycle(`#${modalDomId}`);
  }, []);

  useEffect(() => {
    if (data?.data?.blueprintId && !blueprintInfo) {
      dispatch({ 
        type: types.BLUEPRINT_FETCH_REQUESTED, 
        payload: data.data.blueprintId
      });
    }
  }, [data?.data?.blueprintId]);

  useEffect(() => {
    const loadFirstAddress = async () => {
      const wallet = getGlobalWallet();
      if (wallet.isReady()) {
        const address = await wallet.getAddressAtIndex(0);
        setFirstAddress(address);
      }
    };
    loadFirstAddress();
  }, []);

  const handleAccept = () => {
    if (type === ReownModalTypes.SEND_NANO_CONTRACT_TX) {
      console.log('Type is send nano contract.');
      // For nano contract transactions, we need to include the caller address
      // Create a new object with the same properties, preserving BigInt values
      const ncData = {
        blueprintId: data.data.blueprintId,
        method: data.data.method,
        args: data.data.args.map(arg => {
          // If it's already a BigInt, return as is
          if (typeof arg === 'bigint') return arg;
          // If it's a number or numeric string, convert to BigInt
          if (typeof arg === 'number' || (typeof arg === 'string' && !isNaN(arg))) {
            return BigInt(arg);
          }
          // Otherwise return the original value
          return arg;
        }),
        actions: data.data.actions.map(action => ({
          ...action,
          // Convert amount to BigInt if it's not already
          amount: typeof action.amount === 'bigint' ? action.amount : BigInt(action.amount)
        })),
        caller: firstAddress
      };
      console.log('Nc data: ', ncData);
      onAcceptAction(ncData);
    } else {
      onAcceptAction(data);
    }
  };

  const handleReject = () => {
    if (onRejectAction) {
      dispatch(onRejectAction);
    } else {
      dispatch({ type: types.REOWN_REJECT });
    }
  };

  const renderModalContent = () => {
    switch (type) {
      case ReownModalTypes.CONNECT:
        return (
          <>
            <div className="modal-header">
              <h5 className="modal-title">{t`Connect to dApp`}</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <div className="d-flex align-items-center mb-3">
                {data.icon && <img src={data.icon} alt="dApp icon" className="mr-3" style={{ width: 48, height: 48 }} />}
                <div>
                  <h6 className="mb-1">{data.proposer}</h6>
                  <small className="text-muted">{data.url}</small>
                </div>
              </div>
              <p>{data.description}</p>
              <p className="mb-0">{t`This dApp would like to:`}</p>
              <ul className="mt-2">
                {data.requiredNamespaces?.hathor?.methods?.map((method) => (
                  <li key={method}>{method}</li>
                ))}
              </ul>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleReject} data-dismiss="modal">{t`Reject`}</button>
              <button type="button" className="btn btn-hathor" onClick={handleAccept}>{t`Connect`}</button>
            </div>
          </>
        );

      case ReownModalTypes.SIGN_MESSAGE:
        return (
          <>
            <div className="modal-header">
              <h5 className="modal-title">{t`Sign Message`}</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
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
              <p>{t`Message to sign:`}</p>
              <pre className="bg-light p-3 rounded">{data.data.message}</pre>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleReject} data-dismiss="modal">{t`Reject`}</button>
              <button type="button" className="btn btn-hathor" onClick={handleAccept}>{t`Sign`}</button>
            </div>
          </>
        );

      case ReownModalTypes.SIGN_ORACLE_DATA:
        return (
          <>
            <div className="modal-header">
              <h5 className="modal-title">{t`Sign Oracle Data`}</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
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
              <p>{t`Oracle data to sign:`}</p>
              <pre className="bg-light p-3 rounded">{JSON.stringify(data.data, null, 2)}</pre>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleReject} data-dismiss="modal">{t`Reject`}</button>
              <button type="button" className="btn btn-hathor" onClick={handleAccept}>{t`Sign`}</button>
            </div>
          </>
        );

      case ReownModalTypes.SEND_NANO_CONTRACT_TX:
        return (
          <>
            <div className="modal-header">
              <h5 className="modal-title">{t`NEW NANO CONTRACT TRANSACTION`}</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
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
                      {helpers.truncateText(data.data.blueprintId, 8, 4)}
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
                    <div className="text-monospace">
                      {helpers.truncateText(firstAddress, 8, 4)}
                      <button 
                        className="btn btn-link btn-sm p-0 ml-2" 
                        onClick={() => navigator.clipboard.writeText(firstAddress)}
                      >
                        <i className="fa fa-copy"></i>
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
                              address: firstAddress 
                            }
                          })}
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
              <button type="button" className="btn btn-secondary" onClick={handleReject} data-dismiss="modal">{t`Reject`}</button>
              <button type="button" className="btn btn-hathor" onClick={handleAccept}>{t`Accept Transaction`}</button>
            </div>
          </>
        );

      case ReownModalTypes.CREATE_TOKEN:
        return (
          <>
            <div className="modal-header">
              <h5 className="modal-title">{t`Create Token`}</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
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
              <p>{t`Token details:`}</p>
              <pre className="bg-light p-3 rounded">{JSON.stringify(data.data, null, 2)}</pre>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleReject} data-dismiss="modal">{t`Reject`}</button>
              <button type="button" className="btn btn-hathor" onClick={handleAccept}>{t`Create`}</button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  // Update the Arguments Section in renderModalContent
  const renderArgumentsSection = () => (
    <>
      <h6 className="mb-3">{t`Arguments`}</h6>
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-sm mb-0">
              <tbody>
                {argEntries.map(([argName, value, argType]) => (
                  <tr key={argName}>
                    <td className="border-top-0 pl-3" style={{width: '30%'}}>
                      <strong>{argName}</strong>
                      {argType && <small className="text-muted d-block">{argType}</small>}
                    </td>
                    <td className="border-top-0 text-monospace">
                      {typeof value === 'string' && value.length > 20 
                        ? helpers.truncateText(value, 8, 4)
                        : typeof value === 'bigint'
                          ? value.toString()
                          : value.toString()}
                      {typeof value === 'string' && value.length > 20 && (
                        <button 
                          className="btn btn-link btn-sm p-0 ml-2" 
                          onClick={() => navigator.clipboard.writeText(value)}
                        >
                          <i className="fa fa-copy"></i>
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </>
  );

  return (
    <div className="modal fade" id={modalDomId} tabIndex="-1" role="dialog" aria-labelledby={modalDomId} aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          {renderModalContent()}
        </div>
      </div>
    </div>
  );
} 
