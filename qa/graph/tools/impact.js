/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { allScenarios } = require('./scenarios');
const { planRun } = require('./runplan');

const asList = (value) => (Array.isArray(value) ? value : []);
const findById = (list, id) => asList(list).find((item) => item.id === id);

function assertKnown(graph, pick) {
  let known;
  if (pick.type === 'feature') known = findById(graph.features, pick.id);
  else if (pick.type === 'flag') known = findById(graph.flags, pick.id);
  else {
    const [axisId, valueId] = String(pick.id).split(':');
    known = findById(findById(graph.axes, axisId) && findById(graph.axes, axisId).values, valueId);
  }
  if (!known) throw new Error(`Unknown ${pick.type} '${pick.id}'`);
}

/**
 * What the pick changes. `axisFrom[key]` says where each axis value comes from:
 * the pick itself, a feature that introduces it, or a flag that controls it.
 * A picked feature lists its flags, but only a picked flag adds the values it controls.
 */
function changedBy(graph, pick) {
  const changed = {
    features: [], flags: [], axisValues: [], axisFrom: {},
  };
  const addValue = (key, from) => {
    if (changed.axisValues.includes(key)) return;
    changed.axisValues.push(key);
    changed.axisFrom[key] = from;
  };
  if (pick.type === 'feature') {
    const feature = findById(graph.features, pick.id);
    changed.features.push(pick.id);
    changed.flags.push(...asList(feature && feature.flags));
    asList(feature && feature.introduces).forEach((key) => addValue(key, { type: 'feature', id: pick.id }));
  } else if (pick.type === 'flag') {
    changed.flags.push(pick.id);
  } else {
    addValue(pick.id, { type: 'axisValue', id: pick.id });
  }
  if (pick.type === 'flag') {
    const flag = findById(graph.flags, pick.id);
    asList(flag && flag.axisValues).forEach((key) => addValue(key, { type: 'flag', id: pick.id }));
  }
  return changed;
}

/** A feature owns an action that names it, or that it lists in its `actions`. */
function ownsAction(feature, action) {
  return action.feature === feature.id || asList(feature.actions).includes(action.id);
}

const valueMatches = (key, values) => {
  const [axisId, valueId] = key.split(':');
  return values[axisId] === valueId;
};

/**
 * Features reached by the change. A feature reached via code or flag is touched as a whole:
 * all scenarios of the actions it owns, plus the scenarios on the axis values it introduces.
 * A value reaches every action that has a scenario on it ("via axis").
 */
function touchedFeatures(graph, pick, changed, scenarios) {
  const touched = new Map();
  const whole = new Set();
  const add = (featureId, via, why) => {
    if (via !== 'axis') whole.add(featureId);
    const entry = touched.get(featureId) || { feature: featureId, reasons: [] };
    if (!entry.reasons.some((r) => r.via === via && r.why === why)) {
      entry.reasons.push({ via, why });
    }
    touched.set(featureId, entry);
  };

  changed.features.forEach((id) => add(id, 'code', 'changed directly'));

  // `links` point at dependencies: a feature is touched when something it depends on changes.
  asList(graph.features).forEach((feature) => {
    asList(feature.links)
      .filter((link) => changed.features.includes(link.to))
      .forEach((link) => add(feature.id, 'code', link.reason));
  });

  // A picked flag spreads to every feature it gates. A picked feature's flags only tag the
  // features already touched: changing the feature does not change its flag's other features.
  changed.flags.forEach((flagId) => {
    const flag = findById(graph.flags, flagId);
    asList(flag && flag.gates)
      .filter((featureId) => pick.type === 'flag' || touched.has(featureId))
      .forEach((featureId) => add(
        featureId,
        'flag',
        `must be tested with ${flag.name} on and off`,
      ));
  });

  const axisFrom = { ...changed.axisFrom };
  const keys = [...changed.axisValues];
  [...whole].forEach((featureId) => {
    const feature = findById(graph.features, featureId);
    asList(feature && feature.introduces).filter((key) => !keys.includes(key)).forEach((key) => {
      keys.push(key);
      axisFrom[key] = { type: 'feature', id: featureId };
    });
  });

  keys.forEach((key) => {
    const [axisId, valueId] = key.split(':');
    const axis = findById(graph.axes, axisId);
    const value = findById(axis && axis.values, valueId);
    const valueText = `${axis ? axis.name : axisId} = ${value ? value.name : valueId}`;
    const from = axisFrom[key];
    const source = findById(from.type === 'flag' ? graph.flags : graph.features, from.id);
    const onValue = scenarios.filter((s) => valueMatches(key, s.values));
    asList(graph.actions)
      .filter((action) => onValue.some((s) => s.action === action.id))
      .forEach((action) => {
        let why = `${action.name} varies on ${axis.name}; new value ${value ? value.name : valueId}`;
        if (from.type === 'flag') why = `${action.name} runs on ${valueText}, which ${source.name} controls`;
        else if (from.type === 'feature' && !changed.features.includes(from.id)) {
          why = `${action.name} runs on ${valueText}, which ${source.name} brings in`;
        }
        add(action.feature, 'axis', why);
      });
  });

  return { touched: [...touched.values()], whole, keys };
}

/**
 * What a change reaches: features (each with reasons), scenarios to re-run, and their run plan.
 * @param {{type: 'feature'|'flag'|'axisValue', id: string}} pick
 * @param {object[]} [scenarios] Precomputed `allScenarios(graph)`, to avoid recomputing per pick.
 */
function computeImpact(graph, pick, scenarios = allScenarios(graph)) {
  assertKnown(graph, pick);
  const changed = changedBy(graph, pick);
  const { touched, whole, keys } = touchedFeatures(graph, pick, changed, scenarios);

  const wholeActions = new Set(asList(graph.actions)
    .filter((action) => asList(graph.features)
      .some((f) => whole.has(f.id) && ownsAction(f, action)))
    .map((action) => action.id));
  const affected = scenarios.filter((s) => wholeActions.has(s.action)
    || keys.some((key) => valueMatches(key, s.values)));

  const plan = affected.length > 0 ? planRun(graph, affected) : [];
  return {
    pick, changed, touched, scenarios: affected, plan,
  };
}

/** Every in-scope feature, every flag, every `axis:value`. */
function allPicks(graph) {
  return [
    ...asList(graph.features)
      .filter((f) => f.status === 'in-scope')
      .map((f) => ({ type: 'feature', id: f.id })),
    ...asList(graph.flags).map((f) => ({ type: 'flag', id: f.id })),
    ...asList(graph.axes).flatMap((axis) => asList(axis.values)
      .map((v) => ({ type: 'axisValue', id: `${axis.id}:${v.id}` }))),
  ];
}

module.exports = { computeImpact, allPicks, ownsAction };
