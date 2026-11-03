#!/usr/bin/env node
/**
 * The desktop wallet's e2e suites: every area under qa/e2e/<area>/, each the
 * automation of qa/graph/<area>.yaml, against the production build.
 *
 *   node qa/e2e/run.mjs [--graph <area,...>] [--only <id prefixes,...>] [--tier1]
 *                       [--changed [<base>]] [--strict] [--floor] [--dry-run]
 *                       [--list] [--keep] [--verbose] [--skip-build] [--mode dsn|redirect]
 *
 * See README.md.
 */
import { execFileSync } from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath, pathToFileURL } from 'url';
import { startSink } from './lib/sink.mjs';
import {
  createHarness, killLiveApps, sleep, SetupError,
} from './lib/harness.mjs';
import { ensureBuild, ensureElectron } from './lib/build.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const APP_DIR = path.resolve(HERE, '..', '..');
const GRAPH_DIR = path.join(APP_DIR, 'qa', 'graph');
const require = createRequire(import.meta.url);
const { loadGraph, validateGraph } = require('../graph/tools/load.js');
const { allScenarios } = require('../graph/tools/scenarios.js');
const { selectByChange } = require('../graph/tools/select.js');

const args = process.argv.slice(2);
const opt = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : null;
};
const flag = (name) => args.includes(`--${name}`);

const FLAGS = ['tier1', 'strict', 'floor', 'dry-run', 'list', 'keep', 'verbose', 'skip-build'];
const VALUE_OPTIONS = ['graph', 'only', 'mode'];

/** A mistyped option must stop the run: ignoring `--stric` would silently drop the gate. */
function badArguments() {
  for (let i = 0; i < args.length; i += 1) {
    const name = args[i].replace(/^--/, '');
    if (!args[i].startsWith('--')) return `unexpected argument '${args[i]}'`;
    if (VALUE_OPTIONS.includes(name)) {
      if (!opt(name)) return `${args[i]} needs a value`;
      i += 1;
    } else if (name === 'changed') {
      if (args[i + 1] && !args[i + 1].startsWith('--')) i += 1;
    } else if (!FLAGS.includes(name)) {
      return `unknown option '${args[i]}'`;
    }
  }
  if (opt('mode') && !['dsn', 'redirect'].includes(opt('mode'))) return `--mode must be dsn or redirect, not '${opt('mode')}'`;
  return null;
}

const ports = {
  cdp: Number(process.env.E2E_CDP_PORT || 9334),
  sink: Number(process.env.E2E_SINK_PORT || 9877),
  control: Number(process.env.E2E_CONTROL_PORT || 9878),
};

/** Every area: a scenarios module with its graph. */
async function loadAreas() {
  const names = fs.readdirSync(HERE, { withFileTypes: true })
    .filter((d) => d.isDirectory() && fs.existsSync(path.join(HERE, d.name, 'scenarios.mjs')))
    .map((d) => d.name).sort();
  const areas = [];
  for (const area of names) {
    const graphFile = path.join(GRAPH_DIR, `${area}.yaml`);
    if (!fs.existsSync(graphFile)) throw new Error(`qa/e2e/${area}/ has no graph at qa/graph/${area}.yaml`);
    const graph = loadGraph(graphFile);
    const { errors } = validateGraph(graph);
    if (errors.length) throw new Error(`qa/graph/${area}.yaml is invalid:\n  ${errors.join('\n  ')}`);
    const mod = await import(pathToFileURL(path.join(HERE, area, 'scenarios.mjs')).href);
    areas.push({
      area,
      graph,
      paths: [`qa/graph/${area}.yaml`, `qa/e2e/${area}/`],
      graphIds: allScenarios(graph).map((s) => s.id),
      scenarios: mod.SCENARIOS,
      setups: mod.SETUPS,
      tier1: mod.TIER1 || [],
      failOnExceptions: mod.FAIL_ON_EXCEPTIONS === true,
      manual: mod.MANUAL || [],
      modeOf: mod.modeOf || (() => 'dsn'),
    });
  }
  return areas;
}

