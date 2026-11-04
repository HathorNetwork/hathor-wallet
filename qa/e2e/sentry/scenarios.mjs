/**
 * Sentry scenarios, keyed by their id in qa/graph/sentry.yaml. Each one gets
 * a ctx on a fresh copy of its setup's profile (../lib/harness.mjs), throws on
 * the first failed assertion, and returns details for the report. Every
 * request bound for Sentry ends at the local sink (../lib/sink.mjs).
 *
 * The expectations are the graph's outcomes.
 */
import fs from 'fs';
import path from 'path';
import {
  assert, eq, sleep, CONFIRM_RESET_MESSAGE,
} from '../lib/harness.mjs';

const RELEASE = JSON.parse(fs.readFileSync(new URL('../../../package.json', import.meta.url), 'utf8')).version;
const optedIn = (setup) => setup === 'fresh-in' || setup === 'io-in';

const isEvent = (text) => (i) => i.type === 'event' && String(i.message).includes(text);
const isDump = (i) => i.type === 'attachment' && i.minidump;

// ---- launch-quit: ok-follows-consent, ok-consent-file, err-legacy-wiped -----

const launchQuitSilent = (expectedConsent) => async (ctx) => {
  const since = ctx.sink.mark();
  await ctx.launch();
  eq(await ctx.consent(), expectedConsent, 'consent file once loaded');
  await ctx.quit();
  await ctx.expectNone(since, { ms: 3000 });
};

// ---- page-error: ok-sent-once, ok-modal-on-throw, edge-* ---------------------

const PAGE_ERRORS = {
  throw: { js: 'setTimeout(() => { throw new Error("qa-page-throw") })', text: 'qa-page-throw', source: 'window.error', modal: true },
  'reject-error': { js: 'Promise.reject(new Error("qa-page-reject"))', text: 'qa-page-reject', source: 'unhandledrejection', modal: false },
  'reject-string': { js: 'Promise.reject("qa-page-reject-str")', text: 'Error: qa-page-reject-str', source: 'unhandledrejection', modal: false },
  errorless: { js: 'window.dispatchEvent(new ErrorEvent("error", { message: "qa-errorless" }))', text: 'qa-errorless', source: 'window.error', modal: false },
  'same-twice': { js: 'const e = new Error("qa-dup"); Promise.reject(e); Promise.reject(e)', text: 'qa-dup', source: 'unhandledrejection', modal: false },
};

const pageError = (setup, kind) => async (ctx) => {
  const spec = PAGE_ERRORS[kind];
  await ctx.launch();
  const since = ctx.sink.mark();
  await ctx.page(`(() => { ${spec.js}; return 1; })()`);
  await sleep(500);
  eq(await ctx.modalOpen(), spec.modal, 'unhandled-error modal open');
  if (!optedIn(setup)) {
    await ctx.expectNone(since, { pred: (i) => i.type === 'event', what: 'event while not opted in' });
    return 'nothing sent';
  }
  const ev = await ctx.sink.waitFor(isEvent(spec.text), { since, what: `event "${spec.text}"` });
  eq(ev.source, spec.source, 'extra.source');
  await sleep(2500);
  eq(ctx.events(since, spec.text).length, 1, 'events sent');
  return `one event "${ev.message}" source=${ev.source}`;
};

// ---- crash-modal-report -----------------------------------------------------

