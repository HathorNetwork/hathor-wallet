/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';

/**
 * Reusable component for displaying dApp information
 * Shows dApp icon, proposer name, and URL/chain info
 */
export const DAppInfo = ({ dapp, className = "d-flex align-items-center mb-4" }) => (
  <div className={className}>
    {dapp?.icon && (
      <img
        src={dapp.icon}
        alt="dApp icon"
        className="mr-3"
        style={{ width: 48, height: 48 }}
      />
    )}
    <div>
      <h6 className="mb-1">{dapp?.proposer || "Unknown"}</h6>
      <small className="text-muted">{dapp?.url || dapp?.chain || ""}</small>
    </div>
  </div>
);