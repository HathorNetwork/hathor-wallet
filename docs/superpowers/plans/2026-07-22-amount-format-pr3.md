# Amount Format — PR3 Implementation Plan (Shared Radio components + Address Mode restyle)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task.

**Goal:** Extract the duplicated radio-selector and save-button markup from the Amount Format and Address Mode modals into shared components, then restyle Address Mode onto them — without changing any of its behaviour.

**Architecture:** Four new presentational components under `src/components/Radio/` plus `PreferenceSaveButton`, mirroring the decomposition shipped in wallet-mobile#893 but adapted to desktop React + SCSS + Bootstrap. Both modals become thin: they own state and behaviour, the shared components own presentation.

**Spec:** `docs/superpowers/specs/2026-07-21-amount-format-design.md`
**Depends on:** PR2. Branch from it.

---

## Working agreement

- **Do not commit per task.** The controller commits once at the end.
- **Do not write render tests** — Jest 27 cannot parse `axios@1.7.7`'s ESM entry; 7 of 9 suites already fail on `master`.
- **Test command:** `CI=true npx react-app-rewired test --watchAll=false 2>&1 | grep -E "^(PASS|FAIL)|^Test Suites:|^Tests:"`. Never pipe jest to `tail` and read `$?`.
- **Build gate:** `npm run build` (plain, never `CI=true`).
- **Baseline:** `7 failed, 4 passed, 11 total` / `33 passed, 33 total`.
- **SCSS:** edit only `src/index.module.scss`, then `npm run build-css`. Never hand-edit `src/index.css`.
- **This is a refactor.** Amount Format must look pixel-identical afterwards. Address Mode changes appearance but **not behaviour**.

---

## Reference: the mobile decomposition (wallet-mobile#893)

Adapt this API; do not copy the React Native implementation.

```
RadioGroup({ value, onChange, options })
  options: Array<{ value, title, description?, hint?, badge?, disabled? }>
  → a bordered card; renders a divider between consecutive options

RadioOption({ selected, onPress, disabled, title, badge, description, hint })
  → radio circle + title row (title + optional badge pill) + optional description + optional italic hint

RadioButton({ selected, disabled })
  → just the circle

PreferenceSaveButton({ title, onPress, disabled })
  → the full-width primary save button
```

Desktop adaptations: `onPress` → `onClick`; RN `StyleSheet` → SCSS classes; `TouchableOpacity`/`View`/`Text` → `div`/`span`/`p`; the radio circle stays a real `<input type="radio">` styled with `appearance: none` (as both modals already do) so keyboard and screen-reader behaviour is preserved.

---

## Task 1: `RadioButton`

**Files:** Create `src/components/Radio/RadioButton.js`

- [ ] **Step 1: Write the component**

```jsx
/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * The radio circle itself. A real input so keyboard and assistive tech work;
 * `appearance: none` in SCSS replaces the native rendering.
 *
 * @memberof Components
 */
function RadioButton({ id, name, selected, disabled, onChange }) {
  return (
    <input
      type="radio"
      id={id}
      name={name}
      className="radio-button"
      checked={selected}
      disabled={disabled}
      onChange={onChange}
    />
  );
}

RadioButton.propTypes = {
  id: PropTypes.string.isRequired,
  name: PropTypes.string.isRequired,
  selected: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  onChange: PropTypes.func.isRequired,
};

RadioButton.defaultProps = {
  disabled: false,
};

export default RadioButton;
```

---

## Task 2: `RadioOption`

**Files:** Create `src/components/Radio/RadioOption.js`

- [ ] **Step 1: Write the component**

