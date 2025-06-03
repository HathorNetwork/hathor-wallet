/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';
import hathorLib from '@hathor/wallet-lib';

/**
 * Component for displaying Token creation data
 * 
 * @param {Object} data The token data to be displayed
 */
export default function CreateTokenRequestData({ data }) {
  // Process the data to handle BigInt values
  const processedData = React.useMemo(() => {
    try {
      return JSONBigInt.stringify(data, 2);
    } catch (error) {
      console.error('Error stringifying token data:', error);
      return 'Error displaying token data. Please check console for details.';
    }
  }, [data]);

  /**
   * Format token amount with proper decimal places
   */
  const formatAmount = (amount) => {
    try {
      if (amount === undefined || amount === null) return 'N/A';
      return hathorLib.numberUtils.prettyValue(amount);
    } catch (error) {
      console.error('Error formatting amount:', error);
      return amount.toString();
    }
  };

  return (
    <div style={{ width: '100%' }}>
      {Object.keys(data).length > 0 ? (
        <div>
          {data.name && (
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>{t`Name`}</p>
              <p style={{ margin: 0 }}>{data.name}</p>
            </div>
          )}
          
          {data.symbol && (
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>{t`Symbol`}</p>
              <p style={{ margin: 0 }}>{data.symbol}</p>
            </div>
          )}
          
          {data.amount !== undefined && (
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>{t`Amount`}</p>
              <p style={{ margin: 0 }}>{formatAmount(data.amount)}</p>
            </div>
          )}
          
          {data.address && (
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>{t`Address`}</p>
              <p style={{ margin: 0, wordBreak: 'break-all' }}>{data.address}</p>
            </div>
          )}
          
          {data.mintAuthorityAddress && (
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>{t`Mint Authority Address`}</p>
              <p style={{ margin: 0, wordBreak: 'break-all' }}>{data.mintAuthorityAddress}</p>
            </div>
          )}
          
          {data.mintAuthorityIndex !== undefined && (
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>{t`Mint Authority Index`}</p>
              <p style={{ margin: 0 }}>{data.mintAuthorityIndex}</p>
            </div>
          )}
          
          {data.meltAuthorityAddress && (
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>{t`Melt Authority Address`}</p>
              <p style={{ margin: 0, wordBreak: 'break-all' }}>{data.meltAuthorityAddress}</p>
            </div>
          )}
          
          {data.meltAuthorityIndex !== undefined && (
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>{t`Melt Authority Index`}</p>
              <p style={{ margin: 0 }}>{data.meltAuthorityIndex}</p>
            </div>
          )}
          
          <div style={{ marginTop: '12px' }}>
            <p style={{ fontWeight: '600', marginBottom: '4px' }}>{t`Full Data`}</p>
            <pre style={{ 
              backgroundColor: '#f8f9fa', 
              padding: '8px', 
              borderRadius: '4px',
              margin: 0,
              maxHeight: '300px',
              overflow: 'auto',
              fontSize: '14px'
            }}>
              {processedData}
            </pre>
          </div>
        </div>
      ) : (
        <p>{t`No token data available.`}</p>
      )}
    </div>
  );
} 