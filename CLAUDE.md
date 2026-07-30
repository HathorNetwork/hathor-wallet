# CLAUDE.md — Claude Code conventions for hathor-wallet

This file holds the authoritative rule set Claude Code applies in this
repo. Other AI assistants should read [`AGENTS.md`](./AGENTS.md) for the
tool-neutral version of the same conventions.

## Testing rules

- **Reference vs feature-area distinction.** PRs labelled "reference smoke"
  land one representative test per technique plus infrastructure. PRs
  labelled "feature-area" cover one slice of the wallet across all
  applicable layers. Do not mix the two in a single PR.

- **Use the centralized mocks.** Shared package mocks are activated in
  `src/setupTests.js` and implemented under `src/__mocks__/`. Do not
  redeclare a mock in a test file when a centralized one exists; if you
  need a different shape, override it locally with `jest.mock(...)` at the
  top of the test file — do not add a competing mock for the same module.

- **`*ForTesting` named exports** — do not remove or rename. Each one
  resets module-level state that integration tests depend on for
  isolation. Their `ForTesting` suffix marks them as test-only. The
  canonical example today is `clearModalContextForTesting` in
  `src/sagas/modal.js`; the pattern will spread to other module-state
  sagas as feature-area PRs need it.

- **Ledger mock is a contract mirror, not a reimplementation.** The
  transport mock at `src/__mocks__/@ledgerhq/hw-transport-node-hid.js` and
  the fluent helper at `src/test-utils/ledgerTransportMock.js` mimic the
  APDU response shapes documented in
  [HathorNetwork/hathor-ledger-app](https://github.com/HathorNetwork/hathor-ledger-app).
  JS-mock tests certify wallet code's behaviour **given a Ledger response
  shape**, not Ledger correctness itself; release validation for Ledger
  flows stays with `QA_LEDGER.md` and real hardware.

- **Three-contract reducers.** New reducer tests pin (1) initial-state
  shape, (2) action-type literal strings, (3) behaviour. The shape and
  action-type contracts are the safety net for any future RTK-slices
  migration; tests that assert only behaviour leave the migration
  unprotected.

- **Test layout.** Tests live under `src/__tests__/<layer>/`, helpers in
  `src/test-utils/`, mocks in `src/__mocks__/`. The `__tests__/` directory
  structure is what CRA's `testMatch` discovers; helpers and mocks are
  deliberately outside it.

- **Smoke tests are the rosetta stone.** Eight reference tests in
  `src/__tests__/{utils,reducers,sagas,screens}/` each demonstrate one
  testing technique (pure function, selector, reducer, saga, saga state
  reset, screen happy, screen error, screen navigation). Future
  feature-area PRs should find the closest matching smoke and follow its
  shape.

## Loading deeper guidance

The writing-tests skill auto-loads when this Claude Code session touches
a test file. To load it explicitly, run `/skill writing-tests` or read
`.claude/skills/writing-tests/SKILL.md` directly. The long-form reference
is `docs/testing-guide.md`.

## Commit conventions

Conventional commits with a 50-char subject limit. Types in active use:
`feat:`, `fix:`, `test:`, `chore:`, `docs:`, `ci:`, `refactor:`,
`perf:`. Bodies should explain *why*, not what — the diff already shows
what.

## Things NOT to do

- Do not "modernize" `*ForTesting` exports away. They look like smells;
  they are deliberate test-only seams.
- Do not edit `QA*.md` files casually. They are release-gating manual
  checklists.
- Do not commit without an explicit user request.
