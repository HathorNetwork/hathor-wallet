/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';

/**
 * Reusable component for displaying dApp information
 * 
 * @param {Object} dapp - The dApp metadata object
 * @param {string} dapp.icon - Icon URL for the dApp
 * @param {string} dapp.proposer - Name of the dApp
 * @param {string} dapp.url - URL of the dApp
 * @param {string} dapp.chain - Chain information (fallback for URL)
 */
export const DAppInfo = ({ dapp }) => (
  <div className="d-flex align-items-center mb-4">
    {dapp?.icon && (
      <img
        src={dapp.icon}
        alt={t`dApp icon`}
        className="mr-3"
        style={{ width: 48, height: 48 }}
      />
    )}
    <div>
      <h6 className="mb-1">{dapp?.proposer || t`Unknown`}</h6>
      <small className="text-muted">{dapp?.url || dapp?.chain || ""}</small>
    </div>
  </div>
); 