const crashModal = (setup, clicks) => async (ctx) => {
  await ctx.launch();
  const since = ctx.sink.mark();
  await ctx.page('setTimeout(() => { throw new Error("qa-page-throw") }); 1');
  await ctx.waitModal();
  const hasButton = await ctx.cdp.page('hasTestId', 'modal-unhandled-error-send-report');
  if (optedIn(setup)) {
    // edge-button-hidden-opted-in
    eq(hasButton, false, 'send-report button shown while opted in');
    await sleep(3000);
    eq(ctx.events(since, 'qa-page-throw').length, 1, 'events sent automatically');
    return 'no button; sent once automatically';
  }
  assert(hasButton, 'send-report button missing while opted out');
  for (let n = 0; n < (clicks === 'twice' ? 2 : 1); n += 1) {
    await ctx.cdp.clickTestId('modal-unhandled-error-send-report');
    await sleep(300);
  }
  await ctx.cdp.expectText('Report sent to Hathor Team! Thanks for the support!', { timeout: 5000 });
  // ok-report-delivered, ok-report-has-error, edge-double-click
  await ctx.sink.waitFor(isEvent('qa-page-throw'), { since, what: 'the reported event' });
  await sleep(3000);
  const sent = ctx.events(since, 'qa-page-throw');
  // edge-double-click: the SDK's Dedupe drops the identical second capture.
  eq(sent.length, 1, 'reports sent');
  await ctx.waitConsent(false);
  eq(await ctx.ls('wallet:sentry'), 'false', 'stored consent after the report');
  return `${sent.length} report(s) sent; consent back to false`;
};

// ---- main-crash: ok-dump-sent, ok-main-exception-once, ok-main-native-at-next-start, ok-opted-out-silent

const mainCrash = (setup, crash, relaunch) => async (ctx) => {
  const inn = optedIn(setup);
  await ctx.launch();
  const since = ctx.sink.mark();
  const details = [];

  if (crash === 'main-exception') {
    await ctx.control('throw-main', { message: 'qa-main-throw' });
    if (inn) {
      await ctx.sink.waitFor(isEvent('qa-main-throw'), { since, what: 'the main exception event' });
      await sleep(2000);
      eq(ctx.events(since, 'qa-main-throw').length, 1, 'main exception events');
    } else {
      await ctx.expectNone(since, { pred: (i) => i.type === 'event' });
    }
    assert(await ctx.alive(), 'app died after a main-process exception');
    details.push(inn ? 'sent once, app alive' : 'nothing sent, app alive');
  } else if (crash === 'renderer-native') {
    await ctx.control('crash-renderer');
    await ctx.waitRendererGone();
    if (inn) {
      await ctx.sink.waitFor(isDump, { since, timeout: 30000, what: 'a minidump at crash time' });
      details.push('minidump at crash time');
    } else {
      await ctx.expectNone(since, { ms: 8000, what: 'envelope at crash time' });
      details.push('nothing at crash time');
    }
    await ctx.quit();
  } else if (crash === 'main-native') {
    await ctx.control('crash-main');
    const { signal } = await ctx.quit('gone');
    assert(signal && signal !== 'SIGKILL', `main did not crash: it ended with signal ${signal}`);
    if (!inn) await ctx.expectNone(since, { ms: 2000 });
  }

  if (crash !== 'main-exception') {
    const relaunchMark = ctx.sink.mark();
    await ctx.launch();
    if (crash === 'main-native' && inn) {
      await ctx.sink.waitFor(isDump, { since: relaunchMark, timeout: 30000, what: 'the previous run\'s minidump at relaunch' });
      details.push('minidump at relaunch');
    } else if (!inn) {
      await ctx.expectNone(since, { ms: 6000, what: 'envelope at quit or relaunch' });
      details.push('nothing at quit or relaunch');
    }
  }

  if (relaunch === 'flipped') {
    const flipMark = ctx.sink.mark();
    await ctx.setConsentUI(!inn);
    await ctx.waitConsent(!inn);
    if (!inn) {
      // The dump of an opted-out crash is deleted, not queued: opting in later sends nothing old.
      await ctx.expectNone(flipMark, { ms: 8000, pred: (i) => i.type !== 'session', what: 'old report after opting in' });
      details.push('opting in later sent nothing old');
    } else {
      details.push('opted out after relaunch');
    }
  }
  return details.join('; ');
};

// ---- offline-queue -----------------------------------------------------------

/** What main's offline queue holds on disk: its index, and the request bodies beside it. */
const queueOnDisk = (ctx) => {
  const dir = path.join(ctx.profile, 'Hathor Wallet', 'sentry', 'queue');
  if (!fs.existsSync(dir)) return { index: [], bodies: [] };
  const read = () => { try { return JSON.parse(fs.readFileSync(path.join(dir, 'queue.json'), 'utf8')); } catch (_e) { return []; } };
  return { index: read(), bodies: fs.readdirSync(dir).filter((f) => f !== 'queue.json') };
};

