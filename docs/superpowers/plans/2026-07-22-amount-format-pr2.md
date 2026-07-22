# Amount Format — PR2 Implementation Plan (Convert remaining call sites)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Convert every remaining direct `numberUtils.prettyValue` call to the shared amount layer, so the user's format preference applies consistently across the whole wallet.

**Architecture:** No new abstractions. PR1 built `formatAmount` / `resolveAmountFormat` (`src/utils/amount.js`), `useAmountFormat` (`src/hooks/`) and `<Amount>` (`src/components/`). This PR is a mechanical sweep onto them. Behaviour is unchanged while the feature flag is off, which it is by default.

**Tech Stack:** React 17 (mixed function + class components), Redux, `@hathor/wallet-lib`.

**Spec:** `docs/superpowers/specs/2026-07-21-amount-format-design.md`
**Depends on:** PR1 (`raul-oliveira/feat/amount-format`) — branch from it, not from `master`.

---

## Working agreement

- **Do not commit per task.** Accumulate in the working tree; the controller commits once at the end.
- **Do not write render tests.** Jest 27 cannot parse `axios@1.7.7`'s ESM entry, so any test importing `@hathor/wallet-lib` fails; 7 of 9 suites already fail on `master`. Unit tests for pure functions are fine.
- **Test command:** `CI=true npx react-app-rewired test --watchAll=false 2>&1 | grep -E "^(PASS|FAIL)|^Test Suites:|^Tests:"`. Never pipe jest to `tail` and read `$?` — a pipeline returns the last command's exit code and falsely reports success.
- **Build/lint gate:** `npm run build` (plain, never `CI=true npm run build` — that fails on a pre-existing LavaMoat policy drift).
- **Baseline to match:** `7 failed, 4 passed, 11 total` / `33 passed, 33 total`.
- **`src/components/InputNumber.js` is never touched.** Editable inputs are always expanded.

---

## The three APIs

| API | Import | Use when | Returns |
| --- | --- | --- | --- |
| `<Amount value symbol isNFT />` | `src/components/Amount.js` | The result is rendered as a React child | element |
| `useAmountFormat()` → `formatValue(v, {isNFT})` | `src/hooks/useAmountFormat.js` | **Function** component needing a string | string |
| `formatAmount(v, {decimalPlaces, isNFT, amountFormat})` | `src/utils/amount.js` | **Class** component or plain module needing a string | string |

**Class components must mask the flag.** Add to `mapStateToProps`:

```js
  amountFormat: resolveAmountFormat(
    state.amountFormat,
    state.featureToggles[AMOUNT_FORMAT_FEATURE_TOGGLE]
  ),
```
importing `resolveAmountFormat` from `../utils/amount` and `AMOUNT_FORMAT_FEATURE_TOGGLE` from `../constants`. Never pass `state.amountFormat` raw — that bypasses the feature flag and was a real bug caught in PR1 review.

**Putting a `<Amount>` element into a template literal renders `[object Object]`.** Every site below is pre-classified; trust the classification but sanity-check the surrounding line before editing.

---

## Task 1: Reown components (JSX-rendered strings)

All five are **function** components; the helper lives inside the component, so use the hook.

**Files:** `src/components/Reown/TransactionFees.js`, `Reown/NanoContractActions.js`, `Reown/modals/SendTransactionModal.js`, `Reown/modals/GetUtxosModal.js`, `Reown/modals/BaseNanoContractModal.js`

- [ ] **Step 1: `TransactionFees.js`**

Line 23 assigns `const formattedFee = numberUtils.prettyValue(fee);` and line 35 renders `<span>{formattedFee} {symbol}</span>`. Delete line 23 and replace line 35's content with:

```jsx
          <span><Amount value={fee} symbol={symbol} /></span>
```

Import `Amount from '../Amount'`. Note the original called `prettyValue(fee)` with **no** decimal-places argument, so it used the lib default; `<Amount>` uses the wallet's configured `decimalPlaces` from redux. That is the intended correction — call it out in your report.

- [ ] **Step 2: `NanoContractActions.js`**

Add `import { useAmountFormat } from '../../hooks/useAmountFormat';` and `const formatValue = useAmountFormat();` at the top of the component body. Replace the body of `formatAmount` (line ~91-93) so it returns:

```js
      return formatValue(amount, { isNFT: isNft });
```

Keep the existing `isNft` variable exactly as it is computed today.

- [ ] **Step 3: `SendTransactionModal.js`**

