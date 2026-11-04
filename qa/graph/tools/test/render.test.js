/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { describe, it } = require('node:test');
const { expect } = require('./expect');
const path = require('path');
const { loadGraph } = require('../load');
const { allPicks } = require('../impact');
const { buildPageData, renderHtml, serializeForScript } = require('../render');

const fixture = loadGraph(path.join(__dirname, 'fixtures', 'mini.yaml'));
const version = { label: 'v1 · graph@abc1234' };
const count = (text, re) => (text.match(re) || []).length;
const dataBlock = (html) => {
  const m = html.match(/<script type="application\/json" id="graph-data">([\s\S]*?)<\/script>/);
  return m && m[1];
};

describe('qa graph render', () => {
  it('contains the four views', () => {
    const html = renderHtml(structuredClone(fixture), version);
    ['view-impact', 'view-matrix', 'view-paths', 'view-plan']
      .forEach((id) => expect(html).toContain(`id="${id}"`));
  });

  it('is self-contained', () => {
    const html = renderHtml(structuredClone(fixture), version);
    expect(html).not.toMatch(/(src|href)=["']https?:/);
  });

  it('escapes script-breaking text', () => {
    const graph = structuredClone(fixture);
    const evil = `</script><b>"x" & 'y'</b>`;
    graph.actions[0].path.outcomes[1].message = evil;
    const html = renderHtml(graph, version);

    expect(count(html, /<script/g)).toBe(count(html, /<\/script>/g));
    const block = dataBlock(html);
    expect(block).not.toMatch(/[<>&\u2028\u2029]/);
    const parsed = JSON.parse(block);
    expect(parsed.graph.actions[0].path.outcomes[1].message).toBe(evil);
  });

  it('serializes line and paragraph separators as escapes', () => {
    const text = serializeForScript({ s: 'a\u2028b\u2029c<>&' });
    expect(text).toBe('{"s":"a\\u2028b\\u2029c\\u003c\\u003e\\u0026"}');
    expect(JSON.parse(text).s).toBe('a\u2028b\u2029c<>&');
  });

  it('embeds an impact for every pick', () => {
    const graph = structuredClone(fixture);
    const data = buildPageData(graph, version);
    expect(Object.keys(data.impacts).length).toBe(allPicks(graph).length);
    expect(data.impacts['axisValue:token:fee'].pick).toEqual({ type: 'axisValue', id: 'token:fee' });
  });

  it('embedded impacts reference scenarios that exist', () => {
    const html = renderHtml(structuredClone(fixture), version);
    const data = JSON.parse(dataBlock(html));
    const ids = new Set(data.scenarios.map((s) => s.id));
    const impact = data.impacts['feature:pin-f'];
    expect(impact.scenarios.length).toBeGreaterThan(0);
    impact.scenarios.forEach((id) => expect(ids.has(id)).toBe(true));
    impact.plan.flatMap((g) => g.scenarios).forEach((id) => expect(ids.has(id)).toBe(true));
  });

  it('shows the version label', () => {
    const html = renderHtml(structuredClone(fixture), version);
    expect(html).toContain('v1 · graph@abc1234');
  });
});
