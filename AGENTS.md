# AGENTS.md — Cross-tool entry point

This repository ships with conventions for AI coding assistants that work in
it (Claude Code, Gemini CLI, Codex, OpenAI Copilot, and any future
equivalents). The conventions are tool-neutral; the deeper guidance lives in
a separate skill file that loads on demand, and in a long-form testing guide
for both humans and agents.

## What to read first

| You are about to … | Open … |
|---|---|
| Add or modify a test (any layer) | [`.claude/skills/writing-tests/SKILL.md`](./.claude/skills/writing-tests/SKILL.md) |
| Look up a testing convention | [`docs/testing-guide.md`](./docs/testing-guide.md) |
| Configure Claude-Code-specific behaviour | [`CLAUDE.md`](./CLAUDE.md) |

## Repo-wide conventions

- **Conventional commits.** 50-char subject max; type prefixes (`feat:`,
  `fix:`, `test:`, `chore:`, `docs:`, `ci:`). Keep the bodies short and
  intent-focused.
- **No new emojis in code or comments.** They survive translation toolchains
  inconsistently and add noise to git diffs. Existing emojis stay.
- **Do not edit the manual `QA*.md` checklists casually.** They are the
  release-gating QA artefact. Updates to them should accompany the feature
  that changes the manual flow, not appear in unrelated PRs.

## Testing-specific conventions (load the skill for depth)

- **Reference smoke vs feature-area distinction.** RFC 0001 splits PRs into
  two flavours: "reference smoke" PRs land one representative test per
  technique plus shared infrastructure; "feature-area" PRs cover one slice
  of the wallet across all applicable layers. Do not mix the two in a single
  PR.
- **Use the centralized mocks.** Shared package mocks are activated in
  `src/setupTests.js` and implemented in `src/__mocks__/`. Do not redeclare a
  mock in a test file when a centralized one exists; if you need a different
  shape, override locally — never add a competing mock for the same module.
- **`*ForTesting` named exports** are part of the public test surface. Each
  one resets module-level state that integration tests depend on for
  isolation. Do not remove or rename one as part of an unrelated refactor.
- **JS-level Ledger mock is a contract mirror, not a reimplementation.**
  When the real device behaviour disagrees with the mock, the source of
  truth is [HathorNetwork/hathor-ledger-app](https://github.com/HathorNetwork/hathor-ledger-app).
  Release validation for Ledger flows remains with `QA_LEDGER.md` and real
  hardware.

For the full ruleset and worked examples, load the writing-tests skill.
