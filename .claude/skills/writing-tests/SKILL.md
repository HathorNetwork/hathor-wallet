---
name: writing-tests
description: Auto-loads when a session touches a test file under src/__tests__/ or a mock under src/__mocks__/. Encodes the auto-qa testing conventions established by RFC 0001 — pyramid layout, helpers, centralized mocks, smoke-vs-feature-area cadence, Ledger contract boundary, three-contract reducer pattern.
---

# Writing tests for hathor-wallet

This skill loads whenever you're editing or creating a test file in the
desktop wallet repo. It is the long-form companion to the rules in
[`CLAUDE.md`](../../../CLAUDE.md); the rules there are the short-form
authoritative version, and the patterns below are the depth and worked
examples that let you actually apply them.

## Pyramid layout

```
__tests__/
├── utils/        # L1 — pure functions, selectors
├── reducers/     # L1 — reducer three-contracts tests
├── sagas/        # L2 — saga integration (expectSaga + provide())
├── screens/      # L3 — component render + interaction
└── components/   # L3 — non-screen reusable component tests

src/test-utils/   # helpers used by tests (renderWithProviders, etc.)
src/__mocks__/    # manual mocks for npm packages
src/setupTests.js # CRA-conventional global setup; activates the mocks
```

Layer 4 (Playwright + Electron E2E) will live under a top-level `e2e/`
directory in PR 2; it is not in scope here.

## Reference smoke vs feature-area distinction

RFC 0001 splits the work into two kinds of PR.

**Reference smoke PRs** land one representative test per technique plus
the shared infrastructure (helpers, mocks, agent docs). PR 1 (the one
that introduced this skill) was the reference smoke for Layers 1–3:
eight tests, one for each of pure function, selector, reducer, saga,
saga with state reset, screen happy, screen error, screen navigation.

**Feature-area PRs** cover one slice of the wallet across all applicable
layers. Examples in flight or planned:

- New wallet creation / backup
- Lock / Unlock
- Send Tokens (incl. fee model)
- Custom Tokens (create / register / admin)
- Token Import
- Nano Contracts
- Reown / WalletConnect
- Ledger / Hardware Wallet (JS-mock layer only)

When you're writing a new test, identify which kind of PR you're in.
Reference-smoke PRs land tiny: one test per technique, sized to be a
template. Feature-area PRs cover a slice: as many tests as the feature
needs.

## Test patterns

The eight reference smoke tests in PR 1 are the canonical examples. Find
the smoke that matches what you're writing and copy its shape. Quick
index:

| Need to test … | Reference example |
|---|---|
| A pure function (no mocks, no state) | [`utils/tokens.test.js`](../../../src/__tests__/utils/tokens.test.js) |
| A function reading from Redux state | [`utils/selectors.test.js`](../../../src/__tests__/utils/selectors.test.js) |
| A reducer (three contracts) | [`reducers/reducer.wallet.test.js`](../../../src/__tests__/reducers/reducer.wallet.test.js) |
| A saga happy path | [`sagas/wallet.test.js`](../../../src/__tests__/sagas/wallet.test.js) |
| A saga with module-level state | [`sagas/modal.test.js`](../../../src/__tests__/sagas/modal.test.js) |
| A screen render (happy path) | [`screens/Welcome.test.jsx`](../../../src/__tests__/screens/Welcome.test.jsx) |
| A screen error / non-happy state | [`screens/SoftwareWalletWarning.test.jsx`](../../../src/__tests__/screens/SoftwareWalletWarning.test.jsx) |
| A screen navigation | [`screens/WalletType.test.jsx`](../../../src/__tests__/screens/WalletType.test.jsx) |

### renderWithProviders

```jsx
import { renderWithProviders } from '../../test-utils';
renderWithProviders(<MyScreen />, {
  preloadedState: { /* partial state, merged with getInitialState() */ },
  initialEntries: ['/some-route'],  // MemoryRouter prop, defaults to ['/']
});
```

