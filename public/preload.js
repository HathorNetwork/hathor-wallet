/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// This file is executed right before electron start loading the index
const Sentry = require('@sentry/electron')
const constants = require('./constants');
const { ipcRenderer } = require('electron')

Sentry.init({
  dsn: constants.SENTRY_DSN,
  release: process.env.npm_package_version
})

process.once('loaded', () => {
  // Set closed in localStorage, so user does not open in the wallet page
  localStorage.setItem('localstorage:closed', true);

  // Sending to main process the information about systray message
  const systrayMessageChecked = JSON.parse(localStorage.getItem('wallet:systray_message_checked')) === true;
  ipcRenderer.send('systray_message:check', systrayMessageChecked);

  // Information about systray message changed, so we receive a message from the main process and save in localStorage
  ipcRenderer.on('systray_message:check', (e, check) => {
    localStorage.setItem('wallet:systray_message_checked', check);
  });
})
