/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import { useAmountFormat } from '../hooks/useAmountFormat';

/**
 * Renders a token amount with the wrapping rules applied.
 *
 * Reads the format preference from redux itself so class components can use it
 * without threading decimalPlaces or amountFormat through props.
 *
 * @memberof Components
 */
function Amount({ value, symbol, isNFT, className }) {
  const format = useAmountFormat();
  const formatted = format(value, { isNFT });
  const text = symbol ? `${formatted} ${symbol}` : formatted;

  return <span className={className ? `amount ${className}` : 'amount'}>{text}</span>;
}

Amount.propTypes = {
  /** Amount as a BigInt */
  value: PropTypes.any.isRequired,
  /** Token symbol rendered after the value */
  symbol: PropTypes.string,
  /** Whether the token is an NFT (integer-valued) */
  isNFT: PropTypes.bool,
  /** Extra classes appended to the required `amount` class */
  className: PropTypes.string,
};

Amount.defaultProps = {
  symbol: '',
  isNFT: false,
  className: '',
};

export default Amount;
