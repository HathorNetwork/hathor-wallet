/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { t } from 'ttag';

/**
 * Modal component that displays comprehensive error information
 * including error type, message, timestamp, and stack trace
 */
export function ErrorDetailModal({ visible, errorDetails, onDismiss }) {
  const [copySuccess, setCopySuccess] = useState(false);

  // Clear copy success state after timeout
  useEffect(() => {
    if (copySuccess) {
      const timeoutId = setTimeout(() => {
        setCopySuccess(false);
      }, 2000);
      return () => clearTimeout(timeoutId);
    }
  }, [copySuccess]);

  const handleCopyToClipboard = useCallback(() => {
    if (!errorDetails) return;

    const errorText = `Error Type: ${errorDetails.type}
Message: ${errorDetails.message}
Timestamp: ${new Date(errorDetails.timestamp).toISOString()}

Stack Trace:
${errorDetails.stack}`;

    navigator.clipboard.writeText(errorText).then(() => {
      setCopySuccess(true);
    }).catch((err) => {
      console.error('Failed to copy error details:', err);
    });
  }, [errorDetails]);

  if (!visible || !errorDetails) return null;

  const formattedTimestamp = errorDetails.timestamp
    ? new Date(errorDetails.timestamp).toLocaleString()
    : '-';

  return (
    <div
      className="modal fade show d-block"
      tabIndex="-1"
      role="dialog"
      aria-labelledby="errorDetailModal"
      style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
    >
      <div className="modal-dialog modal-lg" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t`Error Details`}</h5>
            <button type="button" className="close" onClick={onDismiss} aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
            <div className="mb-3">
              <strong>{t`Error Type`}</strong>
              <div className="text-muted">{errorDetails.type}</div>
            </div>

            <div className="mb-3">
              <strong>{t`Message`}</strong>
              <div className="text-muted" style={{ wordBreak: 'break-word' }}>
                {errorDetails.message}
              </div>
            </div>

            <div className="mb-3">
              <strong>{t`Timestamp`}</strong>
              <div className="text-muted">{formattedTimestamp}</div>
            </div>

            <div className="mb-3">
              <strong>{t`Stack Trace`}</strong>
              <div
                className="p-3 bg-light rounded mt-2"
                style={{
                  maxHeight: '200px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}
              >
                {errorDetails.stack}
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleCopyToClipboard}
            >
              {copySuccess ? (
                <>
                  <i className="fa fa-check mr-2"></i>
                  {t`Copied!`}
                </>
              ) : (
                <>
                  <i className="fa fa-copy mr-2"></i>
                  {t`Copy to Clipboard`}
                </>
              )}
            </button>
            <button type="button" className="btn btn-secondary" onClick={onDismiss}>
              {t`Close`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
