#!/usr/bin/env node
/**
 * One-command Ledger end-to-end run against an emulated device.
 *
 *   node tests/ledger-e2e/run.mjs [--app-dir DIR] [--flows a,b] [--skip-build] [--keep] [--label NAME]
 *
 * Builds the renderer if stale, builds or reuses the Ledger app ELF, starts
 * Speculos, launches the wallet with the transport shim, runs the flows over
 * CDP, prints a PASS/FAIL table and cleans up.
 */
import { execFileSync, spawnSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

import { launchApp, readIpcLog } from './lib/app.mjs';
import { CDP } from './lib/cdp.mjs';
import { Device } from './lib/device.mjs';
import { startSentrySink } from './lib/sentry-sink.mjs';
import { FLOWS } from './flows.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---- options ---------------------------------------------------------------
const argv = process.argv.slice(2);
const opt = (name, def) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : def;
};
const flag = (name) => argv.includes(`--${name}`);

const appDir = path.resolve(opt('app-dir', path.join(HERE, '../..')));
const label = opt('label', path.basename(appDir));
const only = opt('flows', null);
const keep = flag('keep');
const skipBuild = flag('skip-build');
const ports = {
  cdp: Number(process.env.LEDGER_E2E_CDP_PORT || 9333),
  sentry: Number(process.env.LEDGER_E2E_SENTRY_PORT || 9876),
  api: Number(process.env.SPECULOS_API_PORT || 5000),
  apdu: Number(process.env.SPECULOS_APDU_PORT || 9999),
};
const TOKEN_UID = process.env.LEDGER_E2E_TOKEN_UID
  || '000000000036a79472ea7ca9f65d0ff90be63d5665b414c58f5a0a838852a5a2'; // "Hathorstrings" (HS7), mainnet
const FULLNODE = process.env.LEDGER_E2E_FULLNODE || 'https://node1.mainnet.hathor.network/v1a/';
const SEED = process.env.SPECULOS_SEED
  || 'glory promote mansion idle axis finger extra february uncover one trip resource lawn turtle enact monster seven myth punch hobby comfort wild raise skin';

const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hathor-ledger-e2e-'));
const files = {
  ipc: path.join(workDir, 'ipc.jsonl'),
  electron: path.join(workDir, 'electron.log'),
  speculos: path.join(workDir, 'speculos.log'),
  results: path.join(workDir, 'results.json'),
};
const xdgDir = path.join(workDir, 'xdg');
fs.mkdirSync(xdgDir);

const t0 = Date.now();
const log = (msg) => console.log(`[${((Date.now() - t0) / 1000).toFixed(1).padStart(6)}s] ${msg}`);

// ---- helpers ---------------------------------------------------------------
function newestMtime(dir, skip) {
  let newest = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (skip(p)) continue;
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(p, skip) : fs.statSync(p).mtimeMs);
  }
  return newest;
}

