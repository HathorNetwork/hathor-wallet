# Ledger end-to-end tests (Speculos)

Runs the production build of the wallet against an emulated Ledger Nano S Plus ([Speculos](https://github.com/LedgerHQ/speculos)) running the real [Hathor Ledger app](https://github.com/HathorNetwork/hathor-ledger-app), then drives both sides: the app over the Chrome DevTools Protocol, the device over the Speculos REST API. No app code is changed.

## Prerequisites

- Linux with an X display (`DISPLAY`, defaults to `:0`). Electron runs with `--no-sandbox`.
- Docker, with the two Ledger images (pulled on first use):
  - `ghcr.io/ledgerhq/ledger-app-builder/ledger-app-builder:latest` (about 3.7 GB, builds the ELF)
  - `ghcr.io/ledgerhq/speculos:latest` (about 1.4 GB, the emulator)
- Node 22+ and the wallet's `node_modules` (the harness uses `ws`, `@hathor/wallet-lib` and `@ledgerhq/hw-transport` from it; it adds no dependency).
- Network access to the mainnet full node: the wallet runs on mainnet and the harness reads the test token's name and symbol from it.
- Free local ports: 5000 (Speculos API), 9999 (APDU), 9333 (CDP), 9876 (Sentry sink). Override with `SPECULOS_API_PORT`, `SPECULOS_APDU_PORT`, `LEDGER_E2E_CDP_PORT`, `LEDGER_E2E_SENTRY_PORT`.

## Run

```sh
npm run test:ledger-e2e
# or, against another checkout that has node_modules:
node tests/ledger-e2e/run.mjs --app-dir ../other-wallet-checkout --label other
```

One run takes about 40 s once the images, the ELF and `build/` exist. It:

1. Rebuilds the renderer (`npm run build-css && npm run build`) if `build/` is missing or older than `src/` or `public/` (`--skip-build` to refuse instead).
2. Builds the Ledger app ELF with `build-app.sh`, or reuses the one cached in `~/.cache/hathor-ledger-e2e/` for the app's current commit.
3. Starts a local Sentry sink and points `SENTRY_DSN` at it. The flows opt out of bug reports on first run, and the run fails if the sink receives anything. Only main and preload read `SENTRY_DSN` at run time: a checkout whose renderer inits Sentry itself (such as `master`, through `--app-dir`) keeps the DSN baked into its build, which is why the run opts out.
4. Starts Speculos with `speculos.sh` and a fixed public test seed (Speculos's default mnemonic; its first mainnet address is `HJYAnivCTdRtxcgeJW8pKk1y7przypne3C`).
5. Launches Electron on a throwaway `XDG_CONFIG_HOME` with the transport shim, runs the flows, prints a PASS/FAIL table and cleans up: app, container, sink and temp dir. Logs (`electron.log`, `ipc.jsonl`, `speculos.log`, `results.json`) are kept in `/tmp/hathor-ledger-e2e-*` only when something fails, or with `--keep`.

Other options: `--flows hw-start,show-address` runs a subset (flows depend on earlier ones, see below).

## How it works

- **Transport swap.** `lib/main-shim.js` is loaded into the Electron main process with `NODE_OPTIONS=--require`. It hooks `Module._load` so `require('@ledgerhq/hw-transport-node-hid')` in `public/ledger.js` returns `SpeculosTransport` (`lib/speculos-transport.js`). That class extends the same `@ledgerhq/hw-transport` copy node-hid uses, so `send()`, `decorateAppAPIMethods()` and `TransportStatusError` behave as in production. Only `exchange()` is new: it speaks Speculos's APDU TCP framing (4-byte big-endian length + APDU; the reply is a 4-byte length N, N bytes of data and the 2-byte status word). `listen()` polls the Speculos API and emits `add`/`remove` like USB hot-plug; `transport.device.close()` closes the socket.
- **IPC record.** The shim also wraps `ipcMain.on` and `webContents.send` for `ledger:*` channels and writes each message, with the runtime type of every payload field (`Buffer`, `Uint8Array`, object, ...), to `ipc.jsonl`. Flows assert on it.
- **Device.** `lib/device.mjs` reads the screen (`GET /events?currentscreenonly=true`) and presses buttons (`POST /button/{left,right,both}`). `walkAndConfirm(firstText)` waits for a prompt, steps right recording every screen until `Approve`, then presses both. `Device.field(screens, 'Address')` joins a value paged over several screens.
- **App.** `lib/cdp.mjs` is a small CDP client over `ws`. It records renderer exceptions and console output; a flow fails if the renderer throws or the unhandled-error modal shows. It attaches only after the app document has parsed its `<title>`: attaching during the window's first navigation made the preload's `loaded` handler throw `SecurityError` on `localStorage` in most launches on Electron 42 (never on Electron 27, never without the early attach).
- **Ground truth.** `lib/expected.cjs` derives the xpub and addresses from the seed with `@hathor/wallet-lib`, independently of the app, and builds the token configuration string.

## Flows

| id | what it checks |
| --- | --- |
| `hw-start` | Hardware wallet start: `ledger:getVersion` → `ledger:version` (the app version is reported), `getPublicKeyData` approved on the device, the xpub rebuilt from the device reply equals the seed xpub, the wallet opens and shows the first address. |
| `show-address` | "Show full address": the device shows the same address as the app's modal, which is `m/44'/280'/0'/0/0` of the seed; approving closes the modal. |
| `token-sign` | Registers a mainnet token (default `Hathorstrings`/`HS7`, override with `LEDGER_E2E_TOKEN_UID`), signs it with the device (symbol, name and UID on the device must match the app), checks the stored signature, then calls `verifyTokenSignature` through the renderer's own IPC object (the UI has no path to it once a token is signed). |
| `token-verify-restart` | Restarts the app on the same profile, reconnects the hardware wallet and checks the startup `verifyManyTokenSignatures` payload (`{uid: bytes}`) and its empty "invalid" reply. Needs `token-sign`. |
| `token-reset` | Settings → "Untrust all tokens on Ledger", approved on the device; the app drops the signatures and the device now rejects the old one (`0xb00a`). Needs `token-sign`. |
| `disconnect` | Stops Speculos with the wallet open: `listen` emits `remove`, main sends `ledger:closed`, the app leaves the wallet screen with "Ledger disconnected!" and no unhandled-error modal. Run it last. |

Not covered: sending (`sendTx`, `getSignatures`, `sendTokens`) needs funds on the emulated wallet. The way to get them is the QA privnet in `qa/large-values-network/`: build the ELF with `NETWORK=testnet` (version byte `0x49`, as privnet), fund the seed's address from the privnet's pre-mined wallet, point the wallet at the privnet node, then add a flow that walks the `Output`/`Send Transaction?` screens.

## Adding a flow

Append an object to `FLOWS` in `flows.mjs`:

```js
{
  id: 'my-flow',
  title: 'What it proves',
  async run(ctx) {
    const mark = ctx.ipc.mark();
    await ctx.cdp.click('Some button', 'button');
    const screens = await ctx.device.walkAndConfirm('First device text');
    const reply = await ctx.ipc.waitFor((e) => e.channel === 'ledger:someEvent', { since: mark });
    // throw (or use the eq/assert helpers) on mismatch
    return { device: screens.map((s) => s.join(' ')).join(' > ') }; // printed in the report
  },
},
```

`ctx` provides `cdp` (`click`, `clickSel`, `setInput`, `waitFor`, `waitForText`, `eval`, `page`), `device` (`screen`, `press`, `waitForText`, `walkAndConfirm`), `ipc` (`mark`, `waitFor`, `all`), `expected` (`xpub`, `addresses`), `token`, a `state` object shared between flows, `restartApp()` (same profile) and `stopSpeculos()`. Screen texts for each prompt are in the Ledger app's `src/ui/display.c`.

## Files

- `run.mjs` runs everything; `flows.mjs` holds the flows.
- `build-app.sh` keeps its own clone of the Ledger app in the cache directory, so it never touches your working copy. It builds `LEDGER_APP_REF` (default: the pinned commit the flows were written against, app 1.1.1) for `LEDGER_MODEL` (default `nanosp`) in the builder image, as the host user. `LEDGER_APP_REPO` can point at a local checkout to build one of its commits.
- `speculos.sh start <elf> | stop | logs` runs the emulator container.
- `lib/` holds the shim, the transport, the CDP and device clients, the Sentry sink and the ground-truth script.