const offlineQueue = (retry) => async (ctx) => {
  await ctx.launch();
  await ctx.sink.offline();
  try {
    await ctx.control('throw-main', { message: 'qa-offline-main' });
    await ctx.page('setTimeout(() => { throw new Error("qa-offline-page") }); 1');
    await sleep(3000);
    if (retry === 'out') {
      const queued = queueOnDisk(ctx).index.length;
      assert(queued >= 2, `expected the two events queued on disk, got ${queued}`);
      const t0 = Date.now();
      await ctx.setConsentUI(false);
      await ctx.waitConsent(false, 10000);
      // edge-revoke-waits-offline: informational
      ctx.log(`revoke while offline took ${Date.now() - t0} ms`);
      // ok-retry-refused: opting out empties the queue at once, without a relaunch.
      await sleep(1000);
      const left = queueOnDisk(ctx);
      eq(left.index.length, 0, 'requests queued on disk after opting out');
      eq(left.bodies.length, 0, 'request bodies on disk after opting out');
    }
    await ctx.quit();
  } finally {
    await ctx.sink.online();
  }
  const since = ctx.sink.mark();
  await ctx.launch();
  if (retry === 'in') {
    await ctx.sink.waitFor(isEvent('qa-offline-main'), { since, timeout: 30000, what: 'the queued main event' });
    await ctx.sink.waitFor(isEvent('qa-offline-page'), { since, timeout: 30000, what: 'the queued page event' });
    return 'both queued events delivered after relaunch';
  }
  await ctx.expectNone(since, { ms: 10000, pred: (i) => i.type === 'event', what: 'queued event after opting out' });
  // ok-retry-refused: nothing old arrives after a later opt-in either.
  await ctx.setConsentUI(true);
  await ctx.waitConsent(true);
  await ctx.relaunch();
  await ctx.control('throw-main', { message: 'qa-offline-new' });
  await ctx.sink.waitFor(isEvent('qa-offline-new'), { since, what: 'the new event after opting in' });
  await ctx.expectNone(since, { ms: 10000, pred: (i) => i.type === 'event' && /qa-offline-(main|page)/.test(i.message), what: 'old queued event after a later opt-in' });
  return 'queue emptied at the opt-out; nothing old sent, then or after a later opt-in';
};

// ---- reset-data ---------------------------------------------------------------

const resetAllData = async (ctx) => {
  await ctx.launch();
  await ctx.control('reset-all-data');
  await ctx.cdp.expectText('Confirm reset all data');
  await ctx.cdp.typeTestId('modal-confirm-clear-storage-input', CONFIRM_RESET_MESSAGE);
  // Main closes the window as soon as the data is cleared, so the click's CDP reply may never come.
  await ctx.cdp.clickTestId('modal-confirm-clear-storage-confirm').catch(() => {});
  await ctx.waitConsent(false);
  await ctx.quit();
  const since = ctx.sink.mark();
  await ctx.launch();
  await ctx.control('throw-main', { message: 'qa-after-reset' });
  await ctx.expectNone(since, { pred: (i) => i.type === 'event' });
  return 'consent revoked; a later main exception sent nothing';
};

const modalResetWallet = async (ctx) => {
  await ctx.launch();
  await ctx.page('setTimeout(() => { throw new Error("qa-page-throw") }); 1');
  await ctx.waitModal();
  await ctx.cdp.clickTestId('modal-unhandled-error-reset-wallet');
  await ctx.cdp.byTestId('welcome-get-started', { timeout: 15000 });
  // edge-reset-wallet-keeps-consent
  eq(await ctx.consent(), true, 'consent file after Reset wallet');
  const since = ctx.sink.mark();
  await ctx.control('throw-main', { message: 'qa-after-wallet-reset' });
  await ctx.sink.waitFor(isEvent('qa-after-wallet-reset'), { since, what: 'a report after Reset wallet' });
  await ctx.getStarted();
  await sleep(1000);
  eq(await ctx.consent(), true, 'consent file after Get started');
  eq(await ctx.ls('wallet:sentry'), 'true', 'stored consent after Get started');
  return 'consent kept through Reset wallet and Get started';
};

