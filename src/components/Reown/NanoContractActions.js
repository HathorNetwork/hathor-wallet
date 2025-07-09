/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useCallback } from 'react';
import { t } from 'ttag';
import { useSelector } from 'react-redux';
import helpers from '../../utils/helpers';
import hathorLib from '@hathor/wallet-lib';
import { constants, NanoContractActionType } from '@hathor/wallet-lib';
const { DEFAULT_NATIVE_TOKEN_CONFIG, NATIVE_TOKEN_UID } = constants;

/**
 * It returns the title template for each action type,
 * which includes 'deposit', 'withdrawal', 'grant_authority', and
 * 'acquire_authority'.
 *
 * @param {string} tokenSymbol The token symbol fetched from metadata,
 * or a shortened token hash.
 *
 * @returns {string} A title template by action type.
 */
const actionTitleMap = (tokenSymbol) => ({
  [NanoContractActionType.DEPOSIT]: t`${tokenSymbol} Deposit`,
  [NanoContractActionType.WITHDRAWAL]: t`${tokenSymbol} Withdrawal`,
  [NanoContractActionType.GRANT_AUTHORITY]: t`${tokenSymbol} Grant Authority`,
  [NanoContractActionType.ACQUIRE_AUTHORITY]: t`${tokenSymbol} Acquire Authority`,
});

/**
 * Get action title depending on the action type.
 * @param {Array} tokens Array of registered tokens with {uid, name, symbol}
 * @param {Object} action An action object
 *
 * @returns {string} A formatted title to be used in the action card
 */
const getActionTitle = (tokens, action) => {
  if (!action?.token) {
    return '';
  }

  // Find the token in the registered tokens array
  const registeredToken = tokens.find(t => t.uid === action.token);
  let tokenSymbol;

  if (registeredToken) {
    tokenSymbol = registeredToken.symbol;
  } else if (action.token === NATIVE_TOKEN_UID) {
    tokenSymbol = DEFAULT_NATIVE_TOKEN_CONFIG.symbol;
  }

  // For authority actions, include the authority type in the title
  if (action.type === NanoContractActionType.GRANT_AUTHORITY
    || action.type === NanoContractActionType.ACQUIRE_AUTHORITY) {
    const baseTitle = actionTitleMap(tokenSymbol)[action.type];
    return action.authority ? `${baseTitle}: ${action.authority}` : baseTitle;
  }

  return actionTitleMap(tokenSymbol)[action.type];
};

/**
 * Component that displays a single action item
 */
const ActionItem = ({ action, isNft, title }) => {
  const decimalPlaces = useSelector((state) => state.serverInfo.decimalPlaces);

  const formatAmount = (amount) => {
    try {
      return hathorLib.numberUtils.prettyValue(amount, isNft ? 0 : decimalPlaces);
    } catch (error) {
      console.warn('Error formatting amount:', amount, error);
      return '0';
    }
  };

  // Get the appropriate icon for the action type
  const getActionIcon = (actionType) => {
    const iconMap = {
      [NanoContractActionType.DEPOSIT]: 'fa fa-arrow-up text-success',
      [NanoContractActionType.WITHDRAWAL]: 'fa fa-arrow-down text-primary',
      [NanoContractActionType.GRANT_AUTHORITY]: 'fa fa-arrow-up text-success',
      [NanoContractActionType.ACQUIRE_AUTHORITY]: 'fa fa-arrow-down text-primary',
    };

    return iconMap[actionType] || 'fa fa-question-circle text-muted';
  };

  // Check if this is an authority action
  const isAuthorityAction = action.type === NanoContractActionType.GRANT_AUTHORITY
    || action.type === NanoContractActionType.ACQUIRE_AUTHORITY;

  // For authority actions, split the title to show authority type
  const titleParts = isAuthorityAction && title.includes(':') ? title.split(':') : null;

  return (
    <div className="d-flex align-items-center p-3 border-bottom">
      <div className="mr-3">
        <i className={getActionIcon(action.type)}></i>
      </div>
      <div className="flex-grow-1">
        {/* Title with authority type handling */}
        {isAuthorityAction && titleParts ? (
          <div className="d-flex justify-content-between align-items-center">
            <div className="font-weight-bold">{titleParts[0].trim()}</div>
            <div className="font-weight-bold text-muted">{titleParts[1].trim()}</div>
          </div>
        ) : (
          <div className="font-weight-bold">{title}</div>
        )}

        {/* WITHDRAWAL: Show only address (address to send the amount and create the output) */}
        {action.type === NanoContractActionType.WITHDRAWAL
          && action.address && (
            <div className="mt-2">
              <small className="text-muted d-block">{t`Address to send amount:`}</small>
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

        {/* DEPOSIT: Show address (to filter UTXOs) and changeAddress (change address) */}
        {action.type === NanoContractActionType.DEPOSIT && (
          <div className={`${(action.address || action.changeAddress) ? 'mt-2' : ''}`}>
            {action.address && (
              <div className="mb-2">
                <small className="text-muted d-block">{t`Address to filter UTXOs:`}</small>
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
            {action.changeAddress && (
              <div>
                <small className="text-muted d-block">{t`Change address:`}</small>
                <div className="text-monospace">
                  {action.changeAddress}
                  <button
                    className="btn btn-link btn-sm p-0 ml-2"
                    onClick={() => navigator.clipboard.writeText(action.changeAddress)}
                  >
                    <i className="fa fa-copy"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* GRANT_AUTHORITY: Show address (filter UTXOs) and authorityAddress (send authority) */}
        {action.type === NanoContractActionType.GRANT_AUTHORITY && (
          <div className={`${(action.address || action.authorityAddress) ? 'mt-2' : ''}`}>
            {action.address && (
              <div className="mb-2">
                <small className="text-muted d-block">{t`Address to filter UTXOs:`}</small>
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
            {action.authorityAddress && (
              <div>
                <small className="text-muted d-block">{t`Address to send new authority:`}</small>
                <div className="text-monospace">
                  {action.authorityAddress}
                  <button
                    className="btn btn-link btn-sm p-0 ml-2"
                    onClick={() => navigator.clipboard.writeText(action.authorityAddress)}
                  >
                    <i className="fa fa-copy"></i>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ACQUIRE_AUTHORITY: Show only address (send the authority and create the output) */}
        {action.type === NanoContractActionType.ACQUIRE_AUTHORITY && action.address && (
          <div className="mt-2">
            <small className="text-muted d-block">{t`Address to send authority:`}</small>
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

      {/* Only show amount for deposit/withdrawal actions */}
      {action.type !== NanoContractActionType.GRANT_AUTHORITY
        && action.type !== NanoContractActionType.ACQUIRE_AUTHORITY
        && action.amount != null && (
          <div className="text-right">
            <span className="font-weight-bold">
              {formatAmount(action.amount)}
            </span>
          </div>
        )}
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
  const registeredTokens = useSelector((state) => state.tokens);

  // A callback to check if the action token is an NFT
  const isNft = useCallback(
    (token) => helpers.isTokenNFT(token, tokenMetadata || {}),
    [tokenMetadata]
  );

  // A callback to retrieve the action title by its token symbol or hash
  const getTitle = useCallback(
    (action) => getActionTitle(registeredTokens || [], action),
    [registeredTokens]
  );

  return (
    <>
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
              isNft={isNft(action.token)}
              title={getTitle(action)}
            />
          ))}
        </div>
      </div>
    </>
  );
} 
