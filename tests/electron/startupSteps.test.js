/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { runStartupSteps } = require('../../public/startupSteps');

function recorder() {
  const events = [];
  return {
    events,
    log: (message) => events.push(`log ${message}`),
    report: (error) => events.push(`report ${error.message}`),
  };
}

test('a failure before the consent step is reported after it ran', () => {
  const r = recorder();
  const steps = [
    function clearLegacyHardwareData() { throw new Error('bad legacy data'); },
    function syncSentryConsent() { r.events.push('consent applied'); },
    function markClosed() { r.events.push('closed'); },
  ];

  runStartupSteps(steps, r);

  assert.deepEqual(r.events, [
    'log preload: startup step clearLegacyHardwareData failed',
    'consent applied',
    'closed',
    'report bad legacy data',
  ]);
});

test('every step runs and every failure is returned in order', () => {
  const r = recorder();
  const ran = [];
  const steps = [
    function a() { ran.push('a'); throw new Error('a'); },
    function b() { ran.push('b'); },
    function c() { ran.push('c'); throw new Error('c'); },
  ];

  const failures = runStartupSteps(steps, r);

  assert.deepEqual(ran, ['a', 'b', 'c']);
  assert.deepEqual(failures.map((e) => e.message), ['a', 'c']);
  assert.deepEqual(r.events.filter((e) => e.startsWith('report')), ['report a', 'report c']);
});

test('nothing is logged or reported when every step succeeds', () => {
  const r = recorder();
  assert.deepEqual(runStartupSteps([function ok() {}], r), []);
  assert.deepEqual(r.events, []);
});
