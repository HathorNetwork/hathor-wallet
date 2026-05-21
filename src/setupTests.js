/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Global test setup, auto-loaded by react-scripts before every test file.
 *
 * What lives here:
 *   - DOM-aware Jest matchers from @testing-library/jest-dom.
 *   - Activations of the centralized package mocks under src/__mocks__/.
 *     The mocks themselves describe their own contracts; this file is just
 *     the activation list.
 *
 * What does NOT live here:
 *   - Per-test mock behavior. Override the centralized mocks in a test file
 *     with `jest.mock('module-name', () => ({ … }))` when a specific test
 *     needs a different shape.
 *   - Application setup (Redux store, navigation). Those live in the
 *     `src/test-utils/` helpers and are imported by the tests that need them.
 *
 * Refs RFC 0001 (auto-qa) Reference-level § Centralized mocks.
 */

import '@testing-library/jest-dom';

// Manual mocks live under src/__mocks__/ and are auto-discovered by Jest
// because CRA's config has `roots: ['<rootDir>/src']`. Each call below
// activates the corresponding manual mock for every test file.
jest.mock('@hathor/wallet-lib');
jest.mock('@hathor/hathor-rpc-handler');
jest.mock('@reown/walletkit');
jest.mock('@walletconnect/core');
jest.mock('@walletconnect/utils');
jest.mock('@sentry/electron');
jest.mock('@ledgerhq/hw-transport-node-hid');
jest.mock('unleash-proxy-client');

// Stub the Redux store module to break a circular import chain that only
// triggers in test path: reducers → sagas/tokens → sagas/helpers →
// utils/tokens → store/index → reducers (re-entry). In production the cycle
// is benign because the entry-point evaluation order avoids re-entry; in a
// test, importing reducers first does not.
//
// The stub provides:
//   - a default-exported store with no-op dispatch/getState/subscribe, used
//     by ad-hoc dispatchers like utils/tokens.js and utils/wallet.js, and
//   - a `sagaMiddleware` with a no-op `.run()`, called once at store init.
//
// Tests that care about saga dispatch use redux-saga-test-plan against a
// fresh local store via createTestStore — they do not touch this stub.
jest.mock('./store/index', () => ({
  __esModule: true,
  default: {
    dispatch: jest.fn(),
    getState: jest.fn(() => ({})),
    subscribe: jest.fn(),
  },
  sagaMiddleware: { run: jest.fn() },
}));
