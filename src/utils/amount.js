/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { numberUtils } from '@hathor/wallet-lib';
import { AMOUNT_FORMAT, AMOUNT_FORMAT_DEFAULT } from '../constants';

const SUBSCRIPT_DIGITS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉'];

// Shortest zero run worth compressing.
const COMPRESS_MIN_ZERO_RUN = 3;

const toSubscript = (n) => String(n)
  .split('')
  .map((digit) => SUBSCRIPT_DIGITS[Number(digit)])
  .join('');

/**
 * Collapse the leading run of fractional zeros into subscript notation,
 * e.g. "0.0000005195" -> "0.0₆5195". Only the first zero run (right after the
 * decimal point) is compressed; inner zeros are kept verbatim. Takes prettyValue's
 * stringified amount to reuse the lib's BigInt formatting. Returns the input
 * unchanged when nothing qualifies: value >= 1, integer, zero, or a leading run
 * shorter than COMPRESS_MIN_ZERO_RUN.
 *
 * @param {string} formatted Amount string from prettyValue
 * @return {string}
 */
export const compressAmountString = (formatted) => {
  const isNegative = formatted.startsWith('-');
  const unsigned = isNegative ? formatted.slice(1) : formatted;

  const dotIndex = unsigned.indexOf('.');
  if (dotIndex === -1) {
    return formatted;
  }

  const integerPart = unsigned.slice(0, dotIndex);
  const decimalPart = unsigned.slice(dotIndex + 1);

  // Only sub-1 values have a leading-zero run worth compressing.
  if (integerPart.replace(/,/g, '') !== '0') {
    return formatted;
  }

  // Trailing zeros are insignificant; drop them before scanning.
  const trimmed = decimalPart.replace(/0+$/, '');
  if (trimmed === '') {
    return formatted;
  }

  let leadingZeros = 0;
  while (leadingZeros < trimmed.length && trimmed[leadingZeros] === '0') {
    leadingZeros += 1;
  }

  if (leadingZeros < COMPRESS_MIN_ZERO_RUN) {
    return formatted;
  }

  const sign = isNegative ? '-' : '';
  const significant = trimmed.slice(leadingZeros);
  return `${sign}0.0${toSubscript(leadingZeros)}${significant}`;
};

/**
 * Format a token amount for display.
 *
 * NFTs are integer-valued, so they are formatted with zero decimal places and
 * never compressed — there is no fractional part to compress.
 *
 * @param {bigint} value Amount as a BigInt
 * @param {Object} options
 * @param {number} options.decimalPlaces Token decimal places
 * @param {boolean} [options.isNFT] Whether the token is an NFT
 * @param {string} [options.amountFormat] AMOUNT_FORMAT.EXPANDED or COMPRESSED
 * @return {string}
 */
export const formatAmount = (value, {
  decimalPlaces,
  isNFT = false,
  amountFormat = AMOUNT_FORMAT_DEFAULT,
} = {}) => {
  const places = isNFT ? 0 : decimalPlaces;
  const formatted = numberUtils.prettyValue(value, places);

  if (amountFormat === AMOUNT_FORMAT.COMPRESSED) {
    return compressAmountString(formatted);
  }

  return formatted;
};

/**
 * Resolve the effective amount format.
 *
 * The preference is hydrated from storage regardless of the feature flag, so a
 * stored COMPRESSED value must be masked back to EXPANDED whenever the flag is
 * off. Every read path goes through here so the flag cannot be bypassed.
 *
 * @param {string} storedFormat The persisted preference from redux
 * @param {boolean} featureEnabled Whether the amount format feature is enabled
 * @return {string}
 */
export const resolveAmountFormat = (storedFormat, featureEnabled) => (
  featureEnabled ? storedFormat : AMOUNT_FORMAT.EXPANDED
);
