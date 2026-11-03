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
const { allScenarios } = require('../scenarios');
const { computeImpact, allPicks } = require('../impact');

const graph = structuredClone(loadGraph(path.join(__dirname, 'fixtures', 'mini.yaml')));
const entry = (impact, feature) => impact.touched.find((t) => t.feature === feature);
const sendIds = (g) => allScenarios(g).filter((s) => s.action === 'send').map((s) => s.id);

describe('qa graph impact', () => {
  it('feature pick spreads via its links', () => {
    const impact = computeImpact(graph, { type: 'feature', id: 'pin-f' });
    expect(entry(impact, 'send-f').reasons)
      .toContainEqual({ via: 'code', why: 'PIN confirms send' });
    expect(entry(impact, 'pin-f').reasons)
      .toContainEqual({ via: 'code', why: 'changed directly' });
  });

  it('flag pick spreads via gates', () => {
    const impact = computeImpact(graph, { type: 'flag', id: 'fbt' });
    const reason = entry(impact, 'fee-f').reasons.find((r) => r.via === 'flag');
    expect(reason.why).toContain('fee-based-tokens.rollout');
  });

  it('axis value pick spreads via axis to unchanged code', () => {
    const impact = computeImpact(graph, { type: 'axisValue', id: 'token:fee' });
    expect(entry(impact, 'send-f').reasons.map((r) => r.via)).toContain('axis');
    expect(impact.scenarios.length).toBeGreaterThan(0);
    impact.scenarios.forEach((s) => expect(s.values.token).toBe('fee'));
    expect(impact.plan.length).toBeGreaterThan(0);
  });

  it('feature introducing a value spreads via axis', () => {
    const impact = computeImpact(graph, { type: 'feature', id: 'fee-f' });
    expect(impact.changed.axisValues).toEqual(['token:fee']);
    expect(entry(impact, 'send-f').reasons.map((r) => r.via)).toContain('axis');
  });

  it('merges reasons per feature and gives each a non-empty why', () => {
    const impact = computeImpact(graph, { type: 'feature', id: 'fee-f' });
    const ids = impact.touched.map((t) => t.feature);
    expect(new Set(ids).size).toBe(ids.length);
    impact.touched.forEach((t) => {
      expect(t.reasons.length).toBeGreaterThan(0);
      t.reasons.forEach((r) => expect(r.why.length).toBeGreaterThan(0));
    });
  });

  it('limits an axis-only feature to scenarios on the changed value', () => {
    const impact = computeImpact(graph, { type: 'feature', id: 'fee-f' });
    expect(impact.scenarios.length).toBeGreaterThan(0);
    impact.scenarios.forEach((s) => expect(s.values.token).toBe('fee'));
  });

  it('re-runs all scenarios of a feature reached via code', () => {
    const impact = computeImpact(graph, { type: 'feature', id: 'pin-f' });
    const sends = allScenarios(graph).filter((s) => s.action === 'send');
    expect(impact.scenarios.map((s) => s.id)).toEqual(sends.map((s) => s.id));
  });

  it('returns an empty plan when no scenarios are reached', () => {
    const g = structuredClone(graph);
    g.features.find((f) => f.id === 'fee-f').introduces = [];
    const none = computeImpact(g, { type: 'flag', id: 'fbt' });
    expect(none.scenarios).toEqual([]);
    expect(none.plan).toEqual([]);
  });

  it('touches the features that depend on a change, not its dependencies', () => {
    const impact = computeImpact(graph, { type: 'feature', id: 'send-f' });
    expect(impact.touched.map((t) => t.feature)).toEqual(['send-f']);
  });

  it('re-runs the actions a feature lists in actions, not only those naming it', () => {
    const g = structuredClone(graph);
    g.features.find((f) => f.id === 'pin-f').actions = ['send'];
    g.features.find((f) => f.id === 'send-f').links = [];
    const impact = computeImpact(g, { type: 'feature', id: 'pin-f' });
    expect(impact.scenarios.map((s) => s.id)).toEqual(sendIds(g));
  });

  it('flag pick reaches the scenarios of actions exercising the features it gates', () => {
    const g = structuredClone(graph);
    g.features.find((f) => f.id === 'fee-f').actions = ['send'];
    const impact = computeImpact(g, { type: 'flag', id: 'fbt' });
    expect(impact.scenarios.map((s) => s.id)).toEqual(sendIds(g));
  });

  it('flag pick reaches the values its gated features introduce', () => {
    const impact = computeImpact(graph, { type: 'flag', id: 'fbt' });
    expect(impact.scenarios.length).toBeGreaterThan(0);
    impact.scenarios.forEach((s) => expect(s.values.token).toBe('fee'));
    expect(entry(impact, 'send-f').reasons.map((r) => r.via)).toEqual(['axis']);
  });

  it('flag pick spreads via axis to the axis values it controls', () => {
    const g = structuredClone(graph);
    g.features.find((f) => f.id === 'fee-f').introduces = [];
    g.flags.find((f) => f.id === 'fbt').axisValues = ['facade:ws'];
    const impact = computeImpact(g, { type: 'flag', id: 'fbt' });
    expect(impact.changed.axisValues).toEqual(['facade:ws']);
    expect(entry(impact, 'send-f').reasons.map((r) => r.via)).toEqual(['axis']);
    const wsSends = allScenarios(g).filter((s) => s.values.facade === 'ws').map((s) => s.id);
    expect(impact.scenarios.map((s) => s.id)).toEqual(wsSends);
  });

  it('a feature pick tags touched features with its flags but does not spread through them', () => {
    const g = structuredClone(graph);
    const pin = g.features.find((f) => f.id === 'pin-f');
    pin.flags = ['fbt'];
    pin.links = [];
    g.flags.find((f) => f.id === 'fbt').gates.push('pin-f');
    g.flags.find((f) => f.id === 'fbt').axisValues = ['facade:ws'];
    g.features.find((f) => f.id === 'send-f').links = [];
    const impact = computeImpact(g, { type: 'feature', id: 'pin-f' });
    expect(impact.touched.map((t) => t.feature)).toEqual(['pin-f']);
    expect(entry(impact, 'pin-f').reasons.map((r) => r.via)).toEqual(['code', 'flag']);
    expect(impact.changed.axisValues).toEqual([]);
    expect(impact.scenarios).toEqual([]);
  });

  it('a feature reached via code re-runs the scenarios on the values it introduces', () => {
    const g = structuredClone(graph);
    g.features.find((f) => f.id === 'send-f').links = [];
    g.features.find((f) => f.id === 'fee-f').links = [{ to: 'pin-f', reason: 'fees are confirmed with the PIN' }];
    const impact = computeImpact(g, { type: 'feature', id: 'pin-f' });
    expect(entry(impact, 'fee-f').reasons).toContainEqual({ via: 'code', why: 'fees are confirmed with the PIN' });
    expect(entry(impact, 'send-f').reasons.map((r) => r.via)).toEqual(['axis']);
    const feeSends = allScenarios(g).filter((s) => s.values.token === 'fee').map((s) => s.id);
    expect(impact.scenarios.map((s) => s.id)).toEqual(feeSends);
  });

  it('throws on unknown picks', () => {
    expect(() => computeImpact(graph, { type: 'flag', id: 'nope' }))
      .toThrow("Unknown flag 'nope'");
    expect(() => computeImpact(graph, { type: 'axisValue', id: 'token:zzz' }))
      .toThrow("Unknown axisValue 'token:zzz'");
  });

  it('allPicks excludes out-of-scope features', () => {
    const picks = allPicks(graph);
    expect(picks.find((p) => p.id === 'swap-f')).toBeUndefined();
    expect(picks).toContainEqual({ type: 'flag', id: 'fbt' });
    expect(picks).toContainEqual({ type: 'axisValue', id: 'token:fee' });
  });
});

