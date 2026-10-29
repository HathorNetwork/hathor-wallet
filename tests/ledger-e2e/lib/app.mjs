/**
 * Launches the wallet's Electron app with the Speculos shim, an isolated
 * profile and a local Sentry DSN, and quits it.
 */
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function launchApp({
  appDir, xdgDir, cdpPort, sentryPort, ipcLog, logFile,
  apiPort, apduPort, display = process.env.DISPLAY || ':0',
}) {
  const electron = path.join(appDir, 'node_modules/electron/dist/electron');
  const out = fs.openSync(logFile, 'a');
  const env = {
    ...process.env,
    DISPLAY: display,
    XDG_CONFIG_HOME: xdgDir,
    SENTRY_DSN: `http://k@127.0.0.1:${sentryPort}/1`,
    NODE_OPTIONS: `--require ${path.join(HERE, 'main-shim.js')}`,
    LEDGER_E2E_IPC_LOG: ipcLog,
    LEDGER_E2E_APP_DIR: appDir,
    LEDGER_E2E_VERBOSE: '1',
    SPECULOS_API_PORT: String(apiPort),
    SPECULOS_APDU_PORT: String(apduPort),
    ELECTRON_ENABLE_LOGGING: '1',
  };
  delete env.ELECTRON_START_URL;
  delete env.NODE_ENV;
  const proc = spawn(electron, ['--no-sandbox', `--remote-debugging-port=${cdpPort}`, appDir], {
    cwd: appDir, env, stdio: ['ignore', out, out], detached: true,
  });
  let exited = false;
  const exitPromise = new Promise((resolve) => proc.on('exit', (code, signal) => { exited = true; resolve({ code, signal }); }));

  return {
    proc,
    exitPromise,
    get exited() { return exited; },
    /**
     * Quits through the shim's SIGUSR2 hook, kills the group if it hangs,
     * then waits for every helper process to exit: a relaunch on the same
     * profile while the old storage service still holds it gets
     * "Access is denied" from localStorage.
     */
    async quit({ timeout = 15000 } = {}) {
      if (!exited) {
        try { process.kill(proc.pid, 'SIGUSR2'); } catch (_e) { /* gone */ }
        const res = await Promise.race([exitPromise, sleep(timeout).then(() => null)]);
        if (!res) { try { process.kill(-proc.pid, 'SIGKILL'); } catch (_e) { /* gone */ } }
      }
      const result = await exitPromise;
      const end = Date.now() + timeout;
      while (groupAlive(proc.pid) && Date.now() < end) await sleep(100);
      if (groupAlive(proc.pid)) { try { process.kill(-proc.pid, 'SIGKILL'); } catch (_e) { /* gone */ } }
      return result;
    },
  };
}

function groupAlive(pgid) {
  try { process.kill(-pgid, 0); return true; } catch (_e) { return false; }
}

/** Reads the shim's JSONL log. */
export function readIpcLog(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
