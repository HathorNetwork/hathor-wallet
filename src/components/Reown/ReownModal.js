/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from 'react';
import { t } from 'ttag';
import { useDispatch } from 'react-redux';
import { types } from '../../actions';

export const ReownModalTypes = {
  CONNECT: 'CONNECT',
  SIGN_MESSAGE: 'SIGN_MESSAGE',
  SIGN_ORACLE_DATA: 'SIGN_ORACLE_DATA',
  SEND_NANO_CONTRACT_TX: 'SEND_NANO_CONTRACT_TX',
  CREATE_TOKEN: 'CREATE_TOKEN',
};

export function ReownModal({ manageDomLifecycle, data, type, onAcceptAction, onRejectAction }) {
  const modalDomId = 'reownModal';
  const dispatch = useDispatch();

  useEffect(() => {
    manageDomLifecycle(`#${modalDomId}`);
  }, []);

  const handleAccept = () => {
    if (onAcceptAction) {
      dispatch(onAcceptAction);
    } else {
      dispatch({ type: types.REOWN_ACCEPT });
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
              <h5 className="modal-title">{t`Send Nano Contract Transaction`}</h5>
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
              <p>{t`Transaction details:`}</p>
              <pre className="bg-light p-3 rounded">{JSON.stringify(data.data, null, 2)}</pre>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" onClick={handleReject} data-dismiss="modal">{t`Reject`}</button>
              <button type="button" className="btn btn-hathor" onClick={handleAccept}>{t`Send`}</button>
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