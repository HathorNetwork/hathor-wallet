# The rendered page

`qa-graph render --graph <graph.yaml>` writes one self-contained HTML file (default `<graph dir>/dist/graph.html`). It works offline, from disk, with no server and no network fetch. Everything on it is computed from the YAML at render time, so the page is a **snapshot**: re-render after every edit.

## What each view answers

| View | Question it answers | Built from |
|---|---|---|
| **A · Impact** | "This changed: what do I re-test, and why?" Pick a feature, flag or axis value, and read left to right: what changed → how it spreads (via code / axis / flag) → features reached, each with its reason → scenarios to re-run, as a filtered run plan. | `impact.js`, every pick precomputed |
| **B · Matrix** | "What combinations exist, and which are risky?" One grid per action per setup. Each chip is a scenario, coloured by class (✕ rejected, ▲ edge, ◆ lib-risk, ✓ valid). Clicking a chip opens the **inspector**: setup, axis values, expected outcomes. | `scenarios.js` |
| **C · Paths** | "What does the tester do, and where can it go wrong?" Per action, the steps left to right, with every error outcome under the step where it shows. Unverified messages are badged. | `actions[].path` |
| **D · Run plan** | "In what order do I run it?" Scenarios grouped by setup and ordered to keep expensive switches rare. Between groups, each switch is spelled out with its `how`. | `runplan.js` |

The header shows the version label (YAML commit and date, tools commit, and either marked `UNCOMMITTED` when dirty) and the counts (features in scope, actions, setups, scenarios, unverified messages). A run file copies that label, so a result traces back to the exact page.

## Pipeline

```text
graph.yaml ──load.js──▶ graph ──validate──▶ (stop on ERROR)
                          │
                          ├─ scenarios.js  allScenarios(graph)            → scenarios[]
                          ├─ runplan.js    planRun(graph, scenarios)      → plan[]
                          └─ impact.js     computeImpact(graph, pick, …)  → impacts{pickKey}
                                         for every pick in allPicks(graph)
render.js: compact (plans and impacts keep scenario ids, not copies)
           → inline JSON in <script type="application/json" id="graph-data">
           → inline view/style.css and view/app.js
           → dist/graph.html
```

All computation happens in Node. The page only draws. That keeps the logic testable (`npm test`) and the page dumb.

### The data contract

`app.js` reads one JSON block:

```js
{
  version:   { label },                          // header label
  graph,                                         // the YAML as parsed
  scenarios: [{ id, action, setup, values, classes, constraintIds, expected }],
  plan:      [{ setup, runnable, cost, steps, scenarios: [id], intraCost, moves }],
  impacts:   { 'feature:<id>' | 'flag:<id>' | 'axisValue:<axis>:<value>':
               { pick, changed, touched: [{ feature, reasons: [{ via, why }] }],
                 scenarios: [id], plan } }
}
```

Adding a field means computing it in `render.js#buildPageData` and reading it in `app.js`. Nothing on the page derives graph logic itself.

## Changing the view

- **Where:** `tools/view/app.js` builds each view (`renderImpact`, `renderMatrix`, `renderPaths`, `renderPlan`, `renderInspector`; routing in `route()`/`show()`). `tools/view/style.css` holds the styles. The light/dark palette and the class and spread colours are CSS custom properties at the top (`--c-rejected`, `--v-code`, …).
- **Safety rule:** data text enters the DOM only as text nodes, through the `h(tag, props, ...children)` helper or `textContent`. Never through `innerHTML`. Graph content is authored by many hands and may contain `<`.
- **Inlining rule:** neither asset may contain `</script` or `</style`; `render.js` refuses to build if one does. The JSON block is escaped (`<`, `>`, `&`, U+2028, U+2029) for the same reason.
- **Offline rule:** no CDN, font or image fetch. `test/render.test.js` fails on any `src=`/`href=` pointing at `http(s):`.
- **New view:** add a `<section id="view-…" class="view">` and a tab in `render.js#renderHtml`, add its id to `VIEWS` in `app.js`, and write `renderX(root)`. Deep links are `#view-…` or `#scenario-<id>`.
- After any change, run `npm test`, re-render a real graph, and check it in a browser (below).

## Checking a rendered page

1. Render a real graph, not only the fixture: `node qa/graph/tools/cli.js render --graph qa/graph/tools/test/fixtures/desktop-sentry.snapshot.yaml --out /tmp/check.html`.
2. Open it. Browsers open it from disk, but Playwright blocks `file:`, so for automated checks serve the folder that holds the rendered file for the duration of the check (`python3 -m http.server 8765 --bind 127.0.0.1` there), then stop the server. When the reviewer is on another machine, bind to an address they can reach instead (a Tailscale IP), never `0.0.0.0`.
3. In the browser, switch to every tab, open an Impact pick, and click a matrix chip so the inspector opens. Count `a.chip` elements: there's one per scenario, so the count must equal the header's scenario count. The console must show no page errors (a `favicon.ico` 404 from the ad-hoc server is fine).

## Size

The page grows with picks × scenarios, compacted by referencing scenarios by id. Reference points: the desktop Sentry graph (127 scenarios) ≈ 0.35 MB, and the mobile graph ≈ 1.4 MB. That's fine in a browser, but too large to embed inline in a chat or artifact renderer (those cap around 500 KB). To show a graph inline, show a summary instead, such as the actions × setups matrix `qa-graph scenarios` prints, and point to the full file.
