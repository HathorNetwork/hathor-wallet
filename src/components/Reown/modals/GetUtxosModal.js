/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useMemo } from 'react';
import { t } from 'ttag';
import { useSelector } from 'react-redux';
import { DAppInfo } from '../DAppInfo';
import hathorLib from '@hathor/wallet-lib';
import helpers from '../../../utils/helpers';

/**
 * Modal for confirming UTXO access requests from dApps.
 * Shows the filter parameters and UTXO summary, asks for user confirmation.
 */
export function GetUtxosModal({ data, onAccept, onReject }) {
  const { tokenMetadata, decimalPlaces } = useSelector((state) => ({
    tokenMetadata: state.tokenMetadata,
    decimalPlaces: state.serverInfo.decimalPlaces
  }));

  // The RPC handler transforms params and may use snake_case keys
  const rawParams = data.params || {};
  const params = {
    token: rawParams.token,
    maxUtxos: rawParams.maxUtxos || rawParams.max_utxos,
    filterAddress: rawParams.filterAddress || rawParams.filter_address,
    amountSmallerThan: rawParams.amountSmallerThan ?? rawParams.amount_smaller_than,
    amountBiggerThan: rawParams.amountBiggerThan ?? rawParams.amount_bigger_than,
    maximumAmount: rawParams.maximumAmount ?? rawParams.max_amount,
    onlyAvailableUtxos: rawParams.onlyAvailableUtxos ?? rawParams.only_available_utxos,
  };

  // UTXOs data from the wallet
  const utxos = data.utxos || {};

  // Get summary from UTXOs response - the RPC handler already provides totals
  const summary = useMemo(() => {
    // The getUtxos response includes total_amount_available and total_utxos_available
    // Individual UTXOs use `amount` property (not `value`)
    const totalQuantity = utxos.total_utxos_available != null
      ? Number(utxos.total_utxos_available)
      : (utxos.utxos?.length || 0);

    let totalAmount = 0;
    if (utxos.total_amount_available != null) {
      totalAmount = Number(utxos.total_amount_available);
    } else if (utxos.utxos) {
      for (const utxo of utxos.utxos) {
        totalAmount += Number(utxo.amount || 0);
      }
    }

    return { totalQuantity, totalAmount };
  }, [utxos]);

  /**
   * Format amount values for display
   */
  const formatAmount = (amount, tokenId) => {
    if (amount === undefined || amount === null) return null;
    const isNFT = tokenId && helpers.isTokenNFT(tokenId, tokenMetadata);
    return hathorLib.numberUtils.prettyValue(amount, isNFT ? 0 : decimalPlaces);
  };

  /**
   * Get token display name
   */
  const getTokenName = (tokenId) => {
    if (!tokenId || tokenId === hathorLib.constants.NATIVE_TOKEN_UID) {
      return 'HTR';
    }
    const metadata = tokenMetadata[tokenId];
    return metadata?.symbol || metadata?.name || tokenId.substring(0, 8) + '...';
  };

  // Check if any filter is set
  const hasFilters = params.token || params.maxUtxos || params.filterAddress ||
    params.amountSmallerThan !== undefined || params.amountBiggerThan !== undefined ||
    params.maximumAmount !== undefined || params.onlyAvailableUtxos !== undefined;

  return (
    <>
      <div className="modal-header">
        <h5 className="modal-title">{t`UTXOs Request`}</h5>
        <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={onReject}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
      <div className="modal-body">
        <DAppInfo dapp={data.dapp} />

        <p className="font-weight-bold mb-2">{t`Review your transaction from this dApp`}</p>
        <p className="text-muted small mb-4">{t`Stay vigilant and protect your data from potential phishing attempts.`}</p>

        {/* UTXOs Request Info Box */}
        <div className="bg-light p-3 rounded mb-4">
          <div className="d-flex align-items-start">
            <div className="mr-3">
              <i className="fa fa-database text-muted" style={{ fontSize: '1.5rem' }}></i>
            </div>
            <div>
              <strong>{t`UTXOs Request`}</strong>
              <p className="text-muted small mb-0">
                {t`This app is requesting access to your wallet's UTXOs (Unspent Transaction Outputs)`}
              </p>
            </div>
          </div>
        </div>

        {/* Request Parameters */}
        <div className="mb-4">
          <h6 className="font-weight-bold mb-3">{t`Request Parameters`}</h6>
          <div className="small">
            {params.token && (
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted">{t`Token:`}</span>
                <span>{getTokenName(params.token)}</span>
              </div>
            )}
            {params.maxUtxos && (
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted">{t`Max UTXOs:`}</span>
                <span>{params.maxUtxos}</span>
              </div>
            )}
            {params.filterAddress && (
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted">{t`Filter Address:`}</span>
                <span className="text-monospace text-truncate ml-2" style={{ maxWidth: '150px' }}>{params.filterAddress}</span>
              </div>
            )}
            {params.amountSmallerThan !== undefined && (
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted">{t`Amount smaller than:`}</span>
                <span>{formatAmount(params.amountSmallerThan, params.token)}</span>
              </div>
            )}
            {params.amountBiggerThan !== undefined && (
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted">{t`Amount bigger than:`}</span>
                <span>{formatAmount(params.amountBiggerThan, params.token)}</span>
              </div>
            )}
            {params.maximumAmount !== undefined && (
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted">{t`Maximum amount:`}</span>
                <span>{formatAmount(params.maximumAmount, params.token)}</span>
              </div>
            )}
            {params.onlyAvailableUtxos !== undefined && (
              <div className="d-flex justify-content-between py-1">
                <span className="text-muted">{t`Only available UTXOs:`}</span>
                <span>{params.onlyAvailableUtxos ? t`Yes` : t`No`}</span>
              </div>
            )}
            {!hasFilters && (
              <p className="text-muted mb-0">{t`No specific filters - all UTXOs will be returned`}</p>
            )}
          </div>
        </div>

        {/* UTXOs to be shared */}
        <div className="mb-4">
          <h6 className="font-weight-bold mb-3">{t`UTXOs to be shared`}</h6>
          <div className="small">
            <div className="d-flex justify-content-between py-1">
              <span className="text-muted">{t`Total quantity:`}</span>
              <span>{summary.totalQuantity}</span>
            </div>
            <div className="d-flex justify-content-between py-1">
              <span className="text-muted">{t`Total amount:`}</span>
              <span>{formatAmount(summary.totalAmount, params.token)} {getTokenName(params.token)}</span>
            </div>
          </div>
        </div>

        {/* Footer note */}
        <p className="text-muted small mb-0">
          {t`The app will receive information about your unspent transaction outputs. It cannot spend your funds without your approval.`}
        </p>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={onReject} data-dismiss="modal">{t`Reject`}</button>
        <button type="button" className="btn btn-hathor" onClick={onAccept}>{t`Share UTXOs Information`}</button>
      </div>
    </>
  );
}
