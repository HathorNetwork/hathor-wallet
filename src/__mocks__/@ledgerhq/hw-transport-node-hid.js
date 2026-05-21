/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Centralized mock for the Ledger USB transport.
 *
 * IMPORTANT — this is a CONTRACT MIRROR, not a Ledger reimplementation. The
 * response shapes here are intended to match what the real device sends, so
 * the wallet's APDU-handling code is exercised end-to-end against the same
 * byte layout it sees in production.
 *
 * When the real device behavior diverges from this mock:
 *   See https://github.com/HathorNetwork/hathor-ledger-app — its pytest +
 *   Speculos suite is the authoritative source for APDU contracts.
 *
 * JS-mock tests certify the wallet code's behavior GIVEN a Ledger response
 * shape. They do NOT certify Ledger firmware correctness; release validation
 * for Ledger flows continues to live in QA_LEDGER.md against real hardware.
 *
 * Per-test customization: tests can override the default mock via
 *   jest.mock('@ledgerhq/hw-transport-node-hid', () => ({ ... }))
 * at the top of the test file. The default below is the "happy path" — Ledger
 * present, no errors — sufficient for most tests that aren't specifically
 * exercising the hardware-wallet path.
 */

const successStatus = Buffer.from([0x90, 0x00]);

const transport = {
  send: jest.fn().mockResolvedValue(successStatus),
  close: jest.fn().mockResolvedValue(undefined),
  on: jest.fn(),
  off: jest.fn(),
  setScrambleKey: jest.fn(),
  exchange: jest.fn().mockResolvedValue(successStatus),
};

const TransportNodeHid = {
  isSupported: jest.fn().mockResolvedValue(true),
  list: jest.fn().mockResolvedValue([]),
  listen: jest.fn(),
  open: jest.fn().mockResolvedValue(transport),
  create: jest.fn().mockResolvedValue(transport),
};

module.exports = {
  __esModule: true,
  default: TransportNodeHid,
  ...TransportNodeHid,
};
