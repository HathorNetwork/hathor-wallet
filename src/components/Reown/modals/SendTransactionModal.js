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
import { unregisteredTokensStoreSuccess } from '../../../actions';
import { CopyButton } from '../../CopyButton';
import helpers from '../../../utils/helpers';

export function SendTransactionModal({ data, onAccept, onReject }) {
  const dispatch = useDispatch();
  const { tokenMetadata, tokens: registeredTokens, decimalPlaces } = useSelector((state) => ({
    tokenMetadata: state.tokenMetadata,
    tokens: state.tokens,
    decimalPlaces: state.serverInfo.decimalPlaces
  }));

  useEffect(() => {
    // Collect unregistered tokens from tokenDetails Map
    let unregisteredTokensMap = {};
    const tokenDetails = data?.data?.tokenDetails;
    if (tokenDetails) {
      unregisteredTokensMap = [...tokenDetails].reduce((acc, [uid, tokenDetail]) => {
        const tokenInfo = tokenDetail.tokenInfo;
        if (tokenInfo && !registeredTokens.find(t => t.uid === uid)) {
          acc[uid] = { ...tokenInfo, uid };
        }
        return acc;
      }, {});
    }

    // Dispatch success action with the unregistered tokens
    if (Object.keys(unregisteredTokensMap).length > 0) {
      dispatch(unregisteredTokensStoreSuccess(unregisteredTokensMap));
    }
  }, [data, registeredTokens, dispatch]);

  const isTokenRegistered = (tokenId) => {
    if (tokenId === constants.NATIVE_TOKEN_UID) {
      return true;
    }
    return !!registeredTokens.find(t => t.uid === tokenId);
  };

  const getTokenSymbol = (tokenId) => {
    // Check if it's explicitly the native token UID
    if (tokenId === constants.NATIVE_TOKEN_UID) {
      return constants.DEFAULT_NATIVE_TOKEN_CONFIG.symbol;
    }

    const token = registeredTokens.find(t => t.uid === tokenId);
    if (token) {
      return token.symbol;
    }

    const tokenInfo = getTokenInfo(tokenId);
    if (tokenInfo) {
      return tokenInfo.symbol;
    }

    // It should never get here but we return empty string as a fallback
    return '';
  };

  const getTokenInfo = (tokenId) => {
    const tokenDetails = data?.data?.tokenDetails;
    if (tokenDetails && tokenDetails.has(tokenId)) {
      return tokenDetails.get(tokenId).tokenInfo;
    }
    return null;
  };

  const renderTokenSymbol = (tokenId) => {
    const symbol = getTokenSymbol(tokenId);
    const isRegistered = isTokenRegistered(tokenId);

    if (isRegistered) {
      return symbol;
    }

    const tokenInfo = getTokenInfo(tokenId);
    if (!tokenInfo) {
      return symbol;
    }

    const tooltipText = `Unregistered token\n${tokenInfo.name} (${tokenInfo.symbol})\n${tokenId}`;

    return (
      <span>
        {symbol}
        <i
          className="fa fa-info-circle ml-1"
          style={{ cursor: 'pointer', color: 'black' }}
          title={tooltipText}
        />
      </span>
    );
  };

  const formatValue = (value, tokenId) => {
    if (value == null) {
      return '-';
    }

    // Check if the token is an NFT using the helpers utility
    const isNFT = tokenId && helpers.isTokenNFT(tokenId, tokenMetadata);

    return numberUtils.prettyValue(value, isNFT ? 0 : decimalPlaces);
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
                <strong>{t`Input`}  {index + 1}</strong>
              </div>
              <div>
                {formatValue(input?.value, input?.token)} {renderTokenSymbol(input?.token)}
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
                <strong>{t`Output`} {index + 1}</strong>
              </div>
              <div>
                {formatValue(output?.value, output?.token)} {renderTokenSymbol(output?.token)}
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

        {data?.data?.pushTx === false && (
          <p className="text-muted small mt-3 mb-0">
            {t`This transaction will only be built, not pushed to the network.`}
          </p>
        )}
      </div>
      <div className="modal-footer border-0">
        <button type="button" className="btn btn-secondary" onClick={handleReject} data-dismiss="modal">{t`Reject`}</button>
        <button type="button" className="btn btn-hathor" onClick={handleAccept}>{t`Accept Transaction`}</button>
      </div>
    </>
  );
} 
