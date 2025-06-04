/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';

/**
 * Component for displaying Nano Contract data
 * 
 * @param {Object} data The nano contract data to be displayed
 */
export default function NanoContractRequestData({ data }) {
  // Process the data to handle BigInt values
  const processedData = React.useMemo(() => {
    try {
      return JSONBigInt.stringify(data, 2);
    } catch (error) {
      console.error('Error stringifying nano contract data:', error);
      return 'Error displaying nano contract data. Please check console for details.';
    }
  }, [data]);

  return (
    <div style={{ width: '100%' }}>
      {Object.keys(data).length > 0 ? (
        <div>
          {data.blueprintId && (
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>{t`Blueprint ID`}</p>
              <p style={{ margin: 0, wordBreak: 'break-all' }}>{data.blueprintId}</p>
            </div>
          )}
          
          {data.method && (
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>{t`Method`}</p>
              <p style={{ margin: 0 }}>{data.method}</p>
            </div>
          )}
          
          {data.args && data.args.length > 0 && (
            <div style={{ marginBottom: '8px' }}>
              <p style={{ fontWeight: '600', marginBottom: '4px' }}>{t`Arguments`}</p>
              <pre style={{ 
                backgroundColor: '#f8f9fa', 
                padding: '8px', 
                borderRadius: '4px',
                margin: 0,
                maxHeight: '200px',
                overflow: 'auto',
                fontSize: '14px'
              }}>
                {JSON.stringify(data.args, null, 2)}
              </pre>
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
        <p>{t`No nano contract data available.`}</p>
      )}
    </div>
  );
} 