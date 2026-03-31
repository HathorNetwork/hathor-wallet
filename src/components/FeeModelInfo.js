/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { TokenVersion } from '@hathor/wallet-lib';
import ReactLoading from 'react-loading';
import { colors } from '../constants';

/**
 * Get fee model information based on token version
 * @param {TokenVersion} tokenVersion
 * @returns {{ label: string, description: string }}
 */
const getFeeModelInfo = (tokenVersion) => {
  if (tokenVersion === TokenVersion.FEE) {
    return {
      label: t`Fee-based`,
      description: t`This token was created without a deposit. A small network fee in HTR is charged on every transfer.`,
    };
  }
  if (tokenVersion === TokenVersion.DEPOSIT) {
    return {
      label: t`Deposit-based`,
      description: t`This token was created with a 1% HTR deposit. No network fees are charged for transfers.`,
    };
  }
  // This should never happen because of the feature flag. When the feature flag is enabled
  // the token sync will run after wallet startup
  return {
    label: t`Unknown`,
    description: t`Unknown fee model`,
  };
};

/**
 * Component to display fee model information with loading and error states
 * @param {Object} props
 * @param {TokenVersion} props.tokenVersion - The token version (FEE or DEPOSIT)
 * @param {boolean} props.isLoading - Whether the version is still loading
 * @param {string|null} props.error - Error message if registration failed
 */
export default function FeeModelInfo({ tokenVersion, isLoading, error }) {
  const feeModelInfo = getFeeModelInfo(tokenVersion);

  if (error) {
    return (
      <p className="mt-2 mb-2 text-danger">
        <strong>{t`Fee Model:`} </strong>
        {t`Error fetching fee model`}
      </p>
    );
  }

  if (isLoading) {
    return (
      <div className="mt-2 mb-2 d-flex align-items-center">
        <strong>{t`Fee Model:`} </strong>
        <div style={{ marginTop: -10, marginLeft: 8 }}>
          <ReactLoading type='spin' color={colors.purpleHathor} width={16} height={16} delay={0}/>
        </div>
        <span className="ml-2">{t`Loading...`}</span>
      </div>
    );
  }

  return (
    <>
      <p className="mt-2 mb-2">
        <strong>{t`Fee Model:`} </strong>
        {feeModelInfo.label}
      </p>
      <p className="mt-2 mb-2">{feeModelInfo.description}</p>
    </>
  );
}
