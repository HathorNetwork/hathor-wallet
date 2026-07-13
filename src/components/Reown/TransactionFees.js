/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { constants, numberUtils } from '@hathor/wallet-lib';

/**
 * Component for displaying network fee information
 *
 * @param {Object} props
 * @param {bigint|number} props.fee - The fee amount to display
 */
export const TransactionFees = ({ fee }) => {
  if (!fee) {
    return null;
  }

  const formattedFee = numberUtils.prettyValue(fee);
  const symbol = constants.DEFAULT_NATIVE_TOKEN_CONFIG.symbol;

  return (
    <div className="mb-4">
      <h6 className="mb-3">{t`Network Fee`}</h6>
      <div className="p-3 bg-light rounded">
        <div className="d-flex justify-content-between align-items-center">
          <span>
            <i className="fa fa-arrow-up text-danger mr-2" />
            <strong>{symbol}</strong>
          </span>
          <span>{formattedFee} {symbol}</span>
        </div>
      </div>
    </div>
  );
};
