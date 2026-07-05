import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

/**
 * Playwright globalSetup. When E2E_TARGET=build, produce the production bundle so
 * the Electron app can be driven from build/index.html via file:// with LavaMoat
 * applied (LavaMoat is only added in the production webpack build — config-overrides.js).
 * Default (dev) target: no-op — the webServer boots the CRA dev server instead.
 * Set E2E_SKIP_BUILD=1 to reuse an existing build/ (faster local iteration).
 */
export default function globalSetup(): void {
  if (process.env.E2E_TARGET !== 'build') return;
  if (process.env.E2E_SKIP_BUILD === '1') {
    // eslint-disable-next-line no-console
    console.log('[e2e] E2E_SKIP_BUILD=1 -> reusing existing build/ (LavaMoat)');
    return;
  }
  const repoRoot = resolve(__dirname, '..', '..', '..');
  // eslint-disable-next-line no-console
  console.log('[e2e] E2E_TARGET=build -> running production build with LavaMoat (npm run build)…');
  execFileSync('npm', ['run', 'build'], { cwd: repoRoot, stdio: 'inherit', env: process.env });
}
