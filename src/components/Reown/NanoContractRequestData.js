/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { JSONBigInt } from '@hathor/wallet-lib/lib/utils/bigint';

// Styles object to avoid inline style repetition
const styles = {
  container: {
    width: '100%'
  },
  fieldContainer: {
    marginBottom: '8px'
  },
  fieldLabel: {
    fontWeight: '600',
    marginBottom: '4px'
  },
  fieldValue: {
    margin: 0,
    wordBreak: 'break-all'
  },
  fieldValueNormal: {
    margin: 0
  },
  fullDataContainer: {
    marginTop: '12px'
  },
  codeBlock: {
    backgroundColor: '#f8f9fa',
    padding: '8px',
    borderRadius: '4px',
    margin: 0,
    maxHeight: '200px',
    overflow: 'auto',
    fontSize: '14px'
  },
  fullDataCodeBlock: {
    backgroundColor: '#f8f9fa',
    padding: '8px',
    borderRadius: '4px',
    margin: 0,
    maxHeight: '300px',
    overflow: 'auto',
    fontSize: '14px'
  }
};

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
    <div style={styles.container}>
      {Object.keys(data).length > 0 ? (
        <div>
          {data.blueprintId && (
            <div style={styles.fieldContainer}>
              <p style={styles.fieldLabel}>{t`Blueprint ID`}</p>
              <p style={styles.fieldValue}>{data.blueprintId}</p>
            </div>
          )}

          {data.method && (
            <div style={styles.fieldContainer}>
              <p style={styles.fieldLabel}>{t`Method`}</p>
              <p style={styles.fieldValueNormal}>{data.method}</p>
            </div>
          )}

          {data.args && data.args.length > 0 && (
            <div style={styles.fieldContainer}>
              <p style={styles.fieldLabel}>{t`Arguments`}</p>
              <pre style={styles.codeBlock}>
                {JSON.stringify(data.args, null, 2)}
              </pre>
            </div>
          )}

          <div style={styles.fullDataContainer}>
            <p style={styles.fieldLabel}>{t`Full Data`}</p>
            <pre style={styles.fullDataCodeBlock}>
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
