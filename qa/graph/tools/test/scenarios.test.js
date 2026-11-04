/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { describe, it } = require('node:test');
const { expect } = require('./expect');
const path = require('path');
const { loadGraph, validateGraph } = require('../load');
const { classifyCombo, selectScenarios, allScenarios } = require('../scenarios');

const fixture = path.join(__dirname, 'fixtures', 'mini.yaml');
const fresh = () => structuredClone(loadGraph(fixture));
const graph = loadGraph(fixture);
const combo = (facade, dest, token, privacy) => ({
  facade, addr: 'single', dest, token, privacy,
});

describe('classifyCombo', () => {
  it('classifies private to simple as rejected', () => {
    const r = classifyCombo(graph, 'send', combo('ws', 'simple', 'htr', 'private'));
    expect(r.classes).toEqual(['rejected']);
    expect(r.expected).toEqual(['err-priv']);
  });

  it('excludes shielded on fullnode', () => {
    expect(classifyCombo(graph, 'send', combo('fn', 'shielded', 'htr', 'public')).excluded).toBe(true);
  });

  it('marks multisig as lib-risk and fee as edge together', () => {
    const r = classifyCombo(graph, 'send', combo('ws', 'multisig', 'fee', 'public'));
    expect(r.classes).toEqual(['lib-risk', 'edge']);
    expect(r.constraintIds).toEqual(['c-multisig', 'c-fee']);
    expect(r.expected).toEqual(['err-htr']);
  });

  it('a rejection expects only its own outcome, dropping later edges', () => {
    const r = classifyCombo(graph, 'send', combo('ws', 'simple', 'fee', 'private'));
    expect(r.classes).toEqual(['rejected', 'edge']);
    expect(r.constraintIds).toEqual(['c-priv', 'c-fee']);
    expect(r.expected).toEqual(['err-priv']);
  });

  it('keeps only the rejections at the earliest step, and edges before it', () => {
    const g = fresh();
    const { outcomes } = g.actions[0].path;
    outcomes.push({ id: 'err-late', kind: 'error', at: 'confirm', message: 'late', source: 'x:1', verified: false });
    outcomes.push({ id: 'err-early', kind: 'error', at: 'addr-in', message: 'early', source: 'x:2', verified: false });
    g.constraints.push(
      { id: 'c-late', action: 'send', when: { token: 'fee' }, class: 'rejected', outcome: 'err-late', note: 'x' },
      { id: 'c-early', action: 'send', when: { dest: 'multisig' }, class: 'edge', outcome: 'err-early', note: 'x' },
    );
    const r = classifyCombo(g, 'send', combo('ws', 'multisig', 'fee', 'private'));
    expect(r.expected).toEqual(['err-early', 'err-priv']);
  });

  it('plain combo expects the success outcome', () => {
    const r = classifyCombo(graph, 'send', combo('ws', 'simple', 'htr', 'public'));
    expect(r.excluded).toBe(false);
    expect(r.classes).toEqual([]);
    expect(r.expected).toEqual(['ok-sent']);
  });
});

