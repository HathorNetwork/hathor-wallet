#!/usr/bin/env node
/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { loadGraph, validateGraph } = require('./load');
const { renderHtml } = require('./render');
const { checkFreshness, describeVersion, extractNames } = require('./freshness');
const { allScenarios } = require('./scenarios');

const USAGE = 'Usage: qa-graph validate|render|check|sources|scenarios --graph <file> [--out <file>] [--base <ref>]';
const OPTIONS = ['graph', 'out', 'base'];
const KIT_ROOT = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const options = {};
  for (let i = 0; i < rest.length; i += 1) {
    const flag = rest[i];
    const key = flag.replace(/^--/, '');
    if (!flag.startsWith('--') || !OPTIONS.includes(key) || i + 1 >= rest.length) {
      throw new Error(`Unknown or incomplete option '${flag}'. ${USAGE}`);
    }
    i += 1;
    options[key] = rest[i];
  }
  if (!options.graph) throw new Error(`Missing --graph. ${USAGE}`);
  options.graph = path.resolve(options.graph);
  options.out = path.resolve(options.out || path.join(path.dirname(options.graph), 'dist', 'graph.html'));
  return { command, options };
}

const git = (cwd, args) => execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });

/** The checkout the graph describes: the git top level of the graph's directory. */
function repoRootOf(graphPath) {
  try {
    return git(path.dirname(graphPath), ['rev-parse', '--show-toplevel']).trim();
  } catch (e) {
    return null;
  }
}

function printValidation(graph) {
  const { errors, warnings } = validateGraph(graph);
  errors.forEach((e) => console.log(`ERROR ${e}`));
  warnings.forEach((w) => console.log(`WARN ${w}`));
  return errors.length;
}

function graphVersion(graphPath) {
  const tools = (() => {
    try {
      return {
        toolsCommit: git(KIT_ROOT, ['rev-parse', '--short', 'HEAD']).trim(),
        toolsDirty: git(KIT_ROOT, ['status', '--porcelain', '--', 'tools']).trim() !== '',
      };
    } catch (e) {
      return { toolsCommit: 'unknown', toolsDirty: false };
    }
  })();
  try {
    const cwd = path.dirname(graphPath);
    const [commit, date] = git(cwd, ['log', '-1', '--format=%h %cs', '--', graphPath]).trim().split(' ');
    const dirty = git(cwd, ['status', '--porcelain', '--', graphPath]).trim() !== '';
    return describeVersion({
      commit: commit || 'uncommitted', date: date || 'never committed', dirty, ...tools,
    });
  } catch (e) {
    return describeVersion({
      commit: 'none (not in git)', date: 'unknown date', dirty: false, ...tools,
    });
  }
}

function changedFilesSince(root, base) {
  try {
    return git(root, ['diff', '--name-only', `${base}...HEAD`]).split('\n').filter(Boolean);
  } catch (e) {
    console.log(`WARN Cannot diff against '${base}' (${e.message.split('\n')[0]}); assuming no changed files`);
    return [];
  }
}

/** Names each `check.inventories` entry finds in the code. */
function readInventories(root, check) {
  return ((check && check.inventories) || []).map((inv) => {
    const names = inv.files.flatMap((rel) => {
      try {
        return extractNames(fs.readFileSync(path.join(root, rel), 'utf8'), inv.pattern);
      } catch (e) {
        console.log(`WARN Cannot read ${rel}: ${e.message}`);
        return [];
      }
    });
    return { kind: inv.kind, names, where: inv.files.join(', ') };
  });
}

function run(argv) {
  const { command, options } = parseArgs(argv);
  const graph = loadGraph(options.graph);

  if (command === 'validate') {
    return printValidation(graph) > 0 ? 1 : 0;
  }

  if (command === 'render') {
    if (printValidation(graph) > 0) return 1;
    const html = renderHtml(graph, { label: graphVersion(options.graph) });
    fs.mkdirSync(path.dirname(options.out), { recursive: true });
    fs.writeFileSync(options.out, html);
    console.log(`Wrote ${options.out}`);
    return 0;
  }

  if (command === 'check') {
    const errorCount = printValidation(graph);
    const root = repoRootOf(options.graph);
    if (!root) {
      console.log('WARN The graph is not inside a git checkout; nothing to compare against');
      return errorCount > 0 ? 1 : 0;
    }
    const base = options.base || (graph.check && graph.check.base) || 'origin/master';
    const changedFiles = changedFilesSince(root, base);
    const { warnings, notes } = checkFreshness(graph, {
      inventories: readInventories(root, graph.check),
      changedFiles,
      graphChanged: changedFiles.includes(path.relative(root, options.graph)),
    });
    warnings.forEach((w) => console.log(`WARN ${w}`));
    notes.forEach((n) => console.log(`NOTE ${n}`));
    return errorCount > 0 ? 1 : 0;
  }

  if (command === 'scenarios') {
    if (printValidation(graph) > 0) return 1;
    const scenarios = allScenarios(graph);
    const setupIds = (graph.setups || []).map((s) => s.id);
    const width = Math.max(6, ...(graph.actions || []).map((a) => a.id.length));
    const cols = setupIds.map((id) => String(id).padStart(Math.max(id.length, 3)));
    console.log(`${'action'.padEnd(width)}  ${cols.join(' ')}  total`);
    (graph.actions || []).forEach((action) => {
      const mine = scenarios.filter((x) => x.action === action.id);
      const cells = setupIds.map((id, i) => {
        const n = mine.filter((x) => x.setup === id).length;
        return (n ? String(n) : '.').padStart(cols[i].length);
      });
      console.log(`${action.id.padEnd(width)}  ${cells.join(' ')}  ${mine.length}`);
    });
    console.log(`${scenarios.length} scenarios\n`);
    scenarios.forEach((x) => console.log(`id ${x.id}${x.classes.length ? `  [${x.classes.join(',')}]` : ''}`));
    return 0;
  }

  if (command === 'sources') {
    const root = repoRootOf(options.graph) || path.dirname(options.graph);
    let missing = 0;
    (graph.actions || []).forEach((action) => {
      ((action.path && action.path.outcomes) || []).forEach((o) => {
        const [file, lineNo] = String(o.source || '').split(/:(?=\d+$)/);
        let text;
        try {
          const lines = fs.readFileSync(path.join(root, file), 'utf8').split('\n');
          text = lineNo ? lines[Number(lineNo) - 1] : '(no line number)';
          if (text === undefined) text = `MISSING: past the end of the file (${lines.length} lines)`;
        } catch (e) {
          text = `MISSING: ${e.code || e.message}`;
        }
        if (text.startsWith('MISSING')) missing += 1;
        console.log(`${action.id}/${o.id}  ${o.source}\n    ${text.trim()}`);
      });
    });
    return missing > 0 ? 1 : 0;
  }

  throw new Error(USAGE);
}

try {
  process.exitCode = run(process.argv.slice(2));
} catch (e) {
  console.error(`ERROR ${e.message}`);
  process.exitCode = 1;
}
