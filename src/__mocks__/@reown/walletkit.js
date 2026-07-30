/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Centralized mock for @reown/walletkit. The real package opens WebSocket
 * connections at module import time, which is hostile to a Jest run.
 */

const Core = jest.fn().mockImplementation(() => ({}));
const WalletKit = {
  init: jest.fn().mockResolvedValue({
    on: jest.fn(),
    off: jest.fn(),
    getActiveSessions: jest.fn(() => ({})),
    approveSession: jest.fn(),
    rejectSession: jest.fn(),
    disconnectSession: jest.fn(),
    respondSessionRequest: jest.fn(),
  }),
};

module.exports = {
  __esModule: true,
  Core,
  WalletKit,
  default: WalletKit,
};
