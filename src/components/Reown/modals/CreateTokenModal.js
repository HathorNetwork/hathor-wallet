/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';

export function CreateTokenModal({ data, onAccept, onReject }) {
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
        <button type="button" className="btn btn-secondary" onClick={onReject} data-dismiss="modal">{t`Reject`}</button>
        <button type="button" className="btn btn-hathor" onClick={onAccept}>{t`Create`}</button>
      </div>
    </>
  );
} 
