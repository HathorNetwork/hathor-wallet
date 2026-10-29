/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { stripBrotli, isBrotliEncoded, installBrotliGuard } = require('../../public/brotliGuard');

test('stripBrotli removes br and keeps the other encodings', () => {
  assert.equal(stripBrotli('gzip, deflate, br'), 'gzip, deflate');
  assert.equal(stripBrotli('br'), '');
  assert.equal(stripBrotli('BR;q=1.0, gzip;q=0.8'), 'gzip;q=0.8');
  assert.equal(stripBrotli('gzip, deflate, br, zstd'), 'gzip, deflate, zstd');
  assert.equal(stripBrotli('gzip, brotli-like'), 'gzip, brotli-like');
});

test('isBrotliEncoded detects br in any casing or position', () => {
  assert.equal(isBrotliEncoded({ 'Content-Encoding': ['br'] }), true);
  assert.equal(isBrotliEncoded({ 'content-encoding': ['gzip, br'] }), true);
  assert.equal(isBrotliEncoded({ 'CONTENT-ENCODING': ['BR'] }), true);
  assert.equal(isBrotliEncoded({ 'Content-Encoding': ['gzip'], 'X-Note': ['br'] }), false);
  assert.equal(isBrotliEncoded({ 'Content-Type': ['text/plain'] }), false);
  assert.equal(isBrotliEncoded(undefined), false);
});

test('installBrotliGuard rewrites requests and cancels only br responses', () => {
  const listeners = {};
  installBrotliGuard({
    webRequest: {
      onBeforeSendHeaders: (fn) => { listeners.send = fn; },
      onHeadersReceived: (fn) => { listeners.receive = fn; },
    },
  });
  const reply = (listener, details) => {
    let result;
    listener(details, (value) => { result = value; });
    return result;
  };

  const sent = reply(listeners.send, {
    requestHeaders: { 'Accept-Encoding': 'gzip, deflate, br', 'X-Wallet': 'hathor' },
  });
  assert.deepEqual(sent, {
    requestHeaders: { 'Accept-Encoding': 'gzip, deflate', 'X-Wallet': 'hathor' },
  });
  assert.deepEqual(reply(listeners.send, { requestHeaders: {} }), { requestHeaders: {} });

  assert.deepEqual(reply(listeners.receive, { responseHeaders: { 'Content-Encoding': ['br'] } }), { cancel: true });
  assert.deepEqual(reply(listeners.receive, { responseHeaders: { 'Content-Encoding': ['gzip'] } }), {});
  assert.deepEqual(reply(listeners.receive, {}), {});
});
