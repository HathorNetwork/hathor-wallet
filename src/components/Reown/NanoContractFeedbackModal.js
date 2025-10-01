/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { useSelector, useDispatch } from 'react-redux';
import { types, unregisteredTokensClean } from '../../actions';
import { FeedbackModal } from './FeedbackModal';
import { constants } from '@hathor/wallet-lib';
import tokens from '../../utils/tokens';

export const MODAL_ID = 'nanoContractFeedbackModal';

/**
 * Component that shows a modal with feedback for nano contract transactions
 * Shows loading, success or error message and provides retry option on failure
 */
export function NanoContractFeedbackModal({ isError, isLoading = true, onClose, manageDomLifecycle }) {
  const dispatch = useDispatch();
  const unregisteredTokens = useSelector((state) => state.unregisteredTokens);

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
    onClose();
  };

  const renderUnregisteredTokensComponent = () => {
    if (!hasUnregisteredTokens) return null;

    const many = unregisteredTokensList.length > 1;

    return (
      <div className="mt-3 p-3 border rounded bg-light">
        <p className="text-muted small mb-3">
          {t`There ${many ? `are ${unregisteredTokensList.length}` : 'is 1'} unregistered token${many ? 's' : ''} in this transaction. Do you want to register ${many ? 'them' : 'it'}?`}
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
      onClose={hasUnregisteredTokens ? handleClose : onClose}
      manageDomLifecycle={manageDomLifecycle}
      titles={{
        loading: t`Processing Transaction`,
        error: t`Transaction Failed`,
        success: t`Transaction Successful`
      }}
      messages={{
        loading: t`Processing nano contract transaction...`,
        error: t`There was an error sending the nano contract transaction. Would you like to try again?`,
        success: t`The nano contract transaction was sent successfully.`
      }}
      retryAction={types.REOWN_NEW_NANOCONTRACT_RETRY}
      retryDismissAction={types.REOWN_NEW_NANOCONTRACT_RETRY_DISMISS}
      extraComponent={renderUnregisteredTokensComponent()}
      customButtons={renderCustomButtons()}
    />
  );
} 
