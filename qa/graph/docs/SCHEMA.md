# QA graph schema

Reference for `graph.yaml`. The validator (`qa-graph validate`) errors on the required fields below and on broken cross-references, and it warns about unknown keys, so a typo never silently drops a field. Ids are unique within a collection and within one version of the file. They don't need to stay stable across versions, because run files anchor to a commit (see [Run files](#run-files)).

## Contents

- [Required fields](#required-fields) · [Top level](#top-level)
- [environments](#environments) · [features](#features) · [flags](#flags) · [axes](#axes) · [setups](#setups) · [actions](#actions) · [constraints](#constraints) · [check](#check)
- [How scenarios are generated](#how-scenarios-are-generated)
- [How the run plan is ordered](#how-the-run-plan-is-ordered)
- [How impact spreads](#how-impact-spreads)
- [Modelling idioms](#modelling-idioms)
- [YAML traps](#yaml-traps)
- [Run files](#run-files)

## Required fields

| Where | Required (an ERROR if missing or invalid) |
|---|---|
| top level | `version: 1`, `costs`, and the lists `environments`, `features`, `flags`, `axes`, `setups`, `actions`, `constraints` (a list may be empty) |
| every list item | a unique `id` |
| feature | `status` |
| flag | `appliesAt` |
| axis | `kind`, a non-empty `values`, `switch.cost`, and `switch.fallback` (with its `cost`) when any transition is `impossible` |
| setup | `environment`, and a value for every setup axis |
| action | `feature` |
| outcome | `kind`, `at` (also a WARN when `source` is missing or `verified` isn't `true`/`false`) |
| constraint | `action`, `class`, and `outcome` when `class: rejected` |

Everything else is optional, but a field left out loses what it drives: no `files`, no `check` coverage; no `links`, no impact via code.

## Top level

`check` is the one optional top-level key ([check](#check)).

`costs` maps a cost key to a number. Every cost named elsewhere must be one of these keys. The standard scale:

```yaml
costs: { cheap: 1, medium: 5, expensive: 20, very-expensive: 60 }
```

Put the reading aids for testers in a header comment: where the graph's scope begins and ends, and the observation points ([METHOD.md step 3](METHOD.md#3-choose-observation-points)) that outcomes refer to by name.

## environments

`{ id, name, notes }`. Where a setup runs: a network, a device class, a build flavour, or a local harness. `notes` says what the place is for and how it differs from the others.

## features

`{ id, name, description, status, screens, files, flags, links, introduces, actions }`

- `status`: `in-scope` or `out-of-scope`. Out-of-scope features are inventory stubs. They keep `check` quiet and give the Impact view a complete list, with no actions of their own.
- `screens`: the route or screen names a tester sees. The Paths view and the screen inventory check use them.
- `files`: repo-relative source paths, or directories ending in `/`, that implement the feature. `check` uses them to tell which features a diff touched, so list the files whose change should trigger a re-test, not every import.
- `flags`: ids of flags that affect the feature.
- `links`: `{ to, reason }`, read as "this feature **depends on** `to`". When `to` changes, this feature is reached *via code*. Write a link only for a code dependency. When the relation is a value a tester picks (a token type, a wallet type, a facade), use `introduces` on the feature that brings the value instead, so impact narrows to the scenarios on that value.
- `introduces`: `axisId:valueId` pairs this feature brings in, such as `token:fee`.
- `actions`: ids of actions that exercise the feature in every scenario. A feature owns these and every action whose `feature` names it. A feature exercised only on some values of an action lists no action and introduces those values instead.

## flags

`{ id, name, constant, default, gates, combinesWith, appliesAt, status, axisValues? }`

- `name`: the remote flag name. `constant`: the constant in the code.
- `gates`: features the flag turns on or off.
- `combinesWith`: free text, usually a list, about interactions with other flags or settings.
- `appliesAt`: `live`, `next-start` or `next-pin` (the next unlock), meaning when a change of the flag takes effect.
- `axisValues` (optional): `axisId:valueId` pairs the flag controls, such as `facade:wallet-service`. Picking the flag in the Impact view spreads *via axis* to the scenarios on these values.

A repo with no feature flags has `flags: []`.

## axes

`{ id, name, kind, values, how, switch }`

- `kind`: `setup` or `action`. A **setup axis** is expensive to change, and its values combine into setups. An **action axis** is cheap to vary inside one setup, and the scenario generator sweeps it pairwise.
- `values`: a list of `{ id, name }`. When the value is something to type or run (a snippet, a command), make `name` the literal, so the tester copies it from the page.
- `how`: how a tester changes the axis. It's shown wherever a switch is needed.
- `switch.cost`: the default cost of changing the value.
- `switch.transitions`: a list of `{ from, to, cost?, impossible?, when? }`. A matching entry overrides the default cost, in that direction only. `impossible: true` means the transition can't be done at all. `when` is text for the tester (the condition under which this cost applies). The run plan doesn't evaluate it, so the entry always applies.
- `switch.fallback`: `{ cost, how }`, what to do when a needed transition is impossible, typically "start from a fresh install". It's required when any transition is impossible. The run plan never schedules an impossible transition; it uses the fallback.

## setups

`{ id, name, values, environment, runnable, notes? }`

- `values`: maps **every** setup axis to one of its values.
- `environment`: an environment id.
- `runnable: false`: the setup can't be reached today. It still gets scenarios, greyed out in the matrix, but the run plan never routes through it. Its groups come last, marked not runnable.

Enumerate setups by hand. Don't take the cross product of setup axes. Each setup is a state someone has to build, so list the ones worth building and say in `notes` why.

## actions

`{ id, name, feature, axes, setups, path }`

- `feature`: the feature the action exercises.
- `axes`: action axes it varies on. An empty list `[]` gives exactly one scenario per setup.
- `setups`: the setups it runs in.
- `path.steps`: a list of `{ id, screen, name }`, in order. `name` is the instruction the tester follows.
- `path.outcomes`: a list of `{ id, kind, at, message, source, verified, note? }`.
  - `kind`: `success` or `error`. `at`: the step id where the outcome shows.
  - `message`: the text the tester will see. Copy user-facing strings from the code verbatim. For observations that aren't UI text, describe the observable precisely ("SINK shows one session(status=exited)").
  - `source`: `path:line` of the code that produces it, relative to the git top level of the checkout holding the graph (or the graph's folder, outside git). `qa-graph sources` prints each line so you can check it, and exits 1 when a file or line is missing.
  - `verified`: `false` until a tester has seen it on a real build, then `true`. Always write it: `check` only notes outcomes that say `false`.
  - `note`: anything the tester needs, such as why the message may not show.

## constraints

`{ id, action, when, class, outcome?, note }`

`when` maps axis ids (setup or action) to a value id or a list of value ids. A combination matches when every listed axis has one of the listed values. `class` is one of:

- `invalid`: the combination can't be constructed. It's excluded and produces no scenario.
- `rejected`: it can be constructed and the app refuses it. `outcome` is required and must be an `error` outcome of the action.
- `edge`: valid but risky. If it names an `outcome` (any kind), that outcome replaces the success outcomes as the scenario's expectation. Without one, the scenario keeps expecting the success outcomes and is only highlighted.
- `lib-risk`: valid, but it relies on behaviour in a dependency (a library, an SDK, the platform). It's highlighted, and it doesn't change the expectation.

An empty or missing `when` matches every combination, so an `invalid` one removes the whole action. `validate` warns about it.

`validate` warns when a constraint matches no combination the action can reach. That usually means the action's `setups` exclude it, so either widen the setups or delete the constraint. This check runs only once the graph has no ERROR, so validate again after fixing errors.

## check

Optional. Tells `qa-graph check` where to find the names the graph should mirror:

```yaml
check:
  base: origin/master            # what `check` diffs against; --base overrides it
  inventories:
    - kind: flag                 # compared both ways with flags[].name
      files: [src/constants.js]
      pattern: "export\\s+const\\s+\\w+\\s*=\\s*(['\"])(?<name>[^'\"]+\\.rollout)\\1"
    - kind: screen               # code → graph only, against features[].screens
      files: [src/App.js, src/screens/NetworkSettings/NetworkSettingsFlowStack.js]
      pattern: "(?:Stack|Tab)\\.Screen\\b[^>]*?\\bname\\s*=\\s*(['\"])(?<name>[^'\"]+)\\1"
```

`pattern` is a JavaScript regex. The name comes from the named group `name`, else the first group, else the whole match. Configure a `screen` inventory only for an inventory graph ([METHOD.md](METHOD.md#building-a-qa-graph) branches). On a scoped graph, it flags every screen outside the scope. Without `check`, the command still compares the diff with each feature's `files` and with every unverified outcome's `source`.

`check` diffs `<base>...HEAD`, so it sees committed changes only. Commit the code and the graph before reading its result. Its warnings never change the exit code; only schema errors exit 1.

## How scenarios are generated

A **scenario** is one (action, setup, action-axis values) combination. Its id is `<action>:<setup>:<values>`, with the action's axis values joined by `.` in the order of `axes`. With no action axes, the id is `<action>:<setup>`.

For each action and each of its setups:

1. Enumerate the cross product of the action's axes over the setup's values.
2. Drop every combination an `invalid` constraint matches.
3. Keep the first combination that each non-invalid constraint matches. Every rejected, edge and lib-risk case gets a scenario.
4. Add combinations greedily until every single value and every pair of values (across the action axes) appears in some non-rejected scenario. This is **pairwise** coverage.

The `expected` field: the outcomes named by matched `rejected` constraints at the earliest step among them (a rejection stops the path), plus `edge` outcomes at earlier steps. If neither matches, it's all of the action's `success` outcomes.

## How the run plan is ordered

Scenarios are grouped by setup. Runnable groups are chained greedily: from the current setup, go to the one with the cheapest switch, where the switch cost is the sum of per-axis transition costs and impossible switches use the axis fallback. Inside a group, scenarios are ordered nearest-neighbour by action-axis switch cost, keeping enumeration order unless that's more expensive. Not-runnable groups come last.

## How impact spreads

A **pick** is an in-scope feature, a flag, or an axis value. The Impact view precomputes every pick. A pick reaches features three ways:

- **via code**: the picked feature, and every feature whose `links` point at it.
- **via flag**: a picked flag reaches every feature it `gates`. A picked feature's flags only tag features already reached.
- **via axis**: an axis value reaches every action that has a scenario on it. The values are the picked one, those the picked feature introduces, those a picked flag lists in `axisValues`, and those introduced by any feature reached via code or flag.

A feature reached via code or flag re-runs every scenario of the actions it owns, plus the scenarios on the values it introduces. A feature reached only via axis re-runs only the scenarios on those values.

## Modelling idioms

These come from building real graphs. Each one fixes a defect the validator can't see.

- **Success outcomes must all hold at once.** With no edge or rejection matching, a scenario expects *every* success outcome of its action. When the right result depends on the setup (opted in versus opted out, online versus offline), write one conditional success outcome ("Opted in: one event. Opted out: nothing."), or add `edge` constraints naming the outcome per setup value. Two contradictory success outcomes make every scenario wrong.
- **Prune what doesn't matter, don't let it multiply.** If an axis only matters in some setups, move it to its own action restricted to those setups. For example, "quit methods" only differ for opted-in users, so it became its own action with two setups instead of an axis on a nine-setup action. An axis on a many-setup action multiplies scenarios on every setup.
- **`invalid` is for combinations that can't exist.** Use it when a screen is unreachable in a setup, or a value only exists before onboarding. For combinations that are possible but not worth running, narrow `setups` or split the action.
- **Use `edge` + `outcome` to state a known gap.** A behaviour you found by reading the code (a dropped report, a stale value) becomes an error outcome plus an `edge` constraint. The scenario then expects the gap, and a tester who sees it records "as expected", not a new bug. Reserve `lib-risk` for "this depends on code we don't own"; it adds no expectation.
- **Upgrades are a setup axis.** "Fresh install" versus "upgraded from the previous release" versus "seeded legacy data" changes state that's expensive to rebuild. These are setup values, with the transitions between them declared, including the impossible ones.
- **Mark guesses.** Any value you couldn't verify (a cost, an `appliesAt`, a command that only runs on another OS) gets a trailing `# QA: confirm` comment.

## YAML traps

- In flow mappings (`{ id: x, name: ... }`), an unquoted value containing `,` splits into extra keys. A `"` or `: ` in it breaks parsing. Quote such values with single quotes, and double any inner single quote (`'it''s'`). The validator's `unknown key '...'` warnings are the symptom.
- Regex patterns in `check` are YAML strings first: write `\\s` inside double quotes, or use single quotes and write `\s`.

## Run files

Results never go in the graph. One file per run, in `runs/` next to the graph, starting from this template:

```yaml
# This test was run based on the YAML of <date>, version from commit <hash>, with the tools at commit <toolsCommit>.
yamlCommit: <hash>
yamlDate: <date>
toolsCommit: <hash>      # the rendered page's label shows it
appBuild: <version or build id>
device: <device or machine>
environment: <environment id>
scope:
  reason: <why this run covers these picks>
  picks: []              # features, flags, axis values, or tiers picked
results:
  - scenario: <scenario id as of yamlCommit>
    status: passed       # passed | failed | skipped
    notes: ''
```

Run only against a committed graph. Scenario ids mean what they meant at `yamlCommit`.
