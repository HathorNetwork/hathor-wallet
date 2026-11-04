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

## Sentry runbook (manual, macOS)

`sentry.yaml` tests what the Electron 42, context isolation and consent work changed in Sentry reporting. `qa/e2e/sentry/` automates 75 of its 127 scenarios on Linux. 14 of those are the `io-in` setup, with its sentry.io requests redirected to the local sink, so they don't prove sentry.io accepts them: that check stays manual. This runbook is for the rest, which need a packaged macOS app, the Dock, an older release or a loaded wallet, and for checking any of them by hand. `node qa/e2e/run.mjs --graph sentry --list` says which scenarios are manual and why.

Lines marked `# QA: confirm` in the YAML are guesses that couldn't be checked from Linux. Fix them as you go.

### What changed, in one picture

There are now three copies of the user's choice, and most of this tree tests whether they stay in step:

| Copy | Where | Written by | Gates |
|---|---|---|---|
| `wallet:sentry` | renderer `localStorage` | Settings / Welcome / crash modal | the UI ("Yes"/"No", the modal button) |
| preload client `enabled` | preload's `@sentry/electron` | `syncSentryConsent` on load, `sentrySetEnabled` on change | page errors forwarded over the bridge, preload errors |
| `sentry-consent.json` | `~/Library/Application Support/Hathor Wallet/` | main, on `sentry:consent` IPC and on `app:clear_storage_success` | **everything main sends**: sessions, minidumps, main exceptions, offline-queue retries, including the *previous* run's crash dumps at start |

### One-time setup on the Mac

```sh
git fetch origin && git checkout <the branch under test>
nvm use 22 && npm ci
npm run build-css && npm run build  # production (LavaMoat) bundle in build/
```

Packaged `.app` for the `pkg-*` and `io-in` setups. Signing and notarization are switched off, so electron-builder ad-hoc signs:

```sh
CSC_IDENTITY_AUTO_DISCOVERY=false npx electron-builder --mac dir \
  -c.extraMetadata.main=build/electron.js -c.mac.notarize=false -c.mac.provisioningProfile=null
# -> dist/mac-arm64/Hathor Wallet.app (or dist/mac/ on Intel)   # QA: confirm
```

### The four windows of a run

1. **SINK.** Run `node qa/e2e/sentry/manual-sink.mjs`. Before each scenario, type `m <scenario id>` + Enter so the log shows where it starts.
2. **App**, launched from a Terminal so `SENTRY_DSN` reaches main and the preload:
   ```sh
   # unpacked
   SENTRY_DSN=http://qa@127.0.0.1:9876/1 npx electron --inspect=5858 . --unsafe-mode --hathor-debug
   # packaged
   SENTRY_DSN=http://qa@127.0.0.1:9876/1 "dist/mac-arm64/Hathor Wallet.app/Contents/MacOS/Hathor Wallet" --inspect=5858 --unsafe-mode --hathor-debug
   ```
   `--unsafe-mode --hathor-debug` adds the **Debug** menu (Open DevTools, Cmd+B; Reset all data). For `io-in`, leave `SENTRY_DSN` out.
3. **CONSENT.** Run `while :; do clear; date; cat ~/Library/Application\ Support/Hathor\ Wallet/sentry-consent.json 2>&1; sleep 1; done`. Check the folder name once with `ls ~/Library/Application\ Support | grep -i hathor`.
4. **PAGE and MAIN.** PAGE is Debug > Open DevTools; type snippets in the default `top` context. MAIN is Chrome > `chrome://inspect` > Configure > `localhost:5858` > inspect.

Moving userData away gives a `fresh` setup: quit, then `mv ~/Library/Application\ Support/Hathor\ Wallet{,.bak-$(date +%s)}`. Move it back afterwards if that's your real wallet.

### Suggested order

The run plan in `dist/sentry.html` (`node qa/graph/tools/cli.js render`) orders the setups by switching cost: `fresh-none` → `fresh-in` → `fresh-out` → `legacy-in` → `upgrade-*` → `pkg-*` → `io-in`. If time is short, run **tier 1** first. It covers the guarantees the consent work exists for; on Linux, `npm run test:e2e:tier1` runs it, with the `pkg-*` scenarios as their `fresh-*` twins:

| Tier 1 scenario | Why |
|---|---|
| `launch-quit:fresh-none`, `launch-quit:fresh-out`, `launch-quit:fresh-in` | opted out sends nothing at quit (the bug HathorNetwork/hathor-wallet#903 fixed); opted in still sends |
| `onboarding-get-started:fresh-none` | "Get started" lands on No, and nothing is sent |
| `toggle-consent:fresh-in:in-to-out`, `toggle-consent:fresh-out:out-to-in` | live flip + survives relaunch, for all three copies |
| `page-error:fresh-in:throw`, `page-error:fresh-out:throw` | page errors cross the isolation boundary only with consent |
| `crash-modal-report:fresh-out:once` | the grant → capture → revoke report actually arrives (it didn't, in the first version of HathorNetwork/hathor-wallet#903) |
| `main-crash:pkg-out:*`, `main-crash:pkg-in:*` | minidumps: sent with consent, deleted without, including at the next start |
| `bridge-probe:fresh-out:send-consent-channel` | the page can't forge consent |
| `launch-quit:io-in`, `page-error:io-in:throw` | real sentry.io receives events through the Brotli guard on Electron 42 (by hand: `npm run test:e2e:tier1` runs them against the sink) |

Then tier 2: offline queue, resets, startup-step failures, upgrade and legacy setups, quit methods, smoke noise.

### Findings to expect

These come from reading the code. They're in the tree as `edge` constraints, so they show up as expected outcomes, not failures:

- **Upgrade, first launch.** Main has no consent file until the window loads, so a main crash in that window is dropped (`c-upgrade-first-crash`). HathorNetwork/hathor-wallet#903 accepts this.
- **First startup step failure is reported late.** If `clearLegacyHardwareData` throws, the failure is logged at once but reported after every step has run, so it still reaches Sentry when opted in (`c-step-legacy`).
- **Reset wallet keeps consent.** `wallet:sentry` isn't in `storageKeys`, so main keeps reporting after a wallet reset, and "Get started" keeps a choice already made (`c-reset-wallet`).
- **An unchanged value is never written.** Users who never opted in have no `sentry-consent.json`, which is fine, since a missing file means no consent. A user who revoked has `{"enabled":false}`.
- **wallet-lib rejections.** `smoke-noise:*:network-drop` counts what a Wi-Fi drop forwards as `unhandledrejection`. HathorNetwork/hathor-wallet#899 left open whether to filter these, and this count is the input to that decision.