```jsx
/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import RadioButton from './RadioButton';

/**
 * A selectable row: radio circle, a title row carrying an optional badge pill,
 * an optional description and an optional muted italic hint.
 *
 * @memberof Components
 */
function RadioOption({ name, value, selected, disabled, onSelect, title, badge, description, hint }) {
  const inputId = `${name}-${value}`;
  const handleSelect = () => {
    if (!disabled) {
      onSelect(value);
    }
  };

  const renderBadge = () => {
    if (!badge) {
      return null;
    }
    return <span className="radio-option-badge">{badge}</span>;
  };

  const renderDescription = () => {
    if (!description) {
      return null;
    }
    return <p className="radio-option-description">{description}</p>;
  };

  const renderHint = () => {
    if (!hint) {
      return null;
    }
    return <span className="radio-option-hint">{hint}</span>;
  };

  return (
    <div
      className={`radio-option ${disabled ? 'radio-option--disabled' : ''}`}
      onClick={handleSelect}
    >
      <RadioButton
        id={inputId}
        name={name}
        selected={selected}
        disabled={disabled}
        onChange={handleSelect}
      />
      <div className="radio-option-body">
        <div className="radio-option-header">
          <label className="radio-option-title" htmlFor={inputId}>{title}</label>
          {renderBadge()}
        </div>
        {renderDescription()}
        {renderHint()}
      </div>
    </div>
  );
}

RadioOption.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  selected: PropTypes.bool.isRequired,
  disabled: PropTypes.bool,
  onSelect: PropTypes.func.isRequired,
  title: PropTypes.node.isRequired,
  badge: PropTypes.node,
  description: PropTypes.node,
  hint: PropTypes.node,
};

RadioOption.defaultProps = {
  disabled: false,
  badge: null,
  description: null,
  hint: null,
};

export default RadioOption;
```

Note the render helpers rather than inline ternaries — a project convention (`CLAUDE.md`: "Nas funcoes que renderizam JSX, evite usar if ternarios, prefira funcoes para isso").

---

## Task 3: `RadioGroup` and the barrel

**Files:** Create `src/components/Radio/RadioGroup.js`, `src/components/Radio/index.js`

- [ ] **Step 1: `RadioGroup.js`**

```jsx
/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import RadioOption from './RadioOption';

/**
 * A bordered card grouping radio options, separated by dividers. Controlled:
 * the caller owns the selected value and receives it back through onChange.
 *
 * @memberof Components
 */
function RadioGroup({ name, value, onChange, options }) {
  return (
    <div className="radio-group">
      {options.map((option, index) => (
        <React.Fragment key={option.value}>
          {index > 0 && <hr className="radio-group-divider" />}
          <RadioOption
            name={name}
            value={option.value}
            selected={value === option.value}
            disabled={option.disabled}
            onSelect={onChange}
            title={option.title}
            badge={option.badge}
            description={option.description}
            hint={option.hint}
          />
        </React.Fragment>
      ))}
    </div>
  );
}

RadioGroup.propTypes = {
  name: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  options: PropTypes.arrayOf(PropTypes.shape({
    value: PropTypes.string.isRequired,
    title: PropTypes.node.isRequired,
    description: PropTypes.node,
    hint: PropTypes.node,
    badge: PropTypes.node,
    disabled: PropTypes.bool,
  })).isRequired,
};

export default RadioGroup;
```

- [ ] **Step 2: `index.js`**

```js
/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export { default as RadioButton } from './RadioButton';
export { default as RadioOption } from './RadioOption';
export { default as RadioGroup } from './RadioGroup';
```

---

## Task 4: `PreferenceSaveButton`

**Files:** Create `src/components/PreferenceSaveButton.js`

- [ ] **Step 1: Write the component**

```jsx
/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';

/**
 * The primary save button shared by the preference modals. Renders only the
 * button; the caller supplies its own container and spacing.
 *
 * @memberof Components
 */
function PreferenceSaveButton({ title, onClick, disabled }) {
  return (
    <button
      type="button"
      className={`preference-save-btn ${disabled ? '' : 'preference-save-btn--active'}`}
      disabled={disabled}
      onClick={onClick}
    >
      {title}
    </button>
  );
}

PreferenceSaveButton.propTypes = {
  title: PropTypes.node.isRequired,
  onClick: PropTypes.func.isRequired,
  disabled: PropTypes.bool,
};

PreferenceSaveButton.defaultProps = {
  disabled: false,
};

export default PreferenceSaveButton;
```

---

## Task 5: Shared SCSS

**Files:** Modify `src/index.module.scss`

The `.amount-format-*` and `.address-mode-*` blocks currently duplicate the radio circle, option card, option typography and save button almost line for line. Hoist those into shared blocks.

