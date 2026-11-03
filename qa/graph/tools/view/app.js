/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/* eslint-env browser */

// Renders the four views from the embedded data block. All data text goes in via
// text nodes (append / textContent); nothing from the data is ever parsed as HTML.
(function main() {
  const data = JSON.parse(document.getElementById('graph-data').textContent);
  const { graph } = data;

  const list = (value) => (Array.isArray(value) ? value : []);
  const indexById = (items) => new Map(list(items).map((item) => [item.id, item]));
  const features = indexById(graph.features);
  const flags = indexById(graph.flags);
  const axes = indexById(graph.axes);
  const setups = indexById(graph.setups);
  const actions = indexById(graph.actions);
  const environments = indexById(graph.environments);
  const scenarioById = new Map(data.scenarios.map((s) => [s.id, s]));
  const resolve = (ids) => ids.map((id) => scenarioById.get(id)).filter(Boolean);

  const VIEWS = ['view-impact', 'view-matrix', 'view-paths', 'view-plan'];
  const CLASS_META = {
    rejected: { label: 'rejected by design', short: 'rejected', sym: '✕' },
    edge: { label: 'known edge', short: 'edge', sym: '▲' },
    'lib-risk': { label: 'lib-only risk', short: 'lib risk', sym: '◆' },
    valid: { label: 'valid', short: 'valid', sym: '✓' },
  };
  const CLASS_ORDER = ['rejected', 'edge', 'lib-risk', 'valid'];
  const VIA_META = {
    code: { label: 'code' },
    axis: { label: 'axis' },
    flag: { label: 'flag' },
  };
  const PICK_GROUPS = [
    { type: 'feature', title: 'Features' },
    { type: 'flag', title: 'Flags' },
    { type: 'axisValue', title: 'Axis values' },
  ];

  // ---------- DOM helpers ----------

  function h(tag, props, ...children) {
    const el = document.createElement(tag);
    Object.entries(props || {}).forEach(([key, value]) => {
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') el.className = value;
      else if (key.startsWith('on')) el.addEventListener(key.slice(2), value);
      else el.setAttribute(key, value === true ? '' : String(value));
    });
    children.flat(Infinity).forEach((child) => {
      if (child === null || child === undefined || child === false) return;
      el.append(child instanceof Node ? child : String(child));
    });
    return el;
  }

  const clear = (el) => {
    while (el.firstChild) el.removeChild(el.firstChild);
    return el;
  };
  const anchor = (id) => `#${encodeURIComponent(id)}`;

  // ---------- Domain helpers ----------

  const valueName = (axisId, valueId) => {
    const axis = axes.get(axisId);
    const value = axis && list(axis.values).find((v) => v.id === valueId);
    return value ? value.name : valueId;
  };
  const axisName = (axisId) => (axes.get(axisId) ? axes.get(axisId).name : axisId);
  const setupName = (id) => (setups.get(id) ? setups.get(id).name : id);
  const featureName = (id) => (features.get(id) ? features.get(id).name : id);
  const actionName = (id) => (actions.get(id) ? actions.get(id).name : id);
  const envName = (id) => (environments.get(id) ? environments.get(id).name : id);
  const outcomeOf = (actionId, outcomeId) => {
    const action = actions.get(actionId);
    return list(action && action.path && action.path.outcomes).find((o) => o.id === outcomeId);
  };
  // A feature owns the actions that name it and those it lists (as impact.js ownsAction).
  const ownedActions = (f) => list(graph.actions)
    .filter((a) => a.feature === f.id || list(f.actions).includes(a.id));
  const primaryClass = (s) => CLASS_ORDER.find((c) => s.classes.includes(c)) || 'valid';
  const plural = (n, word, many) => `${n} ${n === 1 ? word : (many || `${word}s`)}`;

  function countClasses(scenarios) {
    const counts = {
      rejected: 0, edge: 0, 'lib-risk': 0, valid: 0,
    };
    scenarios.forEach((s) => { counts[primaryClass(s)] += 1; });
    return counts;
  }

  function matches(constraint, values) {
    return Object.entries(constraint.when || {}).every(([axisId, wanted]) => (
      Array.isArray(wanted) ? wanted : [wanted]).includes(values[axisId]));
  }

  function setupValuesText(setup) {
    return Object.entries(setup.values || {})
      .map(([axisId, valueId]) => `${axisName(axisId)}: ${valueName(axisId, valueId)}`)
      .join(' · ');
  }

  // ---------- Shared widgets ----------

  function classSym(cls, withLabel) {
    const meta = CLASS_META[cls];
    return h(
      'span',
      { class: `cls c-${cls}`, title: meta.label },
      h('span', { class: 'sym', 'aria-hidden': 'true' }, meta.sym),
      withLabel ? h('span', { class: 'cls-label' }, meta.short) : h('span', { class: 'sr' }, meta.label),
    );
  }

  function classLegend(onFocus) {
    return h(
      'div',
      { class: 'legend', role: 'group', 'aria-label': 'Scenario classes' },
      CLASS_ORDER.map((cls) => h(
        onFocus ? 'button' : 'span',
        {
          class: `legend-item c-${cls}`,
          type: onFocus ? 'button' : null,
          'data-cls': cls,
          title: onFocus ? `Highlight ${CLASS_META[cls].label} scenarios` : null,
          onclick: onFocus ? () => onFocus(cls) : null,
        },
        h('span', { class: 'swatch', 'aria-hidden': 'true' }, CLASS_META[cls].sym),
        CLASS_META[cls].label,
      )),
    );
  }

  function classBar(scenarios) {
    const counts = countClasses(scenarios);
    const present = CLASS_ORDER.filter((c) => counts[c] > 0);
    const title = present.map((c) => `${counts[c]} ${CLASS_META[c].label}`).join(', ');
    return h(
      'span',
      { class: 'classbar', title },
      h('span', { class: 'bar', 'aria-hidden': 'true' }, present.map((c) => h('i', {
        class: `c-${c}`, style: `flex-grow:${counts[c]}`,
      }))),
      h('span', { class: 'bar-counts' }, present.filter((c) => c !== 'valid').map((c) => h(
        'span',
        { class: `cnt c-${c}` },
        h('span', { class: 'sym', 'aria-hidden': 'true' }, CLASS_META[c].sym),
        String(counts[c]),
        h('span', { class: 'sr' }, ` ${CLASS_META[c].label}`),
      ))),
      h('span', { class: 'sr' }, title),
    );
  }

  function viaTag(via) {
    return h('span', { class: `via via-${via}` }, VIA_META[via] ? VIA_META[via].label : via);
  }

  function unverifiedBadge(outcome) {
    if (!outcome || outcome.verified) return null;
    return h('span', { class: 'unverified', title: 'Copied from code; confirm the exact text on device' }, 'unverified');
  }

  function runnableBadge(setup) {
    if (!setup || setup.runnable !== false) return null;
    return h('span', { class: 'badge not-runnable-badge', title: setup.notes || 'Cannot be run on the available environments' }, 'not runnable');
  }

  function outcomeLine(actionId, outcomeId) {
    const outcome = outcomeOf(actionId, outcomeId);
    if (!outcome) return h('span', { class: 'mono' }, outcomeId);
    const kind = outcome.kind === 'error' ? 'error' : 'success';
    return h(
      'a',
      { class: `outcome-line kind-${kind}`, href: anchor(`outcome-${actionId}-${outcome.id}`) },
      h('span', { class: 'kind-icon', 'aria-hidden': 'true' }, kind === 'error' ? '✕' : '✓'),
      h('span', { class: 'msg' }, outcome.message),
      unverifiedBadge(outcome),
    );
  }

  // ---------- Header stats ----------

  function renderStats() {
    const inScope = list(graph.features).filter((f) => f.status === 'in-scope').length;
    const runnable = list(graph.setups).filter((s) => s.runnable !== false).length;
    const outcomes = list(graph.actions).flatMap((a) => list(a.path && a.path.outcomes));
    const unverified = outcomes.filter((o) => !o.verified).length;
    const stat = (label, value, note) => h(
      'div',
      { class: 'stat' },
      h('dd', null, String(value), note ? h('small', null, note) : null),
      h('dt', null, label),
    );
    append(document.getElementById('stats'), [
      stat('features in scope', inScope),
      stat('actions', list(graph.actions).length),
      stat('setups', list(graph.setups).length, runnable < list(graph.setups).length ? ` ${runnable} runnable` : null),
      stat('scenarios', data.scenarios.length),
      stat('unverified messages', `${unverified}/${outcomes.length}`),
    ]);
  }

  function append(el, children) {
    children.flat(Infinity).forEach((c) => c && el.append(c));
    return el;
  }

  // ---------- A · Impact ----------

  const impactState = { pick: null };

  function pickLabel(pick) {
    if (pick.type === 'feature') return featureName(pick.id);
    if (pick.type === 'flag') return flags.get(pick.id) ? flags.get(pick.id).name : pick.id;
    const [axisId, valueId] = pick.id.split(':');
    return `${axisName(axisId)} = ${valueName(axisId, valueId)}`;
  }

  function pickDetail(pick) {
    if (pick.type === 'feature') return pick.id;
    if (pick.type === 'flag') return flags.get(pick.id) ? flags.get(pick.id).constant : '';
    return pick.id;
  }

  function renderImpactShell(root) {
    const picks = Object.values(data.impacts).map((impact) => impact.pick);
    const search = h('input', {
      type: 'search', class: 'search', placeholder: 'Search features, flags, values…', 'aria-label': 'Search picks',
    });
    const empty = h('p', { class: 'muted pick-empty', hidden: true }, 'No match.');
    const groups = PICK_GROUPS.map(({ type, title }) => {
      const ofType = picks.filter((p) => p.type === type);
      if (ofType.length === 0) return null;
      const items = [];
      let lastAxis = null;
      ofType.forEach((pick) => {
        if (type === 'axisValue') {
          const axisId = pick.id.split(':')[0];
          if (axisId !== lastAxis) {
            items.push(h('li', { class: 'pick-sub', 'data-axis': axisId }, axisName(axisId)));
            lastAxis = axisId;
          }
        }
        const key = `${pick.type}:${pick.id}`;
        const count = data.impacts[key].scenarios.length;
        const label = type === 'axisValue' ? valueName(...pick.id.split(':')) : pickLabel(pick);
        items.push(h(
          'li',
          { class: 'pick-li', 'data-axis': type === 'axisValue' ? pick.id.split(':')[0] : null },
          h(
            'a',
            {
              class: 'pick',
              href: anchor(`view-impact/${key}`),
              'data-key': key,
              'data-search': `${pickLabel(pick)} ${pick.id} ${pickDetail(pick)}`.toLowerCase(),
            },
            h('span', { class: 'pick-name' }, label),
            h('span', { class: 'pick-id mono' }, pickDetail(pick)),
            h('span', { class: `pick-count${count === 0 ? ' zero' : ''}`, title: `${plural(count, 'scenario')} to re-run` }, String(count)),
          ),
        ));
      });
      return h(
        'section',
        { class: 'pick-group', 'data-type': type },
        h('h3', null, title, h('span', { class: 'muted' }, ` ${ofType.length}`)),
        h('ul', null, items),
      );
    });

    search.addEventListener('input', () => {
      const q = search.value.trim().toLowerCase();
      let shown = 0;
      root.querySelectorAll('.pick-group').forEach((group) => {
        let inGroup = 0;
        const axesShown = new Set();
        group.querySelectorAll('.pick').forEach((a) => {
          const hit = !q || a.dataset.search.includes(q);
          const li = a.parentElement;
          li.toggleAttribute('hidden', !hit);
          if (hit) {
            inGroup += 1;
            if (li.dataset.axis) axesShown.add(li.dataset.axis);
          }
        });
        group.querySelectorAll('.pick-sub')
          .forEach((sub) => sub.toggleAttribute('hidden', !axesShown.has(sub.dataset.axis)));
        group.toggleAttribute('hidden', inGroup === 0);
        shown += inGroup;
      });
      empty.hidden = shown > 0;
    });

    append(clear(root), [
      h(
        'div',
        { class: 'view-head' },
        h('h2', null, 'What do I re-test?'),
        h('p', { class: 'lede' }, 'Pick what changed. Read left to right: what changed, why it spreads, the features it reaches, and the scenarios to re-run.'),
      ),
      h(
        'div',
        { class: 'impact-layout' },
        h('nav', { class: 'picker', 'aria-label': 'Pick a change' }, search, groups, empty),
        h('div', { class: 'flow', id: 'impact-flow', 'aria-live': 'polite' }),
      ),
    ]);
  }

  function box(cls, title, why, ...extra) {
    return h(
      'div',
      { class: `box ${cls || ''}` },
      h('div', { class: 'box-title' }, title),
      why ? h('div', { class: 'why' }, why) : null,
      extra,
    );
  }

  function changedColumn(impact) {
    const { pick, changed } = impact;
    const isPick = (type, id) => pick.type === type && pick.id === id;
    const fromPick = (type, id) => {
      if (isPick(type, id)) return null;
      const from = (changed.axisFrom || {})[id];
      const text = from && from.type === 'flag' ? 'controlled by the flag' : 'with the feature';
      return h('span', { class: 'from-pick' }, text);
    };
    const boxes = [];
    changed.features.forEach((id) => {
      const f = features.get(id);
      boxes.push(box(
        'chg',
        [h('span', { class: 'kind' }, 'feature'), featureName(id)],
        f && f.description,
        f && f.status === 'out-of-scope' ? h('span', { class: 'badge' }, 'out of scope') : null,
      ));
    });
    changed.flags.forEach((id) => {
      const f = flags.get(id);
      boxes.push(box(
        `flag${isPick('flag', id) ? ' chg' : ''}`,
        [h('span', { class: 'kind' }, 'flag'), h('code', null, f ? f.name : id)],
        f ? `${f.constant} · default ${String(f.default)} · applies ${f.appliesAt}` : null,
        fromPick('flag', id),
      ));
    });
    changed.axisValues.forEach((key) => {
      const [axisId, valueId] = key.split(':');
      const axis = axes.get(axisId);
      const others = list(axis && axis.values).filter((v) => v.id !== valueId).map((v) => v.name);
      const from = (changed.axisFrom || {})[key];
      const controlled = from && from.type === 'flag';
      boxes.push(box(
        `axis${isPick('axisValue', key) ? ' chg' : ''}`,
        [h('span', { class: 'kind' }, `${axis ? axis.kind : ''} axis value`), axisName(axisId), controlled ? ' = ' : ' += ', h('b', null, valueName(axisId, valueId))],
        others.length && !controlled ? `joins ${others.join(', ')}` : null,
        fromPick('axisValue', key),
      ));
    });
    return boxes;
  }

  function spreadColumn(impact) {
    const byVia = { code: 0, axis: 0, flag: 0 };
    impact.touched.forEach((t) => {
      new Set(t.reasons.map((r) => r.via))
        .forEach((via) => { byVia[via] = (byVia[via] || 0) + 1; });
    });
    const flagNames = impact.changed.flags.map((id) => (flags.get(id) ? flags.get(id).name : id));
    const axisNames = [...new Set(impact.changed.axisValues.map((k) => axisName(k.split(':')[0])))];
    const explain = {
      code: 'changed directly, or depends on the change in code',
      axis: axisNames.length
        ? `every action with scenarios on the ${axisNames.join(', ')} value re-runs them, even if its code did not change`
        : 'every action with scenarios on a value a touched feature brings in re-runs them',
      flag: `must be tested with ${flagNames.join(', ')} on and off`,
    };
    const boxes = ['code', 'axis', 'flag'].filter((via) => byVia[via] > 0).map((via) => box(
      `spread spread-${via}`,
      [viaTag(via), h('span', { class: 'spread-count' }, plural(byVia[via], 'feature'))],
      explain[via],
    ));
    return boxes.length ? boxes : [h('p', { class: 'muted' }, 'Nothing links to this change.')];
  }

  function touchedColumn(impact) {
    if (impact.touched.length === 0) return [h('p', { class: 'muted' }, 'No features reached.')];
    return impact.touched.map((t) => {
      const f = features.get(t.feature);
      const owned = f ? ownedActions(f).map((a) => a.name) : [];
      const vias = [...new Set(t.reasons.map((r) => r.via))];
      return h(
        'div',
        { class: 'box touched' },
        h(
          'div',
          { class: 'box-title' },
          featureName(t.feature),
          h('span', { class: 'tags' }, vias.map(viaTag)),
          f && f.status === 'out-of-scope' ? h('span', { class: 'badge' }, 'out of scope') : null,
        ),
        h('ul', { class: 'reasons' }, t.reasons.map((r) => h('li', { class: `reason via-line-${r.via}` }, r.why))),
        owned.length ? h('div', { class: 'owned' }, `actions: ${owned.join(', ')}`) : null,
      );
    });
  }

  function rerunColumn(impact) {
    const scenarios = resolve(impact.scenarios);
    const key = `${impact.pick.type}:${impact.pick.id}`;
    if (scenarios.length === 0) {
      return [box('out empty', 'Nothing to re-run', 'The features reached own no actions in this graph.')];
    }
    const byAction = new Map();
    scenarios.forEach((s) => {
      if (!byAction.has(s.action)) byAction.set(s.action, []);
      byAction.get(s.action).push(s);
    });
    const rows = [...byAction.entries()].map(([actionId, items]) => h(
      'a',
      { class: 'box rerun', href: anchor(`matrix-${actionId}`) },
      h(
        'div',
        { class: 'rerun-head' },
        h('span', null, actionName(actionId)),
        h('span', { class: 'n' }, String(items.length)),
      ),
      h('div', { class: 'rerun-meta' }, classBar(items), h('span', { class: 'muted' }, plural(new Set(items.map((s) => s.setup)).size, 'setup'))),
    ));
    const setupCount = impact.plan.length;
    const totalCost = impact.plan.reduce((sum, g) => sum + g.cost + g.intraCost, 0);
    return [
      ...rows,
      h(
        'a',
        { class: 'box out', href: anchor(`view-plan/${key}`) },
        h('div', { class: 'out-total' }, plural(scenarios.length, 'scenario'), ' · ', plural(setupCount, 'setup')),
        h('div', { class: 'why' }, `switch cost ${totalCost}`),
        h('div', { class: 'out-cta' }, 'Open as run plan →'),
      ),
    ];
  }

  function renderImpact(key) {
    const impact = data.impacts[key];
    const flow = document.getElementById('impact-flow');
    if (!flow) return;
    document.querySelectorAll('#view-impact .pick').forEach((a) => {
      if (a.dataset.key === key) a.setAttribute('aria-current', 'true');
      else a.removeAttribute('aria-current');
    });
    if (!impact) {
      append(clear(flow), [h('p', { class: 'muted' }, 'Pick a feature, flag or axis value on the left.')]);
      return;
    }
    impactState.pick = key;
    const col = (n, title, children) => h(
      'div',
      { class: `col col-${n}` },
      h('h4', null, h('span', { class: 'step-n' }, String(n)), title),
      children,
    );
    const arrow = () => h('div', { class: 'arrow', 'aria-hidden': 'true' }, h('span', null));
    append(clear(flow), [
      col(1, 'What changed', changedColumn(impact)),
      arrow(),
      col(2, 'Why it spreads', spreadColumn(impact)),
      arrow(),
      col(3, `Features touched · ${impact.touched.length}`, touchedColumn(impact)),
      arrow(),
      col(4, 'Scenarios to re-run', rerunColumn(impact)),
    ]);
  }

  // ---------- B · Matrix ----------

  function cellInvalid(action, setup, fixed) {
    const invalid = list(graph.constraints).filter((c) => c.action === action.id && c.class === 'invalid');
    if (invalid.length === 0) return null;
    let combos = [{ ...setup.values, ...fixed }];
    list(action.axes).filter((a) => !(a in fixed)).forEach((axisId) => {
      const axis = axes.get(axisId);
      combos = combos.flatMap((base) => list(axis && axis.values)
        .map((v) => ({ ...base, [axisId]: v.id })));
    });
    const hits = new Set();
    const all = combos.every((values) => {
      const hit = invalid.find((c) => matches(c, values));
      if (hit) hits.add(hit);
      return Boolean(hit);
    });
    return all ? [...hits] : null;
  }

  function scenarioChip(s, restAxes) {
    const cls = primaryClass(s);
    const rest = restAxes.map((a) => valueName(a, s.values[a]));
    const extra = s.classes.filter((c) => c !== cls);
    const title = [
      s.id,
      s.classes.length ? s.classes.map((c) => CLASS_META[c].label).join(', ') : 'valid',
      ...s.expected.map((o) => {
        const outcome = outcomeOf(s.action, o);
        return outcome ? `→ ${outcome.message}` : o;
      }),
    ].join('\n');
    return h(
      'a',
      {
        class: `chip c-${cls}`, id: `scenario-${s.id}`, href: anchor(`scenario-${s.id}`), title, 'data-classes': s.classes.join(' ') || 'valid',
      },
      h('span', { class: 'sym', 'aria-hidden': 'true' }, CLASS_META[cls].sym, extra.map((c) => CLASS_META[c].sym)),
      h('span', { class: 'chip-text' }, rest.length ? rest.join(' · ') : CLASS_META[cls].short),
      h('span', { class: 'sr' }, ` ${CLASS_META[cls].label}`),
    );
  }

  function matrixTable(action, setup, scenarios) {
    const [rowAxis, colAxis, ...restAxes] = list(action.axes);
    const rowValues = rowAxis ? list(axes.get(rowAxis).values) : [null];
    const colValues = colAxis ? list(axes.get(colAxis).values) : [null];
    const cellOf = (rv, cv) => scenarios.filter((s) => (!rowAxis || s.values[rowAxis] === rv.id)
      && (!colAxis || s.values[colAxis] === cv.id));

    const corner = h('th', { class: 'corner', scope: 'col' }, rowAxis ? axisName(rowAxis) : '', colAxis ? h('span', { class: 'corner-col' }, ` × ${axisName(colAxis)}`) : '');
    const head = h('tr', null, corner, colValues.map((cv) => h('th', { scope: 'col' }, cv ? cv.name : '')));
    const body = rowValues.map((rv) => h(
      'tr',
      null,
      h('th', { scope: 'row' }, rv ? rv.name : 'run once'),
      colValues.map((cv) => {
        const items = cellOf(rv, cv);
        if (items.length > 0) {
          return h('td', { class: items.length === 1 ? 'single' : 'multi' }, items.map((s) => scenarioChip(s, restAxes)));
        }
        const fixed = {};
        if (rowAxis) fixed[rowAxis] = rv.id;
        if (colAxis) fixed[colAxis] = cv.id;
        const invalid = cellInvalid(action, setup, fixed);
        if (invalid) {
          return h('td', { class: 'na', title: invalid.map((c) => `${c.id}: ${c.note}`).join('\n') }, 'n/a');
        }
        return h('td', { class: 'none', title: 'No scenario picked here; its pairs are covered by other cells' }, '·');
      }),
    ));
    return h('table', { class: 'grid' }, h('thead', null, head), h('tbody', null, body));
  }

  function renderMatrix(root) {
    const focus = (cls) => {
      const matrix = root.querySelector('.matrix');
      const next = matrix.dataset.focus === cls ? '' : cls;
      matrix.dataset.focus = next;
      root.querySelectorAll('.legend-item').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.cls === next)));
    };
    const toc = h('nav', { class: 'toc', 'aria-label': 'Actions' }, list(graph.actions).map((a) => h('a', { href: anchor(`matrix-${a.id}`) }, a.name)));
    const sections = list(graph.actions).map((action) => {
      const own = data.scenarios.filter((s) => s.action === action.id);
      const [rowAxis, colAxis, ...restAxes] = list(action.axes);
      const layout = [
        rowAxis ? `rows: ${axisName(rowAxis)}` : 'no action axes',
        colAxis ? `columns: ${axisName(colAxis)}` : null,
        restAxes.length ? `in cells: ${restAxes.map(axisName).join(' · ')}` : null,
      ].filter(Boolean).join('   ');
      const cards = list(action.setups).map((setupId) => {
        const setup = setups.get(setupId);
        const items = own.filter((s) => s.setup === setupId);
        const notRunnable = setup && setup.runnable === false;
        return h(
          'figure',
          { class: `card matrix-card${notRunnable ? ' not-runnable' : ''}`, id: `matrix-${action.id}-${setupId}` },
          h(
            'figcaption',
            null,
            h(
              'div',
              { class: 'card-title' },
              h('span', null, setupName(setupId)),
              runnableBadge(setup),
              h('span', { class: 'card-count' }, plural(items.length, 'scenario')),
            ),
            setup ? h('div', { class: 'card-sub' }, `${envName(setup.environment)} · ${setupValuesText(setup)}`) : null,
          ),
          h('div', { class: 'grid-wrap' }, setup ? matrixTable(action, setup, items) : null),
        );
      });
      return h(
        'section',
        { class: 'action-block', id: `matrix-${action.id}` },
        h(
          'header',
          { class: 'action-head' },
          h('h3', null, action.name, h('span', { class: 'muted' }, ` · ${featureName(action.feature)}`)),
          classBar(own),
          h('a', { class: 'xlink', href: anchor(`path-${action.id}`) }, 'path (C) →'),
        ),
        h('p', { class: 'layout-note mono' }, layout),
        cards.length
          ? h('div', { class: 'cards', style: `--card-min:${340 + restAxes.length * 55}px` }, cards)
          : h('p', { class: 'muted' }, 'No setups.'),
      );
    });
    append(clear(root), [
      h(
        'div',
        { class: 'view-head' },
        h('h2', null, 'Combination matrix'),
        h('p', { class: 'lede' }, 'One grid per action per setup. Each chip is one scenario; click it for details. Click a class to highlight it.'),
        h('div', { class: 'view-tools' }, classLegend(focus), toc),
      ),
      h('div', { class: 'matrix', 'data-focus': '' }, sections),
    ]);
  }

  // ---------- C · Paths ----------

  function renderPaths(root) {
    const sections = list(graph.actions).map((action) => {
      const steps = list(action.path && action.path.steps);
      const outcomes = list(action.path && action.path.outcomes);
      const own = data.scenarios.filter((s) => s.action === action.id);
      const errorsAt = (stepId) => outcomes.filter((o) => o.kind === 'error' && o.at === stepId);
      const successes = outcomes.filter((o) => o.kind === 'success');
      const triggers = (outcomeId) => list(graph.constraints)
        .filter((c) => c.action === action.id && c.outcome === outcomeId);
      const expecting = (outcomeId) => own.filter((s) => s.expected.includes(outcomeId)).length;
      const stepName = (stepId) => {
        const step = steps.find((x) => x.id === stepId);
        return step ? step.name : stepId;
      };
      // A success that does not land on the last step is worth calling out.
      const earlyExit = (o) => o.kind === 'success' && steps.length > 0
        && o.at !== steps[steps.length - 1].id;

      const outcomeBox = (o) => h(
        'div',
        { class: `outcome kind-${o.kind}`, id: `outcome-${action.id}-${o.id}` },
        h(
          'div',
          { class: 'outcome-msg' },
          h('span', { class: 'kind-icon', 'aria-hidden': 'true' }, o.kind === 'error' ? '✕' : '✓'),
          h('q', null, o.message),
        ),
        h('div', { class: 'outcome-meta' }, h('code', { class: 'src' }, o.source), unverifiedBadge(o)),
        o.note ? h('p', { class: 'outcome-note' }, o.note) : null,
        triggers(o.id).length ? h('ul', { class: 'triggers' }, triggers(o.id).map((c) => h(
          'li',
          null,
          classSym(c.class === 'invalid' ? 'rejected' : c.class),
          ' ',
          c.note || c.id,
        ))) : null,
        h('div', { class: 'outcome-count muted' }, `${plural(expecting(o.id), 'scenario')} expect this`, earlyExit(o) ? ` · at ${stepName(o.at)}` : ''),
      );

      const columns = steps.map((step, i) => h(
        'div',
        { class: 'path-col' },
        h(
          'div',
          { class: 'step-node' },
          h('span', { class: 'step-i' }, String(i + 1)),
          h('div', { class: 'step-name' }, step.name),
          h('code', { class: 'step-screen' }, step.screen),
        ),
        errorsAt(step.id).length ? h('div', { class: 'exits' }, errorsAt(step.id).map(outcomeBox)) : null,
      ));
      const end = h('div', { class: 'path-col path-end' }, successes.map(outcomeBox));
      return h(
        'section',
        { class: 'card path-card', id: `path-${action.id}` },
        h(
          'header',
          { class: 'action-head' },
          h('h3', null, action.name, h('span', { class: 'muted' }, ` · ${featureName(action.feature)}`)),
          h('span', { class: 'muted' }, `${plural(steps.length, 'step')} · ${plural(outcomes.filter((o) => o.kind === 'error').length, 'error exit')}`),
          h('a', { class: 'xlink', href: anchor(`matrix-${action.id}`) }, 'matrix (B) →'),
        ),
        h('div', { class: 'path-scroll' }, h('div', { class: 'path', style: `--cols:${steps.length + 1}` }, columns, end)),
      );
    });
    append(clear(root), [
      h(
        'div',
        { class: 'view-head' },
        h('h2', null, 'Paths'),
        h('p', { class: 'lede' }, 'The screens of each action left to right, with every exit to an error message below the step where it appears. Messages are copied from code; "unverified" ones must be confirmed on device.'),
      ),
      sections,
    ]);
  }

  // ---------- D · Run plan ----------

  function stepCost(step) {
    const axis = axes.get(step.axis);
    const sw = (axis && axis.switch) || {};
    const rule = list(sw.transitions).find((t) => t.from === step.from && t.to === step.to);
    const key = step.via === 'fallback' ? sw.fallback && sw.fallback.cost : (rule && rule.cost) || sw.cost;
    return { key, value: graph.costs[key], when: rule && rule.when };
  }

  function transitionBlock(group, index) {
    return h(
      'div',
      { class: 'transition' },
      h('div', { class: 'transition-head' }, `Switch to setup ${index + 1}`, h('span', { class: 'cost' }, `cost ${group.cost}`)),
      h('ol', { class: 'tsteps' }, group.steps.map((step) => {
        const cost = stepCost(step);
        const fallback = step.via === 'fallback';
        return h(
          'li',
          { class: `tstep${fallback ? ' fallback' : ''}` },
          h('span', { class: 'taxis' }, axisName(step.axis)),
          h('span', { class: 'tmove' }, valueName(step.axis, step.from), h('span', { class: 'tarrow', 'aria-hidden': 'true' }, ' → '), h('b', null, valueName(step.axis, step.to))),
          fallback ? h('span', { class: 'fallback-badge', title: `A direct switch from ${valueName(step.axis, step.from)} to ${valueName(step.axis, step.to)} is impossible` }, '⟲ forced reset') : null,
          h('span', { class: 'thow' }, step.how),
          cost.key ? h('span', { class: `cost cost-${cost.key}` }, `${cost.key} · ${cost.value}`) : null,
          cost.when ? h('span', { class: 'muted' }, `when ${cost.when}`) : null,
        );
      })),
    );
  }

  const COLUMNS = ['#', 'Scenario id', 'Action', 'Combination', 'Class', 'Expected', ''];

  /** A switch inside a setup that costs more than cheap, spelled out before the scenario. */
  function moveRow(move) {
    return h(
      'tr',
      { class: 'move-row' },
      h('td', { class: 'num', 'aria-hidden': 'true' }, '↻'),
      h('td', { colspan: COLUMNS.length - 1 }, h(
        'div',
        { class: 'move' },
        h('span', { class: 'move-head' }, 'Switch first'),
        move.steps.map((step) => {
          const cost = stepCost(step);
          return h(
            'span',
            { class: 'move-step' },
            h('span', { class: 'taxis' }, axisName(step.axis)),
            valueName(step.axis, step.from),
            h('span', { class: 'tarrow', 'aria-hidden': 'true' }, ' → '),
            h('b', null, valueName(step.axis, step.to)),
            cost.key ? h('span', { class: `cost cost-${cost.key}` }, `${cost.key} · ${cost.value}`) : null,
            cost.when ? h('span', { class: 'muted' }, `when ${cost.when}`) : null,
          );
        }),
      )),
    );
  }

  function planRow(s, n) {
    const action = actions.get(s.action);
    const cls = primaryClass(s);
    return h(
      'tr',
      { id: `run-${s.id}`, class: `c-row-${cls}` },
      h('td', { class: 'num' }, String(n)),
      h('td', { class: 'sid' }, h('code', { title: 'Scenario id, as used in run files' }, s.id)),
      h('td', null, actionName(s.action)),
      h('td', { class: 'combo' }, list(action && action.axes).map((a) => h(
        'span',
        { class: 'val', title: axisName(a) },
        h('span', { class: 'val-axis' }, axisName(a)),
        valueName(a, s.values[a]),
      ))),
      h('td', { class: 'classes' }, s.classes.length ? s.classes.map((c) => classSym(c, true)) : classSym('valid', true)),
      h('td', { class: 'expected' }, s.expected.map((o) => outcomeLine(s.action, o))),
      h(
        'td',
        { class: 'links' },
        h('a', { href: anchor(`scenario-${s.id}`), title: 'Matrix cell (B)' }, 'B'),
        h('a', { href: anchor(`path-${s.action}`), title: 'Path (C)' }, 'C'),
      ),
    );
  }

  const planState = { filter: null };

  function renderPlan(root, filterKey) {
    const impact = filterKey ? data.impacts[filterKey] : null;
    planState.filter = impact ? filterKey : null;
    const plan = impact ? impact.plan : data.plan;
    const groups = plan.map((g) => ({ ...g, items: resolve(g.scenarios) }));
    const total = groups.reduce((sum, g) => sum + g.items.length, 0);
    const betweenCost = groups.reduce((sum, g) => sum + g.cost, 0);
    const intraCost = groups.reduce((sum, g) => sum + g.intraCost, 0);
    const fallbacks = groups.flatMap((g) => g.steps).filter((s) => s.via === 'fallback').length;
    const blocked = groups.filter((g) => g.runnable === false).length;

    let n = 0;
    const body = groups.map((g, i) => {
      const setup = setups.get(g.setup);
      const movesBefore = new Map(list(g.moves).map((m) => [m.scenario, m]));
      const rows = g.items.flatMap((s) => {
        n += 1;
        const move = movesBefore.get(s.id);
        return [move ? moveRow(move) : null, planRow(s, n)];
      });
      const firstBlocked = g.runnable === false && (i === 0 || groups[i - 1].runnable !== false);
      return [
        firstBlocked ? h(
          'div',
          { class: 'blocked-head' },
          h('h3', null, 'Not runnable today'),
          h('p', { class: 'muted' }, 'These setups cannot be reached on the available environments. They are listed for reference and are not part of the route or its switch cost.'),
        ) : null,
        i > 0 && g.runnable !== false ? transitionBlock(g, i) : null,
        h(
          'details',
          { class: `group${setup && setup.runnable === false ? ' not-runnable' : ''}`, id: `group-${g.setup}`, open: true },
          h(
            'summary',
            null,
            h('span', { class: 'group-n' }, `Setup ${i + 1}`),
            h('span', { class: 'group-name' }, setupName(g.setup)),
            setup ? h('span', { class: 'muted group-env' }, envName(setup.environment)) : null,
            runnableBadge(setup),
            h('span', { class: 'group-spacer' }),
            classBar(g.items),
            g.intraCost > 0 ? h('span', { class: 'muted group-intra', title: 'Switch cost between scenarios inside this setup' }, `inside: cost ${g.intraCost}`) : null,
            h('span', { class: 'group-count' }, plural(g.items.length, 'scenario')),
          ),
          setup ? h('p', { class: 'group-sub muted' }, setupValuesText(setup), setup.notes ? ` · ${setup.notes}` : '') : null,
          h(
            'table',
            { class: 'runs' },
            h('thead', null, h('tr', null, COLUMNS.map((t) => h('th', { scope: 'col' }, t)))),
            h('tbody', null, rows),
          ),
        ),
      ];
    });

    const setAll = (open) => root.querySelectorAll('details.group')
      .forEach((d) => d.toggleAttribute('open', open));
    append(clear(root), [
      h(
        'div',
        { class: 'view-head' },
        h('h2', null, 'Run plan'),
        h('p', { class: 'lede' }, 'Scenarios grouped by setup, ordered to keep expensive switches rare, between setups and inside each one. Between groups, the switch steps are spelled out; forced resets are highlighted. Inside a group, any switch above cheap is shown before the scenario that needs it. Run files refer to scenarios by their id.'),
        impact ? h(
          'div',
          { class: 'filter-banner' },
          h('span', null, 'Filtered to re-run after: ', h('b', null, pickLabel(impact.pick))),
          h('span', { class: 'muted' }, ` · ${total} of ${data.scenarios.length} scenarios`),
          h('a', { href: anchor(`view-impact/${filterKey}`) }, '← impact'),
          h('a', { href: '#view-plan' }, 'show full plan'),
        ) : null,
        h(
          'div',
          { class: 'plan-summary' },
          h('span', null, h('b', null, String(total)), ' scenarios'),
          h('span', null, h('b', null, String(groups.length)), ' setups'),
          h('span', null, 'switch cost ', h('b', null, String(betweenCost + intraCost)), h('span', { class: 'muted' }, ` (${betweenCost} between setups, ${intraCost} inside)`)),
          fallbacks ? h('span', { class: 'fallback-badge' }, `⟲ ${plural(fallbacks, 'forced reset')}`) : null,
          blocked ? h('span', { class: 'badge not-runnable-badge' }, `${plural(blocked, 'setup')} not runnable`) : null,
          h('span', { class: 'group-spacer' }),
          h('button', { type: 'button', class: 'btn', onclick: () => setAll(true) }, 'Expand all'),
          h('button', { type: 'button', class: 'btn', onclick: () => setAll(false) }, 'Collapse all'),
        ),
      ),
      groups.length ? body : h('p', { class: 'muted' }, 'Nothing to run.'),
    ]);
  }

  // ---------- Inspector ----------

  function renderInspector(s) {
    const panel = document.getElementById('inspector');
    const action = actions.get(s.action);
    const setup = setups.get(s.setup);
    const constraints = list(graph.constraints).filter((c) => s.constraintIds.includes(c.id));
    const actionAxes = list(action && action.axes);
    const rows = Object.entries(s.values).map(([a, v]) => h(
      'tr',
      null,
      h('th', { scope: 'row' }, axisName(a), actionAxes.includes(a) ? null : h('span', { class: 'muted' }, ' setup')),
      h('td', null, valueName(a, v)),
    ));
    append(clear(panel), [
      h(
        'div',
        { class: 'insp-head' },
        h('span', { class: 'muted' }, 'Scenario'),
        h('button', {
          type: 'button', class: 'btn close', 'aria-label': 'Close', onclick: () => { panel.hidden = true; },
        }, '×'),
      ),
      h('h3', null, actionName(s.action)),
      h('code', { class: 'insp-id' }, s.id),
      h('p', null, setupName(s.setup), setup ? h('span', { class: 'muted' }, ` · ${envName(setup.environment)}`) : null, runnableBadge(setup)),
      h('div', { class: 'insp-classes' }, s.classes.length ? s.classes.map((c) => classSym(c, true)) : classSym('valid', true)),
      h('table', { class: 'kv' }, h('tbody', null, rows)),
      constraints.length ? [
        h('h4', null, 'Constraints'),
        h('ul', { class: 'insp-list' }, constraints.map((c) => h('li', null, h('code', null, c.id), ` ${c.note || ''}`))),
      ] : null,
      h('h4', null, 'Expected'),
      h('div', { class: 'insp-expected' }, s.expected.map((o) => {
        const outcome = outcomeOf(s.action, o);
        return h(
          'div',
          null,
          outcomeLine(s.action, o),
          outcome ? h('code', { class: 'src' }, outcome.source) : null,
          outcome && outcome.note ? h('p', { class: 'outcome-note' }, outcome.note) : null,
        );
      })),
      h(
        'div',
        { class: 'insp-links' },
        h('a', { class: 'btn', href: anchor(`path-${s.action}`) }, 'Path (C)'),
        h('a', { class: 'btn', href: anchor(`run-${s.id}`) }, 'Run plan (D)'),
      ),
    ]);
    panel.hidden = false;
  }

  // ---------- Routing ----------

  const views = {};
  VIEWS.forEach((id) => { views[id] = document.getElementById(id); });

  function show(viewId) {
    VIEWS.forEach((id) => { views[id].hidden = id !== viewId; });
    document.querySelectorAll('.tabs a').forEach((a) => {
      if (a.dataset.view === viewId) a.setAttribute('aria-current', 'page');
      else a.removeAttribute('aria-current');
    });
  }

  function flash(el) {
    el.classList.remove('flash');
    // Restart the animation on repeated visits.
    // eslint-disable-next-line no-unused-expressions
    el.offsetWidth;
    el.classList.add('flash');
  }

  function focusTarget(id) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.closest('details') && !el.closest('details').open) el.closest('details').open = true;
    el.scrollIntoView({ block: 'center' });
    flash(el);
    if (id.startsWith('scenario-')) {
      const s = scenarioById.get(id.slice('scenario-'.length));
      if (s) renderInspector(s);
    }
  }

  const firstPick = Object.keys(data.impacts)[0] || null;

  function route() {
    const raw = decodeURIComponent(window.location.hash.slice(1));
    // The inspector describes one scenario; any other destination leaves it stale.
    if (!raw.startsWith('scenario-')) document.getElementById('inspector').hidden = true;
    const [head] = raw.split('/');
    const arg = raw.slice(head.length + 1) || null;
    if (VIEWS.includes(head)) {
      show(head);
      if (head === 'view-impact') renderImpact(arg || impactState.pick || firstPick);
      if (head === 'view-plan' && (arg || null) !== planState.filter) renderPlan(views['view-plan'], arg);
      window.scrollTo(0, 0);
      return;
    }
    if (raw.startsWith('scenario-') || raw.startsWith('matrix-')) show('view-matrix');
    else if (raw.startsWith('path-') || raw.startsWith('outcome-')) show('view-paths');
    else if (raw.startsWith('run-') || raw.startsWith('group-')) {
      if (planState.filter && !document.getElementById(raw)) renderPlan(views['view-plan'], null);
      show('view-plan');
    } else {
      show('view-impact');
      renderImpact(impactState.pick || firstPick);
      return;
    }
    focusTarget(raw);
  }

  // Clicking a link to the hash already in the URL fires no hashchange; route anyway.
  document.addEventListener('click', (event) => {
    const link = event.target.closest('a[href^="#"]');
    if (link && link.getAttribute('href') === window.location.hash) route();
  });
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') document.getElementById('inspector').hidden = true;
  });
  window.addEventListener('hashchange', route);

  renderStats();
  renderImpactShell(views['view-impact']);
  renderMatrix(views['view-matrix']);
  renderPaths(views['view-paths']);
  renderPlan(views['view-plan'], null);
  route();
}());
