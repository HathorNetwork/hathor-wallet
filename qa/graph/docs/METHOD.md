# Building a QA graph

How to model a repository, a feature area, or a change as a QA graph that a person can run by hand and that later becomes automated end-to-end tests. Field-by-field rules are in [SCHEMA.md](SCHEMA.md). Rendering is in [VISUALIZATION.md](VISUALIZATION.md). Turning the graph into automated tests is in [E2E.md](E2E.md).

Commands below write `qa-graph` for `node qa/graph/tools/cli.js`, run from the repository root (`alias qa-graph="node qa/graph/tools/cli.js"`).

Pick the branch first:

- **Scoped graph**: one change or one area (a PR stack, "Sentry", "payments"). Smaller, faster, and the usual starting point for a repo with no tests. Follow every step.
- **Inventory graph**: the whole app, with every feature and every flag listed, and the areas not yet modelled marked `out-of-scope` (stubs with no actions). Follow every step. The surface in step 2 is the app's route table and flag constants. Add a `check` block with a `flag` and a `screen` inventory ([SCHEMA.md#check](SCHEMA.md#check)).
- **Updating an existing graph** for a PR:
  1. Map each hunk of the diff onto the graph: flags, screens, files, messages, steps, axis values, constraints.
  2. Fix the local gaps.
  3. Commit the code and the graph, then run `qa-graph check --graph <file>`. `check` only sees committed changes, and its warnings never fail the exit code, so read them.

  hathor-wallet-mobile's `.agents/skills/qa-graph-check/SKILL.md` is the worked procedure. Done when `check` prints no WARN, or each WARN left is named in the PR body as a follow-up.

## Steps

### 1. Fix the scope

Read what's under test: the PR bodies (intent, evidence, stated risks, "not covered" notes), `git diff --stat <base>...<top>`, and the repo's existing QA docs. For a stack of PRs, test the top branch and read every layer's body.

Done when you can name, in one sentence each, what the scope is for and what it leaves out, and every source file in scope is on a list. That means every changed file for a change, or every route and flag constant for an inventory graph.

### 2. Map the surface

Find every code path that reads or writes the state the scope is about. Grep for its storage keys, IPC channels, exported functions and UI strings, then follow the callers until you reach a user action, a startup step, a reset, a migration, or a crash path. Look hardest for **state copies**: the same truth held in more than one place (local storage, a process-side file, an in-memory client flag, a server). Most real bugs live where copies drift, so each copy becomes a row in the run guide's table and a source of scenarios.

Done when every file from step 1 is either mapped to a code path or marked "no QA impact" (tests, styling, logs), and every state copy is named with its writer, its reader and what it gates.

### 3. Choose observation points

An **observation point** is where a tester sees an effect without reading code: UI text, a file to watch, a log line, a devtools console, a network sink. When an effect has none, build one. A local stand-in server that prints one line per received request turns "did it send?" into a yes/no answer. Name each point in capitals in the graph's header comment (`SINK`, `CONSENT`, `PAGE`) and refer to it by name in outcomes.

Done when every outcome you expect to write can be checked at a named observation point.

### 4. Write features and flags

One feature per user-facing capability, or per internal mechanism a tester can provoke (a consent store, an error forwarder, a crash reporter). Give each its `files`, `links` (what it depends on, with the reason) and `introduces`.

Then one flag per remote feature flag the scope reads, with `gates` naming exactly the features that list it in their `flags`. The validator warns when the two sides disagree. A repo without feature flags writes `flags: []`.

Done when every code path from step 2 belongs to exactly one feature, and `validate` shows no flag/feature mismatch.

### 5. Write axes

Each branch the code takes becomes an axis value, a constraint, or a stated exclusion. Sort axes by switching cost:

- **Setup axes**, expensive: build flavour (dev, packaged, store), environment or backend, install provenance (fresh, upgraded from the last release, seeded legacy data), persisted state at launch (settings, consent, wallet type).
- **Action axes**, cheap: the variants of one action (error kinds, quit methods, input classes, token types).

Write each axis's `values`, `how` and `switch` as [SCHEMA.md#axes](SCHEMA.md#axes) describes, using the standard `costs` scale ([SCHEMA.md#top-level](SCHEMA.md#top-level)).

Done when every branch found in step 2 maps to an axis value or a constraint, or is named as out of scope in a feature's description.

### 6. Write environments and setups

List the places setups run (`environments`). Then list the setups worth building ([SCHEMA.md#setups](SCHEMA.md#setups)), each pointing at an environment. Mark unreachable ones `runnable: false`, and mark guesses `# QA: confirm`.

Done when each setup has a reason to exist that no other setup covers.

### 7. Write actions

One action per thing a tester does that has a happy path and failure exits. Give each one:

- `steps` a tester can follow without context.
- `outcomes`: user-facing text copied verbatim from the code, observations phrased against observation points, and a `source: path:line` and `verified: false` on each one.
- a `setups` list that covers the setups where the result differs, not every setup.

Then run `qa-graph sources --graph <file>` and read every printed line against its outcome. Line numbers drift while you write, so fix every mismatch.

Done when `sources` exits 0 and each printed line is the code that produces its outcome.

### 8. Write constraints

- `invalid` for combinations that can't exist.
- `rejected` (with its error outcome) for combinations the app refuses.
- `edge` with an outcome for every gap or oddity you found while reading the code. The scenario then expects it ([SCHEMA.md#constraints](SCHEMA.md#constraints)), and the run guide lists it under "findings to expect".
- `lib-risk` where correctness rests on a dependency, such as an old SDK on a new runtime.

Done when every gap found in steps 2–7 is an `edge` with an outcome.

### 9. Validate and size

```sh
qa-graph validate  --graph <file>   # fix every ERROR, then run again: dead-constraint warnings only appear once errors are gone
qa-graph scenarios --graph <file>   # scenario counts per action x setup, then every id
```

For a manual run, apply the [modelling idioms](SCHEMA.md#modelling-idioms) until the count is something a person can run, typically about 100–150 scenarios of under a minute each.

Done when `validate` prints nothing, and every success outcome of each action holds in every one of its setups (or is written as one conditional outcome).

### 10. Render and check the page

`qa-graph render --graph <file>`, then follow [Checking a rendered page](VISUALIZATION.md#checking-a-rendered-page).

Done when all four views draw, the chip count equals the scenario count, and the console shows no page error.

### 11. Write the run guide

Write a `README.md` next to the graph, for the human running it. It covers:

- a one-time setup;
- how to launch with each observation point open;
- the state-copies table;
- a **tier 1** list of scenario ids covering the guarantees the scope exists for;
- the findings to expect.

Also add `runs/TEMPLATE.yaml` from [Run files](SCHEMA.md#run-files). Check every tier-1 id against `qa-graph scenarios --graph <file> | grep '^id '`.

Done when every tier-1 id is printed by that command, and someone with the repo and the README, and no access to you, can run tier 1.

## Where the files go

Put the graph next to the repo's QA material, in its own folder (`qa/<area>/` or `QA/graph/`). Check for a sibling folder whose name differs only in case: macOS file systems are case-insensitive, so `QA/` and `qa/` collide. The rendered `dist/` is a build output, so keep it out of commits. Commit, push or open a PR only when the task asks for it.
