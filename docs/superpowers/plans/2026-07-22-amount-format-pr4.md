# Amount Format — PR4 Implementation Plan (Home / dashboard wrapping)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Make long amounts on the dashboard wrap onto additional lines instead of clipping or overflowing — in the balance block and in the transaction history `Value` column.

**Architecture:** Layout only. `<Amount>` already carries `overflow-wrap: anywhere`; what is missing is containers that allow the wrap and produce the hanging indent from the design. No formatting logic changes.

**Figma:** [Home / dashboard, node `372:1822`](https://www.figma.com/design/2xRserWXaSJAgkbiQlPzhr/Amounts-Update?node-id=372-1822)
**Depends on:** PR3. Branch from it.

---

## Working agreement

- **Do not commit per task.** The controller commits once at the end.
- **No render tests** — Jest 27 cannot parse `axios@1.7.7`'s ESM entry; 7 of 9 suites already fail on `master`.
- **Test command:** `CI=true npx react-app-rewired test --watchAll=false 2>&1 | grep -E "^(PASS|FAIL)|^Test Suites:|^Tests:"`. Never pipe jest to `tail` and read `$?`.
- **Build gate:** `npm run build` (plain, never `CI=true`).
- **Baseline:** `7 failed, 4 passed, 11 total` / `33 passed, 33 total`.
- **SCSS:** edit only `src/index.module.scss`, then `npm run build-css`.

---

## Design values (measured from Figma — do not invent)

**Balance rows** (`372:1845`–`372:1857`): each row is an independent flex row with `gap: 8px`. Label is `20px` weight 700, `line-height: 22px`, `#000`, `white-space: nowrap`. Value is `20px` weight 400, `line-height: 22px`, `#000`. The value box hugs its content — **no explicit max-width**.

The hanging indent (continuation line aligning under the value's first character, not under the label) is a **free consequence of flex layout**: both lines live inside one flex item that begins after the label plus gap. Do not add an explicit indent or margin.

**History `Value` column** (`372:2193`/`372:2195`): `20px` regular, `line-height: 22px`, `text-align: right`. Both lines of a wrapped value sit flush to the same right edge.

**Two important caveats about the mock:**

1. The wrapped values in Figma are **hand-authored line breaks** — two separate `<p>` nodes, each `white-space: nowrap`. The designer chose the break point to illustrate the effect; it is **not** a specification of where CSS should break. Implement live wrapping and let the break fall where the container width dictates.
2. The table's header columns and body columns are laid out independently in the mock (header pitch 334px; body columns content-hugged and differing per row). **Do not lift a fixed column width from Figma** — the design never committed to one.

**Confirmed:** no `text-overflow`, no truncation, no reduced font size anywhere in the frame at any content length. The ellipsis in the ID column is literal text typed by the designer, not a CSS pattern to copy.

---

## Explicitly out of scope

The Figma frame also differs from the shipped app in ways this PR must **not** change:

- Figma renders history values at `20px` in the default sans font; the app uses `font-family: monospace; font-size: 1.2rem` (`src/index.css`, `#token-history .value`).
- Figma uses `#41A922` / `#A92224` for received/sent; the app uses `#28a745` / `#dc3545`.

The brief for this screen is wrapping only. Leave the font and colours alone and note the divergence in the PR description so the designer can confirm.

---

## Task 1: Balance block wrapping

**Files:** Modify `src/components/WalletBalance.js`, `src/index.module.scss`

Today each row is `<p><strong>Total:</strong> <Amount ... /></p>`. In a plain paragraph the continuation line wraps back to the paragraph's left edge — under the label — instead of under the value.

- [ ] **Step 1: Make each row a flex row**

In `src/components/WalletBalance.js`, replace the three rows inside `renderBalance` with:

```jsx
        <div className="wallet-balance-row">
          <strong className="wallet-balance-label">{t`Total:`}</strong>
          <Amount value={balance.available + balance.locked} symbol={symbol} isNFT={isNFT} />
        </div>
        <div className="wallet-balance-row">
          <strong className="wallet-balance-label">{t`Available:`}</strong>
          <Amount value={balance.available} symbol={symbol} isNFT={isNFT} />
        </div>
        <div className="wallet-balance-row">
          <strong className="wallet-balance-label">{t`Locked:`}</strong>
          <Amount value={balance.locked} symbol={symbol} isNFT={isNFT} />
        </div>
```

- [ ] **Step 2: Add the SCSS**

Append to `src/index.module.scss`:

```scss
/* Dashboard balance rows */
.wallet-balance {
  &-row {
    display: flex;
    align-items: flex-start;
    gap: 8px;
    // Bootstrap's paragraph spacing used to provide this; the rows are divs now.
    margin-bottom: 1rem;

    // The value is the flex item, so its wrapped continuation lines align under
    // the value's first character rather than under the label. This is the
    // hanging indent from the design — it needs no explicit indent.
    .amount {
      min-width: 0;
    }
  }

  &-label {
    white-space: nowrap;
    flex-shrink: 0;
  }
}
```

- [ ] **Step 3: Rebuild** — `npm run build-css`, confirm `.wallet-balance-row` is in `src/index.css`.

- [ ] **Step 4: Check the spacing did not regress**

The previous `<p>` elements inherited Bootstrap's `margin-bottom: 1rem`. The `margin-bottom` above restores it. Compare the rendered spacing against `master` and report any difference.

---

## Task 2: History `Value` column wrapping

**Files:** Modify `src/index.module.scss`

The `Value` cell already renders `<Amount>`, which carries `overflow-wrap: anywhere`. Two things can still defeat it: the cell collapsing to an unusably narrow width, and the table forcing a single line.

- [ ] **Step 1: Add the column rules**

Append to `src/index.module.scss`:

```scss
/* Transaction history value column */
#token-history .value {
  // Long amounts wrap onto a second line, right-aligned, and are never
  // shrunk or ellipsized. min-width stops the column collapsing so far that
  // the value breaks earlier than it needs to.
  min-width: 12rem;
  white-space: normal;
}
```

Do **not** set an explicit `width` — the Figma columns are content-hugged and vary per row, so a fixed width would be inventing a value the design never specified.

`text-align: right` and the monospace font are already applied by the existing `#token-history .value` rule in `src/index.css`; that rule is compiled from `src/index.module.scss`, so check whether the block already exists there and extend it rather than adding a duplicate selector.

- [ ] **Step 2: Rebuild and confirm** — `npm run build-css`, then verify there is exactly one `#token-history .value` rule in the compiled output, with the merged declarations.

---

## Task 3: Verification

- [ ] **Step 1: Suite and build** — baseline unchanged, no warning naming a touched file.

- [ ] **Step 2: Confirm no truncation remains**

Run: `grep -rn "text-overflow\|white-space: *nowrap" src/index.module.scss`

Review every hit. None may apply to an element that renders an amount. `.wallet-balance-label` legitimately uses `nowrap` — that is the label, not the value.

- [ ] **Step 3: Manual QA** (a human runs this; list it in the PR body)

Use a wallet holding a very large balance, or temporarily stub one, so values reach roughly `123,456,789,012,345,678.12345678`.

  - Dashboard `Total` / `Available` / `Locked`: the value wraps to a second line, and the second line starts under the **value**, not under the label.
  - Narrow the window to roughly 900px: values still wrap, never clip, never ellipsize, never shrink.
  - History `Value` column: long values wrap to two lines, both flush right, and the column does not collapse.
  - Short values are unchanged from `master`.
  - Row spacing in the balance block matches `master`.

---

## Out of scope

- Font family, font size and colour of history values (see above).
- The transaction overview modal — PR5.
- Deposit and fee labels — PR6.
