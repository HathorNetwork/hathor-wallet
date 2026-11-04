/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const fs = require('fs');
const path = require('path');
const { allScenarios } = require('./scenarios');
const { planRun } = require('./runplan');
const { computeImpact, allPicks } = require('./impact');

const VIEW_DIR = path.join(__dirname, 'view');

const pickKey = (pick) => `${pick.type}:${pick.id}`;

/**
 * Everything the page displays, computed ahead of time; the client only renders it.
 * @param {object} graph
 * @param {{label: string}} version
 */
function buildPageData(graph, version) {
  const scenarios = allScenarios(graph);
  const impacts = {};
  allPicks(graph).forEach((pick) => {
    impacts[pickKey(pick)] = computeImpact(graph, pick, scenarios);
  });
  return {
    version,
    graph,
    scenarios,
    plan: planRun(graph, scenarios),
    impacts,
  };
}

/**
 * Scenario objects are embedded once; plans and impacts refer to them by id.
 * Without this, every pick would repeat its scenarios and the page would grow by picks x scenarios.
 */
function compactForPage(data) {
  const ids = (list) => list.map((s) => s.id);
  const compactPlan = (plan) => plan
    .map((group) => ({ ...group, scenarios: ids(group.scenarios) }));
  const impacts = {};
  Object.entries(data.impacts).forEach(([key, impact]) => {
    impacts[key] = { ...impact, scenarios: ids(impact.scenarios), plan: compactPlan(impact.plan) };
  });
  return { ...data, plan: compactPlan(data.plan), impacts };
}

/** JSON safe to inline inside a <script> element: no `<`, `>`, `&`, U+2028, U+2029. */
function serializeForScript(data) {
  return JSON.stringify(data)
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

const escapeHtml = (text) => String(text)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;');

function readAsset(name, closingTag) {
  const text = fs.readFileSync(path.join(VIEW_DIR, name), 'utf8');
  if (text.toLowerCase().includes(closingTag)) {
    throw new Error(`${name} must not contain '${closingTag}'`);
  }
  return text;
}

/**
 * One self-contained HTML page with views A-D; works offline.
 * @param {object} graph
 * @param {{label: string}} version
 * @returns {string}
 */
function renderHtml(graph, version) {
  const data = compactForPage(buildPageData(graph, version));
  const css = readAsset('style.css', '</style');
  const js = readAsset('app.js', '</script');
  const label = escapeHtml(version.label);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark">
<title>QA feature graph · ${label}</title>
<style>
${css}
</style>
</head>
<body>
<header class="top">
  <div class="brand">
    <span class="brand-mark" aria-hidden="true"></span>
    <div>
      <h1>QA feature graph</h1>
      <p class="version">${label}</p>
    </div>
  </div>
  <dl class="stats" id="stats"></dl>
  <nav class="tabs" aria-label="Views">
    <a href="#view-impact" data-view="view-impact"><b>A</b> Impact</a>
    <a href="#view-matrix" data-view="view-matrix"><b>B</b> Matrix</a>
    <a href="#view-paths" data-view="view-paths"><b>C</b> Paths</a>
    <a href="#view-plan" data-view="view-plan"><b>D</b> Run plan</a>
  </nav>
</header>
<main>
  <section id="view-impact" class="view" aria-label="A · Impact"></section>
  <section id="view-matrix" class="view" aria-label="B · Matrix"></section>
  <section id="view-paths" class="view" aria-label="C · Paths"></section>
  <section id="view-plan" class="view" aria-label="D · Run plan"></section>
</main>
<aside id="inspector" class="inspector" hidden></aside>
<noscript><p class="noscript">This page renders its views with JavaScript; enable it to see the graph.</p></noscript>
<script type="application/json" id="graph-data">${serializeForScript(data)}</script>
<script>
${js}
</script>
</body>
</html>
`;
}

module.exports = { buildPageData, renderHtml, serializeForScript };
