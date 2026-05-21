/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

module.exports = {
  __esModule: true,
  buildApprovedNamespaces: jest.fn(() => ({})),
  getSdkError: jest.fn((msg) => ({ message: msg, code: 1 })),
  parseUri: jest.fn(),
};
