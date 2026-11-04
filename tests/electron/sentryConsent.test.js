/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const {
  CONSENT_CHANNEL,
  createConsentStore,
  createConsentHandler,
  gateTransport,
} = require('../../public/sentryConsent');
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
    rmSync: (path) => { delete files[path]; },
  };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
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

    _flushQueue() {}
  }
  let enabled = false;
  const transport = new (gateTransport(Base, { isEnabled: () => enabled, onRevoke: () => {} }))();

  assert.deepEqual(await transport.sendRequest({ type: 'event' }), { status: 'skipped' });
  assert.deepEqual(await transport.sendRequest({ type: 'session' }), { status: 'skipped' });
  assert.deepEqual(sent, []);

  enabled = true;
  assert.deepEqual(await transport.sendRequest({ type: 'event' }), { status: 'success' });
  assert.deepEqual(sent, ['event']);
});

/**
 * A small model of the offline transport's queue: it flushes when created, a
 * flush pops one request, a popped request carries its queue date, and only a
 * successful send flushes again. The e2e scenario runs the real one.
 */
function queueingBase(queued) {
  const sent = [];
  return {
    sent,
    Base: class {
      constructor() {
        this._flushQueue();
      }

      sendRequest(request) {
        sent.push(request.id);
        this._flushQueue();
        return Promise.resolve({ status: 'success' });
      }

      async _flushQueue() {
        await null;
        const found = queued.shift();
        if (found) this.sendRequest(found);
      }
    },
  };
}

const retry = (id) => ({ id, date: new Date() });
const settle = async () => {
  for (let i = 0; i < 50; i += 1) await new Promise((r) => setImmediate(r));
};

test('starting without consent empties the queue, and a later grant sends nothing old', async () => {
  const queued = [retry('old-1'), retry('old-2'), retry('old-3')];
  const { Base, sent } = queueingBase(queued);
  const store = createConsentStore('/c.json', fakeFs({}));
  const transport = new (gateTransport(Base, store))();
  await settle();
  assert.deepEqual(queued, []);

  store.setEnabled(true);
  await transport.sendRequest({ id: 'new' });
  await settle();
  assert.deepEqual(sent, ['new']);
});

test('a revoke empties the queue while the app runs', async () => {
  const queued = [];
  const { Base, sent } = queueingBase(queued);
  const store = createConsentStore('/c.json', fakeFs({ '/c.json': '{"enabled":true}' }));
  new (gateTransport(Base, store))();
  await settle();
  queued.push(retry('old-1'), retry('old-2'));

  store.setEnabled(false);
  await settle();
  assert.deepEqual(queued, []);
  assert.deepEqual(sent, []);
});

test('starting with consent sends the queue', async () => {
  const queued = [retry('old-1'), retry('old-2')];
  const { Base, sent } = queueingBase(queued);
  const store = createConsentStore('/c.json', fakeFs({ '/c.json': '{"enabled":true}' }));
  new (gateTransport(Base, store))();
  await settle();
  assert.deepEqual(sent, ['old-1', 'old-2']);
});

test('a refused new request does not flush: a queue that throws cannot feed itself', async () => {
  const queued = [];
  const { Base } = queueingBase(queued);
  const store = createConsentStore('/c.json', fakeFs({}));
  const transport = new (gateTransport(Base, store))();
  await settle();
  queued.push(retry('old'));

  await transport.sendRequest({ id: 'captured-error' });
  await settle();
  assert.equal(queued.length, 1);
});

test('a revoke applies even if a listener throws', () => {
  const store = createConsentStore('/c.json', fakeFs({ '/c.json': '{"enabled":true}' }));
  store.onRevoke(() => { throw new Error('no such method'); });
  store.setEnabled(false);
  assert.equal(store.isEnabled(), false);
});

test('the page cannot send or listen on the consent channel', () => {
  assert.ok(!VALID_SEND_CHANNELS.includes(CONSENT_CHANNEL));
  assert.ok(!VALID_RECEIVE_CHANNELS.includes(CONSENT_CHANNEL));
});

test('a revoke that cannot be written removes the stored grant', () => {
  const fs = fakeFs({});
  const store = createConsentStore('/c.json', fs);
  store.setEnabled(true);
  fs.writeFileSync = () => { throw new Error('EROFS'); };
  store.setEnabled(false);
  assert.equal(store.isEnabled(), false);
  assert.equal(createConsentStore('/c.json', fs).isEnabled(), false);
});

test('a revoke waits for events already being processed', async () => {
  const store = createConsentStore('/c.json', fakeFs({}));
  const flush = deferred();
  const apply = createConsentHandler(store, () => flush.promise);

  apply(true);
  assert.equal(store.isEnabled(), true);
  const revoked = apply(false);
  assert.equal(store.isEnabled(), true, 'still sending while main flushes');
  flush.resolve(true);
  await revoked;
  assert.equal(store.isEnabled(), false);
});

test('a revoke still applies when the flush fails', async () => {
  const store = createConsentStore('/c.json', fakeFs({}));
  const apply = createConsentHandler(store, () => Promise.reject(new Error('timeout')));
  apply(true);
  await apply(false);
  assert.equal(store.isEnabled(), false);
});

test('a grant during a pending revoke wins', async () => {
  const store = createConsentStore('/c.json', fakeFs({}));
  const flush = deferred();
  const apply = createConsentHandler(store, () => flush.promise);
  apply(true);
  const revoked = apply(false);
  apply(true);
  flush.resolve(true);
  await revoked;
  assert.equal(store.isEnabled(), true);
});

test('anything but a strict true is a revoke', async () => {
  const store = createConsentStore('/c.json', fakeFs({}));
  const apply = createConsentHandler(store, () => Promise.resolve());
  apply(true);
  await apply('true');
  assert.equal(store.isEnabled(), false);
});
