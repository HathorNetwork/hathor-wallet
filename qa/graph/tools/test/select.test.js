/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

const { describe, it } = require('node:test');
const { expect } = require('./expect');
const { validateGraph } = require('../load');
const {
  globToRegExp, selectByChange, unmappedFiles,
} = require('../select');

/** A one-setup graph: each feature owns one action, so each feature has one scenario. */
function graphOf(features, selection) {
  const feature = (f) => ({
    id: f.id,
    name: f.id,
    description: f.id,
    status: f.status || 'in-scope',
    screens: [],
    files: f.files || [],
    flags: [],
    links: (f.links || []).map((to) => ({ to, reason: `${f.id} uses ${to}` })),
    introduces: [],
    actions: [],
  });
  return {
    version: 1,
    costs: { cheap: 1 },
    ...(selection ? { selection } : {}),
    environments: [{ id: 'local', name: 'Local', notes: '' }],
    features: features.map(feature),
    flags: [],
    axes: [{
      id: 'install', name: 'Install', kind: 'setup', values: [{ id: 'fresh', name: 'Fresh' }], how: '', switch: { cost: 'cheap' },
    }],
    setups: [{ id: 'fresh', name: 'Fresh', values: { install: 'fresh' }, environment: 'local' }],
    actions: features.filter((f) => f.status !== 'out-of-scope').map((f) => ({
      id: `${f.id}-act`,
      name: f.id,
      feature: f.id,
      axes: [],
      setups: ['fresh'],
      path: { steps: [{ id: 's1', screen: 'X', name: 'do it' }], outcomes: [] },
    })),
    constraints: [],
  };
}

const SELECTION = {
  full: ['package.json', 'public/electron.js', 'src/store/', 'qa/e2e/lib/', '.github/workflows/e2e-electron.yml'],
  ignore: ['*.md', 'locale/', '.github/', 'src/**/*.test.js'],
};

const onboarding = {
  area: 'onboarding',
  paths: ['qa/graph/onboarding.yaml', 'qa/e2e/onboarding/'],
  graph: graphOf([
    { id: 'welcome', files: ['src/screens/Welcome.js'] },
    { id: 'new-wallet', files: ['src/screens/NewWallet.js', 'src/components/'], links: ['welcome'] },
    { id: 'pin', files: ['src/components/ChoosePin.js'] },
  ], SELECTION),
};
const sentry = {
  area: 'sentry',
  paths: ['qa/graph/sentry.yaml', 'qa/e2e/sentry/'],
  graph: graphOf([
    { id: 'consent-ui', files: ['src/screens/Welcome.js', 'src/screens/Settings.js'] },
    { id: 'main-crash', files: ['public/sentryConsent.js'] },
    { id: 'offline-queue', files: ['public/sentryConsent.js'] },
    { id: 'legacy', status: 'out-of-scope', files: ['src/screens/Legacy.js'] },
  ]),
};
const GRAPHS = [onboarding, sentry];
const ids = (result) => result.scenarios.map((s) => s.id).sort();
const classes = (result) => Object.fromEntries(result.files.map((f) => [f.file, f.class]));

describe('globToRegExp', () => {
  const m = (pattern, file) => globToRegExp(pattern).test(file);

  it('matches a bare pattern on the base name anywhere', () => {
    expect(m('*.md', 'README.md')).toBe(true);
    expect(m('*.md', 'qa/e2e/README.md')).toBe(true);
    expect(m('*.md', 'src/md.js')).toBe(false);
  });

  it('treats a trailing slash as a directory prefix', () => {
    expect(m('src/store/', 'src/store/index.js')).toBe(true);
    expect(m('src/store/', 'src/storage.js')).toBe(false);
    expect(m('locale/', 'locale/pt-br/texts.po')).toBe(true);
  });

  it('lets ** cross directories and * stop at them', () => {
    expect(m('src/**/*.test.js', 'src/a.test.js')).toBe(true);
    expect(m('src/**/*.test.js', 'src/screens/x/a.test.js')).toBe(true);
    expect(m('src/*.js', 'src/screens/a.js')).toBe(false);
    expect(m('package.json', 'package.json')).toBe(true);
    expect(m('package.json', 'sub/package.json')).toBe(true);
  });
});

