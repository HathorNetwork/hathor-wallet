/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { CONSENT_CHANNEL, createConsentStore, gateTransport } = require('../../public/sentryConsent');
const { VALID_SEND_CHANNELS, VALID_RECEIVE_CHANNELS } = require('../../public/bridge');

function fakeFs(initial) {
  const files = { ...initial };
  return {
    files,
    readFileSync: (path) => {
      if (!(path in files)) throw new Error('ENOENT');
      return files[path];
    },
    writeFileSync: (path, data) => { files[path] = data; },
  };
}

test('consent defaults to off when nothing usable is stored', () => {
  assert.equal(createConsentStore('/c.json', fakeFs({})).isEnabled(), false);
  assert.equal(createConsentStore('/c.json', fakeFs({ '/c.json': 'not json' })).isEnabled(), false);
  assert.equal(createConsentStore('/c.json', fakeFs({ '/c.json': '{"enabled":"true"}' })).isEnabled(), false);
});

test('consent survives a restart', () => {
  const fs = fakeFs({});
  createConsentStore('/c.json', fs).setEnabled(true);
  assert.equal(createConsentStore('/c.json', fs).isEnabled(), true);
  createConsentStore('/c.json', fs).setEnabled(false);
  assert.equal(createConsentStore('/c.json', fs).isEnabled(), false);
});

test('only a strict true grants consent', () => {
  const store = createConsentStore('/c.json', fakeFs({}));
  for (const value of ['true', 1, {}, 'https://key@sentry.io/1']) {
    store.setEnabled(value);
    assert.equal(store.isEnabled(), false, String(value));
  }
});

test('the gated transport sends nothing without consent', async () => {
  const sent = [];
  class Base {
    sendRequest(request) { sent.push(request.type); return Promise.resolve({ status: 'success' }); }
  }
  let enabled = false;
  const transport = new (gateTransport(Base, () => enabled))();

  assert.deepEqual(await transport.sendRequest({ type: 'event' }), { status: 'skipped' });
  assert.deepEqual(await transport.sendRequest({ type: 'session' }), { status: 'skipped' });
  assert.deepEqual(sent, []);

  enabled = true;
  assert.deepEqual(await transport.sendRequest({ type: 'event' }), { status: 'success' });
  assert.deepEqual(sent, ['event']);
});

test('the page cannot send or listen on the consent channel', () => {
  assert.ok(!VALID_SEND_CHANNELS.includes(CONSENT_CHANNEL));
  assert.ok(!VALID_RECEIVE_CHANNELS.includes(CONSENT_CHANNEL));
});
