/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { useCallback } from 'react';
import { useSelector } from 'react-redux';
import { formatAmount, resolveAmountFormat } from '../utils/amount';
import { AMOUNT_FORMAT_FEATURE_TOGGLE } from '../constants';

/**
 * Returns a formatter bound to the wallet's decimal places and the user's
 * amount format preference.
 *
 * The feature toggle is applied here rather than at the call sites: when the
 * flag is off, a previously stored COMPRESSED preference must not leak through.
 *
 * @return {(value: bigint, options?: {isNFT?: boolean}) => string}
 */
export function useAmountFormat() {
  const decimalPlaces = useSelector((state) => state.serverInfo.decimalPlaces);
  const storedFormat = useSelector((state) => state.amountFormat);
  const enabled = useSelector((state) => state.featureToggles[AMOUNT_FORMAT_FEATURE_TOGGLE]);

  const amountFormat = resolveAmountFormat(storedFormat, enabled);

  return useCallback(
    (value, { isNFT = false } = {}) => formatAmount(value, { decimalPlaces, isNFT, amountFormat }),
    [decimalPlaces, amountFormat]
  );
}