// ---- startup-step-failure -----------------------------------------------------

const STEPS = {
  systray: { key: 'wallet:systray_message_checked', restore: 'false', step: 'syncSystrayMessage' },
  legacy: { key: 'wallet:accessData', restore: null, step: 'clearLegacyHardwareData' },
};

const stepFailure = (setup, which) => async (ctx) => {
  const spec = STEPS[which];
  await ctx.launch();
  await ctx.page(`localStorage.setItem(${JSON.stringify(spec.key)}, '{bad')`);
  const since = ctx.sink.mark();
  const consoleMark = ctx.cdp.console.length;
  await ctx.page('location.reload(); 1').catch(() => {});
  await sleep(1000);
  await ctx.cdp.waitFor('document.readyState === "complete" && document.body.innerText.length > 20', { what: 'reload' });
  await sleep(1500);
  const logged = ctx.cdp.console.slice(consoleMark).some((c) => c.text.includes(`preload: startup step ${spec.step} failed`));
  assert(logged, `no "startup step ${spec.step} failed" in the console`);
  const sent = sink => sink.since(since, (i) => i.type === 'event' && /SyntaxError/.test(i.message));
  if (optedIn(setup)) {
    // Reported after the consent step ran, whichever step failed.
    await ctx.sink.waitFor((i) => i.type === 'event' && /SyntaxError/.test(i.message), { since, what: 'the step failure event' });
  } else {
    await sleep(3000);
    eq(sent(ctx.sink).length, 0, 'step failure events');
  }
  await ctx.page(spec.restore === null ? `localStorage.removeItem(${JSON.stringify(spec.key)})` : `localStorage.setItem(${JSON.stringify(spec.key)}, ${JSON.stringify(spec.restore)})`);
  return `${spec.step} failure logged; ${sent(ctx.sink).length} event(s)`;
};

// ---- bridge-probe ---------------------------------------------------------------

const BRIDGE = {
  'send-consent-channel': async (ctx) => {
    const msg = await ctx.page('(() => { try { window.electronAPI.send("sentry:consent", true); return "no throw"; } catch (e) { return e.message; } })()');
    eq(msg, 'IPC channel "sentry:consent" is not allowlisted in public/bridge.js', 'error');
  },
  'set-enabled-string': async (ctx) => {
    await ctx.page('window.electronAPI.sentrySetEnabled("true"); 1');
    await sleep(500);
  },
  'capture-direct': async (ctx) => {
    const r = await ctx.page('typeof window.electronAPI.sentryCapture({ message: "qa-bridge-capture" })');
    eq(r, 'undefined', 'sentryCapture return');
  },
  'require-gone': async (ctx) => {
    eq(await ctx.page('typeof window.require'), 'undefined', 'typeof window.require');
  },
};

const bridgeProbe = (probe) => async (ctx) => {
  await ctx.launch();
  const since = ctx.sink.mark();
  await BRIDGE[probe](ctx);
  eq(await ctx.consent(), 'absent', 'consent file (never granted)');
  await ctx.page('setTimeout(() => { throw new Error("qa-after-probe") }); 1');
  await ctx.expectNone(since, { pred: (i) => i.type === 'event', what: 'event while opted out' });
};

// ---- ipc-listener-error ---------------------------------------------------------

const ipcListenerError = (setup) => async (ctx) => {
  await ctx.launch();
  await ctx.cdp.clickTestId('wallet-type-hardware');
  await sleep(1500);
  const since = ctx.sink.mark();
  await ctx.control('send', { channel: 'ledger:version', args: '[null]' });
  await ctx.waitModal();
  if (!optedIn(setup)) {
    await ctx.expectNone(since, { pred: (i) => i.type === 'event' });
    return 'modal open; nothing sent';
  }
  const ev = await ctx.sink.waitFor((i) => i.type === 'event', { since, what: 'the listener error event' });
  await sleep(2500);
  eq(ctx.sink.since(since, (i) => i.type === 'event').length, 1, 'events');
  eq(ev.source, 'window.error', 'extra.source');
  return `modal open; one event "${ev.message}"`;
};

