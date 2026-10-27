/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Main-process side of Sentry consent. The user's choice lives in the
// renderer's localStorage, which main cannot read, so preload.js reports it
// over IPC and main persists a copy for its next start, when crash dumps from
// the previous run are uploaded before any window has loaded.

const CONSENT_CHANNEL = 'sentry:consent';

/**
 * A boolean consent flag persisted as JSON. Anything unreadable counts as no
 * consent.
 */
function createConsentStore(filePath, fs) {
  let enabled = false;
  try {
    enabled = JSON.parse(fs.readFileSync(filePath, 'utf8')).enabled === true;
  } catch (_e) {
    enabled = false;
  }
  return {
    isEnabled: () => enabled,
    setEnabled: (value) => {
      const next = value === true;
      if (next === enabled) {
        return;
      }
      enabled = next;
      try {
        fs.writeFileSync(filePath, JSON.stringify({ enabled }));
      } catch (e) {
        console.error('Could not persist Sentry consent', e);
      }
    },
  };
}

/**
 * Subclass a Sentry transport so nothing leaves the machine without consent.
 * Events, sessions, crash dumps and the offline queue's retries all go
 * through sendRequest; the client's `enabled` option misses the last three.
 * Refused requests are dropped, not queued.
 */
function gateTransport(Transport, isEnabled) {
  return class ConsentGatedTransport extends Transport {
    sendRequest(request) {
      if (!isEnabled()) {
        return Promise.resolve({ status: 'skipped' });
      }
      return super.sendRequest(request);
    }
  };
}

module.exports = { CONSENT_CHANNEL, createConsentStore, gateTransport };
