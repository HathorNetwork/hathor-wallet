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
