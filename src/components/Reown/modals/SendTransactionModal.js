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
import helpers from '../../../utils/helpers';

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
      // Skip if it's the native token
      if (input.token === constants.NATIVE_TOKEN_UID || !input.token) {
        return;
      }
      
      const token = registeredTokens.find(t => t.uid === input.token);
      if (!token) {
        // If we can't find this token in our registered tokens list, we need to fetch its details
        unregisteredTokens.add(input.token);
      }
    });

    data?.data?.outputs?.forEach(output => {
      // Skip if it's the native token or if token is not specified
      if (output.token === constants.NATIVE_TOKEN_UID || !output.token) {
        return;
      }

      const token = registeredTokens.find(t => t.uid === output.token);
      if (!token) {
        // If we can't find this token in our registered tokens list, we need to fetch its details
        unregisteredTokens.add(output.token);
      }
    });

    // Only dispatch if we actually have unregistered tokens to fetch
    if (unregisteredTokens.size > 0) {
      dispatch(unregisteredTokensDownloadRequested(Array.from(unregisteredTokens)));
    }
  }, [data, registeredTokens, dispatch]);

  const getTokenSymbol = (tokenId) => {
    // Check if it's explicitly the native token UID
    if (tokenId === constants.NATIVE_TOKEN_UID) {
      return constants.DEFAULT_NATIVE_TOKEN_CONFIG.symbol;
    }

    const token = registeredTokens.find(t => t.uid === tokenId);
    if (token) {
      return token.symbol;
    }

    // We return '?' as a fallback for tokens that are not yet loaded or recognized
    // This should be temporary until the token details are fetched
    // The unregisteredTokensDownloadRequested action should be loading these details
    return '?';
  };

  const formatValue = (value, tokenId) => {
    if (value == null) {
      return '-';
    }

    // Check if the token is an NFT using the helpers utility
    const isNFT = tokenId && helpers.isTokenNFT(tokenId, tokenMetadata);
    
    return numberUtils.prettyValue(value, isNFT ? 0 : undefined);
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
                {formatValue(input?.value, input?.token)} {getTokenSymbol(input?.token)}
              </div>
            </div>
            <div className="text-monospace">
              {truncateTxId(input?.txId)} ({input?.index})
              {input?.txId && (
                <CopyButton text={input.txId} />
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
                {formatValue(output?.value, output?.token)} {getTokenSymbol(output?.token)}
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
                  {output.data}
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
                  <CopyButton text={data.data.changeAddress} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>
      <div className="modal-footer border-0">
        <button type="button" className="btn btn-secondary" onClick={handleReject} data-dismiss="modal">{t`Reject`}</button>
        <button type="button" className="btn btn-hathor" onClick={handleAccept}>{t`Accept Transaction`}</button>
      </div>
    </>
  );
} 
