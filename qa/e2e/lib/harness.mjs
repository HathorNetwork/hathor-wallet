/**
 * Launches the wallet's production build with the shim, builds each setup's
 * profile once, and gives every scenario a fresh copy of its setup's profile
 * and a `ctx` to drive it.
 *
 * An area (qa/e2e/<area>/scenarios.mjs) supplies its setup builders; this file
 * holds what every area shares: launching, quitting, the shim's control
 * endpoint, the Sentry sink, and the screens every suite walks through.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';
import { CDP } from './cdp.mjs';
import { electronPath } from './build.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const SHIM = path.join(HERE, 'shim.cjs');
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export class AssertionError extends Error {}
export class SetupError extends Error {}
export function assert(cond, msg) {
  if (!cond) throw new AssertionError(msg);
}
export function eq(actual, expected, label) {
  assert(actual === expected, `${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

export const CONFIRM_RESET_MESSAGE = 'I want to reset my wallet';

/** Every app launched and not yet gone: they are detached, so a dying runner must end them. */
const liveApps = new Set();
export function killLiveApps() {
  liveApps.forEach((proc) => { try { process.kill(-proc.pid, 'SIGKILL'); } catch (_e) { /* gone */ } });
}

function groupAlive(pgid) {
  try { process.kill(-pgid, 0); return true; } catch (_e) { return false; }
}

/**
 * A PATH dir whose xdg-open records the URL instead of opening a browser:
 * shell.openExternal runs in the preload's process, out of the shim's reach,
 * and on Linux it goes through xdg-open.
 */
function openStub(dir) {
  const bin = path.join(dir, 'bin');
  fs.mkdirSync(bin, { recursive: true });
  const log = path.join(dir, 'opened.txt');
  fs.writeFileSync(path.join(bin, 'xdg-open'), `#!/bin/sh\nprintf '%s\\n' "$1" >> ${JSON.stringify(log)}\n`, { mode: 0o755 });
  return { bin, log };
}

/**
 * Starts Electron on the app's production build with a throwaway
 * XDG_CONFIG_HOME and the main-process shim. Linux only: it needs an X display
 * (E2E_DISPLAY, else DISPLAY, else :0).
 *
 * @param {object} o
 * @param {string} o.appDir The checkout, with node_modules and build/.
 * @param {string} o.profile XDG_CONFIG_HOME for this instance.
 * @param {number} o.cdpPort
 * @param {string} o.logFile Electron's stdout and stderr.
 * @param {object} [o.env] Extra environment; a value of `undefined` removes the variable.
 * @param {string[]} [o.preload] Extra files for NODE_OPTIONS=--require, after the shim.
 */
export function launchApp({
  appDir, profile, cdpPort, logFile, env: extra = {}, preload = [],
}) {
  const electron = electronPath(appDir);
  const env = {
    ...process.env,
    DISPLAY: process.env.E2E_DISPLAY || process.env.DISPLAY || ':0',
    XAUTHORITY: process.env.XAUTHORITY || path.join(os.homedir(), '.Xauthority'),
    XDG_CONFIG_HOME: profile,
    NODE_OPTIONS: [SHIM, ...preload].map((f) => `--require ${f}`).join(' '),
    ELECTRON_ENABLE_LOGGING: '1',
  };
  delete env.ELECTRON_START_URL;
  delete env.NODE_ENV;
  delete env.SENTRY_DSN;
  Object.entries(extra).forEach(([k, v]) => { if (v === undefined) delete env[k]; else env[k] = v; });

  const out = fs.openSync(logFile, 'a');
  const proc = spawn(electron, ['--no-sandbox', `--remote-debugging-port=${cdpPort}`, appDir], {
    cwd: appDir, env, stdio: ['ignore', out, out], detached: true,
  });
  let exited = false;
  liveApps.add(proc);
  const exitPromise = new Promise((resolve) => {
    proc.on('exit', (code, signal) => { exited = true; liveApps.delete(proc); resolve({ code, signal }); });
    proc.on('error', (error) => { exited = true; liveApps.delete(proc); resolve({ code: null, signal: null, error: error.message }); });
  });
  const app = {
    proc,
    exitPromise,
    get exited() { return exited; },
    /** Waits for the main process and every helper to be gone, so the profile is free. */
    async waitGone(timeout = 15000) {
      const res = await Promise.race([exitPromise, sleep(timeout).then(() => null)]);
      if (!res) { try { process.kill(-proc.pid, 'SIGKILL'); } catch (_e) { /* gone */ } }
      const end = Date.now() + timeout;
      while (groupAlive(proc.pid) && Date.now() < end) await sleep(100);
      if (groupAlive(proc.pid)) { try { process.kill(-proc.pid, 'SIGKILL'); } catch (_e) { /* gone */ } }
      return exitPromise;
    },
    /**
     * Quits through the shim's SIGUSR2 hook, kills the group if it hangs, then
     * waits for every helper: a relaunch on the same profile while the old
     * storage service still holds it gets "Access is denied" from localStorage.
     */
    async quit({ timeout = 15000 } = {}) {
      if (!exited) { try { process.kill(proc.pid, 'SIGUSR2'); } catch (_e) { /* gone */ } }
      return app.waitGone(timeout);
    },
  };
  return app;
}

