# Amount Format — PR6 Implementation Plan (Deposit / fee labels)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Stop the read-only amount labels on Create Deposit Token, Create Fee Token, Create NFT and Send Tokens from overflowing their containers when the amount is long.

**Architecture:** Layout only. The amounts already route through `<Amount>` / `formatAmount` from PR1. This PR gives their containers permission to wrap. **The editable amount input is not touched.**

**Figma:** [Create deposit token / Send tokens, node `326:3120`](https://www.figma.com/design/2xRserWXaSJAgkbiQlPzhr/Amounts-Update?node-id=326-3120)
**Depends on:** PR5. Branch from it.

---

## Working agreement

- **Do not commit per task.** The controller commits once at the end.
- **No render tests** — Jest 27 cannot parse `axios@1.7.7`'s ESM entry.
- **Test command:** `CI=true npx react-app-rewired test --watchAll=false 2>&1 | grep -E "^(PASS|FAIL)|^Test Suites:|^Tests:"`. Never pipe jest to `tail` and read `$?`.
- **Build gate:** `npm run build` (plain, never `CI=true`).
- **Baseline:** `7 failed, 4 passed, 11 total` / `33 passed, 33 total`.

---

## `src/components/InputNumber.js` is not modified

Decided during design and unchanged: `InputNumber` accumulates keystrokes as BigInt and has no `maxLength`, so it **already** accepts any number of decimal places — the "support 8 decimal places in the inputs" requirement is functionally met today.

A long typed value can overflow the field visually, but `<input>` is single-line by definition and the caret is already pinned to the end (`InputNumber.updateCaretPosition`), so the digits being typed stay visible. Widening the field, shrinking the font and capping the length were all considered and rejected. **Only read-only labels are in scope.**

For context, Figma's Amount input (`326:3146`) is `381px × 38px`, `1px solid #B7BFC7`, `border-radius: 4px`. Recorded so nobody re-derives it; not a change to make.

---

## Design values (measured from Figma)

The `Deposit: … HTR (20.00 HTR available)` label (`326:3153`): `16px`, `line-height: 22px`, colour `#000`, container hugs to `620px` inside a `716px` parent.

**Caveat:** the mock shows this label as `white-space: nowrap`, on one line. That is not a specification that it must never wrap — it simply reflects the short sample value the designer used, which fits in the available width. With a realistic maximum it would overflow the card. Implement wrapping; the mock is consistent with that because at its sample length no wrap occurs.

Two other frames in that Figma file sit loose on the canvas rather than inside the card's auto-layout (`326:3156`, `326:3159`, `326:3160`) and are designer scratch. Ignore them.

---

## Task 1: Create Token / Create Fee Token labels

**Files:** Modify `src/screens/CreateToken.js`, `src/index.module.scss`

`CreateToken.js` builds `infoLabel` as a template string combining the deposit amount and the available balance, then renders it. The string itself is fine; the container must be allowed to wrap.

- [ ] **Step 1: Find the label element**

Locate where `infoLabel` (and the `requiredFeeAmountText` / `availableBalanceText` values) are rendered. Note the class or inline style on the containing element.

- [ ] **Step 2: Give it a wrapping class**

Add `className="amount-label"` to the element that renders the label text. If it already has classes, append rather than replace.

- [ ] **Step 3: Add the SCSS**

Append to `src/index.module.scss`:

```scss
/* Read-only amount labels beside inputs (deposit, fee, available balance) */
.amount-label {
  // The label embeds amounts inside a sentence, so the break can land at a
  // space normally; `anywhere` is the fallback for a single very long number
  // that exceeds the container on its own.
  overflow-wrap: anywhere;
  white-space: normal;
  max-width: 100%;
}
```

- [ ] **Step 4: Rebuild** — `npm run build-css`, confirm `.amount-label` is present in `src/index.css`.

---

## Task 2: Create NFT labels

**Files:** Modify `src/screens/CreateNFT.js`

This screen renders three `<p>` rows — `<symbol> available:`, `Deposit:` and `Total:` — each already using `<Amount>`, plus an `nftFee` string.

- [ ] **Step 1:** Add `className="amount-label"` to each of those three `<p>` elements and to the element rendering `nftFee`.

- [ ] **Step 2:** Confirm none of them sits inside a container with a fixed width or `overflow: hidden`. Report if one does.

---

## Task 3: Send Tokens labels

**Files:** Modify `src/components/SendTokensOne.js`

Three read-only amount labels: the network fee row, the available-balance readout beside the token selector, and the "You'll pay" summary line built as a template string.

- [ ] **Step 1:** Add `className="amount-label"` to each of the three containing elements.

- [ ] **Step 2:** The available-balance readout sits next to the token `<select>` in a flex or inline row. Confirm the amount can wrap without pushing the select off-screen; if the row needs `flex-wrap: wrap` or the label needs `min-width: 0`, add it and say so.

---

## Task 4: Token Mint / Melt deposit labels

**Files:** Modify `src/components/tokens/TokenMint.js`, `src/components/tokens/TokenMelt.js`

`TokenMint` passes a `deposit={...}` template string containing two amounts down to a child component. `TokenMelt` builds similar message strings.

- [ ] **Step 1:** Find where each string is rendered — it may be inside a shared child component rather than in these files. Add `className="amount-label"` at the render site.

- [ ] **Step 2:** If the render site is a shared component used by callers outside this feature, do **not** hardcode the class there. Either accept a `className` prop or add the class at each caller. Report which approach you took and why.

---

## Task 5: Verification

- [ ] **Step 1: Suite and build** — baseline unchanged, no warning naming a touched file.

- [ ] **Step 2: `InputNumber` untouched**

Run: `git diff --stat src/components/InputNumber.js`
Expected: **no output**.

- [ ] **Step 3: Manual QA** (a human runs this; list it in the PR body)

  - **Create Deposit Token:** type an amount long enough to make the deposit label exceed the card width. The label wraps within the card; it does not overflow, get clipped, or push the card wider. The input itself is unchanged — it scrolls horizontally as before, with the caret pinned to the end.
  - **Create Fee Token:** same, for the network-fee label.
  - **Create NFT:** available / deposit / total all wrap.
  - **Send Tokens:** the fee row, available balance and "You'll pay" line all wrap; the token select stays usable.
  - **Token Mint / Melt:** the deposit label wraps.
  - Narrow the window to roughly 900px and repeat — nothing clips.
  - Short amounts render identically to `master`.

---

## Out of scope

- `src/components/InputNumber.js` and any editable input behaviour.
- Any layout change beyond letting labels wrap — the brief is explicit that this screen gets no other restyling.
- The Figma frame's input dimensions and card layout.
