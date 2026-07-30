/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Mock for the Unleash feature-flag client. The real client polls an HTTP
 * endpoint on a recurring timer at construction time; the mock returns a
 * static no-flags-enabled state so tests don't have flag-driven flakiness.
 */

class UnleashClient {
  constructor() {
    this.handlers = {};
  }
  on(event, handler) {
    this.handlers[event] = handler;
    return this;
  }
  start() {
    return Promise.resolve();
  }
  stop() {}
  isEnabled() {
    return false;
  }
  getVariant() {
    return { name: 'disabled', enabled: false };
  }
  updateContext() {
    return Promise.resolve();
  }
}

module.exports = {
  __esModule: true,
  UnleashClient,
  default: UnleashClient,
};
