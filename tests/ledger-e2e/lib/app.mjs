/**
 * Launches the wallet's Electron app through the shared e2e launcher
 * (qa/e2e/lib/harness.mjs) with the Ledger shim, an isolated profile and a
 * local Sentry DSN.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { launchApp as launchShared } from '../../../qa/e2e/lib/harness.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));

export function launchApp({
  appDir, xdgDir, cdpPort, sentryPort, ipcLog, logFile, apiPort, apduPort,
}) {
  return launchShared({
    appDir,
    profile: xdgDir,
    cdpPort,
    logFile,
    preload: [path.join(HERE, 'ledger-shim.js')],
    env: {
      SENTRY_DSN: `http://k@127.0.0.1:${sentryPort}/1`,
      LEDGER_E2E_IPC_LOG: ipcLog,
      LEDGER_E2E_APP_DIR: appDir,
      LEDGER_E2E_VERBOSE: '1',
      SPECULOS_API_PORT: String(apiPort),
      SPECULOS_APDU_PORT: String(apduPort),
    },
  });
}

/** Reads the shim's JSONL log. */
export function readIpcLog(file) {
  if (!fs.existsSync(file)) return [];
  return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
