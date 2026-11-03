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
const { allScenarios } = require('../scenarios');
const { renderHtml } = require('../render');

const fixture = (name) => loadGraph(path.join(__dirname, 'fixtures', name));

describe('the optional check block', () => {
  const withCheck = (check) => ({ ...fixture('mini.yaml'), check });

  it('accepts a well-formed block', () => {
    const { errors, warnings } = validateGraph(withCheck({
      base: 'origin/main',
      inventories: [{ kind: 'flag', files: ['src/constants.js'], pattern: "'(?<name>[^']+\\.rollout)'" }],
    }));
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('rejects an unknown kind, missing files and a broken pattern', () => {
    const { errors } = validateGraph(withCheck({
      inventories: [{ kind: 'route', files: [], pattern: '(' }],
    }));
    expect(errors).toEqual(expect.arrayContaining([
      "check inventories[0]: invalid kind 'route'",
      'check inventories[0]: files must be a non-empty list',
    ]));
    expect(errors.some((e) => e.startsWith('check inventories[0]: invalid pattern'))).toBe(true);
  });

  it('warns about unknown keys inside it', () => {
    const { warnings } = validateGraph(withCheck({ bse: 'x', inventories: [] }));
    expect(warnings).toContain("check: unknown key 'bse'");
  });
});

describe('a graph with no flags (desktop Sentry snapshot)', () => {
  const graph = fixture('desktop-sentry.snapshot.yaml');

  it('validates without errors or warnings', () => {
    expect(validateGraph(graph)).toEqual({ errors: [], warnings: [] });
  });

  it('produces scenarios for every action and renders', () => {
    const scenarios = allScenarios(graph);
    const actions = new Set(scenarios.map((s) => s.action));
    graph.actions.forEach((a) => expect(actions.has(a.id)).toBe(true));
    expect(renderHtml(graph, { label: 'test' })).toContain('id="graph-data"');
  });
});

describe('validator rules added in the kit', () => {
  const mini = () => structuredClone(fixture('mini.yaml'));

  it('rejects an impossible transition on an axis without a fallback', () => {
    const g = mini();
    const axis = g.axes.find((a) => a.switch && Array.isArray(a.switch.transitions) && a.switch.transitions.length > 0)
      || g.axes[0];
    const [a, b] = axis.values.map((v) => v.id);
    axis.switch = { cost: 'cheap', transitions: [{ from: a, to: b, impossible: true }] };
    const { errors } = validateGraph(g);
    expect(errors).toContain(`axis ${axis.id}: transition ${a}->${b} is impossible but the axis has no switch.fallback`);
  });

  it('warns when an outcome has no boolean verified', () => {
    const g = mini();
    const outcome = g.actions[0].path.outcomes[0];
    delete outcome.verified;
    const { warnings } = validateGraph(g);
    expect(warnings).toContain(`action ${g.actions[0].id}: outcome ${outcome.id}: verified must be true or false`);
  });

  it('warns about a constraint with an empty when', () => {
    const g = mini();
    g.constraints[0].when = {};
    const { warnings } = validateGraph(g);
    expect(warnings).toContain(`constraint ${g.constraints[0].id}: empty 'when' matches every combination of the action`);
  });
});
