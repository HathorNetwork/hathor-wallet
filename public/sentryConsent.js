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
  const revokeListeners = [];
  return {
    isEnabled: () => enabled,
    onRevoke: (listener) => { revokeListeners.push(listener); },
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
        if (!enabled) {
          // A file still granting consent would let the next start upload.
          try {
            fs.rmSync(filePath, { force: true });
          } catch (rmError) {
            console.error('Could not remove Sentry consent', rmError);
          }
        }
      }
      if (!enabled) {
        revokeListeners.forEach((listener) => {
          try {
            listener();
          } catch (e) {
            console.error('Sentry consent revoke listener failed', e);
          }
        });
      }
    },
  };
}

/**
 * Apply the consent changes preload reports. A grant applies at once. A
 * revoke first waits for `flush`, so renderer events that reached main just
 * before it, and are still being processed, send under the consent they were
 * captured with: the crash modal's "Send error report" grants, captures and
 * revokes in a single tick. A later change supersedes a pending revoke.
 */
function createConsentHandler(store, flush) {
  let latest = 0;
  return (enabled) => {
    const change = ++latest;
    if (enabled === true) {
      store.setEnabled(true);
      return Promise.resolve();
    }
    return Promise.resolve()
      .then(flush)
      .catch((e) => console.error('Sentry flush before revoking consent failed', e))
      .then(() => {
        if (change === latest) {
          store.setEnabled(false);
        }
      });
  };
}

/**
 * Subclass a Sentry transport so nothing leaves the machine without consent.
 * Events, sessions, crash dumps and the offline queue's retries all go
 * through sendRequest; the client's `enabled` option misses the last three.
 * Refused requests are dropped, not queued.
 *
 * The offline transport's queue only flushes again after a successful send, so
 * a refused retry flushes it instead: requests queued under an earlier grant
 * must not wait on disk for a later one. A revoke starts that at once, since
 * the next retry can be hours away. Only retries, which carry their queue date,
 * do this: a flush that throws is captured as a new request, and if that
 * flushed too the two would feed each other.
 */
function gateTransport(Transport, store) {
  return class ConsentGatedTransport extends Transport {
    constructor(...args) {
      super(...args);
      store.onRevoke(() => this._flushQueue());
    }

    sendRequest(request) {
      if (!store.isEnabled()) {
        if (request.date) {
          this._flushQueue();
        }
        return Promise.resolve({ status: 'skipped' });
      }
      return super.sendRequest(request);
    }
  };
}

module.exports = { CONSENT_CHANNEL, createConsentStore, createConsentHandler, gateTransport };
