# Testing guide — hathor-wallet desktop

Long-form reference for the automated test suite introduced by
[RFC 0001 (auto-qa)](https://github.com/HathorNetwork/rfcs/blob/master/projects/hathor-wallet/0001-automated-test-suite/automated-test-suite.md).
The conventions live in three places, in increasing depth:

1. [`AGENTS.md`](../AGENTS.md) and [`CLAUDE.md`](../CLAUDE.md) — the
   authoritative short-form rules (~40 lines each).
2. [`.claude/skills/writing-tests/SKILL.md`](../.claude/skills/writing-tests/SKILL.md)
   — pattern reference auto-loaded by Claude Code when an agent touches
   a test file.
3. This guide — the prose explanation a human can read top-to-bottom
   before they touch the test surface for the first time.

## Why this exists

Before RFC 0001 the desktop wallet's release validation was six
hundred-line manual QA checklists run by hand before every release.
Jest existed but was disabled in CI because of an older
react-scripts/React 18 incompatibility. The 9 ad-hoc tests under
`src/__tests__/` had been silent for months; some had drifted from
production code without anyone noticing.

RFC 0001 introduces a four-layer testing pyramid (Jest unit, saga
integration, component, E2E) with infrastructure designed so future
contributors — human or AI — can land tests without re-fighting the
same review nits.

This guide covers Layers 1–3 (what PR 1 ships). Layer 4 (Playwright +
Electron) ships in PR 2 and will get its own section here when it lands.

## Pyramid

```
        ┌─────────┐
        │  E2E    │  ← Playwright + Electron (PR 2)
        │ (few)   │
       ┌┴─────────┴┐
       │ Component  │  ← @testing-library/react
       │ (moderate) │    Screen-level render + interaction
      ┌┴───────────┴┐
      │ Integration  │  ← redux-saga-test-plan
      │ (moderate)   │    Saga + reducer end-to-end
     ┌┴─────────────┴┐
      │    Unit        │  ← Jest
      │ (many, fast)   │    Pure functions, reducers
      └───────────────┘
```

The lower in the pyramid a test sits, the faster and more deterministic
it is. The higher up, the closer to real user behaviour. Spend most of
your testing budget at the bottom; reserve the top for journeys you
cannot meaningfully cover lower down.

## File layout

```
src/
├── __tests__/                  # Tests, organized by layer
│   ├── utils/                  # L1 — pure functions, selectors
│   ├── reducers/               # L1 — reducer three-contracts tests
│   ├── sagas/                  # L2 — saga integration
│   ├── screens/                # L3 — screen-level component tests
│   └── components/             # L3 — reusable component tests
├── __mocks__/                  # Manual mocks for npm packages
│   ├── @hathor/
│   ├── @ledgerhq/
│   ├── @reown/
│   ├── @sentry/
│   ├── @walletconnect/
│   └── unleash-proxy-client.js
├── test-utils/                 # Shared helpers
│   ├── createTestStore.js
│   ├── renderWithProviders.js
│   ├── mockNavigation.js
│   ├── getInitialState.js
│   ├── ledgerTransportMock.js
│   └── index.js                # Barrel re-exports
└── setupTests.js               # Activates the centralized mocks
```

`src/__tests__/` is what CRA's `testMatch` discovers automatically.
`src/test-utils/` lives outside `__tests__/` deliberately, so the
helpers are not interpreted as tests. `src/__mocks__/` is the
Jest-conventional location for manual mocks, picked up automatically
because CRA's `roots` includes `<rootDir>/src`.

## The eight reference tests

PR 1 ships exactly eight tests — one per technique a feature-area PR
will reach for. They are deliberately tiny; each one is meant to be
copy-pasted as a starting point.

| Layer | Pattern | Reference file |
|---|---|---|
| L1 | Pure function | `src/__tests__/utils/tokens.test.js` |
| L1 | Selector (state-consuming) | `src/__tests__/utils/selectors.test.js` |
| L1 | Reducer (three contracts) | `src/__tests__/reducers/reducer.wallet.test.js` |
| L2 | Saga happy path | `src/__tests__/sagas/wallet.test.js` |
| L2 | Saga module-state reset | `src/__tests__/sagas/modal.test.js` |
| L3 | Screen happy path | `src/__tests__/screens/Welcome.test.jsx` |
| L3 | Screen error / non-happy | `src/__tests__/screens/SoftwareWalletWarning.test.jsx` |
| L3 | Screen navigation | `src/__tests__/screens/WalletType.test.jsx` |

If the test you want to write fits one of these patterns, copy the
matching file's structure. If it doesn't, ask whether the gap belongs
in this list or whether you're about to write a test in the wrong
layer.

## Centralized mocks

The mocks live at `src/__mocks__/<package-name>.js` and are activated
in `src/setupTests.js`:

```js
// src/setupTests.js
import '@testing-library/jest-dom';

jest.mock('@hathor/wallet-lib');
jest.mock('@hathor/hathor-rpc-handler');
jest.mock('@reown/walletkit');
jest.mock('@walletconnect/core');
jest.mock('@walletconnect/utils');
jest.mock('@sentry/electron');
jest.mock('@ledgerhq/hw-transport-node-hid');
jest.mock('unleash-proxy-client');
jest.mock('./store/index', () => ({ /* … store stub … */ }));
```

The store mock breaks a circular import chain
(`reducers/index → sagas/tokens → sagas/helpers → utils/tokens → store/index → reducers/index`)
that is benign at app startup but cyclic from a test entry point.

When you need a different shape for a specific test, override the
centralized mock locally at the top of the test file:

```js
jest.mock('@hathor/wallet-lib', () => {
  const actual = jest.requireActual('@hathor/wallet-lib');
  return { ...actual, swapService: { create: () => ({ id: 'fake-id' }) } };
});
```

Do NOT add a competing mock file for a package the central mocks
already cover. That is a code-review nit.

## Helpers — `src/test-utils/`

### `renderWithProviders(ui, options)`

Wraps a component in `Provider` (Redux) and `MemoryRouter`
(react-router-dom v6) for rendering. Returns the
`@testing-library/react` render result plus `{ store }` for tests that
need to dispatch or read state mid-test.

```js
import { renderWithProviders } from '../../test-utils';

const { store } = renderWithProviders(<MyScreen />, {
  preloadedState: { useWalletService: true },
  initialEntries: ['/wallet/some-route'],
});
```

### `createTestStore(preloadedState)`

Returns a Redux store configured with the same middlewares as
production (`redux-saga`, `redux-thunk`, `serializableCheck: false`),
seeded with the root reducer's initial state merged with the caller's
`preloadedState`. Used directly by saga tests; used indirectly via
`renderWithProviders` by component tests.

Does not auto-run the root sagas. Saga tests drive sagas explicitly via
`expectSaga`.

### `getInitialState()`

Calls the root reducer with `undefined` state and a `@@INIT`-style
action, returns the result. The reducer-test three-contract layer
asserts on the shape of this return value.

### `mockNavigation`

Two styles. The shared spy (for cross-file assertions in larger PRs):

```js
import { mockNavigationModule, mockNavigate } from '../../test-utils';
jest.mock('react-router-dom', () => mockNavigationModule());
```

The test-local spy (for one-off tests, used by the reference
`WalletType.test.jsx`):

```js
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));
```

The `mock` prefix on `mockNavigate` is required for
`babel-plugin-jest-hoist` to allow referencing the variable inside the
`jest.mock` factory.

### `ledgerTransportMock` — fluent scripted APDU responses

```js
import { createLedgerTransportMock, successResponse, errorResponse } from '../../test-utils';

const ledger = createLedgerTransportMock()
  .respondTo(0xC0, successResponse([/* version payload */]))
  .respondTo(0xE0, errorResponse(0x6985));  // user denied

// Inject into code under test (typically via per-test jest.mock override).
```

The default behaviour (no `.respondTo` calls) is "always reply
`0x9000`" — the success-status word with no payload. That's enough for
the smoke tests; feature-area Ledger tests script per-instruction
behaviour.

## Production code accommodations

PR 1 introduces one production-code pattern intentionally: the
`*ForTesting` named export.

```js
// src/sagas/modal.js
let modalContext = null;

export const setModalContext = (context) => { modalContext = context; };

export const clearModalContextForTesting = () => { modalContext = null; };
```

The `ForTesting` suffix marks the export as test-only by convention.
Tests call it in `beforeEach` to reset module-level state between
cases; production code never calls it. Future feature-area PRs that
touch sagas with module-level state add their own `*ForTesting`
exports.

Do not remove or rename a `*ForTesting` export as part of an unrelated
refactor — they look like smells but are deliberate test-only seams.

## Ledger — the contract-mirror boundary

The wallet has substantial Ledger integration (Ledger app discovery,
APDU exchange, PIN verification, transaction signing). The auto-qa
suite mocks the Ledger transport at the
`@ledgerhq/hw-transport-node-hid` boundary; everything above that
boundary in the wallet's code path is exercised against the mock.

This is a **contract mirror, not a Ledger reimplementation**. The mock
matches the APDU response shapes documented in
[HathorNetwork/hathor-ledger-app](https://github.com/HathorNetwork/hathor-ledger-app).
The wallet code under test is the same code that runs in production;
only the transport at the bottom is fake.

What JS-mock tests certify:
- The wallet sends the correct APDU for the operation it intends.
- The wallet branches correctly on the response status word.
- PIN validation, transaction signing, and reset paths handle the
  response shapes without crashing.

What JS-mock tests do NOT certify:
- Ledger firmware correctness.
- Real USB transport behaviour (timeouts, disconnects, plugged-in/out
  cycles).
- Hardware-wallet user-interaction flows (button presses, displayed
  text on the device screen).

Release validation for Ledger flows continues to live in
`QA_LEDGER.md` and requires real hardware. If your test would only
catch a Ledger firmware bug, it belongs in QA, not in Jest.

When the real device behaviour disagrees with the mock, treat
hathor-ledger-app's pytest + Speculos suite as the authoritative source
and update the mock to match. Do not adjust wallet code to match an
incorrect mock.

## Pre-existing tests that were skipped in PR 1

Re-enabling Jest in CI surfaced four pre-existing test suites that
had been silent for months and have drifted from production code.
Each is skipped with a `describe.skip` + FIXME comment pointing at
the root cause:

- `src/__tests__/components/ModalPin.test.js` "pin validation" — the
  tests pass a `wallet` prop the component no longer honours (uses
  `getGlobalWallet()` instead).
- `src/__tests__/components/ModalSendTx.test.js` "tx handling" —
  reaches for a nested `ErrorMessages.ErrorMessages` shape on the
  wallet-lib mock and deeper `SendTransaction` behaviour than the
  smoke mock provides.
- `src/__tests__/utils/atomicSwap.test.js` "calculateExhibitionData" —
  constructs `PartialTxProposal` instances directly with internal-
  state expectations beyond what the smoke mock reproduces.
- `src/__tests__/screens/CreateToken.test.js` "Token Version Handling"
  — `getByText` matches both the screen heading and the submit button;
  needs scoping to `getByRole('heading', { name: ... })`.

These are deferred to the feature-area PR that owns the relevant
flow. Removing the FIXME and the `describe.skip` is part of that PR's
deliverable. Do not delete the skipped tests outright — they describe
intent, and the eventual fix is small.

## Running tests

```bash
# Full suite, watch mode (default for npm test)
npm test

# Full suite, single run (what CI uses)
CI=true npm test -- --watchAll=false

# A specific file or pattern
npm test -- --testPathPattern='screens/Welcome'

# With coverage
npm test -- --coverage --watchAll=false
```

Coverage thresholds in `package.json` are currently placeholders
(1–5%) and will be ratcheted to meaningful values once the first few
feature-area PRs have landed (RFC 0001's "first feature-area PR that
enforces them").

## When to update this guide

- A new pattern was needed in a feature-area PR and the existing eight
  smokes did not cover it → document the new pattern.
- A centralized mock gained a non-obvious shape → document it.
- A `*ForTesting` export was added → describe its purpose in the
  relevant feature-area subsection.

Resist adding speculative content. The guide stays useful when every
line is load-bearing for some real-world contributor decision.

## Reference

- [RFC 0001 — Automated test suite for hathor-wallet](https://github.com/HathorNetwork/rfcs/blob/master/projects/hathor-wallet/0001-automated-test-suite/automated-test-suite.md)
- [HathorNetwork/rfcs#110 — Mobile wallet automated test suite](https://github.com/HathorNetwork/rfcs/pull/110)
  (sibling RFC; differs at Layer 4 because RN's Fabric + LavaMoat/SES
  surface forces Maestro over Playwright on mobile)
- [HathorNetwork/hathor-ledger-app](https://github.com/HathorNetwork/hathor-ledger-app)
  — canonical Ledger APDU contract; consult when the JS-mock disagrees
  with real device behaviour
