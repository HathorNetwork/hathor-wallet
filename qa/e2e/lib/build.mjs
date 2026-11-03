/**
 * The suites drive the production renderer bundle in build/, under the Electron
 * binary. This rebuilds the bundle when it is missing or older than src/ or
 * public/, and downloads the binary, which `npm ci` does not install.
 */
import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';

function newestMtime(dir, skip) {
  let newest = 0;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (skip(p)) continue;
    newest = Math.max(newest, entry.isDirectory() ? newestMtime(p, skip) : fs.statSync(p).mtimeMs);
  }
  return newest;
}

/** The path of the Electron binary. */
export const electronPath = (appDir) => path.join(appDir, 'node_modules/electron/dist/electron');

/**
 * @param {string} appDir
 * @param {{log?: (msg: string) => void}} [o]
 */
export function ensureElectron(appDir, { log = console.log } = {}) {
  if (fs.existsSync(electronPath(appDir))) return;
  log('Electron binary missing: downloading it');
  const r = spawnSync(process.execPath, ['node_modules/electron/install.js'], { cwd: appDir, stdio: ['ignore', 'pipe', 'pipe'], encoding: 'utf8' });
  if (r.status !== 0 || !fs.existsSync(electronPath(appDir))) {
    throw new Error(`could not install the Electron binary:\n${(r.stdout + r.stderr).slice(-3000)}`);
  }
}

/**
 * @param {string} appDir
 * @param {{skipBuild?: boolean, log?: (msg: string) => void}} [o]
 *   `skipBuild` throws instead of building.
 */
export function ensureBuild(appDir, { skipBuild = false, log = console.log } = {}) {
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
