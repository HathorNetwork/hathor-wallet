/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useCallback } from 'react';
import { t } from 'ttag';
import { useSelector } from 'react-redux';
import tokensUtils from '../../utils/tokens';
import helpers from '../../utils/helpers';
import hathorLib from '@hathor/wallet-lib';
import { DEFAULT_NATIVE_TOKEN_CONFIG, NATIVE_TOKEN_UID } from '@hathor/wallet-lib/lib/constants';

/**
 * It returns the title template for each action type,
 * which is either 'deposit' or 'withdrawal'.
 *
 * @param {string} tokenSymbol The token symbol fetched from metadata,
 * or a shortened token hash.
 *
 * @returns {string} A title template by action type.
 */
const actionTitleMap = (tokenSymbol) => ({
  deposit: t`${tokenSymbol} Deposit`,
  withdrawal: t`${tokenSymbol} Withdrawal`,
});

/**
 * Get action title depending on the action type.
 * @param {Object} tokens A map of token metadata by token uid
 * @param {Object} action An action object
 *
 * @returns {string} A formatted title to be used in the action card
 */
const getActionTitle = (tokens, action) => {
  if (!action?.token) {
    return '';
  }

  // If it's HTR, use HTR as the symbol
  if (action.token === NATIVE_TOKEN_UID) {
    return actionTitleMap(DEFAULT_NATIVE_TOKEN_CONFIG.symbol)[action.type];
  }

  // If we have token metadata, use its symbol
  if (tokens && tokens[action.token]?.symbol) {
    return actionTitleMap(tokens[action.token].symbol)[action.type];
  }

  // Fallback to truncated token ID
  return actionTitleMap(helpers.truncateText(action.token, 8, 4))[action.type];
};

/**
 * Component that displays a single action item
 */
const ActionItem = ({ action, isNft, title }) => {
  const decimalPlaces = useSelector((state) => state.serverInfo.decimalPlaces);

  const formatAmount = (amount) => {
    // Convert to BigInt if it's not already
    const bigIntAmount = typeof amount === 'bigint' ? amount : BigInt(amount);
    return hathorLib.numberUtils.prettyValue(bigIntAmount, isNft ? 0 : decimalPlaces);
  };

  return (
    <div className="d-flex align-items-center p-3 border-bottom">
      <div className="mr-3">
        {action.type === 'deposit' ? (
          <i className="fa fa-arrow-up text-success"></i>
        ) : (
          <i className="fa fa-arrow-down text-primary"></i>
        )}
      </div>
      <div className="flex-grow-1">
        <div className="font-weight-bold">{title}</div>
        {action.address && (
          <div>
            <small className="text-muted d-block">{t`To Address:`}</small>
            <div className="text-monospace">
              {action.address}
              <button 
                className="btn btn-link btn-sm p-0 ml-2" 
                onClick={() => navigator.clipboard.writeText(action.address)}
              >
                <i className="fa fa-copy"></i>
              </button>
            </div>
          </div>
        )}
      </div>
      <div className="text-right">
        <span className="font-weight-bold">
          {formatAmount(action.amount)}
        </span>
      </div>
    </div>
  );
};

/**
 * Component that shows the list of nano contract actions
 */
export function NanoContractActions({ ncActions, tokens, error }) {
  if (!ncActions || ncActions.length < 1) {
    return null;
  }

  const tokenMetadata = useSelector((state) => state.tokenMetadata);
  // A callback to retrieve the action title by its token symbol of hash.
  const getTitle = useCallback(
    (action) => getActionTitle(tokens, action),
    [tokens]
  );

  return (
    <>
      <h6 className="mb-3 mt-3">{t`Action List`}</h6>
      {error && (
        <div className="alert alert-danger d-flex align-items-center" role="alert">
          <i className="fa fa-exclamation-circle mr-2"></i>
          <span>{error}</span>
        </div>
      )}
      <div className="card">
        <div className="card-body p-0">
          {ncActions.map((action, index) => (
            <ActionItem
              key={index}
              action={action}
              isNft={false}
              title={getTitle(action)}
            />
          ))}
        </div>
      </div>
    </>
  );
} 
