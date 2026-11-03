/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// This file is executed right before electron start loading the index
const { contextBridge, ipcRenderer, shell } = require('electron')
const Sentry = require('@sentry/electron')
const constants = require('./constants');
const { createElectronAPI } = require('./bridge');
const { CONSENT_CHANNEL } = require('./sentryConsent');

// Init must run enabled, or the SDK skips installing the integration that
// forwards renderer events to the main process. Reporting is then switched
// off until the stored consent is read on 'loaded'.
Sentry.init({
  dsn: constants.SENTRY_DSN,
  release: constants.versionNumber,
  // EventToMain drops each event after forwarding it to main, which the SDK
  // counts as lost and would report straight to sentry.io.
  sendClientReports: false,
})
setSentryEnabled(false);

/**
 * Flip the live client instead of re-calling Sentry.init: the renderer SDK
 * ignores every init after the first one.
 */
function setSentryEnabled(enabled) {
  const client = Sentry.getCurrentHub().getClient();
  if (client) {
    client.getOptions().enabled = enabled;
  }
}

/**
 * Apply the user's consent here and in the main process, whose own Sentry
 * client sends crash dumps and sessions.
 */
function applySentryConsent(enabled) {
  setSentryEnabled(enabled);
  ipcRenderer.send(CONSENT_CHANNEL, enabled);
}

contextBridge.exposeInMainWorld('electronAPI', createElectronAPI({
  ipcRenderer,
  shell,
  Sentry,
  setSentryEnabled: applySentryConsent,
}));

process.once('loaded', () => {
  const oldAccessDataRaw = localStorage.getItem('wallet:accessData');
  if (oldAccessDataRaw) {
    // When migrating from wallets with version v0.26.0 and older initialized with hardware devices
    // we need to clean the localStorage since some state left over can cause issues
    const accessData = JSON.parse(oldAccessDataRaw);
    const isHardware = localStorage.getItem('wallet:type') === 'hardware';
    if (accessData.from_xpub || isHardware) {
      const uniqueId = localStorage.getItem('app:uniqueId');
      localStorage.clear();
      localStorage.setItem('localstorage:started', 'true');
      localStorage.setItem('app:uniqueId', uniqueId);
    }
  }

  // Read consent after the migration above, which may clear it.
  applySentryConsent(localStorage.getItem('wallet:sentry') === 'true');

  // Set closed in localStorage, so user does not open in the wallet page
  localStorage.setItem('localstorage:closed', 'true');

  const accessDataRaw = localStorage.getItem('localstorage:accessdata');
  if (accessDataRaw) {
    // check if the access data is from a hardware wallet, if so we need to remove it
    // This ensures that a previously closed hardware wallet will not be loaded again
    // unless the device is connected
    const accessData = JSON.parse(accessDataRaw);
    if ((accessData?.walletFlags & 0x02) > 0) {
      localStorage.removeItem('localstorage:accessdata');
    }
  }

  // Sending to main process the information about systray message
  const systrayMessageChecked = JSON.parse(localStorage.getItem('wallet:systray_message_checked')) === true;
  ipcRenderer.send('systray_message:check', systrayMessageChecked);

  // Information about systray message changed, so we receive a message from the main process and save in localStorage
  ipcRenderer.on('systray_message:check', (e, check) => {
    localStorage.setItem('wallet:systray_message_checked', check);
  });
})