describe('selectByChange', () => {
  it('selects only what reaches Welcome for a Welcome-only diff, with a reason each', () => {
    const r = selectByChange(GRAPHS, ['src/screens/Welcome.js']);
    expect(r.full).toBe(false);
    expect(classes(r)).toEqual({ 'src/screens/Welcome.js': 'mapped' });
    expect(r.picks.map((p) => `${p.area}/${p.feature}`).sort()).toEqual(['onboarding/welcome', 'sentry/consent-ui']);
    expect(ids(r)).toEqual(['consent-ui-act:fresh', 'new-wallet-act:fresh', 'welcome-act:fresh']);
    const newWallet = r.scenarios.find((s) => s.id === 'new-wallet-act:fresh');
    expect(newWallet.reasons[0]).toBe('src/screens/Welcome.js → welcome → new-wallet (via code: new-wallet uses welcome)');
    r.scenarios.forEach((s) => expect(s.reasons.length > 0).toBe(true));
  });

  it('runs everything when a full-suite file changes', () => {
    const r = selectByChange(GRAPHS, ['src/screens/Welcome.js', 'package.json']);
    expect(r.full).toBe(true);
    expect(classes(r)['package.json']).toBe('full');
    expect(r.scenarios.length).toBe(6);
    expect(r.scenarios.every((s) => s.reasons.includes('a full-suite file changed'))).toBe(true);
  });

  it('selects nothing for an ignore-only diff', () => {
    const r = selectByChange(GRAPHS, ['README.md', 'locale/pt-br/texts.po', 'src/screens/Welcome.test.js', '.github/workflows/main.yml']);
    expect(r.files.every((f) => f.class === 'ignored')).toBe(true);
    expect(r.scenarios).toEqual([]);
    expect(r.unmapped).toEqual([]);
  });

  it('lets a full pattern win over an ignore pattern', () => {
    const r = selectByChange(GRAPHS, ['.github/workflows/e2e-electron.yml']);
    expect(r.full).toBe(true);
  });

  it('reports an unmapped file under src/ and selects nothing for it', () => {
    const r = selectByChange(GRAPHS, ['src/utils/tokens.js', 'scripts/release.sh']);
    expect(classes(r)).toEqual({ 'src/utils/tokens.js': 'unmapped', 'scripts/release.sh': 'other' });
    expect(r.unmapped).toEqual(['src/utils/tokens.js']);
    expect(r.scenarios).toEqual([]);
  });

  it('maps a file under a directory prefix', () => {
    const r = selectByChange(GRAPHS, ['src/components/ModalBackupWords.js']);
    expect(classes(r)['src/components/ModalBackupWords.js']).toBe('mapped');
    expect(ids(r)).toEqual(['new-wallet-act:fresh']);
  });

  it('runs a whole area when its graph or its scenarios change', () => {
    const r = selectByChange(GRAPHS, ['qa/e2e/sentry/scenarios.mjs']);
    expect(classes(r)['qa/e2e/sentry/scenarios.mjs']).toBe('area');
    expect(ids(r)).toEqual(['consent-ui-act:fresh', 'main-crash-act:fresh', 'offline-queue-act:fresh']);
    const own = selectByChange(GRAPHS, ['qa/graph/onboarding.yaml']).scenarios;
    expect(own.length).toBe(3);
    expect(own.every((s) => s.area === 'onboarding')).toBe(true);
  });

  it('spreads one file to features of two graphs, analysing each graph alone', () => {
    const r = selectByChange(GRAPHS, ['src/screens/Welcome.js', 'public/sentryConsent.js']);
    const byArea = (area) => r.scenarios.filter((s) => s.area === area).map((s) => s.id).sort();
    expect(byArea('onboarding')).toEqual(['new-wallet-act:fresh', 'welcome-act:fresh']);
    expect(byArea('sentry')).toEqual(['consent-ui-act:fresh', 'main-crash-act:fresh', 'offline-queue-act:fresh']);
  });

  it('ignores out-of-scope features when mapping', () => {
    const r = selectByChange(GRAPHS, ['src/screens/Legacy.js']);
    expect(r.unmapped).toEqual(['src/screens/Legacy.js']);
  });

  it('unions the selection blocks of several graphs', () => {
    const extra = { ...sentry, graph: { ...sentry.graph, selection: { full: ['src/index.js'] } } };
    expect(selectByChange([onboarding, extra], ['src/index.js']).full).toBe(true);
    expect(selectByChange([onboarding, extra], ['docs/x.md']).files[0].class).toBe('ignored');
  });
});

describe('unmappedFiles', () => {
  it('lists src/ and public/ files no feature names and no pattern covers', () => {
    const tracked = [
      'src/screens/Welcome.js', 'src/components/Foo.js', 'src/utils/tokens.js', 'src/store/index.js',
      'src/a.test.js', 'public/electron.js', 'public/ledger.js', 'README.md', 'scripts/x.sh',
    ];
    expect(unmappedFiles(GRAPHS, tracked)).toEqual(['src/utils/tokens.js', 'public/ledger.js']);
  });

  it('agrees with selectByChange about a file only an out-of-scope feature names', () => {
    const file = 'src/screens/Legacy.js';
    expect(unmappedFiles(GRAPHS, [file])).toEqual([file]);
    expect(selectByChange(GRAPHS, [file]).unmapped).toEqual([file]);
  });
});

describe('the selection block', () => {
  it('validates a well-formed block', () => {
    const { errors, warnings } = validateGraph(onboarding.graph);
    expect(errors).toEqual([]);
    expect(warnings).toEqual([]);
  });

  it('rejects a non-list, an empty pattern and warns about unknown keys', () => {
    const { errors, warnings } = validateGraph(graphOf([{ id: 'a' }], { full: 'package.json', ignore: [''], only: [] }));
    expect(errors).toEqual(expect.arrayContaining([
      'selection: full must be a list of glob patterns',
      'selection: ignore[0] must be a non-empty string',
    ]));
    expect(warnings).toContain("selection: unknown key 'only'");
  });
});
