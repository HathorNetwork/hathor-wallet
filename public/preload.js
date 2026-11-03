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

/**
 * Send the stored Sentry consent to this process's client and to main.
 */
function syncSentryConsent() {
  applySentryConsent(localStorage.getItem('wallet:sentry') === 'true');
}

/**
 * When migrating from wallets with version v0.26.0 and older initialized with hardware devices
 * we need to clean the localStorage since some state left over can cause issues
 */
function clearLegacyHardwareData() {
  const oldAccessDataRaw = localStorage.getItem('wallet:accessData');
  if (oldAccessDataRaw) {
    const accessData = JSON.parse(oldAccessDataRaw);
    const isHardware = localStorage.getItem('wallet:type') === 'hardware';
    if (accessData.from_xpub || isHardware) {
      const uniqueId = localStorage.getItem('app:uniqueId');
      localStorage.clear();
      localStorage.setItem('localstorage:started', 'true');
      localStorage.setItem('app:uniqueId', uniqueId);
    }
  }
}

/**
 * Set closed in localStorage, so user does not open in the wallet page
 */
function markClosed() {
  localStorage.setItem('localstorage:closed', 'true');
}

/**
 * Remove the access data of a hardware wallet, so a previously closed
 * hardware wallet will not be loaded again unless the device is connected
 */
function forgetHardwareWallet() {
  const accessDataRaw = localStorage.getItem('localstorage:accessdata');
  if (accessDataRaw) {
    const accessData = JSON.parse(accessDataRaw);
    if ((accessData?.walletFlags & 0x02) > 0) {
      localStorage.removeItem('localstorage:accessdata');
    }
  }
}

/**
 * Send to main process the information about systray message, and save it
 * in localStorage whenever main reports a change
 */
function syncSystrayMessage() {
  const systrayMessageChecked = JSON.parse(localStorage.getItem('wallet:systray_message_checked')) === true;
  ipcRenderer.send('systray_message:check', systrayMessageChecked);

  ipcRenderer.on('systray_message:check', (e, check) => {
    localStorage.setItem('wallet:systray_message_checked', check);
  });
}

// clearLegacyHardwareData may clear the stored consent, so it runs first.
const startupSteps = [
  clearLegacyHardwareData,
  syncSentryConsent,
  markClosed,
  forgetHardwareWallet,
  syncSystrayMessage,
];

/**
 * Each step runs on its own so a failure in one still lets the others run.
 */
process.once('loaded', () => {
  // A debugger attached while the window first loads can make the preload
  // also run in the window's initial about:blank document, where
  // localStorage throws SecurityError. That document is discarded right away
  // and the preload runs again for the wallet's own document, before any of
  // the wallet's scripts, so there is nothing to do here.
  if (window.location.href === 'about:blank') {
    return;
  }
  for (const step of startupSteps) {
    try {
      step();
    } catch (error) {
      console.error(`preload: startup step ${step.name} failed`, error);
      // Sent only with consent, like any other preload error.
      Sentry.captureException(error);
    }
  }
})
