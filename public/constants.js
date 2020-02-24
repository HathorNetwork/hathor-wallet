/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const ledgerVersionMagicString = 'HTR';
const ledgerVersionMagicStringBuffer = [
  ledgerVersionMagicString.charCodeAt(0),
  ledgerVersionMagicString.charCodeAt(1),
  ledgerVersionMagicString.charCodeAt(2),
];

module.exports = {
  SENTRY_DSN: process.env.SENTRY_DSN || 'https://69c067d1587c465cac836eaf25467ce1@sentry.io/1410476',
  ledgerVersionMagicStringBuffer,
}
