# Amount Format — PR5 Implementation Plan (Transaction overview wrapping)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Stop the transaction overview modal clipping long amounts. Per-output amounts and the "You will pay" total wrap instead of being forced onto one line.

**Architecture:** Layout only, on the modal's **current** structure. No formatting logic changes, no structural redesign.

**Figma:** [as-is `318:4172`](https://www.figma.com/design/2xRserWXaSJAgkbiQlPzhr/Amounts-Update?node-id=318-4172) / [to-be `323:196`](https://www.figma.com/design/2xRserWXaSJAgkbiQlPzhr/Amounts-Update?node-id=323-196)
**Depends on:** PR4. Branch from it.

---

## ⚠️ Read this before starting: one requirement is parked

The original brief asked for the value font size to "adapt based on what the wallet-mobile does". Figma defines that precisely — but on an element the desktop modal **does not have**.

Measured from Figma:

| Element | as-is | to-be |
| --- | --- | --- |
| Headline amount (`323:193` / `323:249`) | **24px** SF Pro Text Heavy, black, centered | **16px**, same weight and colour |
| `available` sub-line (`323:194` / `323:250`) | 12px SF Pro Text Semibold, `#8E8E93` | unchanged |
| Total value (`323:291`) | 14px, single line | **14px, wraps to two lines — never shrinks** |

So the design shrinks **only** a headline amount, 24px → 16px, and never shrinks the total. The shipped desktop modal (`src/components/ModalTransactionOverview.js`) has no headline amount — it opens straight into the per-output list — so those two numbers have nothing to apply to.

**Decision pending.** Until it is made, this PR ships **wrapping only** and adds no adaptive font sizing. The three candidate resolutions are recorded in the "Open questions" section of `docs/superpowers/specs/2026-07-21-amount-format-design.md`. Do not invent a base/floor pair for the per-output rows.

If you are executing this plan and the decision has since been made, stop and ask for an updated plan rather than improvising.

---

## Working agreement

- **Do not commit per task.** The controller commits once at the end.
- **No render tests** — Jest 27 cannot parse `axios@1.7.7`'s ESM entry.
- **Test command:** `CI=true npx react-app-rewired test --watchAll=false 2>&1 | grep -E "^(PASS|FAIL)|^Test Suites:|^Tests:"`. Never pipe jest to `tail` and read `$?`.
- **Build gate:** `npm run build` (plain, never `CI=true`).
- **Baseline:** `7 failed, 4 passed, 11 total` / `33 passed, 33 total`.
- **Do not restructure the modal.** No headline amount, no `To:` row, no collapsible fee breakdown, no `Privacy fee` line — the last implies a feature that does not exist on desktop.

---

## Task 1: Per-output amounts wrap

**Files:** Modify `src/components/ModalTransactionOverview.js`

The output rows render an address on the left and an amount plus a direction arrow on the right. The amount `<span>` sets `whiteSpace: 'nowrap'`, which is what clips long values today.

- [ ] **Step 1: Locate the row**

Find the amount `<span>` inside `renderOutput` — it is the one carrying `fontWeight: 500, color: '#404040', marginLeft: '12px', whiteSpace: 'nowrap', fontSize: '14px'`. Line numbers have shifted across PRs 1–4; locate by content.

- [ ] **Step 2: Let it wrap**

Remove `whiteSpace: 'nowrap'` from that span's style object and add `overflowWrap: 'anywhere'` plus `minWidth: 0`. Keep every other declaration.

The address span beside it already has `wordBreak: 'break-all', minWidth: 0, flex: 1`. Give the amount span a `flexShrink: 0` **only if** testing shows the address squeezing the amount to nothing; otherwise leave the flex behaviour alone and say so.

- [ ] **Step 3: Keep the arrow on the last line**

The direction arrow `<i>` sits inside the same span. Confirm that when the amount wraps, the arrow stays adjacent to the final line rather than being orphaned. If it detaches badly, wrap the numeric part in its own `<span>` and leave the arrow as a sibling — report if you needed this.

---

## Task 2: "You will pay" total wraps

**Files:** Modify `src/components/ModalTransactionOverview.js`

Figma node `323:291` gives exact values for this element, and confirms it does **not** shrink:

| Property | Value |
| --- | --- |
| font-size | `14px` |
| font-weight | `500` (semibold) |
| colour | `#404040` |
| line-height | `20px` |
| text-align | `right` |
| wrapping | `word-break: break-word`, wraps to as many lines as needed |

- [ ] **Step 1: Update the value span**

In `renderTotalPayment`, the value span currently sets `fontSize: '14px', fontWeight: 500, color: '#404040'`. Add `lineHeight: '20px'`, `textAlign: 'right'`, `overflowWrap: 'anywhere'` and `minWidth: 0`.

- [ ] **Step 2: Let the flex row give it room**

The wrapper is `<div className="d-flex justify-content-between mb-4">`. A flex item will not shrink below its content width by default, which would push the row wider than the modal. Give the label span `flexShrink: 0` and the value span `minWidth: 0` so the value is the element that wraps.

- [ ] **Step 3: Check for a clipping ancestor**

Figma's equivalent container (`323:290`) sets `overflow-clip`. **Do not reproduce that** — a clipping parent defeats wrapping entirely. Verify no ancestor of this row in the modal sets `overflow: hidden`; if one does, report it rather than changing shared modal CSS unilaterally.

---

## Task 3: Network fee row

**Files:** Modify `src/components/ModalTransactionOverview.js`

`renderNetworkFeeValue` returns a span with `fontSize: '14px', fontWeight: 500, color: '#404040'`. It has no `nowrap`, so it should already wrap — but its flex row needs the same treatment as Task 2.

- [ ] **Step 1:** Confirm the fee row's label has `flexShrink: 0` and the value has `minWidth: 0`. Add them if missing.
- [ ] **Step 2:** Leave the "No fee" pill alone — it is a fixed-width badge, not an amount.

---

## Task 4: Verification

- [ ] **Step 1: Suite and build** — baseline unchanged, no warning naming this file.

- [ ] **Step 2: Confirm no `nowrap` remains on an amount**

Run: `grep -n "nowrap" src/components/ModalTransactionOverview.js`

Any remaining hit must be on a non-amount element. Report each with its purpose.

- [ ] **Step 3: Manual QA** (a human runs this; list it in the PR body)

Trigger the modal from Send Tokens with an amount near `123,456,789,012,345,678.12345678`:

  - The per-output amount wraps rather than clipping, and the direction arrow stays with the final line.
  - "You will pay" wraps across lines, right-aligned, and does not widen the modal.
  - With multiple tokens plus a fee, the joined total (`"… AAA + … HTR"`) wraps sensibly.
  - The modal does not grow wider than its `modal-dialog` and no horizontal scrollbar appears.
  - Short amounts look identical to `master`.
  - The PIN field, Cancel and Confirm are unaffected.

---

## Out of scope

- **Adaptive font sizing** — parked, see the top of this plan.
- Any structural change to the modal.
- The `Privacy fee` line from the mock — no such feature on desktop.