/**
 * @param {object} o
 * @param {string} o.appDir
 * @param {string} o.workDir Scratch space for profiles and logs.
 * @param {{cdp: number, sink: number, control: number}} o.ports
 * @param {object} o.sink From sink.mjs.
 * @param {(msg: string) => void} o.log
 */
export function createHarness({
  appDir, workDir, ports, sink, log,
}) {
  const setupCache = new Map();

  /** A ctx bound to one profile directory. */
  function makeCtx({ profile, mode, files }) {
    let app = null;
    let cdp = null;
    const open = openStub(path.dirname(files.shim));
    const exceptions = []; // Renderer exceptions of every launch on this profile.

    const ctx = {
      sink,
      mode,
      profile,
      get cdp() { return cdp; },
      get app() { return app; },
      exceptions,
      log,

      async launch() {
        // A leftover app on the CDP port would be driven instead of this one.
        const stale = await fetch(`http://127.0.0.1:${ports.cdp}/json/version`).then(() => true, () => false);
        if (stale) throw new Error(`an app is still answering on CDP port ${ports.cdp}; refusing to launch over it`);
        app = launchApp({
          appDir,
          profile,
          cdpPort: ports.cdp,
          logFile: files.electron,
          env: {
            E2E_LOG: files.shim,
            E2E_CONTROL_PORT: String(ports.control),
            PATH: `${open.bin}:${process.env.PATH}`,
            // 'dsn': main and the preload read SENTRY_DSN at run time and send to the sink.
            // 'redirect': the real DSN is kept and the shim rewrites sentry.io requests to the sink.
            SENTRY_DSN: mode === 'dsn' ? `http://e2e@127.0.0.1:${ports.sink}/1` : undefined,
            E2E_SENTRY_REDIRECT: mode === 'dsn' ? undefined : sink.url,
          },
        });
        cdp = new CDP({
          port: ports.cdp,
          nodeModules: path.join(appDir, 'node_modules'),
          log: (m) => fs.appendFileSync(files.electron, `[cdp] ${m}\n`),
        });
        cdp.exceptions = exceptions;
        const launched = app;
        await Promise.race([
          cdp.connect(),
          launched.exitPromise.then((r) => { cdp.close(); throw new Error(`the app exited during launch: ${JSON.stringify(r)}`); }),
        ]);
        await cdp.waitFor('document.readyState === "complete" && document.body.innerText.length > 20', { timeout: 60000, what: 'app to render' });
        await ctx.waitControl();
      },

      /** Ends the app and returns its { code, signal }. `how`: 'quit' (app.quit, like Cmd+Q) or 'gone' (already ending). */
      async quit(how = 'quit') {
        if (!app) return null;
        try { cdp && cdp.close(); } catch (_e) { /* ignore */ }
        if (!app.exited && how === 'quit') { try { process.kill(app.proc.pid, 'SIGUSR2'); } catch (_e) { /* gone */ } }
        const r = await app.waitGone();
        app = null;
        return r;
      },

      async relaunch(how = 'quit') {
        await ctx.quit(how);
        await ctx.launch();
      },

      async control(action, params = {}) {
        const qs = new URLSearchParams(params).toString();
        const res = await fetch(`http://127.0.0.1:${ports.control}/${action}${qs ? `?${qs}` : ''}`);
        const body = await res.text();
        if (!res.ok) throw new Error(`control ${action}: ${res.status} ${body}`);
        return body;
      },

      async waitControl(timeout = 15000) {
        const end = Date.now() + timeout;
        let other = null;
        while (Date.now() < end) {
          try {
            const userData = await ctx.control('user-data');
            if (userData.startsWith(profile)) return;
            other = userData; // Another instance holds the control port.
          } catch (_e) { /* not up yet */ }
          await sleep(100);
        }
        throw new Error(other ? `another app answers on control port ${ports.control} (user data ${other})` : 'shim control endpoint never came up');
      },

      async alive() {
        try { await ctx.control('user-data'); return true; } catch (_e) { return false; }
      },

      /** Waits for the shim to record the page's renderer process going away. */
      async waitRendererGone(timeout = 10000) {
        const end = Date.now() + timeout;
        while (Date.now() < end) {
          const gone = ctx.shimLog().find((e) => e.kind === 'render-process-gone');
          if (gone) return gone.reason;
          await sleep(100);
        }
        throw new AssertionError('the renderer did not go away');
      },

      /** From now on, requests whose URL contains `includes` get `status` back, as from a failing server. */
      stub: (includes, status = 500) => ctx.control('stub', { includes, status }),

      /** The consent main keeps: 'absent', or the parsed `enabled` boolean. */
      async consent() {
        const raw = await ctx.control('consent');
        return raw === 'absent' ? 'absent' : JSON.parse(raw).enabled;
      },

      /** Read the consent file from disk while the app is down. */
      consentOnDisk() {
        try {
          return JSON.parse(fs.readFileSync(path.join(profile, 'Hathor Wallet', 'sentry-consent.json'), 'utf8')).enabled;
        } catch (_e) { return 'absent'; }
      },

      async waitConsent(expected, timeout = 8000) {
        const end = Date.now() + timeout;
        let last;
        while (Date.now() < end) {
          last = await ctx.consent();
          if (last === expected) return last;
          await sleep(150);
        }
        throw new AssertionError(`consent file: expected ${JSON.stringify(expected)}, got ${JSON.stringify(last)}`);
      },

      ls: (key) => cdp.eval(`localStorage.getItem(${JSON.stringify(key)})`),
      page: (expr) => cdp.eval(expr),

      /** Welcome: accept the terms and press "Get started", landing on the wallet type screen. */
      async getStarted() {
        await cdp.byTestId('welcome-get-started');
        await cdp.checkTestId('welcome-terms-checkbox', true);
        await cdp.clickTestId('welcome-get-started');
        await cdp.byTestId('wallet-type-software');
      },

      /** Settings > Change, through the real /permission screen. */
      async setConsentUI(on) {
        await cdp.eval('location.hash = "#/permission/"');
        await cdp.byTestId('sentry-permission-checkbox');
        await cdp.checkTestId('sentry-permission-checkbox', on);
        await cdp.clickTestId('sentry-permission-continue');
        await cdp.waitFor('!location.hash.startsWith("#/permission")', { what: 'leaving /permission' });
      },

      modalOpen: () => cdp.eval('!!document.querySelector(\'[data-testid="modal-unhandled-error"].show\')'),
      async waitModal(timeout = 5000) {
        await cdp.waitFor('!!document.querySelector(\'[data-testid="modal-unhandled-error"].show\')', { timeout, what: 'the unhandled-error modal' });
      },

      /** Nothing matching `pred` reaches the sink from `since` for `ms`. */
      async expectNone(since, { ms = 4000, pred = () => true, what = 'envelope' } = {}) {
        await sleep(ms);
        const got = sink.since(since, pred);
        assert(got.length === 0, `expected no ${what}, got ${got.length}: ${got.map((i) => i.type + (i.message ? ` "${i.message}"` : '')).join(', ')}`);
      },

      events: (since, text) => sink.since(since, (i) => i.type === 'event' && (!text || String(i.message).includes(text))),

      openedUrls() {
        return fs.existsSync(open.log) ? fs.readFileSync(open.log, 'utf8').split('\n').filter(Boolean) : [];
      },

      shimLog() {
        if (!fs.existsSync(files.shim)) return [];
        return fs.readFileSync(files.shim, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
      },
    };
    return ctx;
  }

  const newFiles = (dir) => ({
    electron: path.join(dir, 'electron.log'),
    shim: path.join(dir, 'shim.jsonl'),
  });

  return {
    /**
     * A ctx on a fresh copy of the setup's profile. `builders` maps a setup id
     * to an async function that brings a ctx on an empty profile to that setup.
     * Profiles are cached per area and setup.
     */
    async forScenario({
      area, setupId, builders, scenarioDir, mode,
    }) {
      const key = `${area}/${setupId}`;
      if (!(setupId in builders)) throw new SetupError(`area ${area} has no builder for setup ${setupId}`);
      if (!setupCache.has(key)) {
        const dir = path.join(workDir, 'setups', area, setupId);
        fs.mkdirSync(path.join(dir, 'profile'), { recursive: true });
        log(`building setup ${key}`);
        const builder = makeCtx({ profile: path.join(dir, 'profile'), mode, files: newFiles(dir) });
        try {
          await builders[setupId](builder);
          setupCache.set(key, { profile: path.join(dir, 'profile') });
        } catch (e) {
          setupCache.set(key, { error: e.message });
        } finally {
          await builder.quit().catch(() => {});
        }
      }
      const setup = setupCache.get(key);
      if (setup.error) throw new SetupError(`setup ${key} could not be built: ${setup.error}`);
      const profile = path.join(scenarioDir, 'profile');
      fs.cpSync(setup.profile, profile, { recursive: true });
      return makeCtx({ profile, mode, files: newFiles(scenarioDir) });
    },
  };
}