- [ ] **Step 1: Add the shared blocks**

```scss
/* Shared radio selector, used by the preference modals */
.radio-group {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 24px 16px;

  &-divider {
    margin: 24px 0;
    border-top: 1px solid #e5e7eb;
  }
}

.radio-option {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  cursor: pointer;

  &--disabled {
    cursor: default;

    .radio-option-title {
      color: #c4c4c4;
      cursor: default;
    }

    .radio-option-description,
    .radio-option-hint {
      color: #b0b0b0;
    }

    .radio-option-hint {
      font-style: normal;
    }
  }

  &-body {
    flex: 1;
    min-width: 0;
  }

  &-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
  }

  &-title {
    font-size: 16px;
    font-weight: 600;
    line-height: 20px;
    color: #000;
    margin-bottom: 4px;
    cursor: pointer;
  }

  &-description {
    font-size: 12px;
    line-height: 20px;
    color: #979797;
    margin-bottom: 0;
  }

  &-hint {
    font-size: 12px;
    line-height: 20px;
    font-style: italic;
    color: #57606a;
  }

  &-badge {
    background: #f2f3f5;
    border-radius: 8px;
    width: 69px;
    height: 23px;
    font-size: 12px;
    line-height: 20px;
    color: #6b7280;
    text-align: center;
    flex-shrink: 0;
    padding: 2px 0;
  }
}

.radio-button {
  appearance: none;
  -webkit-appearance: none;
  width: 26px;
  height: 26px;
  border: 2px solid #c4c4c4;
  border-radius: 50%;
  margin: 0;
  cursor: pointer;
  position: relative;
  flex-shrink: 0;

  &:checked {
    border-color: $purpleHathor;

    &::after {
      content: "";
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 13px;
      height: 13px;
      border-radius: 50%;
      background: $purpleHathor;
    }
  }

  &:disabled {
    border-color: #e0e0e0;
    cursor: default;
  }
}

.preference-save-btn {
  background: #e5e5e5;
  border: none;
  border-radius: 8px;
  padding: 16px;
  width: 226px;
  color: #b0b0b0;
  font-weight: 600;
  font-size: 14px;
  text-transform: uppercase;
  cursor: default;

  &--active {
    background: $purpleHathor;
    color: white;
    cursor: pointer;

    &:hover {
      background: $purpleHathorHover;
    }
  }
}
```

- [ ] **Step 2: Delete the superseded declarations**

Remove from the `.amount-format` block: `&-card`, `&-divider`, `&-option` (and all its nested rules including the `input[type=radio]` styling), `&-tag`, `&-save-btn`. **Keep** `&-modal .modal-dialog`, `&-description`, `&-preview-label`, `&-preview` and its children — those are Amount-Format-specific.

Remove from the `.address-mode-*` rules: `.address-mode-option` (and its `input[type=radio]` styling and `--disabled` variants), `.address-mode-label`, `.address-mode-description`, `.address-mode-hint`, `.address-mode-save-btn` (and `--active`). **Keep** `.address-mode-alert` — the warning banner is unique to Address Mode.

- [ ] **Step 3: Rebuild** — `npm run build-css`, then confirm `.radio-group`, `.radio-option`, `.radio-button` and `.preference-save-btn` are present in `src/index.css` and the deleted classes are gone.

---

## Task 6: Recompose `ModalAmountFormat` — zero visual change

**Files:** Modify `src/components/ModalAmountFormat.js`

- [ ] **Step 1: Replace the hand-rolled options with `RadioGroup`**

Delete the local `renderOption` helper. Import `RadioGroup from './Radio/RadioGroup'` and `PreferenceSaveButton from './PreferenceSaveButton'`, then render:

```jsx
            <RadioGroup
              name="amountFormat"
              value={selectedFormat}
              onChange={setSelectedFormat}
              options={[
                {
                  value: AMOUNT_FORMAT.EXPANDED,
                  title: t`Expanded`,
                  badge: t`Default`,
                  description: t`Standard notation. Leading zeros are written out in full (ex: 0.0000005195).`,
                },
                {
                  value: AMOUNT_FORMAT.COMPRESSED,
                  title: t`Compressed`,
                  description: t`Compresses leading zeros into a subscript count for shorter, easier-to-read small values (ex: 0.0₆5195).`,
                },
              ]}
            />
```