function ensureBuild() {
  const index = path.join(appDir, 'build/index.html');
  const generated = (p) => p.endsWith('.css') || p.includes(`${path.sep}locale${path.sep}`);
  const srcTime = Math.max(newestMtime(path.join(appDir, 'src'), generated), newestMtime(path.join(appDir, 'public'), () => false));
  const stale = !fs.existsSync(index) || fs.statSync(index).mtimeMs < srcTime;
  if (!stale) { log(`renderer build is fresh (${index})`); return; }
  if (skipBuild) throw new Error(`build/ is missing or stale in ${appDir} and --skip-build was given`);
  log('renderer build missing or stale: npm run build-css && npm run build');
  for (const script of ['build-css', 'build']) {
    const r = spawnSync('npm', ['run', script], { cwd: appDir, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
    if (r.status !== 0) throw new Error(`npm run ${script} failed:\n${(r.stdout + r.stderr).slice(-3000)}`);
  }
}

function computeExpected(token, deviceXpubHex) {
  const out = execFileSync(process.execPath, [path.join(HERE, 'lib/expected.cjs'), appDir, SEED, token.uid || '', token.name || '', token.symbol || ''], {
    encoding: 'utf8', env: { ...process.env, DEVICE_XPUB_DATA: deviceXpubHex || '' },
  });
  return JSON.parse(out);
}

async function fetchToken(uid) {
  const res = await fetch(`${FULLNODE}thin_wallet/token?id=${uid}`);
  const body = await res.json();
  if (!body.success) throw new Error(`token ${uid} not found on ${FULLNODE}`);
  return { uid, name: body.name, symbol: body.symbol };
}

function makeIpc() {
  let cursor = 0;
  return {
    mark: () => readIpcLog(files.ipc).length,
    all: () => readIpcLog(files.ipc),
    async waitFor(pred, { since = 0, timeout = 30000 } = {}) {
      const end = Date.now() + timeout;
      while (Date.now() < end) {
        const entries = readIpcLog(files.ipc);
        const hit = entries.slice(since).find(pred);
        if (hit) { cursor = entries.length; return hit; }
        await sleep(150);
      }
      throw new Error(`timed out waiting for IPC entry ${pred.toString().slice(0, 160)}`);
    },
    get cursor() { return cursor; },
  };
}

const speculos = (...args) => execFileSync(path.join(HERE, 'speculos.sh'), args, {
  encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env, SPECULOS_API_PORT: String(ports.api), SPECULOS_APDU_PORT: String(ports.apdu), SPECULOS_SEED: SEED },
});

// ---- main ------------------------------------------------------------------
const results = [];
let app = null;
let cdp = null;
let sink = null;
let speculosUp = false;

async function main() {
  log(`app dir ${appDir} (label ${label}); work dir ${workDir}`);
  const electronPkg = JSON.parse(fs.readFileSync(path.join(appDir, 'node_modules/electron/package.json'), 'utf8'));
  log(`electron ${electronPkg.version}`);
  ensureBuild();

  const elf = execFileSync(path.join(HERE, 'build-app.sh'), { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] }).trim().split('\n').pop();
  log(`ledger app ELF ${elf}`);

  const token = await fetchToken(TOKEN_UID);
  const expected = computeExpected(token);
  token.configString = expected.configString;
  log(`seed xpub ${expected.xpub.slice(0, 20)}..., address[0] ${expected.addresses[0]}, token ${token.symbol}/${token.name}`);

  sink = await startSentrySink(ports.sentry);
  speculos('start', elf);
  speculosUp = true;
  log('speculos up');

  const device = new Device(`http://127.0.0.1:${ports.api}`);
  const ipc = makeIpc();

  const start = async () => {
    app = launchApp({
      appDir, xdgDir, cdpPort: ports.cdp, sentryPort: ports.sentry, ipcLog: files.ipc,
      logFile: files.electron, apiPort: ports.api, apduPort: ports.apdu,
    });
    const prev = cdp;
    cdp = new CDP({ port: ports.cdp, nodeModules: path.join(appDir, 'node_modules'), log: (m) => fs.appendFileSync(files.electron, `[cdp] ${m}\n`) });
    if (prev) { cdp.exceptions = prev.exceptions; cdp.console = prev.console; }
    await cdp.connect();
    await cdp.waitFor('document.readyState === "complete" && document.body.innerText.length > 20', { timeout: 60000, what: 'app to render' });
    ctx.cdp = cdp;
    log(`app launched (pid ${app.proc.pid})`);
  };

  const ctx = {
    device, ipc, expected, token, state: {}, cdp: null,
    xpubFromDeviceData: async (hex) => computeExpected({}, hex).xpubFromDevice,
    restartApp: async () => {
      log('restarting app');
      cdp.close();
      const r = await app.quit();
      log(`app exited (${JSON.stringify(r)})`);
      await start();
    },
    stopSpeculos: async () => { speculos('stop'); speculosUp = false; log('speculos stopped'); },
  };

  await start();

  const selected = only ? FLOWS.filter((f) => only.split(',').includes(f.id)) : FLOWS;
  let blocked = null;
  for (const flow of selected) {
    const fStart = Date.now();
    const excBefore = cdp.exceptions.length;
    const entry = { id: flow.id, title: flow.title, status: 'PASS', details: null, error: null };
    if (blocked) {
      entry.status = 'SKIP';
      entry.error = `blocked by ${blocked}`;
    } else {
      log(`flow ${flow.id}: start`);
      try {
        entry.details = await flow.run(ctx);
        const newExc = cdp.exceptions.slice(excBefore);
        if (newExc.length) throw new Error(`renderer threw: ${newExc.map((e) => e.text.slice(0, 200)).join(' | ')}`);
        const unhandled = await cdp.eval('!!document.querySelector("#unhandledErrorModal.show")').catch(() => false);
        if (unhandled) throw new Error('unhandled error modal is showing');
      } catch (e) {
        entry.status = 'FAIL';
        entry.error = e.message;
        try { entry.page = (await cdp.page('text')).slice(0, 500); } catch (_e) { /* ignore */ }
        try { entry.deviceScreen = await device.screen(); } catch (_e) { /* ignore */ }
        if (flow.id === 'hw-start') blocked = flow.id;
      }
    }
    entry.seconds = Number(((Date.now() - fStart) / 1000).toFixed(1));
    results.push(entry);
    log(`flow ${flow.id}: ${entry.status}${entry.error ? ` - ${entry.error}` : ''}`);
  }
}

