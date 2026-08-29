# Amount Format — Design

**Date:** 2026-07-21
**Branch:** `raul-oliveira/feat/amount-format`
**Worktree:** `/Users/rauloliveira/git/hathor/hathor-wallet-amount-format`
**Figma:** [Amounts Update](https://www.figma.com/design/2xRserWXaSJAgkbiQlPzhr/Amounts-Update)
**Mobile precedent:** [wallet-mobile#891](https://github.com/HathorNetwork/hathor-wallet-mobile/pull/891) (preference + compression), [wallet-mobile#893](https://github.com/HathorNetwork/hathor-wallet-mobile/pull/893) (shared Radio components)

## Problem

Long token amounts are clipped, truncated or forced onto a single line across the desktop
wallet. There is also no way for a user to choose how small amounts are displayed.

Note what is *not* broken: `numberUtils.prettyValue` already emits every decimal place
(it pads the fractional part to `decimalPlaces` and never rounds). No truncation exists
in the formatting layer. Every defect in scope is a **layout** defect — `white-space: nowrap`,
fixed-width containers, and table cells that clip rather than wrap.

Two things are therefore being built:

1. A wallet-wide **amount format preference** (Expanded / Compressed), new behavior.
2. **Layout fixes** so long amounts wrap instead of clipping, existing bug.

## Goals

- A user-selectable amount format preference, persisted and applied wallet-wide.
- Long amounts wrap onto additional lines and are never shrunk, ellipsized, or rounded.
- A single shared abstraction for amount display, so no screen can drift.

## Non-goals

- Redesigning the Transaction overview modal (see Decision 2).
- The `Privacy Settings:` row and the promotion of Reown to a top-level section, both
  visible in the Figma settings frame. Neither belongs to this project.
- Changing `InputNumber` behavior (see Decision 4).

## Architecture

### `src/utils/amount.js`

```js
compressAmountString(formatted)  // "0.0000005195" -> "0.0₆5195"
formatAmount(value, { decimalPlaces, isNFT, amountFormat })
```

`formatAmount` wraps `numberUtils.prettyValue` and applies subscript compression only when
`amountFormat === AMOUNT_FORMAT.COMPRESSED`.

`compressAmountString` is ported verbatim from wallet-mobile#891 so both wallets produce
identical output:

- Only the **leading** fractional zero run compresses; inner zeros stay verbatim
  (`0.000000045600000123` -> `0.0₇45600000123`).
- Minimum run length is 3; shorter runs pass through unchanged.
- Trailing zeros are trimmed before scanning.
- Values `>= 1`, integers, and zero pass through unchanged.
- The sign is preserved.

Subscripts use the Unicode codepoints U+2080–U+2089, matching mobile. See
Risk 2 for the font-coverage caveat and the required verification.

### `src/hooks/useAmountFormat.js`

Reads `state.serverInfo.decimalPlaces` and `state.amountFormat`, returns
`format(value, { isNFT })`. Call sites stop threading `decimalPlaces` through props.

### `src/components/Amount.js`

`<Amount value={} symbol={} isNFT={} />` renders the formatted string plus symbol inside a
`.amount` span that carries the wrapping CSS. This is the only place the overflow rules
live, so a screen cannot forget them.

Class components (`TxData`, `TokenHistory`, `WalletBalance`, `TokenAdministrative`,
`SendTokensOne`) cannot use the hook. They use `<Amount>` where the amount is JSX, and
`formatAmount()` directly where a plain string is required — alerts, error messages,
`.join()`-built totals, clipboard text.

### Wrapping rules

A single `.amount` class in `src/index.module.scss`:

- `overflow-wrap: anywhere`, so a break can land mid-digit-run when nothing else fits.
- Never `text-overflow: ellipsis`, never font shrinking, never fewer decimal places.

Label rows (`Total:` / `Available:` / `Locked:`) become flex rows with the value as its own
flex item. This produces the hanging-indent wrap the Figma frame shows: the continuation
line aligns under the value, not under the label.

The transaction history `Value` column keeps `text-align: right`, so both lines sit flush
right, and gains a `min-width` so the column cannot collapse and force an earlier break.

### State and persistence

`src/constants.js`:

```js
AMOUNT_FORMAT = { EXPANDED: 'expanded', COMPRESSED: 'compressed' }
AMOUNT_FORMAT_DEFAULT = AMOUNT_FORMAT.EXPANDED
AMOUNT_FORMAT_KEY = 'wallet:amount_format'
AMOUNT_FORMAT_FEATURE_TOGGLE = 'amount-format-desktop.rollout'  // false in FEATURE_TOGGLE_DEFAULTS
```

Redux gains `amountFormat` in `initialState` (defaulting to `EXPANDED`) and a
`setAmountFormat` action plus reducer case, mirroring the existing `addressMode` wiring at
`src/reducers/index.js:502`.

Persistence uses `LOCAL_STORE`, **wallet-wide and not namespaced per network**. Address mode
is namespaced per network specifically to stop an Unleash rollout being bypassed by switching
networks; that concern has no analogue for a purely cosmetic setting.

The key uses the `wallet:` prefix, which is this codebase's convention for **user
preferences** — `wallet:sentry`, `wallet:notification`, `wallet:hide_zero_balance_tokens`,
`wallet:address_mode:<network>`. The separate `localstorage:` prefix belongs to LOCAL_STORE's
own session and wallet data, which is what `storage.js`'s `storageKeys` array enumerates.

Because preference keys are deliberately outside `storageKeys`, `resetStorage()` does not
clear them. Wallet reset must remove the key explicitly in `onWalletReset`
(`src/sagas/wallet.js`), immediately alongside the existing `walletUtils.clearAllAddressModes()`
call that exists for exactly the same reason. `src/storage.js` is not modified.

Hydration happens in the `startWallet` saga, alongside the network settings load: read the
key and `put(setAmountFormat(...))`. `startWallet` re-runs on every unlock, so the choice
survives lock/unlock. There is no pre-wallet concern here — amounts only render once a
wallet is loaded.

### Feature flag

`amount-format-desktop.rollout` gates the Settings row and the modal, and forces `EXPANDED`
when off, so a stored `COMPRESSED` cannot leak through if the flag is later disabled.

The wrapping and layout work ships **ungated**: it fixes overflow that is broken today, and
gating it would mean maintaining and testing two layouts.

## Decisions

1. **The preference applies wallet-wide**, to every read-only display site, not just the
   screens with Figma references. A shared abstraction plus a full migration is the only way
   to guarantee a user who picks Compressed does not see expanded amounts in a Reown modal.

2. **Transaction overview keeps its current layout.** The Figma "as-is" frame (node
   `318:4172`) shows a headline amount, a `To:` row, a collapsible `Fees` breakdown and a
   `Total` row. None of that exists in `ModalTransactionOverview.js` on any branch — the
   shipped modal renders a per-output list, a `Network fee` row and a `You will pay` row.
   Since the designer's baseline does not match the code, we map the stated intent onto the
   current structure rather than rebuilding the modal. The `Privacy fee` line in the mock
   implies a feature that does not exist on desktop.

   The adaptive-font-size half of that intent is **parked** — see Open Questions.

3. **The subscript uses Unicode codepoints**, matching mobile, with glyph rendering added as
   an explicit QA item on Windows and Linux rather than engineered around up front.

4. **`InputNumber` is not modified.** It accumulates keystrokes as BigInt and has no
   `maxLength`, so it already accepts any number of decimal places — the "supports 8 decimal
   places" requirement is functionally met today. A long typed value can overflow the field
   visually, but `<input>` is single-line by definition and the caret is already pinned to
   the end (`InputNumber.updateCaretPosition`), so the digits being typed stay visible.
   Only the read-only labels beside it are fixed.

## PR breakdown

All six PRs stack on the previous one, in this worktree.

Exact pixel values (spacing, radii, colours, and the `min-width` for the history `Value`
column) are pulled from the Figma nodes named in each PR when the implementation plan is
written, so every task carries concrete numbers. No value is left to be chosen at
implementation time. The Figma node ids are recorded here for that purpose:

| Screen | Node |
| --- | --- |
| Home / dashboard | `372:1822` |
| Settings, Amount format row | `318:2373` |
| Amount format modal, Expanded selected | `318:2469` |
| Amount format modal, Compressed selected | `318:2998` |
| Transaction overview, as-is | `318:4172` |
| Transaction overview, to-be | `323:196` |
| Create deposit token / Send tokens | `326:3120` |

### PR1 — Amount format foundation + Settings

Everything under Architecture, plus:

- `Settings.js`: an `Amount format: Expanded | Compressed  [Change]` row in Advanced
  Settings, rendered only when the flag is on, slotted after `Address Mode:` per Figma.
- `ModalAmountFormat.js` and a `MODAL_TYPES.AMOUNT_FORMAT` entry in `GlobalModal`: a bordered
  card with a divider, two radio options (Expanded carries a `Default` badge), a `PREVIEW`
  block showing `0.0000005195 HTR` versus `0.0₆5195 HTR` live as the selection changes, and
  a `Save preferences` button disabled until the selection differs from the stored value.

  Note: the Figma frames render this example as `0.0₈5195`. That is a design error —
  `0.0000005195` has six leading fractional zeros, so the correct output is `0.0₆5195`, which
  is also what mobile produces. The preview must be computed by `compressAmountString`, never
  hardcoded from the mock.
- Migrate the call sites exercised while testing the feature: `WalletBalance`,
  `TokenHistory`, `TxData`, `TokenBar`, `TokenInfoBox`, `TokenAdministrative`,
  `ModalTransactionOverview`, `ModalSendSuccess`, `SendTokensOne`, `CreateToken`, `CreateNFT`.
- `make update_pot`.

### PR2 — Convert the remaining call sites

Mechanical, no behavior change: `Reown/*` (`TransactionFees`, `NanoContractActions`,
`CreateTokenRequestData`, `GetUtxosModal`, `BaseNanoContractModal`, `SendTransactionModal`),
`atomic-swap/*` (`EditSwap`, `ProposalBalanceTable`, `ModalAtomicSend`),
`nano-contract/NanoContractDetail`, `NFTListElement`, `tokens/TokenMint`, `tokens/TokenMelt`,
`ModalTokenImport`, and the string helpers in `utils/tokens.js` and `utils/nanoContracts.js`.

After this PR, `numberUtils.prettyValue` survives in exactly one place: `InputNumber`'s
internal `format()`. Inputs are always expanded, never compressed.

### PR3 — Address mode refactor

Extract `components/Radio/{RadioButton,RadioOption,RadioGroup,index}.js` and
`PreferenceSaveButton.js` from PR1's modal, mirroring wallet-mobile#893. Recompose
`ModalAmountFormat` on them with zero visual change, then restyle `ModalAddressMode` onto the
same card.

Behavior is preserved exactly: the `hasTxOutsideFirstAddress` check, the disabled Single
option with its warning banner, and the save -> `reloadWalletRequested` flow.

SCSS: group the `.address-mode-*` classes under a shared parent using `&-suffix`, per the
project's SCSS conventions.

### PR4 — Home / dashboard

`WalletBalance` label rows become flex, so `Total: / Available: / Locked:` wrap with the
hanging indent from Figma. `TokenHistory`'s `Value` column wraps to two right-aligned lines
and never shrinks, with a `min-width` so the column cannot collapse.

### PR5 — Transaction overview

Scoped to wrapping only, on the current layout. The adaptive font size is parked (see Open
Questions) and must be resolved before this PR starts.

- Per-output amounts: `ModalTransactionOverview.js:222` sets `whiteSpace: 'nowrap'`, which is
  what clips long values today. Removed, so the amount wraps like every other amount in the
  project.
- `You will pay` value: `14px`, semibold, `#404040`, `line-height: 20px`, right-aligned,
  `word-break: break-word`, wrapping onto as many lines as needed. These values are taken
  from Figma node `323:291`, which is the same element in the desktop mock and does **not**
  shrink — it stays at 14px and wraps. Its container must not set `overflow: hidden`.

No headline amount, no `To:` row, no collapsible fee breakdown.

### PR6 — Create deposit/fee token + Send tokens (labels only)

`CreateToken.js:255-256`, `CreateNFT.js:351-354`, `SendTokensOne.js:444,507,591` — the
available-balance, deposit, network-fee and total labels move to `<Amount>` and wrap instead
of overflowing. `InputNumber` is untouched.

## Testing

### Unit (Jest + React Testing Library)

- `compressAmountString`: negatives; inner zeros (`0.000000045600000123` ->
  `0.0₇45600000123`); trailing zeros trimmed before scanning; runs shorter than 3 left alone;
  integers, zero, and values `>= 1` passed through; thousand-separated integer parts.
- `formatAmount`: NFTs (`decimalPlaces: 0`) never compress; compression applies only under
  `COMPRESSED`.
- Reducer: `setAmountFormat`; flag-off forces `EXPANDED` even with `COMPRESSED` stored.
- `<Amount>`: renders the symbol and carries the wrapping class.
- `ModalAmountFormat`: preview updates on selection; save disabled until changed; dispatch
  and persist on save.

### Integration

Persistence round-trip: save Compressed -> lock -> unlock -> still Compressed. Wallet reset
-> back to Expanded.

### Manual

The real risk is visual and unit tests will not catch it. Each layout PR is checked at a
narrow window width with a deliberately extreme value, confirming the value wraps rather than
clipping, ellipsizing, or shrinking. Test wallet PIN is `123123`.

### PR1 QA checklist item (cross-platform)

Enable Compressed and confirm the subscript digits `₀`–`₉` render correctly — no tofu boxes,
no visibly mismatched glyph weight or baseline — on **Windows and Linux** builds, including
the transaction history `Value` column, which uses `font-family: monospace`. macOS is already
verified (see Risk 2).

## Risks

1. **Silent regression from the PR2 sweep.** ~25 files change mechanically; a wrong `isNFT`
   argument renders an NFT amount with 8 decimal places. Mitigated by keeping PR2 strictly
   behavior-neutral and diffing rendered output rather than trusting the edit.

2. **Subscript glyph coverage.** The app bundles no webfont — there is no `@font-face`
   anywhere (`font-awesome` is icons only), so text falls through to Bootstrap 4.6.1's native
   stack and every glyph comes from the host OS. The transaction history `Value` column uses
   the generic `monospace` keyword, resolving to Menlo on macOS, Consolas on Windows, and
   DejaVu Sans Mono on Linux.

   Two failure modes: no installed font covers U+2080–U+2089 (tofu box), or another installed
   font supplies the glyph with a different stroke weight and baseline (subtle misalignment
   in a right-aligned monospace column).

   Measured on macOS in Chromium — the same engine as the Electron build — by rendering
   U+2080–U+2089 to canvas and pixel-diffing against a Private Use Area codepoint: all ten
   subscripts render in the Bootstrap sans stack, in generic `monospace`, and in Menlo
   explicitly. **macOS is clear; Windows and Linux are unverified** and covered by the QA
   checklist item above.

   Blast radius is small: the subscript only appears in Compressed mode, only for values
   below 1 with at least three leading fractional zeros, and the feature flag defaults to
   off. Impact if it fails is cosmetic — the displayed value is still correct.

3. **Layout collateral.** Switching label rows to flex touches shared SCSS; sibling screens
   using the same classes need a visual check.

4. **Stacked PRs.** PR3 refactors components PR1 introduces. If PR1 is still in review when
   PR3 starts, rebases follow.

5. **Flag provisioning.** `amount-format-desktop.rollout` must be created in Unleash before
   rollout. It defaults to `false`, so nothing ships enabled.

## Open questions

### Adaptive font size on Transaction overview (blocks PR5 only)

The brief asks for the value font size to adapt the way wallet-mobile does. Figma defines
that range precisely, on the headline amount in `Frame 107`:

| Element | as-is (`323:193`) | to-be (`323:249`) |
| --- | --- | --- |
| Headline amount | 24px, SF Pro Text Heavy, black, centered | 16px, same weight and colour |
| `available` sub-line (`323:194` / `323:250`) | 12px, SF Pro Text Semibold, `#8E8E93` | unchanged |
| Total value (`323:291`) | 14px, single line | 14px, wraps to two lines |

So the design shrinks **only** the headline, from a 24px base to a 16px floor, and never
shrinks the total.

The conflict: the desktop modal has no headline amount, so those two numbers have no element
to apply to. Resolving it means choosing one of:

- Add just the `Frame 107` header to the top of the modal (amount at 24px shrinking to a 16px
  floor, plus the `available` sub-line at 12px `#8E8E93`) and nothing else from the mock.
- Drop shrink-to-fit on desktop entirely and rely on wrapping, which the wider viewport
  allows. This is what PR5 is currently specified to do.
- Request a Figma frame reflecting the shipped desktop modal, with explicit base and floor
  sizes for the per-output rows.

Until this is decided, PR5 ships wrapping only. PR1–PR4 and PR6 are unaffected.

## Definition of done (per PR)

- `npm test` green.
- `npm run build` compiles successfully with no new warnings. There is no `lint` script and no
  ESLint config in this repo — linting runs inside `react-scripts` during the build.
- Touched screens verified visually against the Figma frame.
- `make update_pot` run wherever strings changed.
