/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fs = require('fs');
const { parse } = require('yaml');

const TOP_LEVEL_LISTS = [
  'environments', 'features', 'flags', 'axes', 'setups', 'actions', 'constraints',
];
const CONSTRAINT_CLASSES = ['invalid', 'rejected', 'edge', 'lib-risk'];
const FEATURE_STATUSES = ['in-scope', 'out-of-scope'];
const AXIS_KINDS = ['setup', 'action'];
const APPLIES_AT = ['live', 'next-start', 'next-pin'];
const OUTCOME_KINDS = ['success', 'error'];
const { INVENTORY_KINDS } = require('./freshness');

/**
 * Parse a graph YAML file.
 * @param {string} filePath
 * @returns {object}
 * @throws {Error} message includes the file path on read or syntax errors.
 */
function loadGraph(filePath) {
  let text;
  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch (e) {
    throw new Error(`Cannot read graph file ${filePath}: ${e.message}`);
  }
  try {
    return parse(text);
  } catch (e) {
    throw new Error(`Invalid YAML in ${filePath}: ${e.message}`);
  }
}

const asList = (value) => (Array.isArray(value) ? value : []);
const asArray = (value) => (Array.isArray(value) ? value : [value]);
const isMapping = (value) => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
/** Mapping items of a list; malformed items are skipped (validateGraph reports them). */
const mappings = (value) => asList(value).filter(isMapping);

// Keys each object type may carry; anything else is reported as a likely typo.
const KNOWN_KEYS = {
  graph: ['version', 'costs', 'check', 'selection', ...TOP_LEVEL_LISTS],
  check: ['base', 'inventories'],
  selection: ['full', 'ignore'],
  inventory: ['kind', 'files', 'pattern'],
  environment: ['id', 'name', 'notes'],
  feature: ['id', 'name', 'description', 'status', 'screens', 'files', 'flags', 'links', 'introduces', 'actions'],
  link: ['to', 'reason'],
  flag: ['id', 'name', 'constant', 'default', 'gates', 'combinesWith', 'appliesAt', 'status', 'axisValues'],
  axis: ['id', 'name', 'kind', 'values', 'how', 'switch'],
  value: ['id', 'name'],
  switch: ['cost', 'transitions', 'fallback'],
  transition: ['from', 'to', 'cost', 'impossible', 'when'],
  fallback: ['cost', 'how'],
  setup: ['id', 'name', 'values', 'environment', 'runnable', 'notes'],
  action: ['id', 'name', 'feature', 'axes', 'setups', 'path'],
  path: ['steps', 'outcomes'],
  step: ['id', 'screen', 'name'],
  outcome: ['id', 'kind', 'at', 'message', 'source', 'verified', 'note'],
  constraint: ['id', 'action', 'when', 'class', 'outcome', 'note'],
};
const ITEM_TYPE = {
  environments: 'environment',
  features: 'feature',
  flags: 'flag',
  axes: 'axis',
  setups: 'setup',
  actions: 'action',
  constraints: 'constraint',
};

/**
 * Warn about constraints that can never produce a scenario. A non-invalid constraint
 * is dead when it matches no combination surviving the `invalid` exclusions; an
 * `invalid` one when it matches no combination at all. Checked across the action's setups.
 */
function deadConstraintWarnings(graph) {
  // Required lazily, as the plan mandates; it keeps load.js usable without scenarios.js loaded.
  // There is no actual require cycle.
  // eslint-disable-next-line global-require
  const { enumerateCombos, matches, classifyCombo } = require('./scenarios');
  return asList(graph.constraints).filter((c) => {
    const action = asList(graph.actions).find((a) => a.id === c.action);
    const combos = asList(action.setups)
      .map((id) => asList(graph.setups).find((s) => s.id === id))
      .filter(Boolean)
      .flatMap((setup) => enumerateCombos(graph, action, setup));
    const pool = c.class === 'invalid'
      ? combos
      : combos.filter((values) => !classifyCombo(graph, c.action, values).excluded);
    return !pool.some((values) => matches(c, values));
  }).map((c) => `constraint ${c.id}: matches no combination, so it never produces a scenario`);
}

/**
 * Check the graph schema and cross-references.
 * @param {object} graph
 * @returns {{errors: string[], warnings: string[]}}
 */
