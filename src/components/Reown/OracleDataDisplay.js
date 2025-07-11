/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useMemo } from 'react';
import { t } from 'ttag';
import hathorLib from '@hathor/wallet-lib';
import { getGlobalWallet } from '../../modules/wallet';

/**
 * Component for displaying oracle data in a structured format
 */
export const OracleDataDisplay = ({ oracleData }) => {
  // Try to parse oracle as an address
  const parsedOracleInfo = useMemo(() => {
    try {
      const wallet = getGlobalWallet();
      if (!wallet || !oracleData.oracle) {
        return { raw: oracleData.oracle, isAddress: false };
      }

      // Convert hex string to Buffer
      const oracleBuffer = Buffer.from(oracleData.oracle, 'hex');
      const network = wallet.getNetworkObject();

      const parsedScript = hathorLib.scriptsUtils.parseScript(oracleBuffer, network);
      if (parsedScript && parsedScript.address) {
        return {
          raw: oracleData.oracle,
          address: parsedScript.address.base58,
          isAddress: true,
          scriptType: parsedScript.type
        };
      }

      return { raw: oracleData.oracle, isAddress: false };
    } catch (error) {
      // If any error occurs, fall back to raw display
      return { raw: oracleData.oracle, isAddress: false };
    }
  }, [oracleData.oracle]);

  return (
    <div className="card">
      <div className="card-body p-3">
        <div className="mb-3">
          <strong className="d-block mb-2">{t`Oracle`}</strong>

          {parsedOracleInfo.isAddress ? (
            <div>
              <div className="mb-2">
                <small className="text-muted">{t`Address`} {parsedOracleInfo.scriptType && `(${parsedOracleInfo.scriptType})`}</small>
              </div>
              <div className="d-flex align-items-start mb-2">
                <div
                  className="text-monospace flex-grow-1 p-2 bg-light rounded"
                  style={{ wordBreak: 'break-all', fontSize: '0.875rem' }}>
                  {parsedOracleInfo.address}
                </div>
                <button
                  className="btn btn-link btn-sm p-1 ml-2"
                  onClick={() => navigator.clipboard.writeText(parsedOracleInfo.address)}
                  title={t`Copy address`}>
                  <i className="fa fa-copy"></i>
                </button>
              </div>
              <details className="mt-2">
                <summary className="text-muted small" style={{ cursor: 'pointer' }}>
                  {t`Show raw oracle data`}
                </summary>
                <div className="mt-2 d-flex align-items-start">
                  <div
                    className="text-monospace flex-grow-1 p-2 bg-light rounded small"
                    style={{ wordBreak: 'break-all' }}>
                    {parsedOracleInfo.raw}
                  </div>
                  <button
                    className="btn btn-link btn-sm p-1 ml-2"
                    onClick={() => navigator.clipboard.writeText(parsedOracleInfo.raw)}
                    title={t`Copy raw oracle`}>
                    <i className="fa fa-copy"></i>
                  </button>
                </div>
              </details>
            </div>
          ) : (
            <div className="d-flex align-items-start">
              <div
                className="text-monospace flex-grow-1 p-2 bg-light rounded"
                style={{ wordBreak: 'break-all', fontSize: '0.875rem' }}>
                {parsedOracleInfo.raw}
              </div>
              <button
                className="btn btn-link btn-sm p-1 ml-2"
                onClick={() => navigator.clipboard.writeText(parsedOracleInfo.raw)}
                title={t`Copy oracle`}>
                <i className="fa fa-copy"></i>
              </button>
            </div>
          )}
        </div>

        <div className="mb-0">
          <strong className="d-block mb-2">{t`Data`}</strong>
          <div className="p-2 bg-light rounded">
            <span className="text-monospace">{oracleData.data}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