const startsWithAny = (id, prefixes) => prefixes.some((p) => id === p || id.startsWith(`${p}:`) || id.startsWith(`${p}.`));
const setupOf = (id) => id.split(':')[1];
const manualReason = (a, id) => (a.manual.find(([p]) => id.includes(p)) || [])[1] || 'not automated yet';

const git = (gitArgs) => execFileSync('git', gitArgs, { cwd: APP_DIR, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** Files changed since the merge base with `base`, plus uncommitted ones outside CI. */
function changedFiles(base) {
  const mergeBase = git(['merge-base', base, 'HEAD']).trim();
  // --no-renames lists a moved file's old path too, so its old features are selected.
  const files = new Set(git(['diff', '--name-only', '--no-renames', mergeBase, 'HEAD']).split('\n').filter(Boolean));
  if (!process.env.CI) {
    git(['diff', '--name-only', '--no-renames', 'HEAD']).split('\n').filter(Boolean).forEach((f) => files.add(f));
    git(['ls-files', '--others', '--exclude-standard']).split('\n').filter(Boolean).forEach((f) => files.add(f));
  }
  return { mergeBase, files: [...files].sort() };
}

/**
 * `--changed`: the scenarios the diff reaches, and a report saying why.
 * @param {object[]} areas The areas to run.
 * @param {object[]} allAreas Every area: `--graph` narrows what runs, not how files classify.
 * @returns {{ids: Map<string, string[]>, report: string[], failed: boolean}}
 */
function selectChanged(areas, allAreas) {
  const base = opt('changed') || 'origin/master';
  const { mergeBase, files } = changedFiles(base);
  const r = selectByChange(allAreas, files);
  const report = [`Changed files since ${base} (merge base ${mergeBase.slice(0, 10)}): ${files.length}`];
  r.files.forEach((f) => report.push(`  ${f.class.padEnd(8)} ${f.file}${f.detail ? `  → ${f.detail}` : ''}`));
  if (r.unmapped.length) {
    report.push('', 'unmapped: add it to a feature\'s files: (tier 1 runs for these)');
    r.unmapped.forEach((f) => report.push(`  ${f}`));
  }

  const ids = new Map(); // `${area}|${id}` -> reasons
  r.scenarios.filter((s) => areas.some((a) => a.area === s.area)).forEach((s) => ids.set(`${s.area}|${s.id}`, s.reasons));
  const automatedCount = () => [...ids.keys()].filter((k) => {
    const [area, id] = k.split('|');
    return id in areas.find((a) => a.area === area).scenarios;
  }).length;
  const addTier1 = (why) => areas.forEach((a) => Object.keys(a.scenarios)
    .filter((id) => startsWithAny(id, a.tier1))
    .forEach((id) => { const k = `${a.area}|${id}`; ids.set(k, [...(ids.get(k) || []), why]); }));
  if (r.unmapped.length) addTier1('tier 1: the diff has unmapped files');
  if (flag('floor') && automatedCount() === 0) addTier1('tier 1: the floor for an empty selection');

  const manual = [];
  let automated = 0;
  report.push('', 'Selected scenarios:');
  areas.forEach((a) => {
    [...ids.entries()].filter(([k]) => k.startsWith(`${a.area}|`)).forEach(([k, reasons]) => {
      const id = k.split('|')[1];
      if (!(id in a.scenarios)) { manual.push(`${a.area}: ${id}  (${manualReason(a, id)})`); return; }
      automated += 1;
      report.push(`  ${a.area}: ${id}`);
      reasons.forEach((why) => report.push(`      because ${why}`));
    });
  });
  report.push('', `selected ${ids.size} · automated ${automated} · manual ${manual.length}`);
  if (manual.length) {
    report.push('', 'Manual scenarios this change also touches (run them by hand):');
    manual.forEach((m) => report.push(`  [ ] ${m}`));
  }
  const failed = flag('strict') && r.unmapped.length > 0;
  if (failed) report.push('', `--strict: ${r.unmapped.length} unmapped file(s); map them in a graph or a selection pattern`);
  return { ids, report, failed };
}

function summary(lines) {
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n### e2e selection\n\n\`\`\`\n${lines.join('\n')}\n\`\`\`\n`);
  }
}

async function main() {
  const bad = badArguments();
  if (bad) {
    console.log(`ERROR ${bad}`);
    return 1;
  }
  const allAreas = await loadAreas();
  let areas = allAreas;
  const onlyAreas = opt('graph');
  if (onlyAreas) {
    const unknownAreas = onlyAreas.split(',').filter((n) => !allAreas.some((a) => a.area === n));
    if (unknownAreas.length) {
      console.log(`ERROR --graph: no area ${unknownAreas.join(', ')} (there are: ${allAreas.map((a) => a.area).join(', ')})`);
      return 1;
    }
    areas = allAreas.filter((a) => onlyAreas.split(',').includes(a.area));
  }

  for (const a of areas) {
    const unknown = Object.keys(a.scenarios).filter((id) => !a.graphIds.includes(id));
    if (unknown.length) {
      console.log(`ERROR ${a.area}: scenarios not in qa/graph/${a.area}.yaml (renamed?): ${unknown.join(', ')}`);
      return 1;
    }
    const staleTier1 = a.tier1.filter((p) => !Object.keys(a.scenarios).some((id) => startsWithAny(id, [p])));
    if (staleTier1.length) {
      console.log(`ERROR ${a.area}: TIER1 entries that match no scenario: ${staleTier1.join(', ')}`);
      return 1;
    }
  }

  if (flag('list')) {
    areas.forEach((a) => a.graphIds.forEach((id) => {
      const auto = id in a.scenarios;
      console.log(`${auto ? 'auto  ' : 'manual'} ${a.area}: ${id}${auto ? '' : `  (${manualReason(a, id)})`}`);
    }));
    return 0;
  }

  // [area, id] pairs to run.
  let todo = areas.flatMap((a) => Object.keys(a.scenarios).map((id) => [a, id]));
  if (flag('changed') || opt('changed')) {
    const { ids, report, failed } = selectChanged(areas, allAreas);
    console.log(report.join('\n'));
    summary(report);
    if (failed) return 1;
    todo = todo.filter(([a, id]) => ids.has(`${a.area}|${id}`));
    if (flag('dry-run')) return 0;
    console.log('');
    if (todo.length === 0 && !flag('tier1') && !opt('only')) {
      // A diff that reaches nothing, such as Markdown only.
      console.log('nothing to run');
      return 0;
    }
  }
  if (flag('tier1')) todo = todo.filter(([a, id]) => startsWithAny(id, a.tier1));
  const only = opt('only');
  if (only) todo = todo.filter(([, id]) => only.split(',').some((p) => id.startsWith(p)));
  if (todo.length === 0) {
    console.log('ERROR these options select no scenario');
    return 1;
  }
  if (flag('dry-run')) {
    todo.forEach(([a, id]) => console.log(`${a.area}: ${id}`));
    return 0;
  }

  ensureBuild(APP_DIR, { skipBuild: flag('skip-build') });
  ensureElectron(APP_DIR);
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'hathor-e2e-'));
  // Written as the run goes, so a run that is cut short still leaves its logs.
  const log = (m) => {
    const line = `${new Date().toISOString().slice(11, 23)} ${m}`;
    fs.appendFileSync(path.join(workDir, 'run.log'), `${line}\n`);
    if (flag('verbose')) console.log(line);
  };
  const sink = await startSink(ports.sink, { log });
  const harness = createHarness({
    appDir: APP_DIR, workDir, ports, sink, log,
  });

  // Group by area, then setup, so each setup profile is built once.
  todo.sort(([a1, i1], [a2, i2]) => a1.area.localeCompare(a2.area) || setupOf(i1).localeCompare(setupOf(i2)));
  const results = [];
  const t0 = Date.now();
  for (const [a, id] of todo) {
    const s0 = Date.now();
    const scenarioDir = path.join(workDir, 'scenarios', a.area, id.replace(/[:.]/g, '_'));
    fs.mkdirSync(scenarioDir, { recursive: true });
    const mode = opt('mode') || a.modeOf(id);
    const entry = {
      area: a.area, id, mode, status: 'PASS', details: null, error: null,
    };
    let ctx = null;
    log(`scenario ${a.area}: ${id}: start`);
    try {
      ctx = await harness.forScenario({
        area: a.area, setupId: setupOf(id), builders: a.setups, scenarioDir, mode,
      });
      const since = sink.mark();
      entry.details = await a.scenarios[id](ctx);
      // After the quit, so what is sent at shutdown counts too.
      await ctx.quit();
      // Every scenario: no client report, no envelope the sink couldn't read, and no request to sentry.io.
      const reports = sink.since(since, (i) => i.type === 'client_report');
      if (reports.length) throw new Error(`${reports.length} client_report envelope(s) sent`);
      const unparsed = sink.since(since, (i) => i.type === 'unparsed');
      if (unparsed.length) throw new Error(`${unparsed.length} envelope(s) the sink couldn't parse: ${unparsed[0].error}`);
      const attempted = ctx.shimLog().filter((e) => e.kind === 'sentry-request' && e.action === 'cancelled');
      if (attempted.length) throw new Error(`request(s) to sentry.io were attempted: ${attempted.map((e) => e.url).join(', ')}`);
      if (a.failOnExceptions && ctx.exceptions.length) throw new Error(`renderer exception: ${ctx.exceptions[0].text.slice(0, 300)}`);
    } catch (e) {
      entry.status = e instanceof SetupError ? 'BLOCKED' : 'FAIL';
      entry.error = e.message;
    } finally {
      if (ctx) { try { await ctx.quit(); } catch (_e) { /* already down */ } }
    }
    entry.seconds = Number(((Date.now() - s0) / 1000).toFixed(1));
    results.push(entry);
    fs.writeFileSync(path.join(workDir, 'results.json'), JSON.stringify({ results, sink: sink.items }, null, 2));
    const details = entry.details && (typeof entry.details === 'string' ? entry.details : JSON.stringify(entry.details));
    console.log(`${entry.status.padEnd(7)} ${a.area}: ${id}  (${entry.seconds}s)${entry.error ? `\n      ${entry.error}` : ''}${details ? `\n      ${details}` : ''}`);
    await sleep(300);
  }
  await sink.close();

  const failed = results.filter((r) => r.status !== 'PASS');
  const blocked = results.filter((r) => r.status === 'BLOCKED');
  const minutes = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`\n${results.length - failed.length}/${results.length} passed in ${minutes} min${blocked.length ? ` (${blocked.length} blocked by a setup that could not be built)` : ''}`);
  areas.forEach((a) => console.log(`  ${a.area}: ${Object.keys(a.scenarios).length} of ${a.graphIds.length} graph scenarios automated`));
  if (failed.length || flag('keep')) console.log(`logs: ${workDir}`);
  else fs.rmSync(workDir, { recursive: true, force: true });
  return failed.length ? 1 : 0;
}

['SIGINT', 'SIGTERM'].forEach((signal) => process.on(signal, () => {
  killLiveApps();
  process.exit(1);
}));

main().then((code) => { process.exitCode = code; }, (e) => {
  console.error(`FATAL ${e.stack || e.message}`);
  killLiveApps();
  process.exitCode = 1;
});
