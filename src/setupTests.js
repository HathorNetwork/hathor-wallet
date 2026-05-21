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

jest.mock('@hathor/wallet-lib');
jest.mock('@hathor/hathor-rpc-handler');
jest.mock('@reown/walletkit');
jest.mock('@walletconnect/core');
jest.mock('@walletconnect/utils');
jest.mock('@sentry/electron');
jest.mock('@ledgerhq/hw-transport-node-hid');
jest.mock('unleash-proxy-client');
