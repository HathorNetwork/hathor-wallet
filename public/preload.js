/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// This file is executed right before electron start loading the index
const Sentry = require('@sentry/electron')
const constants = require('./constants');

Sentry.init({
  dsn: constants.SENTRY_DSN,
  release: process.env.npm_package_version
})

process.once('loaded', () => {
  // Set closed in localStorage, so user does not open in the wallet page
  localStorage.setItem('wallet:closed', true);
})
