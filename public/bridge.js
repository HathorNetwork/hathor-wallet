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

/**
 * Build the API preload.js exposes as window.electronAPI. Dependencies are
 * injected so the closures can be tested without Electron.
 *
 * No function here may return a Promise.
 */
function createElectronAPI({ ipcRenderer, shell, Sentry, setSentryEnabled }) {
  return {
    send: (channel, ...args) => {
      assertChannel(VALID_SEND_CHANNELS, channel);
      ipcRenderer.send(channel, ...args);
    },
    on: (channel, listener) => {
      assertChannel(VALID_RECEIVE_CHANNELS, channel);
      // The Electron event is not forwarded across the bridge; listeners get
      // undefined in its place.
      ipcRenderer.on(channel, (_event, ...args) => { listener(undefined, ...args); });
    },
    removeAllListeners: (channel) => {
      assertChannel(VALID_RECEIVE_CHANNELS, channel);
      ipcRenderer.removeAllListeners(channel);
    },
    openExternal: (url) => {
      if (!isAllowedExternalUrl(url)) {
        throw new Error(`Refusing to open external URL: ${url}`);
      }
      shell.openExternal(url).catch((e) => console.error('openExternal failed', e));
    },
    sentrySetEnabled: (enabled) => {
      setSentryEnabled(enabled === true);
    },
    // The isolated SDK cannot see the page's errors, so the page forwards them.
    sentryCapture: ({ name, message, stack, extra }) => {
      const error = new Error(message);
      if (name) error.name = name;
      error.stack = stack || `${error.name}: ${message}`;
      Sentry.withScope((scope) => {
        Object.entries(extra || {}).forEach(([key, item]) => scope.setExtra(key, item));
        Sentry.captureException(error);
      });
    },
  };
}

module.exports = {
  ledgerMethods,
  VALID_SEND_CHANNELS,
  VALID_RECEIVE_CHANNELS,
  assertChannel,
  isAllowedExternalUrl,
  createElectronAPI,
};
