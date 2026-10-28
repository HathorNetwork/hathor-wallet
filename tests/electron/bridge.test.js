/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  ledgerMethods,
  VALID_SEND_CHANNELS,
  VALID_RECEIVE_CHANNELS,
  assertChannel,
  isAllowedExternalUrl,
  createElectronAPI,
} = require('../../public/bridge');

function fakes() {
  const calls = { sent: [], listeners: {}, removed: [], opened: [], enabled: [], captured: [] };
  // Like Electron's, on and removeAllListeners return the ipcRenderer itself.
  const ipcRenderer = {
    send: (...args) => calls.sent.push(args),
    on: (channel, fn) => { calls.listeners[channel] = fn; return ipcRenderer; },
    removeAllListeners: (channel) => { calls.removed.push(channel); return ipcRenderer; },
  };
  const shell = { openExternal: (url) => { calls.opened.push(url); return Promise.resolve(); } };
  const scope = { extra: {}, setExtra(key, value) { this.extra[key] = value; } };
  const Sentry = {
    withScope: (fn) => fn(scope),
    captureException: (error) => calls.captured.push({ error, extra: { ...scope.extra } }),
  };
  const api = createElectronAPI({
    ipcRenderer, shell, Sentry, setSentryEnabled: (enabled) => calls.enabled.push(enabled),
  });
  return { api, calls };
}

test('every ledger method can be sent and its reply received', () => {
  for (const [method, reply] of Object.entries(ledgerMethods)) {
    assert.ok(VALID_SEND_CHANNELS.includes(`ledger:${method}`), method);
    assert.ok(VALID_RECEIVE_CHANNELS.includes(`ledger:${reply}`), reply);
  }
});

test('app channels are allowlisted in the right direction only', () => {
  assert.ok(VALID_SEND_CHANNELS.includes('app:clear_storage_success'));
  assert.ok(VALID_RECEIVE_CHANNELS.includes('app:clear_storage'));
  assert.ok(VALID_RECEIVE_CHANNELS.includes('ledger:closed'));
  assert.ok(!VALID_SEND_CHANNELS.includes('app:clear_storage'));
  assert.ok(!VALID_RECEIVE_CHANNELS.includes('ledger:getVersion'));
});

test('channels handled by main outside the bridge are not exposed', () => {
  assert.ok(!VALID_SEND_CHANNELS.includes('systray_message:check'));
  assert.ok(!VALID_RECEIVE_CHANNELS.includes('systray_message:check'));
});

test('send and receive lists are disjoint', () => {
  assert.deepEqual(VALID_SEND_CHANNELS.filter((c) => VALID_RECEIVE_CHANNELS.includes(c)), []);
});

test('assertChannel throws for a channel outside the allowlist', () => {
  assert.doesNotThrow(() => assertChannel(VALID_SEND_CHANNELS, 'ledger:sendTx'));
  assert.throws(() => assertChannel(VALID_SEND_CHANNELS, 'ledger:unknown'), /not allowlisted/);
});

test('only http and https URLs may be opened externally', () => {
  for (const url of ['https://explorer.hathor.network/transaction/00', 'http://localhost:3001/', 'HTTPS://hathor.network']) {
    assert.equal(isAllowedExternalUrl(url), true, url);
  }
  for (const url of ['file:///etc/passwd', 'javascript:alert(1)', 'smb://host/share', 'ms-msdt:/id', 'localhost:3001', 'not a url', '', undefined, null]) {
    assert.equal(isAllowedExternalUrl(url), false, String(url));
  }
});

test('electronAPI routes each channel only through its own list', () => {
  const { api, calls } = fakes();
  api.send('ledger:sendTx', 'payload');
  assert.deepEqual(calls.sent, [['ledger:sendTx', 'payload']]);
  assert.throws(() => api.send('ledger:txSent'), /not allowlisted/);
  assert.throws(() => api.on('ledger:sendTx', () => {}), /not allowlisted/);
  assert.throws(() => api.removeAllListeners('ledger:sendTx'), /not allowlisted/);
  api.removeAllListeners('ledger:txSent');
  assert.deepEqual(calls.removed, ['ledger:txSent']);
});

test('listeners get undefined for the event and their result never crosses back', async () => {
  const { api, calls } = fakes();
  const received = [];
  api.on('ledger:txSent', async (event, arg) => { received.push([event, arg]); });
  const returned = calls.listeners['ledger:txSent']({ sender: 'electron-event' }, { success: true });
  assert.equal(returned, undefined);
  assert.deepEqual(received, [[undefined, { success: true }]]);
});

test('no electronAPI function returns a Promise', () => {
  const { api } = fakes();
  assert.equal(api.openExternal('https://explorer.hathor.network'), undefined);
  assert.equal(api.sentrySetEnabled(true), undefined);
  assert.equal(api.sentryCapture({ message: 'x' }), undefined);
  assert.equal(api.send('ledger:getVersion'), undefined);
  assert.equal(api.on('ledger:version', () => {}), undefined);
  assert.equal(api.removeAllListeners('ledger:version'), undefined);
});

test('openExternal refuses other schemes before reaching the shell', () => {
  const { api, calls } = fakes();
  assert.throws(() => api.openExternal('file:///etc/passwd'), /Refusing/);
  assert.throws(() => api.openExternal('localhost:3001'), /Refusing/);
  assert.deepEqual(calls.opened, []);
  api.openExternal('https://explorer.hathor.network/');
  assert.deepEqual(calls.opened, ['https://explorer.hathor.network/']);
});

test('sentrySetEnabled only enables on a strict true', () => {
  const { api, calls } = fakes();
  for (const value of [true, false, 'true', 1, 'https://key@sentry.io/1', undefined]) {
    api.sentrySetEnabled(value);
  }
  assert.deepEqual(calls.enabled, [true, false, false, false, false, false]);
});

test('sentryCapture rebuilds the error and keeps extras', () => {
  const { api, calls } = fakes();
  api.sentryCapture({ name: 'TypeError', message: 'boom', stack: '', extra: { source: 'window.error' } });
  const [{ error, extra }] = calls.captured;
  assert.equal(error.name, 'TypeError');
  assert.equal(error.message, 'boom');
  assert.equal(error.stack, 'TypeError: boom');
  assert.deepEqual(extra, { source: 'window.error' });
});
