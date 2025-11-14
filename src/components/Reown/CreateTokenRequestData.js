/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import hathorLib from '@hathor/wallet-lib';

/**
 * Component for displaying a single token parameter
 */
const TokenParameter = ({ label, value, isAddress = false, isBoolean = false }) => {
  if (value === undefined || value === null) return null;

  const renderValue = () => {
    if (isBoolean) {
      return (
        <span className={`badge ${value ? 'badge-success' : 'badge-secondary'}`}>
          {value ? t`Yes` : t`No`}
        </span>
      );
    }

    if (isAddress && value) {
      return (
        <div className="d-flex align-items-center">
          <code className="text-monospace small flex-grow-1" style={{ wordBreak: 'break-all' }}>
            {value}
          </code>
          <button
            className="btn btn-link btn-sm p-0 ml-2"
            onClick={() => navigator.clipboard.writeText(value)}
            title={t`Copy to clipboard`}
          >
            <i className="fa fa-copy"></i>
          </button>
        </div>
      );
    }

    return <span>{value}</span>;
  };

  return (
    <div className="mb-3">
      <div className="d-flex justify-content-between align-items-start">
        <strong className="text-muted small text-uppercase">{label}</strong>
      </div>
      <div className="mt-1">
        {renderValue()}
      </div>
    </div>
  );
};

/**
 * Component for displaying Token creation data
 * 
 * @param {Object} data The token data to be displayed
 */
export default function CreateTokenRequestData({ data }) {
  /**
   * Format token amount with proper decimal places
   */
  const formatAmount = (amount) => {
    try {
      if (amount === undefined || amount === null) return null;
      return hathorLib.numberUtils.prettyValue(amount);
    } catch (error) {
      console.error('Error formatting amount:', error);
      return amount.toString();
    }
  };

  /**
   * Check if token has mint authority
   */
  const hasMintAuthority = () => {
    return data.createMint === true || data.mintAuthorityAddress;
  };

  /**
   * Check if token has melt authority
   */
  const hasMeltAuthority = () => {
    return data.createMelt === true || data.meltAuthorityAddress;
  };

  /**
   * Check if there are additional settings to show
   */
  const hasAdditionalSettings = () => {
    return data.address ||
      data.changeAddress !== undefined ||
      data.allowExternalMintAuthorityAddress !== undefined ||
      data.allowExternalMeltAuthorityAddress !== undefined ||
      data.data !== undefined;
  };

  if (!data || Object.keys(data).length === 0) {
    return (
      <div className="text-center text-muted py-3">
        <i className="fa fa-info-circle mb-2" style={{ fontSize: '2rem' }}></i>
        <p>{t`No token data available.`}</p>
      </div>
    );
  }

  return (
    <div className="token-creation-data">
      {/* Basic Token Information */}
      <div className="mb-4">
        <TokenParameter label={t`Name`} value={data.name} />
        <TokenParameter label={t`Symbol`} value={data.symbol} />
        <TokenParameter label={t`Amount`} value={formatAmount(data.amount)} />
      </div>

      {/* Authority Settings */}
      {(hasMintAuthority() || hasMeltAuthority()) && (
        <div className="mb-4">
          {hasMintAuthority() && (
            <div className="mb-3">
              <TokenParameter label={t`Create mint authority?`} value={data.createMint} isBoolean />
              {data.mintAuthorityAddress && (
                <TokenParameter
                  label={t`Mint Authority Address`}
                  value={data.mintAuthorityAddress}
                  isAddress
                />
              )}
            </div>
          )}

          {hasMeltAuthority() && (
            <div className="mb-3">
              <TokenParameter label={t`Create melt authority?`} value={data.createMelt} isBoolean />
              {data.meltAuthorityAddress && (
                <TokenParameter
                  label={t`Melt Authority Address`}
                  value={data.meltAuthorityAddress}
                  isAddress
                />
              )}
            </div>
          )}
        </div>
      )}

      {/* Additional Settings */}
      {hasAdditionalSettings() && (
        <div className="mb-4">
          <TokenParameter label={t`Address`} value={data.address} isAddress />
          <TokenParameter label={t`Change Address`} value={data.changeAddress} isAddress />
          <TokenParameter
            label={t`Allow External Mint Authority Address`}
            value={data.allowExternalMintAuthorityAddress}
            isBoolean
          />
          <TokenParameter
            label={t`Allow External Melt Authority Address`}
            value={data.allowExternalMeltAuthorityAddress}
            isBoolean
          />
          {data.data && (
            <TokenParameter
              label={t`Data`}
              value={typeof data.data === 'string' ? data.data : JSON.stringify(data.data)}
            />
          )}
        </div>
      )}
    </div>
  );
} 
