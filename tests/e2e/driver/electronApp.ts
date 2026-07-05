import { _electron as electron, type ElectronApplication, type Page } from '@playwright/test';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { TIMEOUTS } from './timeouts';

// tests/e2e/driver -> up 3 = repo root (package.json "main": "public/electron.js").
const repoRoot = resolve(__dirname, '..', '..', '..');

// Absolute path to the installed Electron binary (electron's main export outside Electron).
// eslint-disable-next-line @typescript-eslint/no-var-requires
const electronBinary = require('electron') as unknown as string;

// Well-formed but non-routable DSN: silences real Sentry reporting without throwing on init.
// (An empty value would fall through to the real DSN in public/constants.js.)
const DUMMY_SENTRY_DSN = 'https://0000000000000000000000000000abcd@o0.ingest.sentry.io/0';

export interface LaunchedApp {
  app: ElectronApplication;
  page: Page;
  userDataDir: string;
}

export async function launchWallet(): Promise<LaunchedApp> {
  const userDataDir = mkdtempSync(join(tmpdir(), 'hathor-wallet-e2e-'));

  // build target: no ELECTRON_START_URL -> public/electron.js loads the production
  // build/index.html via file:// (LavaMoat applied). dev target: point Electron at
  // the CRA dev server (no LavaMoat).
  const target = process.env.E2E_TARGET === 'build' ? 'build' : 'dev';
  const env: NodeJS.ProcessEnv = { ...process.env, SENTRY_DSN: DUMMY_SENTRY_DSN };
  if (target === 'build') {
    delete env.ELECTRON_START_URL;
    env.NODE_ENV = 'production';
  } else {
    env.ELECTRON_START_URL = env.ELECTRON_START_URL ?? 'http://localhost:3000';
    env.NODE_ENV = 'dev';
  }

  const app = await electron.launch({
    executablePath: electronBinary,
    cwd: repoRoot,
    args: ['.', '--no-sandbox', `--user-data-dir=${userDataDir}`],
    // electron.launch types env as { [k: string]: string }; Node's process.env is
    // { [k: string]: string | undefined }. At runtime present keys are strings, so
    // reconcile the two here rather than filtering undefined values away.
    env: env as { [key: string]: string },
    timeout: TIMEOUTS.appLaunch,
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page, userDataDir };
}

export async function closeWallet({ app, userDataDir }: LaunchedApp): Promise<void> {
  try {
    await app.close();
  } finally {
    rmSync(userDataDir, { recursive: true, force: true });
  }
}
