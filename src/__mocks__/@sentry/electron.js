/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * No-op Sentry mock so test runs don't initiate any error telemetry.
 */

module.exports = {
  __esModule: true,
  init: jest.fn(),
  captureException: jest.fn(),
  captureMessage: jest.fn(),
  configureScope: jest.fn(),
  withScope: jest.fn((cb) => cb({ setExtras: jest.fn(), setTag: jest.fn() })),
  setUser: jest.fn(),
  setTag: jest.fn(),
  Severity: { Error: 'error', Warning: 'warning', Info: 'info' },
};
