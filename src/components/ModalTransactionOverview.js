/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useState } from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import PropTypes from 'prop-types';
import hathorLib from '@hathor/wallet-lib';
import ReactLoading from 'react-loading';
import { useSelector } from 'react-redux';
import helpers from '../utils/helpers';
import { TOKEN_FEE_RFC_URL, colors } from '../constants';
import SendTxHandler from './SendTxHandler';

const MODAL_ID = 'transactionOverviewModal';

/**
 * Modal showing transaction summary before confirmation.
 * Handles the full flow: overview → sending → success/error.
 *
 * Phases:
 * - 'review': Shows outputs, fee, PIN input, and confirm button
 * - 'sending': Preparing and mining the transaction
 * - 'error': Shows error message with retry option
 */
function ModalTransactionOverview({
  outputs,
  totalFee,
  decimalPlaces,
  prepareSendTransaction,
  onSendSuccess,
  onCancel,
  manageDomLifecycle,
}) {
  const [pin, setPin] = useState('');
  const [phase, setPhase] = useState('review');
  const [errorMessage, setErrorMessage] = useState('');
  const [preparedTx, setPreparedTx] = useState(null);
  const tokenMetadata = useSelector((state) => state.tokenMetadata);

  useEffect(() => {
    manageDomLifecycle(`#${MODAL_ID}`);
  }, [manageDomLifecycle]);

  const fee = typeof totalFee === 'bigint' ? totalFee : BigInt(totalFee || 0);
  const hasAnyFee = fee > 0n;

  const getDecimalPlaces = (tokenUid) => {
    return helpers.isTokenNFT(tokenUid, tokenMetadata) ? 0 : decimalPlaces;
  };

  /**
   * Format total payment string: "0.03 HTR + 1.00 FBT"
   */
  const formatTotalPayment = () => {
    const tokenTotals = new Map();
    for (const output of outputs) {
      if (output.type === 'data' || output.isChangeOutput) continue;
      const uid = output.tokenUid;
      const existing = tokenTotals.get(uid);
      if (existing) {
        existing.total += BigInt(output.value);
      } else {
        tokenTotals.set(uid, { symbol: output.tokenSymbol, total: BigInt(output.value) });
      }
    }

    // Merge fee into HTR total
    if (hasAnyFee) {
      const htrUid = hathorLib.constants.NATIVE_TOKEN_UID;
      const existing = tokenTotals.get(htrUid);
      if (existing) {
        existing.total += fee;
      } else {
        tokenTotals.set(htrUid, { symbol: 'HTR', total: fee });
      }
    }

    const parts = [];
    for (const [uid, { symbol, total }] of tokenTotals) {
      parts.push(`${hathorLib.numberUtils.prettyValue(total, getDecimalPlaces(uid))} ${symbol}`);
    }
    return parts.join(' + ');
  };

  const openFeeRFC = (e) => {
    e.preventDefault();
    helpers.openExternalURL(TOKEN_FEE_RFC_URL);
  };

  const handleCancel = () => {
    $(`#${MODAL_ID}`).modal('hide');
    setPin('');
    onCancel();
  };

  const handleConfirm = async () => {
    setPhase('sending');
    setErrorMessage('');

    try {
      const tx = await prepareSendTransaction(pin);
      setPreparedTx(tx);
    } catch (e) {
      setErrorMessage(e.message || t`Error preparing transaction.`);
      setPhase('error');
    }
  };

  const handleTxSuccess = (tx) => {
    // Prevent manageDomLifecycle's hidden handler from destroying the next modal
    $(`#${MODAL_ID}`).off('hidden.bs.modal');
    $(`#${MODAL_ID}`).modal('hide');
    $('.modal-backdrop').remove();
    $('body').removeClass('modal-open').css('padding-right', '');
    onSendSuccess(tx);
  };

  const handleTxError = (message) => {
    setErrorMessage(message || t`Error sending transaction.`);
    setPreparedTx(null);
    setPhase('error');
  };

  const handleRetry = () => {
    setPreparedTx(null);
    setErrorMessage('');
    setPin('');
    setPhase('review');
  };

  const handlePinChange = (e) => {
    const value = e.target.value.replace(/\D/g, '').slice(0, 6);
    setPin(value);
  };

  // --- Render helpers for the review phase ---

  const renderOutput = (output, idx) => {
    if (output.type === 'data') {
      return (
        <div
          key={`data-${idx}`}
          className="d-flex align-items-center"
          style={{ borderBottom: '1px solid #e9ecef', padding: '10px 0', fontSize: '14px' }}
        >
          <i
            className="fa fa-file-text-o"
            style={{ color: '#8e8e93', marginRight: '8px', width: '16px', textAlign: 'center' }}
          />
          <span style={{ color: '#8e8e93' }}>
            {t`Data output:`} {output.data}
          </span>
        </div>
      );
    }

    const isChange = output.isChangeOutput;
    const arrowClass = isChange ? 'fa-long-arrow-down' : 'fa-long-arrow-up';
    const arrowColor = isChange ? '#28a745' : '#dc3545';

    return (
      <div
        key={idx}
        className="d-flex justify-content-between align-items-center"
        style={{ borderBottom: '1px solid #e9ecef', padding: '10px 0' }}
      >
        <span
          className="text-monospace"
          style={{ wordBreak: 'break-all', fontSize: '13px', minWidth: 0, flex: 1 }}
        >
          {output.address}
          {isChange && (
            <span style={{ color: '#8e8e93', fontWeight: 400, fontFamily: 'inherit' }}> ({t`change`})</span>
          )}
        </span>
        <span
          className="d-flex align-items-center"
          style={{
            fontWeight: 500,
            color: '#404040',
            marginLeft: '12px',
            whiteSpace: 'nowrap',
            fontSize: '14px',
          }}
        >
          {hathorLib.numberUtils.prettyValue(output.value, getDecimalPlaces(output.tokenUid))} {output.tokenSymbol}
          <i
            className={`fa ${arrowClass}`}
            style={{
              transform: 'rotate(45deg)',
              color: arrowColor,
              marginLeft: '10px',
              fontSize: '14px',
            }}
          />
        </span>
      </div>
    );
  };

  const renderNetworkFeeValue = () => {
    if (hasAnyFee) {
      return (
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#404040' }}>
          {hathorLib.numberUtils.prettyValue(fee, decimalPlaces)} HTR
        </span>
      );
    }

    return (
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          backgroundColor: '#EEFBEB',
          color: '#2E701F',
          fontSize: '12px',
          fontWeight: 500,
          padding: '4px 14px 4px 12px',
          borderRadius: '100px',
        }}
      >
        <i className="fa fa-check" style={{ fontSize: '10px' }} />
        {t`No fee`}
      </span>
    );
  };

  const renderFeeExplanation = () => {
    if (!hasAnyFee) return null;

    return (
      <div style={{ fontSize: '10px', color: '#8e8e93', marginBottom: '16px' }}>
        {t`This fee is calculated using fee-based tokens outputs and data outputs.`}
        <br />
        <a href="#" onClick={openFeeRFC} style={{ color: '#8f37ff', fontWeight: 700 }}>
          {t`Read more about fees`}
        </a>
        .
      </div>
    );
  };

  const renderTotalPayment = () => {
    return (
      <div className="d-flex justify-content-between mb-4">
        <span style={{ fontSize: '14px', fontWeight: 600 }}>{t`You will pay`}</span>
        <span style={{ fontSize: '14px', fontWeight: 500, color: '#404040' }}>
          {formatTotalPayment()}
        </span>
      </div>
    );
  };

  // --- Phase-specific body and footer ---

  const renderReviewBody = () => (
    <>
      {/* Flat output list: regular outputs, then change, then data */}
      <div className="mb-3">
        {[
          ...outputs.filter(o => o.type !== 'data' && !o.isChangeOutput),
          ...outputs.filter(o => o.type !== 'data' && o.isChangeOutput),
          ...outputs.filter(o => o.type === 'data'),
        ].map((output, idx) => renderOutput(output, idx))}
      </div>

      <div className="mb-4" />

      {/* Network fee */}
      <div className="d-flex justify-content-between align-items-center mb-2">
        <span style={{ fontSize: '14px', fontWeight: 600 }}>
          {t`Network fee`}{' '}
          <span style={{ color: '#57606a', fontWeight: 400 }}>({t`paid in HTR`})</span>
        </span>
        {renderNetworkFeeValue()}
      </div>

      {renderFeeExplanation()}
      {renderTotalPayment()}

      <div className="mb-4" />

      {/* PIN input */}
      <div className="form-group">
        <label htmlFor="pinInput">{t`Pin* (6 digit password)`}</label>
        <input
          type="password"
          className="form-control"
          id="pinInput"
          value={pin}
          onChange={handlePinChange}
          maxLength={6}
          autoFocus
          autoComplete="off"
        />
      </div>
    </>
  );

  const renderSendingBody = () => (
    <div className="d-flex flex-column align-items-center py-4">
      <ReactLoading type="spin" color={colors.purpleHathor} width={32} height={32} />
      <p className="mt-3 mb-0">{t`Sending transaction...`}</p>
      {preparedTx && (
        <div style={{ display: 'none' }}>
          <SendTxHandler
            sendTransaction={preparedTx}
            onSendSuccess={handleTxSuccess}
            onSendError={handleTxError}
          />
        </div>
      )}
    </div>
  );

  const renderErrorBody = () => (
    <div className="py-3">
      <div className="d-flex align-items-center mb-3">
        <i className="fa fa-exclamation-circle text-danger mr-2" style={{ fontSize: '20px' }} />
        <strong>{t`Transaction failed`}</strong>
      </div>
      <p className="text-danger mb-0">{errorMessage}</p>
    </div>
  );

  const renderBody = () => {
    switch (phase) {
      case 'sending': return renderSendingBody();
      case 'error': return renderErrorBody();
      default: return renderReviewBody();
    }
  };

  const renderFooter = () => {
    if (phase === 'sending') {
      return null;
    }

    if (phase === 'error') {
      return (
        <>
          <button type="button" className="btn btn-secondary" onClick={handleCancel}>
            {t`Cancel`}
          </button>
          <button type="button" className="btn btn-hathor" onClick={handleRetry}>
            {t`Try again`}
          </button>
        </>
      );
    }

    return (
      <>
        <button type="button" className="btn btn-secondary" onClick={handleCancel}>
          {t`Cancel`}
        </button>
        <button
          type="button"
          className="btn btn-hathor"
          onClick={handleConfirm}
          disabled={pin.length !== 6}
        >
          {t`Confirm transfer`}
        </button>
      </>
    );
  };

  return (
    <div
      className="modal fade"
      id={MODAL_ID}
      tabIndex="-1"
      role="dialog"
      aria-labelledby="transactionOverviewModalLabel"
      aria-hidden="true"
      data-backdrop="static"
      data-keyboard="false"
    >
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="transactionOverviewModalLabel">
              {phase === 'error' ? t`Transaction failed` : t`Transaction overview`}
            </h5>
            {phase !== 'sending' && (
              <button type="button" className="close" onClick={handleCancel} aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            )}
          </div>
          <div className="modal-body">
            {renderBody()}
          </div>
          <div className="modal-footer">
            {renderFooter()}
          </div>
        </div>
      </div>
    </div>
  );
}

ModalTransactionOverview.propTypes = {
  outputs: PropTypes.arrayOf(
    PropTypes.oneOfType([
      PropTypes.shape({
        address: PropTypes.string.isRequired,
        value: PropTypes.any.isRequired,
        tokenUid: PropTypes.string.isRequired,
        tokenSymbol: PropTypes.string.isRequired,
        isChangeOutput: PropTypes.bool,
      }),
      PropTypes.shape({
        type: PropTypes.oneOf(['data']).isRequired,
        data: PropTypes.string.isRequired,
      }),
    ])
  ).isRequired,
  totalFee: PropTypes.any.isRequired,
  decimalPlaces: PropTypes.number.isRequired,
  prepareSendTransaction: PropTypes.func.isRequired,
  onSendSuccess: PropTypes.func.isRequired,
  onCancel: PropTypes.func.isRequired,
  manageDomLifecycle: PropTypes.func.isRequired,
};

export default ModalTransactionOverview;
