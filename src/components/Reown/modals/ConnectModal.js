/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';

export function ConnectModal({ data, onAccept, onReject }) {
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
          {data.acceptedMethods?.map((method) => (
            <li key={method}>{method}</li>
          ))}
        </ul>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onReject} data-dismiss="modal">{t`Reject`}</button>
        <button type="button" className="btn btn-hathor" onClick={onAccept}>{t`Connect`}</button>
      </div>
    </>
  );
}
