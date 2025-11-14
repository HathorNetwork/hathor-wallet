/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { OracleDataDisplay } from '../OracleDataDisplay';
import { DAppInfo } from '../DAppInfo';

export function SignOracleDataModal({ data, onAccept, onReject }) {
  return (
    <>
      <div className="modal-header">
        <h5 className="modal-title">{t`Sign Oracle Data`}</h5>
        <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={onReject}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div className="modal-body p-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <DAppInfo dapp={data.dapp} />

        <p className="font-weight-bold mb-3">{t`Review the oracle data from this dApp`}</p>
        <p className="text-muted small mb-4">{t`Stay vigilant and protect your data from potential phishing attempts.`}</p>

        <div className="mb-4">
          <h6 className="font-weight-bold mb-3">{t`Oracle Data to Sign`}</h6>
          <OracleDataDisplay oracleData={data.data} />
        </div>
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
          onClick={onAccept}
        >
          {t`Sign`}
        </button>
      </div>
    </>
  );
} 