// ---- external-url (bridge level; the Public Explorer link needs a loaded wallet) --

const externalUrl = async (ctx) => {
  await ctx.launch();
  const since = ctx.sink.mark();
  const refused = await ctx.page('(() => { try { window.electronAPI.openExternal("localhost:3001"); return "opened"; } catch (e) { return e.message; } })()');
  eq(refused, 'Refusing to open external URL: localhost:3001', 'refusal');
  await ctx.page('window.electronAPI.openExternal("https://explorer.hathor.network/"); 1');
  await sleep(500);
  await sleep(1000);
  const opened = ctx.openedUrls();
  eq(JSON.stringify(opened), JSON.stringify(['https://explorer.hathor.network/']), 'URLs handed to the OS');
  await ctx.expectNone(since, { ms: 2000, pred: (i) => i.type === 'event' });
  return 'non-http refused, https opened, nothing sent';
};

// ---- toggle-consent: ok-applied-live, ok-survives-relaunch ------------------------

const toggleConsent = (setup, toggle) => async (ctx) => {
  const target = toggle === 'unchanged' ? optedIn(setup) : toggle === 'out-to-in';
  await ctx.launch();
  await ctx.setConsentUI(target);
  await ctx.waitConsent(target === false && !optedIn(setup) ? 'absent' : target);
  const check = async (where, fire, text) => {
    const since = ctx.sink.mark();
    await fire();
    if (target) await ctx.sink.waitFor(isEvent(text), { since, what: `${where} event` });
    else await ctx.expectNone(since, { pred: (i) => i.type === 'event', what: `${where} event` });
  };
  await check('page', () => ctx.page('setTimeout(() => { throw new Error("qa-toggle-page") }); 1'), 'qa-toggle-page');
  await ctx.relaunch();
  await check('main, after relaunch', () => ctx.control('throw-main', { message: 'qa-toggle-main' }), 'qa-toggle-main');
  return `consent ${target ? 'on' : 'off'} live and after relaunch, page and main`;
};

// ---- onboarding after a wallet reset: ok-starts-opted-out --------------------------------

const getStartedAfterReset = async (ctx) => {
  await ctx.launch();
  await ctx.page('setTimeout(() => { throw new Error("qa-page-throw") }); 1');
  await ctx.waitModal();
  await ctx.cdp.clickTestId('modal-unhandled-error-reset-wallet');
  await ctx.getStarted();
  await sleep(1000);
  eq(await ctx.consent(), true, 'consent file after Get started');
  eq(await ctx.ls('wallet:sentry'), 'true', 'stored consent');
  return 'an opted-in user stays opted in after Reset wallet and Get started';
};

// ---- quit-methods -----------------------------------------------------------------

/** Turns the systray on through the app menu, as a user does. */
async function enableSystray(ctx) {
  await ctx.control('menu-click', { label: 'Systray' });
  await sleep(1000);
}

const trayExit = async (ctx) => {
  await ctx.launch();
  await enableSystray(ctx);
  const since = ctx.sink.mark();
  await ctx.control('tray-click', { label: 'Exit' });
  const { signal } = await ctx.quit('gone');
  assert(signal !== 'SIGKILL', 'tray Exit hung and had to be killed');
  const session = await ctx.sink.waitFor((i) => i.type === 'session', { since, what: 'a session at tray Exit' });
  eq(session.status, 'exited', 'session status at tray Exit');
  const relaunchMark = ctx.sink.mark();
  await ctx.launch();
  await sleep(4000);
  const abnormal = ctx.sink.since(relaunchMark, (i) => i.type === 'session' && i.status === 'abnormal');
  eq(abnormal.length, 0, 'abnormal sessions at the next launch');
  return 'tray Exit ends the session as exited; nothing abnormal at the next launch';
};

