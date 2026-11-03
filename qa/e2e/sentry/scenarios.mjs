/**
 * Sentry scenarios, keyed by their id in qa/graph/sentry.yaml. Each one gets
 * a ctx on a fresh copy of its setup's profile (../lib/harness.mjs), throws on
 * the first failed assertion, and returns details for the report. Every
 * request bound for Sentry ends at the local sink (../lib/sink.mjs).
 *
 * The expectations are the graph's outcomes.
 */
import fs from 'fs';
import { assert, eq, sleep } from '../lib/harness.mjs';

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

// ---- bridge-probe ---------------------------------------------------------------

const BRIDGE = {
  'send-consent-channel': async (ctx) => {
    const msg = await ctx.page('(() => { try { window.electronAPI.send("sentry:consent", true); return "no throw"; } catch (e) { return e.message; } })()');
    eq(msg, 'IPC channel "sentry:consent" is not allowlisted in public/bridge.js', 'error');
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
  'launch-quit:io-in': async (ctx) => {
    const since = ctx.sink.mark();
    await ctx.launch();
    await ctx.quit();
    const session = await ctx.sink.waitFor((i) => i.type === 'session', { since, what: 'a session through the redirect' });
    const redirected = ctx.shimLog().filter((e) => e.kind === 'sentry-request' && e.action === 'redirected');
    assert(redirected.length > 0, 'no sentry.io request was redirected');
    return `${redirected.length} request(s) to ${new URL(redirected[0].url).host} redirected; session ${session.status}`;
  },

  'onboarding-get-started:fresh-none': async (ctx) => {
    const since = ctx.sink.mark();
    await ctx.launch();
    await ctx.getStarted();
    eq(await ctx.ls('wallet:sentry'), 'false', 'stored consent');
    await sleep(1000);
    eq(await ctx.consent(), 'absent', 'consent file (false is never written over no consent)');
    await ctx.expectNone(since, { ms: 2000 });
  },

  'toggle-consent:fresh-in:in-to-out': toggleConsent('fresh-in', 'in-to-out'),
  'toggle-consent:fresh-out:out-to-in': toggleConsent('fresh-out', 'out-to-in'),

  'page-error:fresh-in:throw': pageError('fresh-in', 'throw'),
  'page-error:fresh-out:throw': pageError('fresh-out', 'throw'),
  'page-error:io-in:throw': pageError('io-in', 'throw'),

  'crash-modal-report:fresh-out:once': crashModal('fresh-out', 'once'),

  'bridge-probe:fresh-out:send-consent-channel': bridgeProbe('send-consent-channel'),
};

for (const setup of ['fresh-in', 'fresh-out']) {
  for (const crash of ['renderer-native', 'main-exception', 'main-native']) {
    for (const relaunch of ['same', 'flipped']) SCENARIOS[`main-crash:${setup}:${crash}.${relaunch}`] = mainCrash(setup, crash, relaunch);
  }
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
export const MANUAL = [];
