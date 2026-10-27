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
} = require('../../public/bridge');

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