const closeToTray = async (ctx) => {
  await ctx.launch();
  await enableSystray(ctx);
  const since = ctx.sink.mark();
  await ctx.control('close-window');
  await sleep(2000);
  assert(await ctx.alive(), 'the app quit on window close with the systray on');
  eq(await ctx.control('window-visible'), 'false', 'window visible after close');
  eq(ctx.sink.since(since, (i) => i.type === 'session').length, 0, 'sessions while hidden');
  // Cmd+Q (app.quit) must still quit with the window hidden to the tray.
  const { signal } = await ctx.quit('quit');
  assert(signal !== 'SIGKILL', 'Cmd+Q with the window hidden hung and had to be killed');
  const session = await ctx.sink.waitFor((i) => i.type === 'session', { since, what: 'a session at quit' });
  eq(session.status, 'exited', 'session status');
  return 'close hides to the tray; Cmd+Q then quits and ends the session';
};

const cmdQ = async (ctx) => {
  await ctx.launch();
  const since = ctx.sink.mark();
  const { signal } = await ctx.quit();
  assert(signal !== 'SIGKILL', 'Cmd+Q hung and had to be killed');
  await sleep(3000);
  const atQuit = ctx.sink.since(since, (i) => i.type === 'session');
  eq(atQuit.length, 1, 'sessions at quit');
  eq(atQuit[0].status, 'exited', 'session status');
  return 'session(exited) at quit';
};

// ---- setups ----------------------------------------------------------------------

/** Setup builders: bring an empty profile to each setup of the graph. */
export const SETUPS = {
  'fresh-none': async () => {},
  'fresh-out': async (ctx) => {
    await ctx.launch();
    await ctx.getStarted();
    await ctx.quit();
  },
  'fresh-in': async (ctx) => {
    await ctx.launch();
    await ctx.getStarted();
    await ctx.setConsentUI(true);
    await ctx.waitConsent(true);
    await ctx.quit();
  },
  'legacy-in': async (ctx) => {
    await SETUPS['fresh-in'](ctx);
    await ctx.launch();
    await ctx.page(`localStorage.setItem('wallet:accessData', JSON.stringify({ from_xpub: true }));
      localStorage.setItem('wallet:type', 'hardware')`);
    await ctx.quit();
  },
};
// The real-sentry.io setup runs here as the opted-in profile, with the real DSN redirected to the sink.
SETUPS['io-in'] = SETUPS['fresh-in'];

/** 'redirect' keeps the production DSN and rewrites sentry.io requests to the sink; 'dsn' points SENTRY_DSN at it. */
export const modeOf = (id) => (id.split(':')[1] === 'io-in' ? 'redirect' : 'dsn');

// ---- the table ----------------------------------------------------------------------

export const SCENARIOS = {
  'launch-quit:fresh-none': launchQuitSilent('absent'),
  'launch-quit:fresh-out': launchQuitSilent('absent'),
  'launch-quit:fresh-in': async (ctx) => {
    const since = ctx.sink.mark();
    await ctx.launch();
    await ctx.waitConsent(true);
    await ctx.quit();
    const session = await ctx.sink.waitFor((i) => i.type === 'session' && i.status === 'exited', { since, what: 'session(status=exited) at quit' });
    eq(session.release, RELEASE, 'session release');
    return `session exited, release ${session.release}`;
  },
  'launch-quit:legacy-in': async (ctx) => {
    const since = ctx.sink.mark();
    await ctx.launch();
    eq(await ctx.ls('wallet:sentry'), null, 'stored consent after the legacy wipe');
    await ctx.waitConsent(false);
    await ctx.quit();
    await ctx.expectNone(since, { ms: 3000 });
    return 'legacy wipe cleared consent; nothing sent';
  },
  'launch-quit:io-in': async (ctx) => {
    const since = ctx.sink.mark();
    await ctx.launch();
    await ctx.quit();
    const session = await ctx.sink.waitFor((i) => i.type === 'session', { since, what: 'a session through the redirect' });
    const redirected = ctx.shimLog().filter((e) => e.kind === 'sentry-request' && e.action === 'redirected');
    assert(redirected.length > 0, 'no sentry.io request was redirected');
    return `${redirected.length} request(s) to ${new URL(redirected[0].url).host} redirected; session ${session.status}`;
  },

  'quit-methods:fresh-in:cmd-q': cmdQ,
  'quit-methods:fresh-in:tray-exit': trayExit,
  'quit-methods:fresh-in:window-close': closeToTray,

  'onboarding-get-started:fresh-none': async (ctx) => {
    const since = ctx.sink.mark();
    await ctx.launch();
    await ctx.getStarted();
    eq(await ctx.ls('wallet:sentry'), 'false', 'stored consent');
    await sleep(1000);
    eq(await ctx.consent(), 'absent', 'consent file (false is never written over no consent)');
    await ctx.expectNone(since, { ms: 2000 });
  },

  'onboarding-get-started:fresh-in': getStartedAfterReset,

  'offline-queue:fresh-in:in': offlineQueue('in'),
  'offline-queue:fresh-in:out': offlineQueue('out'),

  'reset-data:fresh-in:reset-all-data': resetAllData,
  'reset-data:fresh-in:modal-reset-wallet': modalResetWallet,

  'bridge-probe:fresh-out:send-consent-channel': bridgeProbe('send-consent-channel'),
  'bridge-probe:fresh-out:set-enabled-string': bridgeProbe('set-enabled-string'),
  'bridge-probe:fresh-out:capture-direct': bridgeProbe('capture-direct'),
  'bridge-probe:fresh-out:require-gone': bridgeProbe('require-gone'),

  'ipc-listener-error:fresh-in': ipcListenerError('fresh-in'),
  'ipc-listener-error:fresh-out': ipcListenerError('fresh-out'),

  'external-url:fresh-in': externalUrl,
};

