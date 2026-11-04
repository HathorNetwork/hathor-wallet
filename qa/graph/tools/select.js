/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { allScenarios } = require('./scenarios');
const { computeImpact } = require('./impact');

const asList = (value) => (Array.isArray(value) ? value : []);

/**
 * A glob as a RegExp over repo-relative paths.
 * - `**` matches any run of characters, `/` included; `*` and `?` stop at `/`.
 * - A pattern ending in `/` is a directory prefix.
 * - A pattern with no `/` matches the base name anywhere, as in .gitignore.
 */
function globToRegExp(pattern) {
  const anywhere = !pattern.replace(/\/$/, '').includes('/');
  let body = '';
  for (let i = 0; i < pattern.length; i += 1) {
    const c = pattern[i];
    if (c === '*' && pattern[i + 1] === '*') {
      i += 1;
      if (pattern[i + 1] === '/') {
        i += 1;
        body += '(?:.*/)?';
      } else {
        body += '.*';
      }
    } else if (c === '*') body += '[^/]*';
    else if (c === '?') body += '[^/]';
    else body += c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }
  const tail = pattern.endsWith('/') ? '.*' : '';
  return new RegExp(`^${anywhere ? '(?:.*/)?' : ''}${body}${tail}$`);
}

const matchesAny = (patterns, file) => patterns.some((p) => globToRegExp(p).test(file));

/** A `files` entry ending in `/` is a directory prefix; anything else is an exact path. */
const matchesEntry = (entry, file) => (entry.endsWith('/') ? file.startsWith(entry) : file === entry);

/** The union of every graph's `selection` block. */
function selectionOf(graphs) {
  const full = [];
  const ignore = [];
  graphs.forEach(({ graph }) => {
    const sel = (graph && graph.selection) || {};
    asList(sel.full).forEach((p) => { if (!full.includes(p)) full.push(p); });
    asList(sel.ignore).forEach((p) => { if (!ignore.includes(p)) ignore.push(p); });
  });
  return { full, ignore };
}

/** Code under these roots must be mapped to a feature or covered by a `selection` pattern. */
const MAPPED_ROOTS = ['src/', 'public/'];

/**
 * Which scenarios a change reaches, across several graphs.
 *
 * Each changed file is classified, first match wins:
 * 1. `full`: it matches a `selection.full` pattern of any graph; every scenario runs.
 * 2. `ignored`: it matches a `selection.ignore` pattern; nothing runs for it.
 * 3. `area`: it is one of a graph's own files (`area.paths`); every scenario of that graph runs.
 * 4. `mapped`: some in-scope feature's `files` names it; those features become picks.
 * 5. `unmapped`: anything else under src/ or public/; the caller runs its floor (tier 1).
 * 6. `other`: anything else; nothing runs for it.
 *
 * Picks spread with `computeImpact`, one graph at a time: scenario ids belong to one graph.
 *
 * @param {{area: string, graph: object, paths?: string[]}[]} graphs
 *   `paths` are repo-relative files or `/`-ending directories that belong to the area
 *   (its graph file, its scenario directory).
 * @param {string[]} changedFiles Repo-relative paths.
 * @returns {{
 *   files: {file: string, class: string, detail?: string}[],
 *   full: boolean,
 *   unmapped: string[],
 *   picks: {area: string, feature: string, files: string[]}[],
 *   scenarios: {area: string, id: string, reasons: string[]}[],
 * }}
 */
function selectByChange(graphs, changedFiles) {
  const { full: fullPatterns, ignore } = selectionOf(graphs);
  const files = [];
  const wholeAreas = new Set();
  const picks = new Map(); // `${area}/${feature}` -> pick

  changedFiles.forEach((file) => {
    if (matchesAny(fullPatterns, file)) {
      files.push({ file, class: 'full' });
      return;
    }
    if (matchesAny(ignore, file)) {
      files.push({ file, class: 'ignored' });
      return;
    }
    const owner = graphs.find((g) => asList(g.paths).some((entry) => matchesEntry(entry, file)));
    if (owner) {
      wholeAreas.add(owner.area);
      files.push({ file, class: 'area', detail: owner.area });
      return;
    }
    const hits = [];
    graphs.forEach(({ area, graph }) => {
      asList(graph.features)
        .filter((f) => f.status === 'in-scope' && asList(f.files).some((e) => matchesEntry(e, file)))
        .forEach((f) => {
          const key = `${area}/${f.id}`;
          const pick = picks.get(key) || { area, feature: f.id, files: [] };
          pick.files.push(file);
          picks.set(key, pick);
          hits.push(key);
        });
    });
    if (hits.length > 0) {
      files.push({ file, class: 'mapped', detail: hits.join(', ') });
      return;
    }
    const underRoot = MAPPED_ROOTS.some((root) => file.startsWith(root));
    files.push({ file, class: underRoot ? 'unmapped' : 'other' });
  });

  const full = files.some((f) => f.class === 'full');
  const unmapped = files.filter((f) => f.class === 'unmapped').map((f) => f.file);
  const selected = new Map(); // `${area}|${id}` -> entry
  const add = (area, id, reason) => {
    const key = `${area}|${id}`;
    const entry = selected.get(key) || { area, id, reasons: [] };
    if (!entry.reasons.includes(reason)) entry.reasons.push(reason);
    selected.set(key, entry);
  };

  graphs.forEach(({ area, graph }) => {
    const scenarios = allScenarios(graph);
    if (full || wholeAreas.has(area)) {
      const why = full ? 'a full-suite file changed' : `the ${area} graph or its scenarios changed`;
      scenarios.forEach((s) => add(area, s.id, why));
      return;
    }
    [...picks.values()].filter((p) => p.area === area).forEach((pick) => {
      const impact = computeImpact(graph, { type: 'feature', id: pick.feature }, scenarios);
      const whyFeature = new Map(impact.touched.map((t) => [t.feature, t]));
      impact.scenarios.forEach((s) => {
        const action = asList(graph.actions).find((a) => a.id === s.action);
        const owner = action && action.feature;
        const touched = whyFeature.get(owner);
        let reason = `${pick.files.join(', ')} → ${pick.feature}`;
        if (owner && owner !== pick.feature && touched) {
          const r = touched.reasons[0];
          reason += ` → ${owner} (via ${r.via}: ${r.why})`;
        }
        add(area, s.id, reason);
      });
    });
  });

  return {
    files,
    full,
    unmapped,
    picks: [...picks.values()],
    scenarios: [...selected.values()],
  };
}

/**
 * Files under src/ or public/ that no in-scope feature names and no `selection`
 * pattern covers: what `selectByChange` calls unmapped.
 * @param {{graph: object}[]} graphs
 * @param {string[]} trackedFiles Repo-relative paths, e.g. from `git ls-files`.
 */
function unmappedFiles(graphs, trackedFiles) {
  const { full, ignore } = selectionOf(graphs);
  const entries = graphs.flatMap(({ graph }) => asList(graph.features)
    .filter((f) => f.status === 'in-scope')
    .flatMap((f) => asList(f.files)));
  return trackedFiles
    .filter((file) => MAPPED_ROOTS.some((root) => file.startsWith(root)))
    .filter((file) => !matchesAny(full, file) && !matchesAny(ignore, file))
    .filter((file) => !entries.some((e) => matchesEntry(e, file)));
}

module.exports = {
  globToRegExp, selectionOf, selectByChange, unmappedFiles, MAPPED_ROOTS,
};
