/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const asList = (value) => (Array.isArray(value) ? value : []);
const asArray = (value) => (Array.isArray(value) ? value : [value]);

const findById = (list, id) => asList(list).find((item) => item.id === id);

/** A combination matches when every axis listed in `when` has one of the listed values. */
function matches(constraint, values) {
  return Object.entries(constraint.when || {})
    .every(([axisId, wanted]) => asArray(wanted).includes(values[axisId]));
}

/**
 * Cross product of the action's axes (YAML value order, first axis varies slowest),
 * merged over the setup's values. Excluded combos are included; callers filter.
 * @returns {object[]} value maps
 */
function enumerateCombos(graph, action, setup) {
  let combos = [{ ...setup.values }];
  asList(action.axes).forEach((axisId) => {
    const axis = findById(graph.axes, axisId);
    combos = combos.flatMap((base) => asList(axis && axis.values)
      .map((v) => ({ ...base, [axisId]: v.id })));
  });
  return combos;
}

/**
 * @returns {{excluded: boolean, classes: string[], constraintIds: string[], expected: string[]}}
 */
function classifyCombo(graph, actionId, values) {
  const action = findById(graph.actions, actionId);
  const hits = asList(graph.constraints)
    .filter((c) => c.action === actionId && matches(c, values));
  if (hits.some((c) => c.class === 'invalid')) {
    return { excluded: true, classes: [], constraintIds: [], expected: [] };
  }
  const classes = [...new Set(hits.map((c) => c.class))];
  const outcomes = asList(action && action.path && action.path.outcomes);
  const steps = asList(action && action.path && action.path.steps).map((s) => s.id);
  const stepOf = (outcomeId) => {
    const outcome = outcomes.find((o) => o.id === outcomeId);
    return outcome ? steps.indexOf(outcome.at) : -1;
  };
  const outcomesOf = (cls) => hits
    .filter((c) => c.class === cls && c.outcome).map((c) => c.outcome);
  // A rejection stops the path at its step: expect the rejections at the earliest one, and
  // only the edges shown before it.
  const rejectedSteps = outcomesOf('rejected').map(stepOf);
  const stopAt = rejectedSteps.length ? Math.min(...rejectedSteps) : Infinity;
  const expected = [...new Set([
    ...outcomesOf('rejected').filter((o) => stepOf(o) === stopAt),
    ...outcomesOf('edge').filter((o) => stepOf(o) < stopAt),
  ])].sort((a, b) => stepOf(a) - stepOf(b));
  if (expected.length === 0) {
    outcomes.filter((o) => o.kind === 'success').forEach((o) => expected.push(o.id));
  }
  return {
    excluded: false, classes, constraintIds: hits.map((c) => c.id), expected,
  };
}

// Coverage targets: every single axis=value, plus every pair of them.
const pairKeys = (values, axes) => {
  const keys = axes.map((a) => `${a}=${values[a]}`);
  for (let i = 0; i < axes.length; i += 1) {
    for (let j = i + 1; j < axes.length; j += 1) {
      keys.push(`${axes[i]}=${values[axes[i]]}|${axes[j]}=${values[axes[j]]}`);
    }
  }
  return keys;
};

/**
 * Required constraint combos plus a greedy pairwise cover, in enumeration order.
 * @returns {object[]} Scenario objects
 */
function selectScenarios(graph, actionId, setupId) {
  const action = findById(graph.actions, actionId);
  const setup = findById(graph.setups, setupId);
  const axes = asList(action.axes);

  const combos = enumerateCombos(graph, action, setup)
    .map((values) => ({ values, ...classifyCombo(graph, actionId, values) }))
    .filter((c) => !c.excluded);
  const chosen = new Set();

  asList(graph.constraints)
    .filter((c) => c.action === actionId && c.class !== 'invalid')
    .forEach((c) => {
      const index = combos.findIndex((combo) => matches(c, combo.values));
      if (index >= 0) chosen.add(index);
    });

  const candidates = combos.map((c, index) => ({ index, ...c }))
    .filter((c) => !c.classes.includes('rejected'));
  const uncovered = new Set(candidates.flatMap((c) => pairKeys(c.values, axes)));
  candidates.filter((c) => chosen.has(c.index))
    .forEach((c) => pairKeys(c.values, axes).forEach((k) => uncovered.delete(k)));

  // An action with no action axes has nothing to cover but still needs its one run.
  if (axes.length === 0 && chosen.size === 0 && combos.length > 0) chosen.add(0);

  while (uncovered.size > 0) {
    let best = null;
    let bestGain = 0;
    candidates.forEach((c) => {
      const gain = pairKeys(c.values, axes).filter((k) => uncovered.has(k)).length;
      if (gain > bestGain) {
        best = c;
        bestGain = gain;
      }
    });
    chosen.add(best.index);
    pairKeys(best.values, axes).forEach((k) => uncovered.delete(k));
  }

  return [...chosen].sort((a, b) => a - b).map((index) => {
    const { values, classes, constraintIds, expected } = combos[index];
    return {
      // With no action axes the id has no trailing colon: `action:setup`.
      id: [actionId, setupId, ...(axes.length ? [axes.map((a) => values[a]).join('.')] : [])].join(':'),
      action: actionId,
      setup: setupId,
      values,
      classes,
      constraintIds,
      expected,
    };
  });
}

/** Every action x each of its setups, in YAML order. */
function allScenarios(graph) {
  return asList(graph.actions).flatMap((action) => asList(action.setups)
    .flatMap((setupId) => selectScenarios(graph, action.id, setupId)));
}

module.exports = {
  classifyCombo, selectScenarios, allScenarios, enumerateCombos, matches,
};
