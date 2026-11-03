/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Fluent builder for scripted Ledger transport responses.
 *
 * IMPORTANT — see https://github.com/HathorNetwork/hathor-ledger-app for the
 * canonical APDU contract. This module SHAPES wallet code's interaction with
 * the Ledger transport; it does NOT certify Ledger firmware correctness.
 *
 * Usage:
 *   const ledger = createLedgerTransportMock()
 *     .respondTo('GET_VERSION', successResponse(versionPayload))
 *     .respondTo('GET_XPUB',    errorResponse(0x6985));  // user denied
 *   // pass ledger.transport into the code under test (or override the
 *   // centralized @ledgerhq/hw-transport-node-hid mock to return it).
 *
 * Refs RFC 0001 (auto-qa) § Helpers.
 */

const SW_SUCCESS = Buffer.from([0x90, 0x00]);

/**
 * Build a successful APDU response (payload followed by `0x9000`).
 * @param {Buffer|number[]|string} payload  Payload bytes (hex string accepted).
 */
export function successResponse(payload = []) {
  const body = toBuffer(payload);
  return Buffer.concat([body, SW_SUCCESS]);
}

/**
 * Build a Ledger error response containing only the 2-byte status word.
 * @param {number} statusWord  e.g. 0x6985 (user denied), 0x6E00 (CLA not supported)
 */
export function errorResponse(statusWord) {
  return Buffer.from([(statusWord >> 8) & 0xff, statusWord & 0xff]);
}

function toBuffer(input) {
  if (Buffer.isBuffer(input)) return input;
  if (Array.isArray(input)) return Buffer.from(input);
  if (typeof input === 'string') return Buffer.from(input, 'hex');
  return Buffer.alloc(0);
}

/**
 * Create a Ledger transport mock with scriptable responses keyed by command name.
 *
 * @returns {{
 *   transport: object,
 *   respondTo: (command: string, response: Buffer) => any,
 *   reset: () => any,
 * }}
 */
export function createLedgerTransportMock() {
  const responses = new Map();

  const send = jest.fn().mockImplementation((cla, ins, p1, p2, data) => {
    // Default key is the instruction byte (`ins`) in hex. Tests can register
    // either by friendly name (when they decode `ins` themselves) or by hex.
    const insKey = `0x${ins.toString(16).padStart(2, '0').toUpperCase()}`;
    const response = responses.get(insKey) ?? SW_SUCCESS;
    return Promise.resolve(response);
  });

  const api = {
    transport: {
      send,
      exchange: send,
      close: jest.fn().mockResolvedValue(undefined),
      on: jest.fn(),
      off: jest.fn(),
      setScrambleKey: jest.fn(),
    },
    /**
     * Register a response for a specific instruction.
     * @param {string|number} ins Instruction byte (number) or hex string like '0xC0'.
     * @param {Buffer} response Full APDU response (payload + status word).
     */
    respondTo(ins, response) {
      const key = typeof ins === 'number'
        ? `0x${ins.toString(16).padStart(2, '0').toUpperCase()}`
        : ins.toUpperCase();
      responses.set(key, response);
      return api;
    },
    reset() {
      responses.clear();
      send.mockClear();
      return api;
    },
  };

  return api;
}

export default createLedgerTransportMock;
