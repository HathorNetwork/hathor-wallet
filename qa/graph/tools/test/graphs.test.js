/**
 * Change selection against the repo's real graphs, where the unit tests in
 * select.test.js use a small fixture.
 */
const { describe, it } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const { expect } = require('./expect');
const { loadGraph } = require('../load');
const { selectByChange } = require('../select');

const GRAPH_DIR = path.join(__dirname, '..', '..');
const graphs = fs.readdirSync(GRAPH_DIR)
  .filter((f) => f.endsWith('.yaml'))
  .map((f) => ({
    area: f.replace(/\.yaml$/, ''),
    graph: loadGraph(path.join(GRAPH_DIR, f)),
    paths: [`qa/graph/${f}`, `qa/e2e/${f.replace(/\.yaml$/, '')}/`],
  }));
const select = (...files) => selectByChange(graphs, files);

describe('the real graphs', () => {
  it('selects the scenario that reaches the failed-load screen', () => {
    const ids = select('src/screens/LoadWalletFailed.js').scenarios.map((s) => s.id);
    expect(ids).toContain('new-wallet-backup:started');
    expect(ids).toContain('new-wallet-no-backup:started');
  });

  it('runs everything when the LavaMoat policy or a patch changes', () => {
    expect(select('lavamoat/webpack/policy-override.json').full).toBe(true);
    expect(select('patches/elliptic++bn.js+4.12.0.patch').full).toBe(true);
  });

  it('runs nothing for Markdown', () => {
    expect(select('qa/e2e/README.md').scenarios).toEqual([]);
  });
});
