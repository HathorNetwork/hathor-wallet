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
 * which includes 'deposit', 'withdrawal', 'grant_authority', and 'invoke_authority'.
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
  [NanoContractActionType.INVOKE_AUTHORITY]: t`${tokenSymbol} Invoke Authority`,
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

  // Handle case where tokens is undefined or null
  const tokenMetadata = tokens && tokens[action.token];
  let tokenSymbol;

  if (tokenMetadata) {
    tokenSymbol = tokenMetadata.symbol;
  } else if (action.token === NATIVE_TOKEN_UID) {
    tokenSymbol = DEFAULT_NATIVE_TOKEN_CONFIG.symbol;
  } else {
    tokenSymbol = helpers.truncateText(action.token, 8, 4);
  }

  // For authority actions, include the authority type in the title
  if (action.type === NanoContractActionType.GRANT_AUTHORITY
    || action.type === NanoContractActionType.INVOKE_AUTHORITY) {
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
    // Handle undefined, null, or empty amounts
    if (amount === undefined || amount === null || amount === '') {
      return '0';
    }
    
    // Handle string amounts that might be empty or invalid
    if (typeof amount === 'string' && amount.trim() === '') {
      return '0';
    }
    
    try {
      return hathorLib.numberUtils.prettyValue(amount, isNft ? 0 : decimalPlaces);
    } catch (error) {
      console.warn('Error formatting amount:', amount, error);
      return '0';
    }
  };

  // Check if this is an authority action
  const isAuthorityAction = action.type === NanoContractActionType.GRANT_AUTHORITY 
    || action.type === NanoContractActionType.INVOKE_AUTHORITY;

  // For authority actions, split the title to show authority type
  const titleParts = isAuthorityAction && title.includes(':') ? title.split(':') : null;

  return (
    <div className="d-flex align-items-center p-3 border-bottom">
      <div className="mr-3">
        {action.type === NanoContractActionType.DEPOSIT ? (
          <i className="fa fa-arrow-up text-success"></i>
        ) : action.type === NanoContractActionType.WITHDRAWAL ? (
          <i className="fa fa-arrow-down text-primary"></i>
        ) : action.type === NanoContractActionType.GRANT_AUTHORITY ? (
          <i className="fa fa-key text-warning"></i>
        ) : action.type === NanoContractActionType.INVOKE_AUTHORITY ? (
          <i className="fa fa-unlock text-info"></i>
        ) : (
          <i className="fa fa-question-circle text-muted"></i>
        )}
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
        
        {/* Grant Authority Address */}
        {action.type === NanoContractActionType.GRANT_AUTHORITY 
          && (action.authorityAddress || action.address) && (
          <div className="mt-2">
            <small className="text-muted d-block">{t`Address to send a new Authority:`}</small>
            <div className="text-monospace">
              {action.authorityAddress || action.address}
              <button 
                className="btn btn-link btn-sm p-0 ml-2" 
                onClick={() => navigator.clipboard.writeText(action.authorityAddress || action.address)}
              >
                <i className="fa fa-copy"></i>
              </button>
            </div>
          </div>
        )}
        
        {/* Invoke Authority Address */}
        {action.type === NanoContractActionType.INVOKE_AUTHORITY 
          && (action.authorityAddress || action.address) && (
          <div className="mt-2">
            <small className="text-muted d-block">{t`To Address:`}</small>
            <div className="text-monospace">
              {action.authorityAddress || action.address}
              <button 
                className="btn btn-link btn-sm p-0 ml-2" 
                onClick={() => navigator.clipboard.writeText(action.authorityAddress || action.address)}
              >
                <i className="fa fa-copy"></i>
              </button>
            </div>
          </div>
        )}
        
        {/* Regular address for other actions */}
        {action.type !== NanoContractActionType.GRANT_AUTHORITY
          && action.type !== NanoContractActionType.INVOKE_AUTHORITY
          && action.address && (
          <div className="mt-2">
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
      
      {/* Only show amount for deposit/withdrawal actions */}
      {action.type !== NanoContractActionType.GRANT_AUTHORITY
        && action.type !== NanoContractActionType.INVOKE_AUTHORITY
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
  
  // A callback to check if the action token is an NFT
  const isNft = useCallback(
    (token) => helpers.isTokenNFT(token, tokenMetadata || {}),
    [tokenMetadata]
  );
  
  // A callback to retrieve the action title by its token symbol or hash
  const getTitle = useCallback(
    (action) => getActionTitle(tokens || {}, action),
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
              isNft={isNft(action.token)}
              title={getTitle(action)}
            />
          ))}
        </div>
      </div>
    </>
  );
} 