describe('selectScenarios', () => {
  const pairsOf = (values, axes) => {
    const out = [];
    for (let i = 0; i < axes.length; i += 1) {
      for (let j = i + 1; j < axes.length; j += 1) {
        out.push(`${axes[i]}=${values[axes[i]]}|${axes[j]}=${values[axes[j]]}`);
      }
    }
    return out;
  };

  it('covers every valid pair', () => {
    const axes = ['dest', 'token', 'privacy'];
    const action = graph.actions.find((a) => a.id === 'send');
    action.setups.forEach((setupId) => {
      const setup = graph.setups.find((s) => s.id === setupId);
      const expected = new Set();
      graph.axes.find((a) => a.id === 'dest').values.forEach((d) => {
        graph.axes.find((a) => a.id === 'token').values.forEach((t) => {
          graph.axes.find((a) => a.id === 'privacy').values.forEach((p) => {
            const values = { ...setup.values, dest: d.id, token: t.id, privacy: p.id };
            const r = classifyCombo(graph, 'send', values);
            if (!r.excluded && !r.classes.includes('rejected')) {
              pairsOf(values, axes).forEach((k) => expected.add(k));
            }
          });
        });
      });
      const got = new Set();
      selectScenarios(graph, 'send', setupId).forEach((s) => {
        pairsOf(s.values, axes).forEach((k) => got.add(k));
      });
      expected.forEach((k) => expect(got.has(k)).toBe(true));
    });
  });

  it('includes a scenario for every constraint that can match', () => {
    const ids = (setupId) => new Set(
      selectScenarios(graph, 'send', setupId).flatMap((s) => s.constraintIds),
    );
    expect([...ids('ws-single')]).toEqual(expect.arrayContaining(['c-priv', 'c-multisig', 'c-fee']));
    expect(ids('fn-single').has('c-shielded-fn')).toBe(false);
  });

  it('never returns excluded combos', () => {
    ['fn-single', 'fn-multi'].forEach((setupId) => {
      selectScenarios(graph, 'send', setupId).forEach((s) => {
        expect(s.values.dest).not.toBe('shielded');
      });
    });
  });

  it('is deterministic', () => {
    expect(selectScenarios(graph, 'send', 'ws-single'))
      .toEqual(selectScenarios(graph, 'send', 'ws-single'));
  });

  it('ids follow action:setup:values', () => {
    const [first] = selectScenarios(graph, 'send', 'ws-single');
    expect(first.id).toMatch(/^send:ws-single:[a-z]+\.[a-z]+\.[a-z]+$/);
    expect(first.action).toBe('send');
    expect(first.setup).toBe('ws-single');
    expect(first.values.facade).toBe('ws');
  });
});

describe('allScenarios', () => {
  it('covers every action x setup in YAML order', () => {
    const all = allScenarios(graph);
    const setupOrder = [...new Set(all.map((s) => s.setup))];
    expect(setupOrder).toEqual(['ws-single', 'ws-multi', 'fn-single', 'fn-multi']);
    expect(all.length).toBe(
      setupOrder.reduce((n, id) => n + selectScenarios(graph, 'send', id).length, 0),
    );
  });
});

describe('validateGraph scenario checks', () => {
  it('warns about a constraint that matches no combination', () => {
    const g = fresh();
    g.constraints.push({
      id: 'c-dead', action: 'send', when: { dest: 'shielded', facade: 'fn' }, class: 'edge', note: 'x',
    });
    expect(validateGraph(g).warnings.some((w) => w.includes('c-dead'))).toBe(true);
  });

  it('does not warn on the mini fixture', () => {
    expect(validateGraph(fresh()).warnings).toEqual([]);
  });

  it('warns about an invalid constraint that matches nothing', () => {
    const g = fresh();
    g.setups = g.setups.filter((s) => s.values.facade === 'ws');
    g.actions[0].setups = ['ws-single', 'ws-multi'];
    expect(validateGraph(g).warnings.some((w) => w.includes('c-shielded-fn'))).toBe(true);
  });

  it('reports duplicate action axes', () => {
    const g = fresh();
    g.actions[0].axes = ['dest', 'dest', 'token'];
    expect(validateGraph(g).errors.some((e) => e.includes('send') && e.includes('dest'))).toBe(true);
  });
});

describe('actions with fewer than two axes', () => {
  const variant = (axes) => {
    const g = fresh();
    g.actions.push({
      ...structuredClone(g.actions[0]), id: 'extra', axes, setups: ['ws-single', 'fn-single'],
    });
    g.constraints = [];
    return g;
  };

  it('covers every value of a one-axis action', () => {
    const g = variant(['dest']);
    ['ws-single', 'fn-single'].forEach((setupId) => {
      const seen = selectScenarios(g, 'extra', setupId).map((s) => s.values.dest);
      expect(new Set(seen)).toEqual(new Set(['simple', 'multisig', 'shielded']));
    });
  });

  it('returns exactly one scenario per setup for a zero-axis action', () => {
    const g = variant([]);
    ['ws-single', 'fn-single'].forEach((setupId) => {
      const result = selectScenarios(g, 'extra', setupId);
      expect(result.map((s) => s.id)).toEqual([`extra:${setupId}`]);
    });
  });
});