for (const setup of ['fresh-in', 'fresh-out']) {
  for (const toggle of ['in-to-out', 'out-to-in', 'unchanged']) SCENARIOS[`toggle-consent:${setup}:${toggle}`] = toggleConsent(setup, toggle);
}
for (const setup of ['fresh-in', 'fresh-out', 'io-in']) {
  for (const clicks of ['once', 'twice']) SCENARIOS[`crash-modal-report:${setup}:${clicks}`] = crashModal(setup, clicks);
}
for (const setup of ['fresh-none', 'fresh-in', 'fresh-out', 'io-in']) {
  for (const kind of Object.keys(PAGE_ERRORS)) SCENARIOS[`page-error:${setup}:${kind}`] = pageError(setup, kind);
}
for (const setup of ['fresh-in', 'fresh-out', 'io-in']) {
  for (const crash of ['renderer-native', 'main-exception', 'main-native']) {
    for (const relaunch of ['same', 'flipped']) SCENARIOS[`main-crash:${setup}:${crash}.${relaunch}`] = mainCrash(setup, crash, relaunch);
  }
}
for (const setup of ['fresh-in', 'fresh-out']) {
  for (const step of Object.keys(STEPS)) SCENARIOS[`startup-step-failure:${setup}:${step}`] = stepFailure(setup, step);
}

/** The runbook's tier 1, as id prefixes (pkg-* scenarios run as their fresh-* twins here). */
export const TIER1 = [
  'launch-quit:fresh-none', 'launch-quit:fresh-out', 'launch-quit:fresh-in',
  'onboarding-get-started:fresh-none',
  'toggle-consent:fresh-in:in-to-out', 'toggle-consent:fresh-out:out-to-in',
  'page-error:fresh-in:throw', 'page-error:fresh-out:throw',
  'crash-modal-report:fresh-out:once',
  'main-crash:fresh-in', 'main-crash:fresh-out',
  'bridge-probe:fresh-out:send-consent-channel',
  'launch-quit:io-in', 'page-error:io-in:throw',
];

/** Graph scenarios left manual, with the reason, matched by a fragment of the id. */
export const MANUAL = [
  [':pkg-', 'packaged macOS .app; run from the Mac runbook'],
  ['quit-methods:fresh-in:dock-quit', 'macOS Dock'],
  [':upgrade-', 'needs the previous release installed on the same profile'],
  ['reset-data:fresh-in:settings-reset-wallet', 'needs a loaded wallet (Settings)'],
  ['smoke-noise:', 'needs a loaded wallet on a network'],
];
