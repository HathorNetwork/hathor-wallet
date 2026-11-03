/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { describe, it } = require('node:test');
const { expect } = require('./expect');
const path = require('path');
const { loadGraph } = require('../load');
const { computeImpact, allPicks } = require('../impact');
const { allScenarios } = require('../scenarios');
const {
  extractNames, checkFreshness, describeVersion,
} = require('../freshness');

const fixture = loadGraph(path.join(__dirname, 'fixtures', 'mini.yaml'));
const FLAG_PATTERN = "export\\s+const\\s+\\w+\\s*=\\s*(['\"])(?<name>[^'\"]+\\.rollout)\\1";
const ROUTE_PATTERN = "(?:Stack|Tab)\\.Screen\\b[^>]*?\\bname\\s*=\\s*(['\"])(?<name>[^'\"]+)\\1";
const flagInventory = (names) => ({ kind: 'flag', names, where: 'src/constants.js' });
const check = (overrides) => checkFreshness(structuredClone(fixture), {
  inventories: [flagInventory(['fee-based-tokens.rollout'])],
  changedFiles: [],
  graphChanged: false,
  ...overrides,
});

describe('qa graph freshness', () => {
  it('extracts names through a named group', () => {
    const src = "export const A = 'x.rollout';\nexport const B = 'other';";
    expect(extractNames(src, FLAG_PATTERN)).toEqual(['x.rollout']);
  });

  it('extracts the first group when the pattern has no named group', () => {
    expect(extractNames("route('/a') route('/b')", "route\\('([^']+)'\\)")).toEqual(['/a', '/b']);
  });

  it('extracts screen routes', () => {
    const src = `<Stack.Screen name='Foo' component={F} />\n<Tab.Screen name="Bar" />`;
    expect(extractNames(src, ROUTE_PATTERN)).toEqual(['Foo', 'Bar']);
  });

  it('warns about a flag missing from the graph', () => {
    const { warnings } = check({ inventories: [flagInventory(['fee-based-tokens.rollout', 'new.rollout'])] });
    expect(warnings.some((w) => w.includes('new.rollout'))).toBe(true);
  });

  it('warns about a flag removed from code', () => {
    const { warnings } = check({ inventories: [flagInventory([])] });
    expect(warnings.some((w) => w.includes('fee-based-tokens.rollout'))).toBe(true);
  });

  it('skips the flag comparison when no flag inventory is configured', () => {
    const { warnings } = check({ inventories: [] });
    expect(warnings).toEqual([]);
  });

  it('warns about a route missing from every feature', () => {
    const { warnings } = check({
      inventories: [{ kind: 'screen', names: ['Ghost'], where: 'src/App.js' }],
    });
    expect(warnings.some((w) => w.includes('Ghost'))).toBe(true);
  });

  it('warns when an in-scope feature changes without a graph update', () => {
    const { warnings } = check({ changedFiles: ['src/screens/Send/SendConfirm.js'] });
    expect(warnings.some((w) => w.includes('send-f'))).toBe(true);
  });

  it('matches a file entry exactly, not as a prefix', () => {
    const { warnings } = check({ changedFiles: ['src/screens/PinScreen.jsx'] });
    expect(warnings).toEqual([]);
    const hit = check({ changedFiles: ['src/screens/PinScreen.js'] });
    expect(hit.warnings.some((w) => w.includes('pin-f'))).toBe(true);
  });

  it('only notes out-of-scope changes', () => {
    const { warnings, notes } = check({ changedFiles: ['src/screens/TokenSwap/X.js'] });
    expect(warnings).toEqual([]);
    expect(notes.some((n) => n.includes('swap-f'))).toBe(true);
  });

  it('stays quiet when the graph changed too', () => {
    const { warnings } = check({
      changedFiles: ['src/screens/Send/SendConfirm.js'],
      graphChanged: true,
    });
    expect(warnings.some((w) => w.includes('send-f'))).toBe(false);
  });

  it('notes an unverified outcome whose source changed', () => {
    const { notes } = check({ changedFiles: ['src/screens/Send/SendAmountInput.js'] });
    expect(notes.some((n) => n.includes('err-priv'))).toBe(true);
  });

  it('describes the YAML and tools versions', () => {
    const base = {
      commit: 'ab123cd', date: '2026-10-22', dirty: false, toolsCommit: 'ef45678', toolsDirty: false,
    };
    expect(describeVersion(base)).toBe('YAML of 2026-10-22, commit ab123cd · tools ef45678');
    expect(describeVersion({ ...base, dirty: true }))
      .toBe('YAML of 2026-10-22, commit ab123cd + UNCOMMITTED changes · tools ef45678');
    expect(describeVersion({ ...base, toolsDirty: true }))
      .toBe('YAML of 2026-10-22, commit ab123cd · tools ef45678 + UNCOMMITTED changes');
  });
});

describe('computeImpact with precomputed scenarios', () => {
  it('returns identical results with and without the parameter', () => {
    const scenarios = allScenarios(fixture);
    allPicks(fixture).forEach((pick) => {
      expect(computeImpact(fixture, pick, scenarios)).toEqual(computeImpact(fixture, pick));
    });
  });
});
