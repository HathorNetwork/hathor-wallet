/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';

/**
 * Component for displaying signed data with value and signature
 */
export const SignedDataDisplay = ({ value }) => {
  return (
    <div className="card">
      <div className="card-body p-3">
        <div className="mb-3">
          <strong className="d-block mb-2">{t`Value`}</strong>
          <div className="p-2 bg-light rounded">
            {Array.isArray(value.value) ? (
              <ul className="mb-0 pl-3">
                {value.value.map((item, index) => (
                  <li key={index} className="text-monospace">{item}</li>
                ))}
              </ul>
            ) : (
              <span className="text-monospace">{value.value}</span>
            )}
          </div>
        </div>
        
        <div className="mb-0">
          <strong className="d-block mb-2">{t`Signature`}</strong>
          <div className="d-flex align-items-start">
            <div 
              className="text-monospace flex-grow-1 p-2 bg-light rounded" 
              style={{ wordBreak: 'break-all', fontSize: '0.875rem' }}
            >
              {value.signature}
            </div>
            <button
              className="btn btn-link btn-sm p-1 ml-2"
              onClick={() => navigator.clipboard.writeText(value.signature)}
              title={t`Copy signature`}
            >
              <i className="fa fa-copy"></i>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}; 