/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from 'react';
import { t } from 'ttag';
import { useDispatch } from 'react-redux';
import { setCreateTokenStatusReady } from '../../../actions';
import { DAppInfo } from '../DAppInfo';
import CreateTokenRequestData from '../CreateTokenRequestData';


/**
 * Modal for handling token creation requests from dApps
 *
 * @param {Object} data Data about the session and token to be created
 * @param {Function} onAccept Function to call when the user accepts the request
 * @param {Function} onReject Function to call when the user rejects the request
 */
export function CreateTokenModal({ data, onAccept, onReject, params }) {
  const dispatch = useDispatch();
  const tokenData = data?.data || {};

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      // Reset token creation state to ready when the modal is closed
      dispatch(setCreateTokenStatusReady());
    };
  }, [dispatch]);

  return (
    <>
      <div className="modal-header">
        <h5 className="modal-title">{t`Create Token`}</h5>
        <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={onReject}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div className="modal-body p-3" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
        <DAppInfo dapp={data.dapp} className="d-flex align-items-center mb-4" />

        <p className="font-weight-bold mb-3">{t`Review token creation request`}</p>
        <p className="text-muted small mb-4">{t`Stay vigilant and protect your data from potential phishing attempts.`}</p>

        <div className="card mb-4">
          <div className="card-body">
            <CreateTokenRequestData data={tokenData} />
          </div>
        </div>

        {params?.pushTx === false && (
          <p className="text-muted small mt-3 mb-0">
            {t`This transaction will only be built, not pushed to the network.`}
          </p>
        )}
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onReject} data-dismiss="modal">{t`Reject`}</button>
        <button type="button" className="btn btn-hathor" onClick={onAccept}>{t`Create`}</button>
      </div>
    </>
  );
} 
