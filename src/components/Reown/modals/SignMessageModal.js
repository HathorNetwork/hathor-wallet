import React from 'react';
import { t } from 'ttag';

export function SignMessageModal({ data, onAccept, onReject }) {
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
        <button type="button" className="btn btn-secondary" onClick={onReject} data-dismiss="modal">{t`Reject`}</button>
        <button type="button" className="btn btn-hathor" onClick={onAccept}>{t`Sign`}</button>
      </div>
    </>
  );
} 