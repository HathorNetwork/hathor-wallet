/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from 'react';
import { t } from 'ttag';
import { useSelector, useDispatch } from 'react-redux';
import { constants, numberUtils } from '@hathor/wallet-lib';
import { unregisteredTokensDownloadRequested } from '../../../actions';
import { CopyButton } from '../../CopyButton';

export function SendTransactionModal({ data, onAccept, onReject }) {
  const dispatch = useDispatch();
  const { tokenMetadata, tokens: registeredTokens } = useSelector((state) => ({
    tokenMetadata: state.tokenMetadata,
    tokens: state.tokens,
  }));

  useEffect(() => {
    // Collect all unregistered token UIDs
    const unregisteredTokens = new Set();
    
    data?.data?.inputs?.forEach(input => {
      const token = registeredTokens.find(t => t.uid === input.token);
      if (!token && input.token) {
        unregisteredTokens.add(input.token);
      }
    });

    data?.data?.outputs?.forEach(output => {
      const token = registeredTokens.find(t => t.uid === output.token);
      if (!token && output.token) {
        unregisteredTokens.add(output.token);
      }
    });

    if (unregisteredTokens.size > 0) {
      dispatch(unregisteredTokensDownloadRequested(Array.from(unregisteredTokens)));
    }
  }, [data, registeredTokens, dispatch]);

  const getTokenSymbol = (tokenId) => {
    if (!tokenId) {
      return constants.DEFAULT_NATIVE_TOKEN_CONFIG.symbol;
    }

    const token = registeredTokens.find(t => t.uid === tokenId);
    if (token) {
      return token.symbol;
    }

    return '?';
  };

  const formatValue = (value) => {
    if (value == null) {
      return '-';
    }

    return numberUtils.prettyValue(value);
  };

  const truncateTxId = (txId) => {
    if (!txId) return '-';
    return `${txId.slice(0, 8)}...${txId.slice(-8)}`;
  };

  const renderInputs = () => {
    if (!data?.data?.inputs || data.data.inputs.length === 0) {
      return null;
    }

    return (
      <div className="mb-4">
        <h6 className="mb-3">{t`Inputs`}</h6>
        {data.data.inputs.map((input, index) => (
          <div key={index} className="p-3 bg-light rounded mb-2">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <strong>{t`Input ${index + 1}`}</strong>
              </div>
              <div>
                {formatValue(input?.value)} {getTokenSymbol(input?.token)}
              </div>
            </div>
            <div className="text-monospace">
              {truncateTxId(input?.txId)} ({input?.index})
              {input?.txId && (
                <button 
                  className="btn btn-link btn-sm p-0 ml-2" 
                  onClick={() => navigator.clipboard.writeText(input.txId)}
                >
                  <i className="fa fa-copy"></i>
                </button>
              )}
            </div>
            <div className="text-monospace mt-2">
              {input?.address}
              {input?.address && (
                <CopyButton text={input.address} />
              )}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderOutputs = () => {
    if (!data?.data?.outputs || data.data.outputs.length === 0) {
      return null;
    }

    return (
      <div className="mb-4">
        <h6 className="mb-3">{t`Outputs`}</h6>
        {data.data.outputs.map((output, index) => (
          <div key={index} className="p-3 bg-light rounded mb-2">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <div>
                <strong>{t`Output ${index + 1}`}</strong>
              </div>
              <div>
                {formatValue(output?.value)} {getTokenSymbol(output?.token)}
              </div>
            </div>
            <div className="text-monospace">
              {output?.address}
              <CopyButton text={output?.address} />
            </div>
            {output?.data && (
              <>
                <div className="mt-2 mb-1"><small>{t`Data field:`}</small></div>
                <div className="text-monospace">
                  {output.data.join(',')}
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    );
  };

  const handleAccept = () => {
    onAccept(data?.data);
  };

  const handleReject = () => {
    onReject();
  };

  return (
    <>
      <div className="modal-header border-0">
        <h5 className="modal-title">{t`NEW TRANSACTION`}</h5>
        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div className="modal-body">
        <div className="mb-4">
          <h6 className="mb-1">{data?.dapp?.proposer}</h6>
          <small className="text-muted">{data?.dapp?.url}</small>
        </div>

        {renderInputs()}
        {renderOutputs()}

        {data?.data?.changeAddress && (
          <div>
            <h6 className="mb-3">{t`Change Address`}</h6>
            <div className="p-3 bg-light rounded">
              <div className="text-monospace">
                {data.data.changeAddress}
                {data.data.changeAddress && (
                  <button 
                    className="btn btn-link btn-sm p-0 ml-2" 
                    onClick={() => navigator.clipboard.writeText(data.data.changeAddress)}
                  >
                    <i className="fa fa-copy"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="modal-footer border-0">
        <button type="button" className="btn btn-lg btn-secondary" onClick={handleReject} data-dismiss="modal">{t`Reject`}</button>
        <button type="button" className="btn btn-lg btn-hathor" onClick={handleAccept}>{t`Accept Transaction`}</button>
      </div>
    </>
  );
} 
