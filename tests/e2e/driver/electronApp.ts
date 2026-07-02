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
  const app = await electron.launch({
    executablePath: electronBinary,
    cwd: repoRoot,
    args: ['.', '--no-sandbox', `--user-data-dir=${userDataDir}`],
    env: {
      ...process.env,
      ELECTRON_START_URL: process.env.ELECTRON_START_URL ?? 'http://localhost:3000',
      NODE_ENV: 'dev',
      SENTRY_DSN: DUMMY_SENTRY_DSN,
    },
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