- [ ] **Step 2: Replace the save button**

```jsx
            <PreferenceSaveButton
              title={t`Save preferences`}
              disabled={!hasChanged}
              onClick={() => onSave(selectedFormat)}
            />
```

- [ ] **Step 3: Verify no visual change**

The PREVIEW block, the description paragraph and the modal lifecycle stay exactly as they are. Compare against the Figma frame `318:2469` — spacing, the `Default` pill, the divider and the radio circle must be unchanged.

---

## Task 7: Restyle `ModalAddressMode` — zero behaviour change

**Files:** Modify `src/components/ModalAddressMode.js`

This modal's behaviour is load-bearing. **Preserve all of it:**
- the `hasTxOutsideFirstAddress()` check on mount, and the `loading` state while it resolves
- `isSingleDisabled = (loading || hasTxOutside) && currentMode !== ADDRESS_MODE.SINGLE`
- the `.address-mode-alert` warning banner, shown only when `hasTxOutside`, including its `Learn more` link opened via `helpers.openExternalURL`
- save disabled unless `hasChanged && !loading`
- `onSave(selectedMode)` triggering the wallet reload in `Settings.js`

- [ ] **Step 1: Replace the two hand-rolled option blocks with `RadioGroup`**

```jsx
              <RadioGroup
                name="addressMode"
                value={selectedMode}
                onChange={setSelectedMode}
                options={[
                  {
                    value: ADDRESS_MODE.SINGLE,
                    title: t`Single Address`,
                    disabled: isSingleDisabled,
                    description: t`Your wallet will use only one address (index 0).`,
                    hint: t`Easier to manage and compatible with all dApps.`,
                  },
                  {
                    value: ADDRESS_MODE.MULTI,
                    title: t`Multi Address`,
                    description: t`Your wallet will let you generate multiple addresses.`,
                    hint: t`Useful for advanced users.`,
                  },
                ]}
              />
```

The warning banner stays **below** the group, rendered by its existing conditional.

- [ ] **Step 2: Replace the save button** with `PreferenceSaveButton`, keeping `disabled={!hasChanged || loading}`.

- [ ] **Step 3: Replace the remaining inline styles**

Delete the `style={{...}}` attributes the file currently uses for layout (the `display: flex` wrapper, the `marginBottom: 40` intro paragraph, the footer's `borderTop: 'none', marginTop: 12`) in favour of the shared classes plus a small `.address-mode-*` block for what remains unique. Do not introduce new inline styles.

- [ ] **Step 4: Verify behaviour by reading**

Re-read the file and confirm every behaviour in the list above still holds. Report each one explicitly.

---

## Task 8: Verification

- [ ] **Step 1: Suite and build** — baseline unchanged, no warning naming a touched file.
- [ ] **Step 2: `make update_pot`** — the strings are unchanged in wording, so expect only line-reference churn. Report anything else.
- [ ] **Step 3: Manual QA** (a human runs this; list it in the PR body)
  - Amount Format modal is pixel-identical to before this PR.
  - Address Mode: with a wallet that has transactions outside the first address, Single is disabled and greyed, the warning banner shows, and Save stays disabled.
  - Address Mode: with a fresh wallet, Single is selectable, Save enables on change, and saving reloads the wallet into single-address mode.
  - Keyboard: both modals are operable with Tab and the arrow keys, and the label click-target selects the option.

---

## Out of scope

- The `manageDomLifecycle` gap. **Both** modals currently call `$('#id').modal('show')` directly rather than using `GlobalModal`'s `manageDomLifecycle`, so Bootstrap's defaults apply and the modal can be dismissed by Escape or an outside click, silently discarding a selection. This predates the feature and now affects both. It is a reasonable follow-up but is deliberately not bundled here, to keep this PR a pure refactor. Raise it as a separate issue.
- Any amount-formatting change — done in PRs 1 and 2.