async function cleanup() {
  try { cdp && cdp.close(); } catch (_e) { /* ignore */ }
  if (app && !app.exited) {
    const r = await app.quit();
    log(`app exited (${JSON.stringify(r)})`);
  }
  if (app) { try { process.kill(-app.proc.pid, 'SIGKILL'); } catch (_e) { /* already gone */ } }
  try { fs.writeFileSync(files.speculos, speculos('logs')); } catch (_e) { /* not running */ }
  try { speculos('stop'); } catch (_e) { /* ignore */ }
  if (sink) await sink.close();
}

function report(fatal) {
  const errorsLogged = cdp ? cdp.console.filter((c) => c.type === 'error').map((c) => c.text.slice(0, 200)) : [];
  const summary = {
    label, appDir, seconds: Number(((Date.now() - t0) / 1000).toFixed(1)),
    sentryEnvelopes: sink ? sink.envelopes.map((e) => e.types.join(',')) : [],
    rendererExceptions: cdp ? cdp.exceptions.map((e) => e.text.slice(0, 300)) : [],
    consoleErrors: errorsLogged,
    fatal: fatal ? fatal.message : null,
    results,
  };
  fs.writeFileSync(files.results, JSON.stringify(summary, null, 2));

  console.log(`\n=== Ledger e2e: ${label} (${summary.seconds}s) ===`);
  const w = Math.max(...results.map((r) => r.id.length), 4);
  for (const r of results) {
    console.log(`${r.status.padEnd(4)}  ${r.id.padEnd(w)}  ${String(r.seconds).padStart(5)}s  ${r.title}`);
    if (r.details) for (const [k, v] of Object.entries(r.details)) console.log(`${' '.repeat(w + 14)}${k}: ${typeof v === 'string' ? v : JSON.stringify(v)}`);
    if (r.error) console.log(`${' '.repeat(w + 14)}error: ${r.error}`);
  }
  if (fatal) console.log(`FATAL: ${fatal.stack || fatal.message}`);
  console.log(`sentry envelopes received by local sink: ${summary.sentryEnvelopes.length} (opted out, must be 0)`);
  console.log(`renderer uncaught exceptions: ${summary.rendererExceptions.length}; console.error lines: ${errorsLogged.length}`);
  const ok = !fatal && results.length > 0 && results.every((r) => r.status === 'PASS')
    && summary.sentryEnvelopes.length === 0;
  return ok;
}

let fatal = null;
const onSignal = async () => { fatal = new Error('interrupted'); await cleanup(); process.exit(130); };
process.on('SIGINT', onSignal);
process.on('SIGTERM', onSignal);

try {
  await main();
} catch (e) {
  fatal = e;
}
await cleanup();
const ok = report(fatal);
if (ok && !keep) {
  fs.rmSync(workDir, { recursive: true, force: true });
  console.log('all flows passed; work dir removed');
} else {
  fs.rmSync(xdgDir, { recursive: true, force: true });
  console.log(`logs kept in ${workDir}`);
}
process.exit(ok ? 0 : 1);
