/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { util } from 'bitcore-lib';

/**
 * Opcodes used to generate output script
 * @module Opcodes
 */

/**
 * Checks if timestamp is greater than a value
 */
export const OP_GREATERTHAN_TIMESTAMP = util.buffer.hexToBuffer('6f');

/**
 * Duplicates value
 */
export const OP_DUP = util.buffer.hexToBuffer('76');

/**
 * Calculates hash160 of value
 */
export const OP_HASH160 = util.buffer.hexToBuffer('a9');

/**
 * Verifies if values are equal
 */
export const OP_EQUALVERIFY = util.buffer.hexToBuffer('88');

/**
 * Verifies signature
 */
export const OP_CHECKSIG = util.buffer.hexToBuffer('ac');

/**
 * Shows that pushdata will need length value
 */
export const OP_PUSHDATA1 = util.buffer.hexToBuffer('4c');
