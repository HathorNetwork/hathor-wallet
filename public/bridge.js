/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Pure helpers shared by electron.js and preload.js. Kept free of `electron`
// imports so they can be unit tested with `node --test`.

/**
 * Methods available on public/ledger.js and the event sent back to the
 * renderer when each one resolves. Eg: we receive 'ledger:getVersion', call
 * Ledger.getVersion() and reply with 'ledger:version'.
 */
const ledgerMethods = {
  'getVersion': 'version',
  'getPublicKeyData': 'publicKeyData',
  'checkAddress': 'address',
  'sendTx': 'txSent',
  'getSignatures': 'signatures',
  'signToken': 'tokenSignature',
  'sendTokens': 'tokenDataSent',
  'verifyTokenSignature': 'tokenSignatureValid',
  'verifyManyTokenSignatures': 'manyTokenSignatureValid',
  'resetTokenSignatures': 'tokenSignatureReset',
};

const VALID_SEND_CHANNELS = [
  ...Object.keys(ledgerMethods).map((method) => `ledger:${method}`),
  'app:clear_storage_success',
];

const VALID_RECEIVE_CHANNELS = [
  ...Object.values(ledgerMethods).map((event) => `ledger:${event}`),
  'ledger:closed',
  'app:clear_storage',
];

/**
 * Throws for a channel outside the allowlist, so a channel added to the
 * renderer but not here fails loudly instead of waiting forever for a reply.
 */
function assertChannel(allowed, channel) {
  if (!allowed.includes(channel)) {
    throw new Error(`IPC channel "${channel}" is not allowlisted in public/bridge.js`);
  }
}

/**
 * Only http/https URLs may be handed to shell.openExternal: file: and custom
 * schemes can trigger host-side execution if the renderer is compromised.
 */
function isAllowedExternalUrl(url) {
  try {
    const { protocol } = new URL(url);
    return protocol === 'http:' || protocol === 'https:';
  } catch (_e) {
    return false;
  }
}

module.exports = {
  ledgerMethods,
  VALID_SEND_CHANNELS,
  VALID_RECEIVE_CHANNELS,
  assertChannel,
  isAllowedExternalUrl,
};