Same pattern. Replace line ~119 inside `formatValue` with the hook's formatter — rename the local helper if it now collides with the hook result (e.g. call the hook result `formatAmountValue`). Preserve the existing `isNFT` computation.

- [ ] **Step 4: `GetUtxosModal.js`**

Same pattern for the `formatAmount` helper at line ~63-67, preserving its `isNFT` computation.

- [ ] **Step 5: `BaseNanoContractModal.js`**

Line 114 assigns into the `let displayValue` chain that other branches fill with template strings and which is rendered at line 137 as `{displayValue}`. It must stay a **string**. Add the hook and replace line 114 with:

```js
      displayValue = formatValue(value);
```

- [ ] **Step 6: Verify**

Run the test suite and `npm run build`. Confirm the baseline is unchanged and no warning names these files.

---

## Task 2: Reown `CreateTokenRequestData.js` (module-level helper — needs restructuring)

**Files:** `src/components/Reown/CreateTokenRequestData.js`

`formatAmount` is defined at **module scope** (line 17), outside the component, so it cannot call a hook. Its results feed template literals at lines 181 and 187, so it must keep returning a string.

- [ ] **Step 1: Move the helper inside the component**

Delete the module-level `const formatAmount = (amount) => {...}` at line 17. Inside the component body add:

```js
  const formatValue = useAmountFormat();
```
importing `useAmountFormat` from `../../hooks/useAmountFormat`.

- [ ] **Step 2: Update the three call sites**

- Line ~118: `<TokenParameter label={t\`Amount\`} value={formatValue(data.amount)} />`
- Line ~181: `` value={`${formatValue(data.deposit)} ${DEFAULT_TOKEN_SYMBOL}`} ``
- Line ~187: `` value={data.fee ? `${formatValue(data.fee)} ${DEFAULT_TOKEN_SYMBOL}` : '-'} ``

If any of these sit outside the component body after the move, STOP and report — the restructuring assumption is wrong.

- [ ] **Step 3: Verify** — suite + build unchanged.

---

## Task 3: Atomic swap and nano contract screens (pure JSX)

**Files:** `src/screens/atomic-swap/EditSwap.js`, `src/components/atomic-swap/ProposalBalanceTable.js`, `src/components/atomic-swap/ModalAtomicSend.js`, `src/screens/nano-contract/NanoContractDetail.js`

- [ ] **Step 1: `EditSwap.js`** — two JSX sites.

Line 137 → `<Amount value={input.value} />`
Line 156 → `<td className="text-right"><Amount value={output.value} /></td>`

Import `Amount from '../../components/Amount'`.

- [ ] **Step 2: `ProposalBalanceTable.js`** — line 31 is JSX:

```jsx
            return <span><Amount value={amount} /> <b>{symbol}</b></span>
```

Keep the symbol in its existing `<b>` rather than moving it into `<Amount>`; the bold styling is deliberate.

- [ ] **Step 3: `ModalAtomicSend.js`** — line 66 is a **STRING** (it feeds `setAmount`, component state). Use the hook:

```js
        setAmount(formatValue(newAmount));
```

- [ ] **Step 4: `NanoContractDetail.js`** — line 162 is JSX:

```jsx
          <p><strong>Amount: </strong><Amount value={typeof amount.value === 'bigint' ? amount.value : BigInt(amount.value)} /></p>
```

- [ ] **Step 5: Verify** — suite + build unchanged.

---

## Task 4: `NFTListElement.js` (class component, JSX)

**Files:** `src/components/NFTListElement.js`

Line 102 renders inside a conditional. NFT balances are integer-valued and the original hardcodes `0` decimal places, so pass `isNFT`:

```jsx
              { this.props.nftElement.balance.status === TOKEN_DOWNLOAD_STATUS.READY && <Amount value={this.props.nftElement.balance.data.available} isNFT /> }
```

- [ ] **Step 1:** Make the edit, importing `Amount from './Amount'`.
- [ ] **Step 2:** Verify — suite + build unchanged. No `mapStateToProps` change needed; `<Amount>` reads redux itself.

---

## Task 5: `ModalTokenImport.js` (STRING)

**Files:** `src/components/ModalTokenImport.js`

`ModalTokenImport` is a **function** component (`export default function ModalTokenImport({ onClose, manageDomLifecycle })`, line 59) and the balance helper containing line 271 is defined inside it, so the hook applies.

- [ ] **Step 1: Add the hook**

```js
import { useAmountFormat } from '../hooks/useAmountFormat';
```
and in the component body, next to the existing `useSelector` calls:

```js
  const formatValue = useAmountFormat();
```

- [ ] **Step 2: Replace the return at line ~271**

```js
    return `${formatValue(total)} ${symbol}`;
```

The existing `const decimalPlaces = useSelector((state) => state.serverInfo.decimalPlaces);` at line 67 becomes unused if nothing else in the file references it — check, and remove it only if fully unused.

- [ ] **Step 3:** Verify — suite + build unchanged.

---

## Task 6: `tokens/TokenMint.js` and `tokens/TokenMelt.js` (class components, STRING)

Both are class components whose values feed user-facing message strings.

**Files:** `src/components/tokens/TokenMint.js`, `src/components/tokens/TokenMelt.js`

- [ ] **Step 1: Add masked `amountFormat` to both `mapStateToProps`**

Using the `resolveAmountFormat` snippet from the top of this plan.

- [ ] **Step 2: Add a `formatValue` instance method to each class**

```js
  formatValue = (value) => formatAmount(value, {
    decimalPlaces: this.props.decimalPlaces,
    isNFT: this.isNFT(),
    amountFormat: this.props.amountFormat,
  });
```

- [ ] **Step 3: `TokenMint.js`**

Line 97 → `const prettyAmountValue = this.formatValue(this.state.amount);`

Line 205 contains **two** amounts inside one template literal. The `getDepositAmount(...)` call is handled in Task 7; the second is the HTR balance, which is **HTR, not the token** — it must NOT receive the token's `isNFT`. Replace it with a bare `formatAmount` call:

```js
formatAmount(this.props.htrBalance, { decimalPlaces: this.props.decimalPlaces, amountFormat: this.props.amountFormat })
```

- [ ] **Step 4: `TokenMelt.js`**

Line 90 → `const prettyAmountValue = this.formatValue(this.state.amount);`
Line 104 → `const prettyWalletAmount = this.formatValue(walletAmount);`

- [ ] **Step 5: Verify** — suite + build unchanged.

---

## Task 7: `utils/tokens.js` — thread the format through a plain module

**Files:** `src/utils/tokens.js`, `src/screens/CreateToken.js`, `src/components/tokens/TokenMint.js`

`getDepositAmount(mintAmount, depositPercent, decimalPlaces)` is a plain module function returning a **string**, consumed by template literals at `CreateToken.js:330` and `TokenMint.js:205`. It cannot read redux, so the caller must pass the format.

- [ ] **Step 1: Add the parameter**

```js
  getDepositAmount(mintAmount, depositPercent, decimalPlaces, amountFormat) {
    if (mintAmount) {
      const deposit = hathorLib.tokensUtils.getDepositAmount(mintAmount, depositPercent);
      return formatAmount(deposit, { decimalPlaces, amountFormat });
    }
    return '0';
  },
```

Import `formatAmount` from `./amount`. Update the JSDoc to document `amountFormat`. Note the deposit is always HTR, so no `isNFT`.

Making `amountFormat` the last parameter keeps it optional — omitting it falls back to `AMOUNT_FORMAT_DEFAULT` (expanded), so any caller you miss degrades safely rather than crashing.

- [ ] **Step 2: `CreateToken.js:330`** — a function component that already calls `useAmountFormat`. It needs the raw preference value, not the bound formatter, so read it alongside:

```js
  const amountFormat = useSelector(state => resolveAmountFormat(
    state.amountFormat,
    state.featureToggles[AMOUNT_FORMAT_FEATURE_TOGGLE]
  ));
```

then pass `amountFormat` as the fourth argument.

- [ ] **Step 3: `TokenMint.js:205`** — pass `this.props.amountFormat` (already masked by Task 6 Step 1) as the fourth argument.

- [ ] **Step 4: Verify** — suite + build unchanged.

---

## Task 8: `utils/nanoContracts.js` (returns mixed string | JSX)

**Files:** `src/utils/nanoContracts.js`

The enclosing function already returns JSX from a sibling branch (`<SignedDataDisplay value={value} />` at line ~96), so its consumers must already render JSX. The Amount branch can therefore return an element.

- [ ] **Step 1:** Replace line 92 with:

```jsx
      return <Amount value={value} />;
```

importing `Amount from '../components/Amount'`. The `decimalPlaces` parameter may become unused in this function — leave the signature alone, later cleanup removes it.

- [ ] **Step 2: Confirm the assumption**

