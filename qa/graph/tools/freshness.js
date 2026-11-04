/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const asList = (value) => (Array.isArray(value) ? value : []);

const INVENTORY_KINDS = ['flag', 'screen'];

/**
 * Every match of `pattern` in `src`: the named group `name` if the pattern has one,
 * else the first capture group, else the whole match.
 */
function extractNames(src, pattern) {
  const re = new RegExp(pattern, 'g');
  const names = [];
  let m = re.exec(src);
  while (m) {
    names.push((m.groups && m.groups.name) || m[1] || m[0]);
    if (m[0] === '') re.lastIndex += 1;
    m = re.exec(src);
  }
  return names;
}

/** A `files` entry ending in `/` is a directory prefix; anything else is an exact path. */
const matchesEntry = (entry, file) => (entry.endsWith('/') ? file.startsWith(entry) : file === entry);

/**
 * Compare the graph with the code, deterministically.
 * @param {object} graph
 * @param {object} input
 * @param {{kind: 'flag'|'screen', names: string[], where: string}[]} input.inventories
 *   Names found in the code by the graph's `check.inventories`. Flags are compared both ways
 *   with `flags[].name`; screens only code-to-graph with `features[].screens`.
 * @param {string[]} input.changedFiles Repo-relative paths changed since the base.
 * @param {boolean} input.graphChanged Whether the graph file is among them.
 * @returns {{warnings: string[], notes: string[]}}
 */
function checkFreshness(graph, input) {
  const { inventories = [], changedFiles = [], graphChanged = false } = input;
  const warnings = [];
  const notes = [];

  const graphFlags = asList(graph.flags).map((f) => f.name);
  const graphScreens = new Set(asList(graph.features).flatMap((f) => asList(f.screens)));

  inventories.filter((inv) => inv.kind === 'flag').forEach(({ names, where }) => {
    names.filter((n) => !graphFlags.includes(n)).forEach((n) => {
      warnings.push(`Flag '${n}' is in ${where} but missing from the graph flags`);
    });
  });
  const flagInventories = inventories.filter((inv) => inv.kind === 'flag');
  if (flagInventories.length > 0) {
    const codeFlags = new Set(flagInventories.flatMap((inv) => inv.names));
    graphFlags.filter((n) => !codeFlags.has(n)).forEach((n) => {
      warnings.push(`Flag '${n}' is in the graph but not in the code (renamed or removed?)`);
    });
  }

  inventories.filter((inv) => inv.kind === 'screen').forEach(({ names, where }) => {
    names.filter((r) => !graphScreens.has(r)).forEach((r) => {
      warnings.push(`Route '${r}' is in ${where} but not listed in any feature's screens`);
    });
  });

  asList(graph.features).forEach((feature) => {
    const hits = changedFiles
      .filter((file) => asList(feature.files).some((entry) => matchesEntry(entry, file)));
    if (hits.length === 0) return;
    const text = `Feature '${feature.id}' has changed files (${hits.join(', ')})`;
    if (feature.status !== 'in-scope') {
      notes.push(`${text}; it is out of scope`);
    } else if (!graphChanged) {
      warnings.push(`${text} but the graph did not change: did its paths, axes or outcomes change?`);
    }
  });

  asList(graph.actions).forEach((action) => {
    asList(action.path && action.path.outcomes)
      .filter((o) => o.verified === false && o.source)
      .forEach((o) => {
        const file = String(o.source).replace(/:\d+$/, '');
        if (changedFiles.includes(file)) {
          notes.push(`Unverified outcome '${o.id}' of action '${action.id}': its source ${file} changed`);
        }
      });
  });

  return { warnings, notes };
}

/**
 * One-line description of which graph and tools versions a rendered page shows; the tools
 * generate the scenarios, so they matter as much as the YAML.
 */
function describeVersion({ commit, date, dirty, toolsCommit, toolsDirty, }) {
  const mark = (isDirty) => (isDirty ? ' + UNCOMMITTED changes' : '');
  return `YAML of ${date}, commit ${commit}${mark(dirty)} · tools ${toolsCommit}${mark(toolsDirty)}`;
}

module.exports = {
  INVENTORY_KINDS, extractNames, checkFreshness, describeVersion,
};
