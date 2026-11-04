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
const { planRun, transitionCost, sequenceCost } = require('../runplan');

const fixture = path.join(__dirname, 'fixtures', 'mini.yaml');
const fresh = () => structuredClone(loadGraph(fixture));

describe('qa graph run plan', () => {
  it('same value costs nothing', () => {
    expect(transitionCost(fresh(), 'addr', 'multi', 'multi').cost).toBe(0);
  });

  it('single to multi uses the cheap switch', () => {
    const t = transitionCost(fresh(), 'addr', 'single', 'multi');
    expect(t.cost).toBe(1);
    expect(t.via).toBe('switch');
  });

  it('multi to single goes through the fallback', () => {
    const t = transitionCost(fresh(), 'addr', 'multi', 'single');
    expect(t.via).toBe('fallback');
    expect(t.cost).toBe(60);
    expect(t.how).toContain('reset wallet');
  });

  it('orders setups by cheapest next switch', () => {
    const g = fresh();
    const plan = planRun(g, allScenarios(g));
    expect(plan.map((s) => s.setup)).toEqual(['ws-single', 'ws-multi', 'fn-multi', 'fn-single']);
    expect(plan[3].steps[0].via).toBe('fallback');
  });

  it('no step is ever impossible', () => {
    const g = fresh();
    const plan = planRun(g, allScenarios(g));
    plan.forEach((group) => {
      expect(group.cost).not.toBe(Infinity);
      group.steps.forEach((step) => expect(step.via).not.toBe('none'));
    });
  });

  it('throws when a setup is unreachable', () => {
    const g = fresh();
    delete g.axes.find((a) => a.id === 'addr').switch.fallback;
    const scenarios = allScenarios(g).filter((s) => ['ws-multi', 'ws-single'].includes(s.setup));
    expect(() => planRun(g, scenarios, { start: 'ws-multi' })).toThrow('ws-single');
  });

  it('keeps every scenario exactly once', () => {
    const g = fresh();
    const all = allScenarios(g);
    const ids = planRun(g, all).flatMap((s) => s.scenarios.map((x) => x.id));
    expect(ids).toHaveLength(all.length);
    expect(new Set(ids)).toEqual(new Set(all.map((s) => s.id)));
  });

  it('puts not-runnable setups last and never routes through them', () => {
    const g = fresh();
    g.setups.find((s) => s.id === 'ws-multi').runnable = false;
    const plan = planRun(g, allScenarios(g), { start: 'ws-multi' });
    expect(plan.map((s) => s.setup)).toEqual(['ws-single', 'fn-single', 'fn-multi', 'ws-multi']);
    expect(plan.map((s) => s.runnable)).toEqual([true, true, true, false]);
    expect(plan[3].cost).toBe(0);
    expect(plan[3].steps).toEqual([]);
  });

  describe('order inside a setup', () => {
    // Privacy changes fastest in enumeration order; make it the expensive switch.
    const costly = () => {
      const g = fresh();
      g.axes.find((a) => a.id === 'privacy').switch.cost = 'expensive';
      g.axes.find((a) => a.id === 'token').switch.cost = 'medium';
      return g;
    };
    const enumerated = (g, setup) => allScenarios(g).filter((s) => s.setup === setup);

    it('never costs more than enumeration order', () => {
      [fresh(), costly()].forEach((g) => {
        planRun(g, allScenarios(g)).forEach((group) => {
          expect(group.intraCost).toBe(sequenceCost(g, group.scenarios));
          expect(group.intraCost).toBeLessThanOrEqual(sequenceCost(g, enumerated(g, group.setup)));
        });
      });
    });

    it('cuts expensive switches', () => {
      const g = costly();
      const before = g.setups.reduce((n, s) => n + sequenceCost(g, enumerated(g, s.id)), 0);
      const after = planRun(g, allScenarios(g)).reduce((n, group) => n + group.intraCost, 0);
      expect(after).toBeLessThan(before);
    });

    it('is deterministic and keeps every scenario', () => {
      const g = costly();
      const plan = planRun(g, allScenarios(g));
      expect(planRun(g, allScenarios(g))).toEqual(plan);
      plan.forEach((group) => {
        expect(new Set(group.scenarios.map((s) => s.id)))
          .toEqual(new Set(enumerated(g, group.setup).map((s) => s.id)));
      });
    });

    it('lists the switches that cost more than cheap', () => {
      const g = costly();
      const [group] = planRun(g, allScenarios(g));
      expect(group.moves.length).toBeGreaterThan(0);
      group.moves.forEach((move) => {
        expect(group.scenarios.map((s) => s.id)).toContain(move.scenario);
        move.steps.forEach((step) => expect(step.cost).toBeGreaterThan(g.costs.cheap));
      });
      const plain = planRun(fresh(), allScenarios(fresh()));
      plain.forEach((grp) => expect(grp.moves).toEqual([]));
    });
  });
});