Grep this function's call sites and verify every consumer renders the result as JSX. If **any** consumer puts it in a string, revert to threading `amountFormat` through as a parameter like Task 7 and report the deviation.

- [ ] **Step 3: Verify** — suite + build unchanged.

---

## Task 9: `screens/SendTokens.js` (STRING)

**Files:** `src/screens/SendTokens.js`

Line 147 builds `requiredAmount` for a user-facing message. Function component → use the hook. The amount is HTR (a fee total), so no `isNFT`:

```js
        const requiredAmount = formatValue(totalFee + outgoingHTR);
```

- [ ] **Step 1:** Add `useAmountFormat` and make the edit.
- [ ] **Step 2: Verify** — suite + build unchanged.

---

## Task 10: Final sweep and verification

- [ ] **Step 1: Confirm nothing is left behind**

Run: `grep -rn "prettyValue" src/ | grep -v "InputNumber.js" | grep -v "__tests__" | grep -v "utils/amount.js"`

Expected: **no output**. `src/utils/amount.js` legitimately retains the single wrapped call plus doc comments; `InputNumber.js` is intentionally excluded.

- [ ] **Step 2: Confirm no raw preference reads**

Run: `grep -rn "state.amountFormat" src/`

Every hit must be inside `useAmountFormat.js`, wrapped in `resolveAmountFormat(...)`, in `Settings.js` (safe — gated at render), or in a test.

- [ ] **Step 3: Remove dead imports**

For every file touched, check whether `numberUtils` / `hathorLib` is still referenced. Remove the import only if fully unused; leave it otherwise. `npm run build` surfaces unused-variable warnings — treat any naming a touched file as a defect.

- [ ] **Step 4: Full verification**

Test suite: `7 failed, 4 passed, 11 total` / `33 passed, 33 total`, with the same 7 pre-existing failures.
Build: `Compiled with warnings.`, no warning naming a touched file.
`git status --short`: `package.json`, `package-lock.json`, `src/storage.js`, `src/components/InputNumber.js` all unmodified.

- [ ] **Step 5: Extract strings**

Run `make update_pot`. Expect little or no change — this PR adds no new user-facing strings. Report anything unexpected.

---

## Call-site inventory (pre-classified)

| File:line | Kind | Context | API | Notes |
| --- | --- | --- | --- | --- |
| `Reown/TransactionFees.js:23` | fn | JSX | `<Amount>` | had no decimalPlaces arg |
| `Reown/NanoContractActions.js:93` | fn | JSX-rendered string | hook | keep `isNft` |
| `Reown/modals/SendTransactionModal.js:119` | fn | JSX-rendered string | hook | keep `isNFT` |
| `Reown/modals/GetUtxosModal.js:66` | fn | JSX-rendered string | hook | keep `isNFT` |
| `Reown/modals/BaseNanoContractModal.js:114` | fn | STRING | hook | shared `let displayValue` |
| `Reown/CreateTokenRequestData.js:20` | module-level helper | STRING | hook, after moving inside | feeds template literals |
| `screens/atomic-swap/EditSwap.js:137,156` | fn | JSX | `<Amount>` | |
| `atomic-swap/ProposalBalanceTable.js:31` | fn | JSX | `<Amount>` | keep `<b>{symbol}</b>` |
| `atomic-swap/ModalAtomicSend.js:66` | fn | STRING | hook | feeds `setAmount` |
| `screens/nano-contract/NanoContractDetail.js:162` | fn | JSX | `<Amount>` | |
| `NFTListElement.js:102` | class | JSX | `<Amount isNFT>` | hardcoded 0 decimals today |
| `ModalTokenImport.js:271` | fn | STRING | hook | helper is inside the component |
| `tokens/TokenMint.js:97` | class | STRING | `this.formatValue` | |
| `tokens/TokenMint.js:205` | class | STRING | bare `formatAmount` | **HTR balance — no isNFT** |
| `tokens/TokenMelt.js:90,104` | class | STRING | `this.formatValue` | |
| `utils/tokens.js:122` | module | STRING | param-threaded | **HTR deposit — no isNFT** |
| `utils/nanoContracts.js:92` | module | JSX | `<Amount>` | sibling branch returns JSX |
| `screens/SendTokens.js:147` | fn | STRING | hook | **HTR fee — no isNFT** |

---

## Out of scope

- `src/components/InputNumber.js` — always expanded, never migrated.
- Removing now-unused `decimalPlaces` props and `mapStateToProps` entries — a later cleanup.
- Any layout or wrapping change — PRs 4–6.