function validateGraph(graph) {
  const errors = [];
  const warnings = [];
  const err = (msg) => errors.push(msg);

  if (!isMapping(graph)) {
    return { errors: ['graph: expected a YAML mapping at the top level'], warnings };
  }

  const checkKeys = (where, obj, type) => {
    Object.keys(obj).filter((key) => !KNOWN_KEYS[type].includes(key)).forEach((key) => {
      warnings.push(`${where}: unknown key '${key}'`);
    });
  };
  /** Mapping items of a nested list, reporting the malformed ones. */
  const nested = (where, field, value) => {
    asList(value).forEach((item, index) => {
      if (!isMapping(item)) err(`${where}: ${field}[${index}]: expected a mapping`);
    });
    return mappings(value);
  };

  checkKeys('graph', graph, 'graph');
  if (graph.version !== 1) err(`graph: version must be 1, got '${graph.version}'`);
  if (!isMapping(graph.costs)) err('graph: missing field \'costs\'');
  TOP_LEVEL_LISTS.forEach((key) => {
    if (!Array.isArray(graph[key])) err(`graph: field '${key}' must be a list`);
  });
  if (graph.check !== undefined) {
    if (!isMapping(graph.check)) err('graph: check must be a mapping');
    else {
      checkKeys('check', graph.check, 'check');
      nested('check', 'inventories', graph.check.inventories).forEach((inv, index) => {
        const where = `check inventories[${index}]`;
        checkKeys(where, inv, 'inventory');
        if (!INVENTORY_KINDS.includes(inv.kind)) err(`${where}: invalid kind '${inv.kind}'`);
        if (!Array.isArray(inv.files) || inv.files.length === 0) err(`${where}: files must be a non-empty list`);
        try {
          new RegExp(inv.pattern, 'g'); // eslint-disable-line no-new
        } catch (e) {
          err(`${where}: invalid pattern (${e.message})`);
        }
      });
    }
  }
  if (graph.selection !== undefined) {
    if (!isMapping(graph.selection)) err('graph: selection must be a mapping');
    else {
      checkKeys('selection', graph.selection, 'selection');
      ['full', 'ignore'].forEach((field) => {
        const value = graph.selection[field];
        if (value === undefined) return;
        if (!Array.isArray(value)) {
          err(`selection: ${field} must be a list of glob patterns`);
          return;
        }
        value.forEach((p, index) => {
          if (typeof p !== 'string' || p.trim() === '') err(`selection: ${field}[${index}] must be a non-empty string`);
        });
      });
    }
  }
  const costs = isMapping(graph.costs) ? graph.costs : {};
  const checkCost = (where, cost) => {
    if (!(cost in costs)) err(`${where}: unknown cost '${cost}'`);
  };

  // Unique ids per collection, and id lookup tables.
  const ids = {};
  TOP_LEVEL_LISTS.forEach((key) => {
    ids[key] = new Set();
    asList(graph[key]).forEach((item, index) => {
      if (!isMapping(item)) {
        err(`${key}[${index}]: expected a mapping`);
        return;
      }
      if (typeof item.id !== 'string' || !item.id) {
        err(`${key}[${index}]: missing field 'id'`);
        return;
      }
      if (ids[key].has(item.id)) err(`${key} ${item.id}: duplicate id`);
      ids[key].add(item.id);
      checkKeys(`${ITEM_TYPE[key]} ${item.id}`, item, ITEM_TYPE[key]);
    });
  });

  const features = mappings(graph.features);
  const flags = mappings(graph.flags);
  const axes = mappings(graph.axes);
  const axesById = new Map(axes.map((a) => [a.id, a]));
  const actionsById = new Map(mappings(graph.actions).map((a) => [a.id, a]));
  const axisHasValue = (axis, valueId) => mappings(axis.values).some((v) => v.id === valueId);
  const checkAxisValueRef = (where, ref) => {
    const [axisId, valueId] = String(ref).split(':');
    const axis = axesById.get(axisId);
    if (!axis) err(`${where} unknown axis '${axisId}'`);
    else if (!axisHasValue(axis, valueId)) {
      err(`${where} unknown value '${valueId}' for axis '${axisId}'`);
    }
  };

  // Features
  features.forEach((f) => {
    const where = `feature ${f.id}`;
    if (!FEATURE_STATUSES.includes(f.status)) err(`${where}: invalid status '${f.status}'`);
    asList(f.flags).forEach((id) => {
      if (!ids.flags.has(id)) err(`${where}: unknown flag '${id}'`);
    });
    nested(where, 'links', f.links).forEach((link) => {
      checkKeys(`${where} link to ${link.to}`, link, 'link');
      if (!ids.features.has(link.to)) err(`${where}: link to unknown feature '${link.to}'`);
      if (!link.reason) err(`${where}: link to '${link.to}' has no reason`);
    });
    asList(f.actions).forEach((id) => {
      if (!ids.actions.has(id)) err(`${where}: unknown action '${id}'`);
    });
    asList(f.introduces).forEach((ref) => checkAxisValueRef(`${where}: introduces`, ref));
  });

  // Flags
  flags.forEach((flag) => {
    const where = `flag ${flag.id}`;
    if (!APPLIES_AT.includes(flag.appliesAt)) err(`${where}: invalid appliesAt '${flag.appliesAt}'`);
    asList(flag.gates).forEach((id) => {
      if (!ids.features.has(id)) err(`${where}: gates unknown feature '${id}'`);
    });
    if (flag.axisValues !== undefined && !Array.isArray(flag.axisValues)) {
      err(`${where}: axisValues must be a list`);
    }
    asList(flag.axisValues).forEach((ref) => checkAxisValueRef(`${where}: axisValues`, ref));
  });

  // Impact spreads via `gates`, so they must be the inverse of the features' `flags`.
  const flagsById = new Map(flags.map((f) => [f.id, f]));
  flags.forEach((flag) => {
    asList(flag.gates).forEach((id) => {
      const feature = features.find((f) => f.id === id);
      if (feature && !asList(feature.flags).includes(flag.id)) {
        warnings.push(`flag ${flag.id}: gates feature '${id}', but that feature does not list the flag`);
      }
    });
  });
  features.forEach((f) => {
    asList(f.flags).forEach((id) => {
      const flag = flagsById.get(id);
      if (flag && !asList(flag.gates).includes(f.id)) {
        warnings.push(`feature ${f.id}: lists flag '${id}', but the flag does not gate it`);
      }
    });
  });

  // Axes
  axes.forEach((axis) => {
    const where = `axis ${axis.id}`;
    if (!AXIS_KINDS.includes(axis.kind)) err(`${where}: invalid kind '${axis.kind}'`);
    if (asList(axis.values).length === 0) err(`${where}: has no values`);
    const valueIds = new Set();
    nested(where, 'values', axis.values).forEach((v) => {
      checkKeys(`${where} value ${v.id}`, v, 'value');
      if (valueIds.has(v.id)) err(`${where}: duplicate value '${v.id}'`);
      valueIds.add(v.id);
    });
    const sw = axis.switch;
    if (!isMapping(sw)) {
      err(`${where}: missing field 'switch'`);
      return;
    }
    checkKeys(`${where} switch`, sw, 'switch');
    checkCost(`${where} switch`, sw.cost);
    nested(where, 'switch.transitions', sw.transitions).forEach((t) => {
      checkKeys(`${where} transition ${t.from}->${t.to}`, t, 'transition');
      ['from', 'to'].forEach((end) => {
        if (!valueIds.has(t[end])) {
          err(`${where}: transition ${end} unknown value '${t[end]}'`);
        }
      });
      if (t.cost !== undefined) checkCost(`${where} transition ${t.from}->${t.to}`, t.cost);
      if (t.impossible === true && sw.fallback === undefined) {
        err(`${where}: transition ${t.from}->${t.to} is impossible but the axis has no switch.fallback`);
      }
    });
    if (sw.fallback !== undefined) {
      if (!isMapping(sw.fallback)) {
        err(`${where}: switch.fallback: expected a mapping`);
      } else {
        checkKeys(`${where} fallback`, sw.fallback, 'fallback');
        checkCost(`${where} fallback`, sw.fallback.cost);
      }
    }
  });

  // Setups
  mappings(graph.setups).forEach((setup) => {
    const where = `setup ${setup.id}`;
    if (!ids.environments.has(setup.environment)) {
      err(`${where}: unknown environment '${setup.environment}'`);
    }
    const values = isMapping(setup.values) ? setup.values : {};
    Object.entries(values).forEach(([axisId, valueId]) => {
      const axis = axesById.get(axisId);
      if (!axis) err(`${where}: unknown axis '${axisId}'`);
      else if (axis.kind !== 'setup') err(`${where}: axis '${axisId}' is not a setup axis`);
      else if (!axisHasValue(axis, valueId)) {
        err(`${where}: unknown value '${valueId}' for axis '${axisId}'`);
      }
    });
    axes.filter((a) => a.kind === 'setup' && !(a.id in values)).forEach((a) => {
      err(`${where}: missing value for setup axis '${a.id}'`);
    });
  });

  // Actions
  mappings(graph.actions).forEach((action) => {
    const where = `action ${action.id}`;
    if (!ids.features.has(action.feature)) err(`${where}: unknown feature '${action.feature}'`);
    asList(action.axes).forEach((id) => {
      const axis = axesById.get(id);
      if (!axis) err(`${where}: unknown axis '${id}'`);
      else if (axis.kind !== 'action') err(`${where}: axis '${id}' is not an action axis`);
    });
    asList(action.setups).forEach((id) => {
      if (!ids.setups.has(id)) err(`${where}: unknown setup '${id}'`);
    });
    const axisIds = asList(action.axes);
    axisIds.filter((id, i) => axisIds.indexOf(id) !== i).forEach((id) => {
      err(`${where}: duplicate axis '${id}'`);
    });
    const actionPath = isMapping(action.path) ? action.path : {};
    if (isMapping(action.path)) checkKeys(`${where} path`, action.path, 'path');
    const steps = nested(where, 'path.steps', actionPath.steps);
    steps.forEach((step) => checkKeys(`${where} step ${step.id}`, step, 'step'));
    const stepIds = new Set(steps.map((step) => step.id));
    nested(where, 'path.outcomes', actionPath.outcomes).forEach((o) => {
      checkKeys(`${where} outcome ${o.id}`, o, 'outcome');
      if (!OUTCOME_KINDS.includes(o.kind)) err(`${where}: outcome ${o.id}: invalid kind '${o.kind}'`);
      if (!stepIds.has(o.at)) err(`${where}: outcome ${o.id}: unknown step '${o.at}'`);
      if (o.note !== undefined && typeof o.note !== 'string') {
        err(`${where}: outcome ${o.id}: note must be a string`);
      }
      if (!o.source) warnings.push(`${where}: outcome ${o.id} has no source`);
      if (typeof o.verified !== 'boolean') {
        warnings.push(`${where}: outcome ${o.id}: verified must be true or false`);
      }
    });
  });

  // Constraints
  mappings(graph.constraints).forEach((c) => {
    const where = `constraint ${c.id}`;
    if (!CONSTRAINT_CLASSES.includes(c.class)) err(`${where}: invalid class '${c.class}'`);
    const action = actionsById.get(c.action);
    if (!action) err(`${where}: unknown action '${c.action}'`);
    if (!isMapping(c.when) || Object.keys(c.when).length === 0) {
      warnings.push(`${where}: empty 'when' matches every combination of the action`);
    }
    Object.entries(isMapping(c.when) ? c.when : {}).forEach(([axisId, wanted]) => {
      const axis = axesById.get(axisId);
      if (!axis) {
        err(`${where}: unknown axis '${axisId}'`);
        return;
      }
      asArray(wanted).forEach((valueId) => {
        if (!axisHasValue(axis, valueId)) {
          err(`${where}: unknown value '${valueId}' for axis '${axisId}'`);
        }
      });
    });
    const outcomes = mappings(action && isMapping(action.path) && action.path.outcomes);
    if (c.class === 'rejected' && !c.outcome) err(`${where}: rejected constraint requires 'outcome'`);
    if (c.outcome) {
      const outcome = outcomes.find((o) => o.id === c.outcome);
      if (!outcome) err(`${where}: unknown outcome '${c.outcome}'`);
      else if (c.class === 'rejected' && outcome.kind !== 'error') {
        err(`${where}: outcome '${c.outcome}' must be of kind error`);
      }
    }
  });

  if (errors.length === 0) warnings.push(...deadConstraintWarnings(graph));

  return { errors, warnings };
}

module.exports = { loadGraph, validateGraph };
