import { defineConfig } from '@playwright/test';
import { resolve } from 'node:path';
import { loadEnvFile } from './tests/e2e/support/env';
import type { WalletSetup } from './tests/e2e/fixtures/electron-fixture';

// Load .env.e2e (gitignored); values already present in process.env win (CI secrets).
loadEnvFile(resolve(__dirname, '.env.e2e'));

// CRA dev-server port (default 3000). Overridable so the suite can run on a free
// port when 3000 is already taken by another local dev server.
const devServerPort = process.env.E2E_DEV_SERVER_PORT || '3000';
const devServerUrl = `http://localhost:${devServerPort}`;

// Two targets: 'dev' (CRA dev server, NO LavaMoat) and 'build' (production
// build/index.html via file://, WITH LavaMoat). Default stays 'dev'.
const target = process.env.E2E_TARGET === 'build' ? 'build' : 'dev';

if (target === 'dev') {
  // Keep the Electron app URL locked to the dev-server URL so the two can't drift:
  // overriding only E2E_DEV_SERVER_PORT is enough. An explicit ELECTRON_START_URL
  // still wins (e.g. pointing Electron at a remote/prebuilt bundle).
  process.env.ELECTRON_START_URL = process.env.ELECTRON_START_URL || devServerUrl;
}

export default defineConfig<Record<string, never>, { walletSetup: WalletSetup }>({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/support/build.ts',
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 180_000,
  expect: { timeout: 30_000 },
  reporter: [['html', { open: 'never' }], ['list']],
  use: {
    actionTimeout: 45_000,
    trace: 'on-first-retry',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'onboarding', testMatch: 'onboarding.spec.ts', use: { walletSetup: { kind: 'onboard' } } },
    { name: 'import', testMatch: 'import.spec.ts', use: { walletSetup: { kind: 'import', wallet: 'funded' } } },
  ],
  // Dev target boots the CRA dev server; build target loads build/index.html via
  // file:// (produced by globalSetup) and needs no server.
  webServer:
    target === 'dev'
      ? {
          command: `PORT=${devServerPort} BROWSER=none npm start`,
          url: devServerUrl,
          reuseExistingServer: !process.env.CI,
          timeout: 180_000,
          stdout: 'pipe',
          stderr: 'pipe',
        }
      : undefined,
});
