/**
 * The runner's argument handling. These stop before anything launches, so they
 * need no build, no display and no Electron binary.
 */
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

const RUN = fileURLToPath(new URL('../run.mjs', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [RUN, ...args], { encoding: 'utf8' });

describe('qa/e2e/run.mjs arguments', () => {
  it('rejects an unknown option, so a typo cannot drop a gate', () => {
    const r = run('--stric', '--dry-run');
    assert.equal(r.status, 1);
    assert.match(r.stdout, /unknown option '--stric'/);
  });

  it('rejects an unknown area', () => {
    const r = run('--graph', 'sentri', '--dry-run');
    assert.equal(r.status, 1);
    assert.match(r.stdout, /no area sentri/);
  });

  it('rejects a mode that does not exist', () => {
    assert.equal(run('--mode', 'real', '--dry-run').status, 1);
  });

  it('fails when the options select no scenario', () => {
    const r = run('--only', 'no-such-scenario', '--dry-run');
    assert.equal(r.status, 1);
    assert.match(r.stdout, /select no scenario/);
  });

  it('lists every area with valid options', () => {
    const r = run('--list');
    assert.equal(r.status, 0);
    assert.match(r.stdout, /onboarding: welcome-render:fresh/);
  });

  it('runs tier 1 of an area as a dry run', () => {
    const r = run('--graph', 'onboarding', '--tier1', '--dry-run');
    assert.equal(r.status, 0);
    assert.match(r.stdout, /onboarding: software-warning:started/);
  });
});