Returns the standard `@testing-library/react` render result plus
`{ store }` for tests that need to dispatch or read state mid-test.

### createTestStore

Use when you need the store reference but not a render — e.g., in saga
tests that you drive with `expectSaga`. Configures the production
middlewares (`redux-saga`, `redux-thunk`) and `serializableCheck: false`.

```js
import { createTestStore } from '../../test-utils';
const { store, sagaMiddleware } = createTestStore({ isOnline: true });
```

### mockNavigation

Two styles, depending on whether the test wants the shared spy or its
own:

- Shared spy: `import { mockNavigate, mockNavigationModule } from
  '../../test-utils'` then `jest.mock('react-router-dom', () =>
  mockNavigationModule())`.
- Test-local spy: declare `const mockNavigate = jest.fn();` (the `mock`
  prefix is required for `babel-plugin-jest-hoist` to allow it inside the
  `jest.mock` factory), then mock react-router-dom inline.

`WalletType.test.jsx` uses the test-local style; future feature-area PRs
that share a navigation spec across files can switch to the shared form.

## Centralized mocks

The mocks every test would otherwise re-declare live in `src/__mocks__/`
and are activated in `src/setupTests.js`. The list as of PR 1:

- `@hathor/wallet-lib` — dissolves the ESM-only-axios import chain that
  Jest's default Babel transform cannot parse. Provides the constants
  (NATIVE_TOKEN_UID, DECIMAL_PLACES, TokenVersion, WalletType,
  PartialTxProposal, …) the wallet reads at module-load time.
- `@hathor/hathor-rpc-handler` — same import-chain concern; minimal stub.
- `@reown/walletkit`, `@walletconnect/{core,utils}` — these libraries
  open WebSockets at import time. Mocked to no-ops.
- `@sentry/electron` — no-op telemetry.
- `@ledgerhq/hw-transport-node-hid` — scripted USB transport; the
  in-file comment points contributors at hathor-ledger-app for the APDU
  contract.
- `unleash-proxy-client` — fixed no-flags state; no HTTP polling.
- `./store/index` (mocked in setupTests.js) — stubs the global Redux
  store to break a circular import chain that fires only on test entry.

If you find yourself needing to redeclare one of these in a test file,
think twice. Almost always the right move is to override the centralized
mock's specific shape locally:

```js
// In your test file, BEFORE other imports
jest.mock('@hathor/wallet-lib', () => {
  const actual = jest.requireActual('@hathor/wallet-lib');
  return { ...actual, swapService: { /* test-specific shape */ } };
});
```

Adding a competing mock for a module the central mocks already cover is
a code-review nit.

## The three-contract reducer pattern

When you write a reducer test, pin three independent contracts in
separate `describe` blocks:

1. **Initial state shape.** Enumerate the top-level keys the reducer
   initializes, alphabetically sorted. Use `it.each(keys)('has top-level
   key %s', ...)` so failures point at the specific missing key.
2. **Action type literals.** Verify the action-type constants resolve to
   the expected string literals (not just "they're defined"). A rename
   in `actions/index.js` that drops a literal surfaces as a clear
   failure instead of a silent runtime no-op.
3. **Behaviour.** Dispatch each handled action and assert on the
   resulting state. This is the bulk of feature-area reducer testing.

The reference example is `src/__tests__/reducers/reducer.wallet.test.js`.

The shape and action-type contracts are the safety net for the eventual
RTK-slices migration. Tests that assert only behaviour leave the
migration unprotected.

## Ledger JS-mock conventions