describe('qa graph impact on the mobile-wallet snapshot', () => {
  const real = loadGraph(path.join(__dirname, 'fixtures', 'mobile-wallet.snapshot.yaml'));
  const scenarios = allScenarios(real);
  const impactOf = (type, id) => computeImpact(real, { type, id }, scenarios);
  const actionsOf = (impact) => [...new Set(impact.scenarios.map((s) => s.action))].sort();

  it('flag wallet-service reaches every action on the wallet-service facade', () => {
    const impact = impactOf('flag', 'wallet-service');
    const onWs = impact.scenarios.filter((s) => s.values.facade === 'wallet-service');
    expect(actionsOf({ scenarios: onWs })).toEqual(['create-token', 'history', 'receive', 'send']);
  });

  it('flag fee-based-tokens reaches the fee-token sends', () => {
    const impact = impactOf('flag', 'fee-based-tokens');
    const sends = impact.scenarios.filter((s) => s.action === 'send');
    expect(sends.length).toBeGreaterThan(0);
    sends.forEach((s) => expect(s.values.token).toBe('fee'));
  });

  it('feature fee-tokens re-runs the fee column and create token only', () => {
    const impact = impactOf('feature', 'fee-tokens');
    const createTokens = scenarios.filter((s) => s.action === 'create-token');
    expect(impact.scenarios.filter((s) => s.action === 'create-token')).toEqual(createTokens);
    impact.scenarios.filter((s) => s.action !== 'create-token')
      .forEach((s) => expect(s.values.token).toBe('fee'));
  });

  it('features without their own screens in a path still reach scenarios', () => {
    ['dashboard', 'network-settings', 'wallet-service', 'address-mode'].forEach((id) => {
      expect(impactOf('feature', id).scenarios.length).toBeGreaterThan(0);
    });
  });

  it('tx-history does not re-run the sends', () => {
    expect(actionsOf(impactOf('feature', 'tx-history'))).toEqual(['history']);
  });
});
