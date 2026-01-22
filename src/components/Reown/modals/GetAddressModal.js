/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { DAppInfo } from '../DAppInfo';

/**
 * Modal for confirming address requests from dApps.
 * Shows the address that will be shared and asks for user confirmation.
 */
export function GetAddressModal({ data, onAccept, onReject }) {
  const { address, addressPath } = data.data || {};

  return (
    <>
      <div className="modal-header">
        <h5 className="modal-title">{t`Address Request`}</h5>
        <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={onReject}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div className="modal-body">
        <DAppInfo dapp={data.dapp} />
        <p>{t`The dApp is requesting access to the following address:`}</p>
        <div className="bg-light p-3 rounded">
          <div className="mb-2">
            <strong>{t`Address:`}</strong>
          </div>
          <div className="text-monospace small text-break mb-3">
            {address || t`Address will be generated`}
          </div>
          {addressPath && (
            <>
              <div className="mb-2">
                <strong>{t`Derivation Path:`}</strong>
              </div>
              <div className="text-monospace small text-muted">
                {addressPath}
              </div>
            </>
          )}
        </div>
        <p className="mt-3 text-muted small">
          {t`By allowing, you grant this dApp permission to see this address.`}
        </p>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onReject} data-dismiss="modal">{t`Reject`}</button>
        <button type="button" className="btn btn-hathor" onClick={onAccept}>{t`Allow`}</button>
      </div>
    </>
  );
}
