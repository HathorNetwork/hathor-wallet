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
const {
  VALID_SEND_CHANNELS,
  VALID_RECEIVE_CHANNELS,
  assertChannel,
  isAllowedExternalUrl,
} = require('./bridge');

// Init must run enabled, or the SDK skips installing the integration that
// forwards renderer events to the main process. Reporting is then switched
// off until the stored consent is read on 'loaded'.
Sentry.init({
  dsn: constants.SENTRY_DSN,
  release: constants.versionNumber,
  // Dropped-event counts would still be sent while reporting is off.
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

// No exposed function may return a Promise.
contextBridge.exposeInMainWorld('electronAPI', {
  send: (channel, ...args) => {
    assertChannel(VALID_SEND_CHANNELS, channel);
    ipcRenderer.send(channel, ...args);
  },
  on: (channel, listener) => {
    assertChannel(VALID_RECEIVE_CHANNELS, channel);
    // The Electron event is not forwarded across the bridge; listeners get
    // undefined in its place.
    ipcRenderer.on(channel, (_event, ...args) => listener(undefined, ...args));
  },
  removeAllListeners: (channel) => {
    assertChannel(VALID_RECEIVE_CHANNELS, channel);
    ipcRenderer.removeAllListeners(channel);
  },
  openExternal: (url) => {
    if (!isAllowedExternalUrl(url)) {
      throw new Error(`Refusing to open external URL: ${url}`);
    }
    shell.openExternal(url).catch((e) => console.error('openExternal failed', e));
  },
  sentrySetEnabled: (enabled) => {
    setSentryEnabled(enabled === true);
  },
  // The isolated SDK cannot see the page's errors, so the page forwards them.
  sentryCapture: ({ name, message, stack, extra }) => {
    const error = new Error(message);
    if (name) error.name = name;
    error.stack = stack || `${error.name}: ${message}`;
    Sentry.withScope(scope => {
      Object.entries(extra || {}).forEach(([key, item]) => scope.setExtra(key, item));
      Sentry.captureException(error);
    });
  },
});

process.once('loaded', () => {
  setSentryEnabled(localStorage.getItem('wallet:sentry') === 'true');

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
