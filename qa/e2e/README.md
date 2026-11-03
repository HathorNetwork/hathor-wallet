# Desktop e2e suites

Each directory here automates one QA graph, `qa/graph/<area>.yaml`, against the production build under Electron. The app is driven over the Chrome DevTools Protocol, a main-process shim adds probes and stubs, and Sentry traffic goes to a local sink and never to sentry.io. The app code isn't changed beyond `data-testid` attributes.

Linux only: it needs an X display (`E2E_DISPLAY`, else `DISPLAY`, else `:0`, with `~/.Xauthority`). CI runs it under `xvfb-run`.

```sh
npm run test:e2e            # every automated scenario (rebuilds build/ when stale)
npm run test:e2e:tier1      # the smoke floor
npm run test:e2e:changed    # what the current branch's diff reaches, against origin/master
node qa/e2e/run.mjs --list  # every graph scenario: auto, or manual and why
```

Options of `node qa/e2e/run.mjs`:

| Option | Does |
|---|---|
| `--graph onboarding,sentry` | only these areas; an unknown one is an error |
| `--only <prefixes>` | only scenario ids starting with these, comma-separated |
| `--tier1` | only each area's `TIER1` |
| `--changed [<base>]` | only what the diff since the merge base with `<base>` (default `origin/master`) reaches; outside CI, uncommitted files count too |
| `--dry-run` | print the selection and stop |
| `--strict` | with `--changed`, fail when the diff has a file under `src/` or `public/` that no graph maps |
| `--floor` | with `--changed`, run tier 1 when the selection has nothing automated |
| `--mode dsn\|redirect` | force how Sentry traffic reaches the sink |
| `--keep`, `--verbose`, `--skip-build` | keep the logs (always kept on failure), print the run log, refuse to rebuild |

An unknown option is an error, and so are options that together select no scenario. A `--changed` diff that reaches nothing exits 0.

Ports: CDP 9334, sink 9877, control 9878 (`E2E_CDP_PORT`, `E2E_SINK_PORT`, `E2E_CONTROL_PORT`).

## Change-based runs

`--changed` classifies every changed file with the graphs' `files:` and `selection` (see "How a change selects scenarios" in `qa/graph/docs/SCHEMA.md`), spreads each touched feature through the graph's links, and prints why each scenario was picked before running it. A diff that only touches `src/screens/Welcome.js` runs the Welcome and consent scenarios and what depends on them, not the main-process crash or offline-queue ones. A file under `src/` or `public/` that no graph maps adds tier 1 and is listed under "unmapped"; `--strict` turns that into a failure. Manual scenarios the change touches are printed as a checklist.

## Selectors

Scenarios find what they click, type into or read by `data-testid`, and check what the user should see by its text. A test id doesn't move with the layout, the copy or the language; the outcomes' messages are what a scenario verifies, so they stay text. The convention is hathor-wallet-mobile's:

- Ids are kebab-case, `<screen or component>-<element>`: `welcome-get-started`, `software-warning-continue`.
- Repeated elements end in a stable key, never in translated text or user data: `backup-words-word-12` and `backup-word-option-3` are positions, not words. Build them from the key: `` data-testid={`backup-word-option-${index}`} ``.
- A shared component takes a `testId` prop and derives its elements' ids from it: `PinPasswordWrapper` with `testId="choose-pin"` gives `choose-pin-input`, `choose-pin-confirm`, `choose-pin-next`. A component shown once sets its own.
- Add an id only to an element a scenario uses, in the commit that first needs it.
- Scenarios use the driver's helpers, never raw selectors: `byTestId`, `clickTestId`, `typeTestId`, `checkTestId`, `textOfTestId`, `formValid`. Copy is checked only through `expectText` / `expectNoText`, so a review sees which checks depend on it.

## Pieces

| File | Role |
|---|---|
| `lib/cdp.mjs` | CDP client over the wallet's own `ws`: evaluation, renderer console and exceptions, the test-id and text helpers. |
| `lib/shim.cjs` | Main-process shim, loaded with `NODE_OPTIONS=--require`. Redirects or cancels every request to `sentry.io`, stubs requests on demand (`ctx.stub('thin_wallet/address_history', 500)`), records `shell.openExternal`, and serves a localhost control endpoint for what a tester does in the main-process inspector: crash the renderer or main, throw in main, send IPC, reset all data, click menu or systray items, exit, read the consent file. |
| `lib/sink.mjs` | Local stand-in for sentry.io. Parses envelopes into items (event, session, minidump attachment, client_report); `offline()`/`online()` simulate the network going away. |
| `lib/harness.mjs` | Launcher and the `ctx` each scenario gets: `launch`, `quit('quit' / 'gone')`, `relaunch`, `page(js)`, `control(action)`, `stub`, `consent()`/`waitConsent`, `getStarted`, `setConsentUI`, `waitModal`, `expectNone`. Each setup's profile is built once per run and copied per scenario, so scenarios share no state. |
| `lib/build.mjs` | Rebuilds `build/` when it is older than `src/` or `public/`, and downloads the Electron binary, which `npm ci` doesn't install. |
| `run.mjs` | Loads every area, checks each scenario id still exists in its graph, selects, runs and reports. |
| `<area>/scenarios.mjs` | `SCENARIOS` (one function per graph scenario id), `SETUPS` (how to build each setup's profile), `TIER1` (id prefixes; one that matches nothing is an error), `MANUAL` (`[id fragment, reason]` for what stays manual), optionally `modeOf(id)` and `FAIL_ON_EXCEPTIONS`. |

Every scenario also fails, once the app has quit, when a `client_report` envelope or an envelope the sink can't parse arrives, or when a request to `sentry.io` is attempted in `dsn` mode. An area that exports `FAIL_ON_EXCEPTIONS` also fails on any uncaught renderer exception; Sentry's scenarios throw on purpose, so it doesn't.

## Adding a scenario

Name it with its graph id. Build the expectation from the scenario's outcomes in the graph, and assert at the observation point the graph names (the page for PAGE, the sink for SINK, `ctx.consent()` for CONSENT). If a graph id changes, `run.mjs` refuses to start until the key is renamed. A new area is a new `qa/graph/<area>.yaml` plus `qa/e2e/<area>/scenarios.mjs`; the runner finds it.
