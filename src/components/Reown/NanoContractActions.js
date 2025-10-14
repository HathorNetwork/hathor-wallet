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
 * @param {Array<{ uid: string, symbol: string, name: string }>} tokens Array of
 * registered and unregistered tokens with {uid, name, symbol}
 * @param {Array<{ uid: string, symbol: string, name: string }>} registeredTokens Array of
 * registered tokens only
 * @param {Object} action An action object
 *
 * @returns {JSX.Element} A formatted title to be used in the action card
 */
const getActionTitle = (tokens, registeredTokens, action) => {
  if (!action?.token) {
    return <span></span>;
  }

  // Find the token in all tokens (registered + unregistered)
  const token = tokens[action.token];
  let tokenSymbol;
  let title;

  if (token) {
    tokenSymbol = token.symbol;
  } else if (action.token === NATIVE_TOKEN_UID) {
    tokenSymbol = DEFAULT_NATIVE_TOKEN_CONFIG.symbol;
  }

  if (!tokenSymbol) {
    return <span></span>;
  }

  // Check if token is registered
  const isRegistered = action.token === NATIVE_TOKEN_UID || registeredTokens[action.token];

  // Create symbol with info icon for unregistered tokens
  const infoElement = (
    <i
    className="fa fa-info-circle ml-1"
    style={{ cursor: 'pointer', color: 'black' }}
    title={`Unregistered token\n${token.name} (${token.symbol})\n${action.token}`}
  />
  );

  title = actionTitleMap(tokenSymbol)[action.type];

  return (
    <span>
      {title}
      {!isRegistered && infoElement}
    </span>
  );
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
      return '';
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

  return (
    <div className="d-flex align-items-center p-3 border-bottom">
      <div className="mr-3">
        <i className={getActionIcon(action.type)}></i>
      </div>
      <div className="flex-grow-1">
        {/* Title with authority type handling */}
        <div className="d-flex justify-content-between align-items-center">
          <div className="font-weight-bold">{title}</div>
          {isAuthorityAction && <div className="font-weight-bold text-muted">{action.authority}</div>}
        </div>

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
          )
        }

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
export function NanoContractActions({ ncActions }) {
  if (!ncActions || ncActions.length < 1) {
    return null;
  }

  const tokenMetadata = useSelector((state) => state.tokenMetadata);
  const registeredTokens = useSelector((state) => state.tokens);
  const unregisteredTokens = useSelector((state) => state.unregisteredTokens);

  // Create a map to use because the registeredTokens is an array
  const registeredMap = Object.fromEntries(
    registeredTokens.map((t) => [t.uid, t])
  );

  // A callback to check if the action token is an NFT
  const isNft = useCallback(
    (token) => helpers.isTokenNFT(token, tokenMetadata || {}),
    [tokenMetadata]
  );

  // A callback to retrieve the action title by its token symbol or hash
  const getTitle = useCallback(
    (action) => getActionTitle({...unregisteredTokens.tokensMap, ...registeredMap}, registeredMap, action),
    [registeredTokens, unregisteredTokens, registeredMap]
  );

  return (
    <>
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