The Ledger transport mock at `src/__mocks__/@ledgerhq/hw-transport-node-hid.js`
and the fluent helper at `src/test-utils/ledgerTransportMock.js` mirror
the APDU response shapes documented in
[HathorNetwork/hathor-ledger-app](https://github.com/HathorNetwork/hathor-ledger-app).
When you write a Ledger-aware test, the mock is your contract surface.

**What JS-mock tests do certify:** the wallet's renderer + main-process
code reacts correctly *given* a Ledger response shape. PIN handling,
APDU encoding, error branches.

**What JS-mock tests do NOT certify:** Ledger firmware correctness, real
USB transport behaviour, hardware-wallet user-interaction flows.
Release validation for Ledger flows continues to live in `QA_LEDGER.md`
and requires real hardware.

When the real device behaviour disagrees with the mock, the source of
truth is hathor-ledger-app's pytest + Speculos suite, not this mock.
Update the mock to match. Do not "fix" the wallet code to match an
incorrect mock.

## Saga test patterns

Use `redux-saga-test-plan`'s `expectSaga` for integration tests. The
canonical pattern is:

```js
import { expectSaga } from 'redux-saga-test-plan';
import * as matchers from 'redux-saga-test-plan/matchers';

return expectSaga(mySaga, actionPayload)
  .provide([
    [matchers.call.fn(someEffect), 'mocked-return-value'],
    [matchers.select(selector), 'mocked-state-slice'],
  ])
  .put(someAction)        // assert a dispatched action
  .returns(expectedValue) // assert the saga's return value
  .run();
```

`matchers.call.fn(someEffect)` matches any call to `someEffect`
regardless of argument values. For tighter assertions that include
argument values, use `matchers.call(someEffect, exactArg1, exactArg2)`.

When the saga under test has module-level state, the production code
exports a `*ForTesting` reset function. Call it in `beforeEach`:

```js
beforeEach(() => {
  clearModalContextForTesting();  // resets src/sagas/modal.js's modalContext
});
```

If the saga you're testing keeps module-level state but lacks a
`*ForTesting` export, adding one is part of the feature-area PR. Keep
the reset function to one line and mark it with a JSDoc comment that
explains it's test-only.

## What NOT to test

Skip these in unit/integration/component tests; they belong to manual QA
or future Layer-4 E2E:

- Packaged-build behaviour (`electron-builder` output, code signing,
  notarization).
- Real network conditions (3G, offline, timeouts) — see `QA.md`.
- OS-level dialogs (file pickers, notifications) — see `QA.md`.
- Visual regressions (pixel-level layout shifts) — out of scope.
- Real Ledger hardware — see `QA_LEDGER.md`.
- Auto-updater download/install — the wallet does not currently ship an
  auto-updater; if one is added later, it stays a QA concern.

When you find yourself writing a test that requires one of the above to
work, the test is in the wrong layer. Move it to QA or wait for Layer 4.

## Diagnostic checklist when a test mysteriously fails

In order of likelihood for this codebase:

1. **"Cannot find module @hathor/wallet-lib" or similar import-chain
   error.** A new wallet-lib export was added that the centralized mock
   does not declare. Add the missing export to
   `src/__mocks__/@hathor/wallet-lib.js`, including any constants the
   wallet code reads at module-load time.

2. **"Cannot read properties of undefined" inside the mock chain.** A
   module-level property you expected is missing. Same fix as above.

3. **A test passes locally but fails in CI.** Make sure you ran with
   `CI=true npm test -- --watchAll=false`. The watch-mode default
   behaves differently and silently swallows some failures.

4. **Module-level state from a previous test leaks forward.** Check
   whether the saga under test has a `*ForTesting` reset function. If
   so, call it in `beforeEach`. If not, add one.

5. **`jest.spyOn(obj, method)` fails with "Cannot spyOn on a primitive
   value".** The mock returns `obj` as `undefined`. The fix is in the
   mock file; see #1.

6. **A `jest.mock(...)` factory references an out-of-scope variable.**
   Babel's `jest-hoist` plugin only allows variables prefixed with
   `mock` (e.g., `mockNavigate`) inside the factory. Rename or move the
   variable.
