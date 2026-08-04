/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// This file is executed right before electron start loading the index
const { contextBridge, ipcRenderer, shell } = require('electron')
const Sentry = require('@sentry/electron')
const constants = require('./constants');

Sentry.init({
  dsn: constants.SENTRY_DSN,
  release: process.env.npm_package_version
})

const VALID_SEND_CHANNELS = [
  'ledger:getVersion',
  'ledger:getPublicKeyData',
  'ledger:checkAddress',
  'ledger:sendTx',
  'ledger:getSignatures',
  'ledger:signToken',
  'ledger:sendTokens',
  'ledger:verifyTokenSignature',
  'ledger:verifyManyTokenSignatures',
  'ledger:resetTokenSignatures',
  'app:clear_storage_success',
];

const VALID_RECEIVE_CHANNELS = [
  'ledger:version',
  'ledger:publicKeyData',
  'ledger:address',
  'ledger:txSent',
  'ledger:signatures',
  'ledger:tokenSignature',
  'ledger:tokenDataSent',
  'ledger:tokenSignatureValid',
  'ledger:manyTokenSignatureValid',
  'ledger:tokenSignatureReset',
  'ledger:closed',
  'app:clear_storage',
];

/**
 * Restore Buffers that the contextBridge downgraded to Uint8Array, before the
 * IPC send: the main process and ledgerjs expect Buffers, so public/ledger.js
 * stays unchanged. Only plain objects and arrays are traversed; anything else
 * (Date, Map, non-Uint8Array typed arrays, ...) is passed through untouched, and
 * the WeakSet guards against circular payloads.
 */
function restoreBuffers(value, seen = new WeakSet()) {
  if (value instanceof Uint8Array) {
    return Buffer.from(value);
  }
  if (value === null || typeof value !== 'object') {
    return value;
  }
  if (seen.has(value)) {
    return value;
  }
  seen.add(value);
  if (Array.isArray(value)) {
    return value.map((item) => restoreBuffers(item, seen));
  }
  const proto = Object.getPrototypeOf(value);
  if (proto !== Object.prototype && proto !== null) {
    return value;
  }
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, restoreBuffers(item, seen)])
  );
}

// Replaces the old `window.require('electron')` access that required nodeIntegration.
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, ...args) => {
    if (VALID_SEND_CHANNELS.includes(channel)) {
      ipcRenderer.send(channel, ...args.map(restoreBuffers));
    }
  },
  on: (channel, listener) => {
    if (VALID_RECEIVE_CHANNELS.includes(channel)) {
      // Don't forward the Electron event across the bridge; pass undefined to
      // keep the legacy (event, ...args) listener signature.
      ipcRenderer.on(channel, (_event, ...args) => listener(undefined, ...args));
    }
  },
  removeAllListeners: (channel) => {
    if (VALID_RECEIVE_CHANNELS.includes(channel)) {
      ipcRenderer.removeAllListeners(channel);
    }
  },
  // Only http/https may be opened externally; block file: and custom schemes,
  // which could trigger host-side execution if the renderer is compromised.
  openExternal: (url) => {
    try {
      const { protocol } = new URL(url);
      if (protocol === 'http:' || protocol === 'https:') {
        return shell.openExternal(url);
      }
    } catch (_e) { /* invalid URL */ }
    return undefined;
  },
  // Sentry runs in the preload (@sentry/electron), outside the LavaMoat-governed
  // renderer bundle, on the renderer's behalf. Empty dsn disables it (consent toggle).
  sentrySetEnabled: (dsn) => Sentry.init({ dsn, release: process.env.npm_package_version }),
  sentryCapture: ({ name, message, stack, extra }) => {
    const error = new Error(message);
    if (name) error.name = name;
    if (stack) error.stack = stack;
    Sentry.withScope(scope => {
      Object.entries(extra || {}).forEach(([key, item]) => scope.setExtra(key, item));
      Sentry.captureException(error);
    });
  },
});

process.once('loaded', () => {
  const oldAccessDataRaw = localStorage.getItem('wallet:accessData');
  if (oldAccessDataRaw) {
    // When migrating from wallets with version v0.26.0 and older initialized with hardware devices
    // we need to clean the localStorage since some state left over can cause issues
    const accessData = JSON.parse(oldAccessDataRaw);
    const isHardware = localStorage.getItem('wallet:type') === 'hardware';
    if (accessData.from_xpub || isHardware) {
      const uniqueId = localStorage.getItem('app:uniqueId');
      localStorage.clear();
      localStorage.setItem('localstorage:started', 'true');
      localStorage.setItem('app:uniqueId', uniqueId);
    }
  }


  // Set closed in localStorage, so user does not open in the wallet page
  localStorage.setItem('localstorage:closed', 'true');

  const accessDataRaw = localStorage.getItem('localstorage:accessdata');
  if (accessDataRaw) {
    // check if the access data is from a hardware wallet, if so we need to remove it
    // This ensures that a previously closed hardware wallet will not be loaded again
    // unless the device is connected
    const accessData = JSON.parse(accessDataRaw);
    if ((accessData?.walletFlags & 0x02) > 0) {
      localStorage.removeItem('localstorage:accessdata');
    }
  }

  // Sending to main process the information about systray message
  const systrayMessageChecked = JSON.parse(localStorage.getItem('wallet:systray_message_checked')) === true;
  ipcRenderer.send('systray_message:check', systrayMessageChecked);

  // Information about systray message changed, so we receive a message from the main process and save in localStorage
  ipcRenderer.on('systray_message:check', (e, check) => {
    localStorage.setItem('wallet:systray_message_checked', check);
  });
})
