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
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';


/**
 * Modal for handling token creation requests from dApps
 * 
 * @param {Object} data Data about the session and token to be created
 * @param {Function} onAccept Function to call when the user accepts the request
 * @param {Function} onReject Function to call when the user rejects the request
 */
export function CreateTokenModal({ data, onAccept, onReject }) {
  const dispatch = useDispatch();

  // Reset state when component unmounts
  useEffect(() => {
    return () => {
      // Reset token creation state to ready when the modal is closed
      dispatch(setCreateTokenStatusReady());
    };
  }, [dispatch]);

  // Process the data to handle BigInt values
  const processedData = React.useMemo(() => {
    try {
      return JSONBigInt.stringify(data.data, 2);
    } catch (error) {
      console.error('Error stringifying token data:', error);
      return 'Error displaying token data. Please check console for details.';
    }
  }, [data.data]);

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
        { /* TODO: Token details will be rendered in raw format, we should improve this UI */ }
        <pre className="bg-light p-3 rounded">{processedData}</pre>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onReject} data-dismiss="modal">{t`Reject`}</button>
        <button type="button" className="btn btn-hathor" onClick={onAccept}>{t`Create`}</button>
      </div>
    </>
  );
} 
