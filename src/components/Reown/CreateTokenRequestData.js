/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import hathorLib from '@hathor/wallet-lib';

const DEFAULT_TOKEN_SYMBOL = hathorLib.constants.DEFAULT_NATIVE_TOKEN_CONFIG.symbol;

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
          <code className="text-monospace small flex-grow-1" style={{ wordBreak: 'break-all', color: 'inherit' }}>
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
    <div className="token-param d-flex justify-content-between align-items-center py-2">
      <span className="text-muted small">{label}</span>
      <span>{renderValue()}</span>
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
 * Renders translated values for token version
 * @param {TokenVersion} version
 */
function formatTokenVersion(version) {
  const versionMap = {
    [hathorLib.TokenVersion.FEE]: t`Fee`,
    [hathorLib.TokenVersion.DEPOSIT]: t`Deposit`,
  };
  return versionMap[version] || t`Unknown`;
}

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
      <TokenParameter label={t`Name`} value={data.name} />
      <TokenParameter label={t`Symbol`} value={data.symbol} />
      <TokenParameter label={t`Amount`} value={formatAmount(data.amount)} />
      <TokenParameter label={t`Type`} value={formatTokenVersion(data.version)} />

      {/* Authority Settings */}
      {hasMintAuthority() && (
        <>
          <TokenParameter label={t`Create mint authority?`} value={data.createMint} isBoolean />
          {data.mintAuthorityAddress && (
            <TokenParameter
              label={t`Mint Authority Address`}
              value={data.mintAuthorityAddress}
              isAddress
            />
          )}
        </>
      )}
      {hasMeltAuthority() && (
        <>
          <TokenParameter label={t`Create melt authority?`} value={data.createMelt} isBoolean />
          {data.meltAuthorityAddress && (
            <TokenParameter
              label={t`Melt Authority Address`}
              value={data.meltAuthorityAddress}
              isAddress
            />
          )}
        </>
      )}

      {/* Additional Settings */}
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

      {/* Fee Fields */}
      <TokenParameter
        label={t`Contract pays fees?`}
        value={data.contractPaysFees}
        isBoolean
      />
      <TokenParameter
        label={t`Contract pays token deposit?`}
        value={data.contractPaysTokenDeposit}
        isBoolean
      />
      {data.deposit && (
        <TokenParameter
          label={t`Deposit`}
          value={`${formatAmount(data.deposit)} ${DEFAULT_TOKEN_SYMBOL}`}
        />
      )}
      {data.fee !== undefined && data.fee !== null && (
        <TokenParameter
          label={t`Network Fee`}
          value={data.fee ? `${formatAmount(data.fee)} ${DEFAULT_TOKEN_SYMBOL}` : '-'}
        />
      )}
    </div>
  );
} 
