/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const asList = (value) => (Array.isArray(value) ? value : []);
const findById = (list, id) => asList(list).find((item) => item.id === id);

/**
 * Directional cost of moving one axis from `from` to `to`.
 * An impossible switch goes through the axis fallback; without one it costs Infinity.
 * @returns {{cost: number, impossible: boolean, via: 'switch'|'fallback'|'none', how: string}}
 */
function transitionCost(graph, axisId, from, to) {
  if (from === to) return { cost: 0, impossible: false, via: 'none', how: '' };
  const axis = findById(graph.axes, axisId);
  const sw = (axis && axis.switch) || {};
  const costOf = (key) => graph.costs[key];
  const rule = asList(sw.transitions).find((t) => t.from === from && t.to === to);

  if (rule && rule.impossible) {
    if (sw.fallback) {
      return {
        cost: costOf(sw.fallback.cost), impossible: true, via: 'fallback', how: sw.fallback.how,
      };
    }
    return {
      cost: Infinity, impossible: true, via: 'none', how: '',
    };
  }
  return {
    cost: costOf((rule && rule.cost) || sw.cost),
    impossible: false,
    via: 'switch',
    how: axis.how,
  };
}

/** Sum of per-axis transition costs over the setup axes whose values differ. */
function setupDistance(graph, fromSetupId, toSetupId) {
  const from = findById(graph.setups, fromSetupId);
  const to = findById(graph.setups, toSetupId);
  const steps = [];
  let cost = 0;
  Object.keys(to.values).forEach((axis) => {
    if (from.values[axis] === to.values[axis]) return;
    const t = transitionCost(graph, axis, from.values[axis], to.values[axis]);
    cost += t.cost;
    steps.push({
      axis, from: from.values[axis], to: to.values[axis], via: t.via, how: t.how,
    });
  });
  return { cost, steps };
}

const actionAxisIds = (graph) => new Set(asList(graph.axes)
  .filter((a) => a.kind === 'action').map((a) => a.id));

/** Action-axis switches from the current state to the next scenario's values. */
function moveTo(graph, axisIds, state, values) {
  let cost = 0;
  const steps = [];
  Object.keys(values)
    .filter((axis) => axisIds.has(axis) && axis in state && state[axis] !== values[axis])
    .forEach((axis) => {
      const t = transitionCost(graph, axis, state[axis], values[axis]);
      cost += t.cost;
      steps.push({
        axis, from: state[axis], to: values[axis], via: t.via, cost: t.cost,
      });
    });
  return { cost, steps };
}

/** Walk scenarios in order; action-axis values persist from one scenario to the next. */
function walk(graph, scenarios) {
  const axisIds = actionAxisIds(graph);
  let state = {};
  let cost = 0;
  const moves = scenarios.map((s) => {
    const move = moveTo(graph, axisIds, state, s.values);
    cost += move.cost;
    state = { ...state, ...s.values };
    return move;
  });
  return { cost, moves };
}

/** Total action-axis switch cost of running the scenarios in this order. */
const sequenceCost = (graph, scenarios) => walk(graph, scenarios).cost;

/**
 * Order one setup's scenarios to keep action-axis switches cheap: greedy nearest neighbour
 * from the first enumerated scenario, ties broken by enumeration order. Falls back to
 * enumeration order when that is not more expensive.
 */
function orderInSetup(graph, scenarios) {
  const axisIds = actionAxisIds(graph);
  const remaining = scenarios.slice(1);
  const ordered = scenarios.slice(0, 1);
  let state = { ...(scenarios[0] ? scenarios[0].values : {}) };
  while (remaining.length > 0) {
    let best = 0;
    let bestCost = moveTo(graph, axisIds, state, remaining[0].values).cost;
    for (let i = 1; i < remaining.length; i += 1) {
      const { cost } = moveTo(graph, axisIds, state, remaining[i].values);
      if (cost < bestCost) {
        best = i;
        bestCost = cost;
      }
    }
    const [next] = remaining.splice(best, 1);
    ordered.push(next);
    state = { ...state, ...next.values };
  }
  const nearest = walk(graph, ordered);
  const enumerated = walk(graph, scenarios);
  const [order, result] = nearest.cost < enumerated.cost
    ? [ordered, nearest] : [scenarios, enumerated];
  const cheap = graph.costs.cheap || 0;
  const moves = order.map((s, i) => ({
    scenario: s.id,
    cost: result.moves[i].cost,
    steps: result.moves[i].steps.filter((step) => step.cost > cheap),
  })).filter((move) => move.steps.length > 0);
  return { scenarios: order, intraCost: result.cost, moves };
}

/**
 * Groups scenarios by setup and orders the runnable groups greedily by the cheapest next switch;
 * not-runnable setups come last, outside the route (cost 0, no steps). Inside each group the
 * scenarios are ordered to keep action-axis switches cheap.
 * @returns {{setup: string, runnable: boolean, cost: number, steps: object[],
 *   scenarios: object[], intraCost: number, moves: object[]}[]}
 */
function planRun(graph, scenarios, { start } = {}) {
  const bySetup = new Map();
  scenarios.forEach((s) => {
    if (!bySetup.has(s.setup)) bySetup.set(s.setup, []);
    bySetup.get(s.setup).push(s);
  });
  const present = asList(graph.setups).filter((s) => bySetup.has(s.id));
  const remaining = present.filter((s) => s.runnable !== false).map((s) => s.id);
  const blocked = present.filter((s) => s.runnable === false).map((s) => s.id);
  const group = (setup, runnable, cost, steps) => ({
    setup, runnable, cost, steps, ...orderInSetup(graph, bySetup.get(setup)),
  });

  const plan = [];
  if (remaining.length > 0) {
    let current = start && remaining.includes(start) ? start : remaining[0];
    remaining.splice(remaining.indexOf(current), 1);
    plan.push(group(current, true, 0, []));
    while (remaining.length > 0) {
      const from = current;
      const best = remaining
        .map((id) => ({ id, d: setupDistance(graph, from, id) }))
        .reduce((a, b) => (b.d.cost < a.d.cost ? b : a));
      if (best.d.cost === Infinity) {
        throw new Error(`No reachable switch from ${current} to ${best.id}`);
      }
      plan.push(group(best.id, true, best.d.cost, best.d.steps));
      remaining.splice(remaining.indexOf(best.id), 1);
      current = best.id;
    }
  }
  blocked.forEach((id) => plan.push(group(id, false, 0, [])));
  return plan;
}

module.exports = {
  transitionCost, setupDistance, planRun, sequenceCost,
};
