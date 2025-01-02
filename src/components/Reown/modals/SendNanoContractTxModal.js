/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { useDispatch, useSelector } from 'react-redux';
import { types } from '../../../actions';
import helpers from '../../../utils/helpers';
import { NanoContractActions } from '../NanoContractActions';

export function SendNanoContractTxModal({ data, firstAddress, onAccept, onReject }) {
  const dispatch = useDispatch();
  const blueprintInfo = useSelector((state) => state.blueprintsData[data?.data?.blueprintId]);
  const nanoContracts = useSelector((state) => state.nanoContracts);

  const renderArgumentsSection = () => {
    if (!data?.data?.args || !blueprintInfo) {
      return null;
    }

    const methodInfo = blueprintInfo.public_methods?.[data.data.method];
    const argEntries = methodInfo
      ? data.data.args.map((arg, idx) => [
          methodInfo.args[idx].name,
          arg,
          methodInfo.args[idx].type
        ])
      : data.data.args.map((arg, idx) => [t`Position ${idx}`, arg]);

    return (
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
  };

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
        <button type="button" className="btn btn-secondary" onClick={onReject} data-dismiss="modal">{t`Reject`}</button>
        <button type="button" className="btn btn-hathor" onClick={onAccept}>{t`Accept Transaction`}</button>
      </div>
    </>
  );
} 
