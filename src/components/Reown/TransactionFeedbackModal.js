/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { useSelector, useDispatch } from 'react-redux';
import { types, unregisteredTokensClean, setReownError } from '../../actions';
import { FeedbackModal } from './FeedbackModal';
import tokens from '../../utils/tokens';

export const MODAL_ID = 'transactionFeedbackModal';

/**
 * Component that shows a modal with feedback for transactions
 * Shows loading, success or error message and provides retry option on failure
 */
export function TransactionFeedbackModal({ isError, isLoading = true, errorMessage, onClose, manageDomLifecycle }) {
  const dispatch = useDispatch();
  const unregisteredTokens = useSelector((state) => state.unregisteredTokens);
  const errorDetails = useSelector((state) => state.reown.error);

  // Get unregistered tokens from tokensMap
  const unregisteredTokensList = Object.values(unregisteredTokens.tokensMap || {});

  const hasUnregisteredTokens = !isLoading && !isError && unregisteredTokensList.length > 0;

  const handleRegisterTokens = () => {
    // Register all unregistered tokens
    unregisteredTokensList.forEach(token => {
      tokens.addToken(token.uid, token.name, token.symbol);
    });

    // Clean unregistered tokens state
    dispatch(unregisteredTokensClean());
    onClose();
  };

  const handleClose = () => {
    // Clean unregistered tokens state
    dispatch(unregisteredTokensClean());
    // Clear error state
    dispatch(setReownError(null));
    onClose();
  };

  const renderUnregisteredTokensComponent = () => {
    if (!hasUnregisteredTokens) return null;

    const many = unregisteredTokensList.length > 1;
    const message = many
      ? t`There are ${unregisteredTokensList.length} unregistered tokens in this transaction. Do you want to register them?`
      : t`There is 1 unregistered token in this transaction. Do you want to register it?`;

    return (
      <div className="mt-3 p-3 border rounded bg-light">
        <p className="text-muted small mb-3">
          {message}
        </p>
        {unregisteredTokensList.map(token => (
          <div key={token.uid} className="mb-2 p-2 border rounded bg-white">
            <div className="font-weight-bold">{token.name}</div>
            <div className="text-muted small">{token.symbol}</div>
            <div className="text-monospace small" style={{ fontSize: '0.8rem' }}>
              {token.uid}
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderCustomButtons = () => {
    if (!hasUnregisteredTokens) return null;

    return (
      <>
        <button type="button" className="btn btn-secondary" onClick={handleClose}>
          {t`Close`}
        </button>
        <button type="button" className="btn btn-hathor" onClick={handleRegisterTokens}>
          {t`Register Tokens`}
        </button>
      </>
    );
  };

  return (
    <FeedbackModal
      modalId={MODAL_ID}
      isError={isError}
      isLoading={isLoading}
      onClose={handleClose}
      manageDomLifecycle={manageDomLifecycle}
      titles={{
        loading: t`Processing Transaction`,
        error: t`Transaction Failed`,
        success: t`Transaction Successful`
      }}
      messages={{
        loading: t`Processing transaction...`,
        error: errorMessage || t`There was an error sending the transaction. Would you like to try again?`,
        success: t`The transaction was sent successfully.`
      }}
      retryAction={types.REOWN_SEND_TX_RETRY}
      retryDismissAction={types.REOWN_SEND_TX_RETRY_DISMISS}
      extraComponent={renderUnregisteredTokensComponent()}
      customButtons={renderCustomButtons()}
      errorDetails={errorDetails}
    />
  );
} 