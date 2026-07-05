# hathor-wallet E2E (Playwright + Electron) — conventions

Read this before writing or changing a test. Adapted from the rpc-lib web-wallet
E2E (PR #169); the MetaMask "driver" is replaced by an Electron app driver.

## Four layers (each has exactly one job)
| Layer | File | Job | Knows Electron? |
|-------|------|-----|-----------------|
| Page object | `helpers/walletApp.ts` | Wallet-UI verbs on the renderer Page. | No |
| App driver | `driver/electronApp.ts` | Launch Electron (fresh `--user-data-dir`), firstWindow, close. | Yes |
| Provisioning | `helpers/journeys.ts` | Reach the loaded dashboard (onboard/import); the `switchToTestnet` verb. | Indirectly |
| Spec | `*.spec.ts` | The scenario: explicit assertions + explicit in-app decisions. | No |

## Rules
1. **Decisions (e.g. the network switch) are explicit steps in the spec**, never hidden in provisioning.
2. **The spec chooses which assertions to invoke.** Assertion *verbs* live on the page object (`expect…()` methods); the spec composes them so each scenario states its checks explicitly. Helpers never hide a decision (approve/switch) — those stay in the spec.
3. **One wallet ⟺ one Playwright project** — a project = a worker = a fresh `--user-data-dir` = a brand-new wallet.
4. **A dependent, ordered chain = one `test.describe.serial` file.** Never split a dependent chain across files.
5. **Use real Unleash — never `SKIP_FEATURE_TOGGLE`.**
6. **Assert only what the UI actually renders. Verify against the real component first.**
7. **Timeouts are centralized and env-tunable** (`driver/timeouts.ts`, `E2E_TIMEOUT_SCALE`).

## Selectors
Prefer `getByRole` / `getByText` + existing ids/placeholders. All fragile DOM is isolated in
`helpers/selectors.ts`. The only `data-testid` added to product source is
`wallet-balance-total` (the dashboard Total; label/value are split text nodes with a duplicate
mobile instance). Add more testids only when the DOM is genuinely untestable, and route them
through `selectors.ts`.

## Network
The wallet boots on the forced first-run **mainnet** connect-default. Onboarding asserts `0.00`
there; the **import** journey switches to **testnet** as an explicit spec verb (funds live on
testnet). Don't provision a switch you don't need. The testnet switch is confirmed via the
Settings screen ("Connected to Testnet") after the wallet restarts and re-syncs.

## Isolation & reset
Fresh Electron `--user-data-dir` per worker (removed on teardown). Alternatives (not used):
`localStorage.clear()` + reload; the `app:clear_storage` IPC (needs `--unsafe-mode --hathor-debug`).

## Targets
The same specs run against two targets, selected by `E2E_TARGET`:

- **`dev` (default)** — Playwright's `webServer` boots the CRA dev server and Electron loads it
  via `ELECTRON_START_URL`. **No LavaMoat** (LavaMoat breaks dev hot-reload, so `config-overrides.js`
  only adds it in the production build).
- **`build`** — `E2E_TARGET=build` runs a Playwright `globalSetup` (`support/build.ts`) that does
  `npm run build`, producing `build/index.html` with **LavaMoat applied** (SES lockdown). Electron
  is launched with **no** `ELECTRON_START_URL`, so `public/electron.js` loads `build/index.html` via
  `file://`. No dev server is started in this mode. Set `E2E_SKIP_BUILD=1` to reuse an existing
  `build/` and skip the (slow) rebuild.

Run the LavaMoat'd production target with `npm run e2e:release` (or `npm run e2e:release:headed`).
`npm run build` regenerates `lavamoat/webpack/policy.json` as a side effect — that file is not
part of the harness and should not be committed from an E2E run.

## Running
`npm run e2e` (all) · `npm run e2e -- --project=onboarding` · `npm run e2e:headed` · `npm run e2e:ui`.
LavaMoat production build: `npm run e2e:release` · `E2E_SKIP_BUILD=1 npm run e2e:release -- --project=import`.
Set `E2E_IMPORT_SEED` in `.env.e2e` (gitignored) to run the import journey; otherwise it skips.
If port 3000 is taken by another dev server, override just the port:
`E2E_DEV_SERVER_PORT=3007 npm run e2e` — `ELECTRON_START_URL` auto-derives from it
(so the app and dev server can't drift). Set `ELECTRON_START_URL` explicitly only to
override that (e.g. point Electron at a remote/prebuilt bundle).
