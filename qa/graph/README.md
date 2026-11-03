# QA feature graphs

Each `<area>.yaml` here is a QA graph of one area of the desktop wallet: its features, the setups worth testing, the actions a tester takes, and the outcomes to expect. The tools turn a graph into pairwise scenarios, a run plan ordered by switch cost, change impact, and an offline HTML page. The e2e suites in `qa/e2e/<area>/` automate a graph's scenarios by id.

| Graph | Area | Automated |
|---|---|---|
| `onboarding.yaml` | Welcome, wallet type, new wallet, words backup, password and PIN, first load | `qa/e2e/onboarding/` |
| `sentry.yaml` | Sentry consent, the preload and main clients, page errors, crash reports | `qa/e2e/sentry/` |

## Tools

`tools/` is a vendored copy of the qa-graph kit, the same tools hathor-wallet-mobile keeps in `QA/graph/tools/`, plus change-based selection (`tools/select.js`). Run them from the repository root:

```sh
node qa/graph/tools/cli.js validate                      # every graph here; --graph <file> for one
node qa/graph/tools/cli.js check [--base origin/master]  # freshness, then src/ and public/ files no graph maps
node qa/graph/tools/cli.js scenarios --graph qa/graph/onboarding.yaml
node qa/graph/tools/cli.js sources --graph qa/graph/sentry.yaml   # the code line behind every outcome
node qa/graph/tools/cli.js render                        # qa/graph/dist/<area>.html, offline
node --test 'qa/graph/tools/test/*.test.js'
```

`validate`, `render`, `scenarios` and `check` exit 1 on schema errors; `sources` exits 1 on a missing file or line. `check`'s warnings and its unmapped-file list never change the exit code. `dist/` is generated and ignored by git.

## Docs

| Doc | Read it to |
|---|---|
| [docs/METHOD.md](docs/METHOD.md) | build a graph for an area or a change, step by step |
| [docs/SCHEMA.md](docs/SCHEMA.md) | look up a field; how scenarios, run plans, impact and change selection are computed; run files |
| [docs/VISUALIZATION.md](docs/VISUALIZATION.md) | understand the HTML page and check a rendered one |
| [../e2e/README.md](../e2e/README.md) | run or extend the automated suites |

## Keeping the mapping honest

The e2e runner picks scenarios from a diff through each feature's `files:` and the `selection` block in `onboarding.yaml` (it applies to every graph). When you add a screen or a module, add it to a feature's `files:`, or to `selection.full` / `selection.ignore`. `check` without `--graph` lists every file under `src/` and `public/` that nothing maps; a pull request that changes one runs tier 1, and with `--strict` it fails.

## Manual runs

Scenarios that need a person (a packaged macOS app, the Dock, an installed older release, a wallet with funds) stay manual. `node qa/e2e/run.mjs --list` says which, and why. Record a manual run in `runs/`, starting from `runs/TEMPLATE.yaml`. Run only against a committed graph: scenario ids mean what they meant at `yamlCommit`.
