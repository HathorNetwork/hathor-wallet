/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { describe, it } = require('node:test');
const { expect } = require('./expect');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { loadGraph, validateGraph } = require('../load');

const fixture = path.join(__dirname, 'fixtures', 'mini.yaml');
const fresh = () => structuredClone(loadGraph(fixture));
const find = (list, id) => list.find((item) => item.id === id);

describe('qa graph loader', () => {
  it('loads the mini fixture without errors', () => {
    expect(validateGraph(loadGraph(fixture)).errors).toEqual([]);
  });

  it('accepts empty axes, setups, actions and constraints', () => {
    const graph = fresh();
    Object.assign(graph, {
      features: graph.features.map((f) => ({ ...f, actions: [], introduces: [] })),
      axes: [],
      setups: [],
      actions: [],
      constraints: [],
    });
    expect(validateGraph(graph).errors).toEqual([]);
  });

  it('reports unknown axis value in a constraint', () => {
    const graph = fresh();
    find(graph.constraints, 'c-priv').when.dest = ['simple', 'nope'];
    const { errors } = validateGraph(graph);
    expect(errors.some((e) => e.includes('c-priv') && e.includes('nope'))).toBe(true);
  });

  it('warns when a flag gates a feature that does not list it', () => {
    const graph = fresh();
    find(graph.flags, 'fbt').gates = ['fee-f', 'pin-f'];
    const { errors, warnings } = validateGraph(graph);
    expect(errors).toEqual([]);
    expect(warnings).toContainEqual(
      "flag fbt: gates feature 'pin-f', but that feature does not list the flag"
    );
  });

  it('warns when a feature lists a flag that does not gate it', () => {
    const graph = fresh();
    find(graph.features, 'pin-f').flags = ['fbt'];
    expect(validateGraph(graph).warnings).toContainEqual(
      "feature pin-f: lists flag 'fbt', but the flag does not gate it"
    );
  });

  it('gives the mini fixture no warnings', () => {
    expect(validateGraph(fresh()).warnings).toEqual([]);
  });

  it('reports dangling feature link', () => {
    const graph = fresh();
    find(graph.features, 'pin-f').links = [{ to: 'ghost', reason: 'x' }];
    expect(validateGraph(graph).errors.some((e) => e.includes('ghost'))).toBe(true);
  });

  it('requires outcome on rejected constraints', () => {
    const graph = fresh();
    delete find(graph.constraints, 'c-priv').outcome;
    expect(validateGraph(graph).errors.some((e) => e.includes('c-priv'))).toBe(true);
  });

  it('rejects duplicate ids within a collection', () => {
    const graph = fresh();
    graph.setups.push({ ...find(graph.setups, 'ws-single') });
    expect(validateGraph(graph).errors.some((e) => e.includes('ws-single'))).toBe(true);
  });

  it('warns about unknown keys, naming the key and its owner', () => {
    const graph = fresh();
    find(graph.setups, 'ws-single').runable = true;
    find(graph.features, 'pin-f').link = [];
    find(graph.actions, 'send').path.outcomes[0].mesage = 'x';
    find(graph.axes, 'addr').switch.transitions[0].costs = 'cheap';
    graph.extra = 1;
    const { errors, warnings } = validateGraph(graph);
    expect(errors).toEqual([]);
    expect(warnings).toEqual(expect.arrayContaining([
      "setup ws-single: unknown key 'runable'",
      "feature pin-f: unknown key 'link'",
      "action send outcome ok-sent: unknown key 'mesage'",
      "axis addr transition multi->single: unknown key 'costs'",
      "graph: unknown key 'extra'",
    ]));
  });

  it('reports null and malformed list items as errors', () => {
    const graph = fresh();
    graph.features.push(null);
    graph.setups.push('ws-x');
    find(graph.features, 'send-f').links.push(null);
    find(graph.axes, 'dest').values.push(null);
    find(graph.actions, 'send').path.outcomes.push(null);
    find(graph.actions, 'send').path.steps.push(7);
    graph.constraints.push(null);
    find(graph.axes, 'addr').switch.transitions.push(null);
    let result;
    expect(() => { result = validateGraph(graph); }).not.toThrow();
    expect(result.errors).toEqual(expect.arrayContaining([
      'features[4]: expected a mapping',
      'setups[4]: expected a mapping',
      'feature send-f: links[1]: expected a mapping',
      'axis dest: values[3]: expected a mapping',
      'action send: path.outcomes[3]: expected a mapping',
      'action send: path.steps[3]: expected a mapping',
      'constraints[4]: expected a mapping',
      'axis addr: switch.transitions[1]: expected a mapping',
    ]));
  });

  it('accepts an optional string note on outcomes and rejects other types', () => {
    const graph = fresh();
    find(graph.actions, 'send').path.outcomes[0].note = 'Shown in a toast';
    expect(validateGraph(graph).errors).toEqual([]);
    find(graph.actions, 'send').path.outcomes[0].note = 3;
    expect(validateGraph(graph).errors)
      .toContainEqual('action send: outcome ok-sent: note must be a string');
  });

  it('checks the axis values a flag controls', () => {
    const graph = fresh();
    find(graph.flags, 'fbt').axisValues = ['token:fee', 'facade:ws'];
    expect(validateGraph(graph).errors).toEqual([]);
    find(graph.flags, 'fbt').axisValues = ['token:zzz', 'nope:x'];
    const { errors } = validateGraph(graph);
    expect(errors).toContainEqual("flag fbt: axisValues unknown value 'zzz' for axis 'token'");
    expect(errors).toContainEqual("flag fbt: axisValues unknown axis 'nope'");
  });

  it('includes the file path in YAML syntax errors', () => {
    const tmp = path.join(os.tmpdir(), `qa-graph-bad-${process.pid}.yaml`);
    fs.writeFileSync(tmp, 'a: [');
    try {
      expect(() => loadGraph(tmp)).toThrow(tmp);
    } finally {
      fs.unlinkSync(tmp);
    }
  });
});
