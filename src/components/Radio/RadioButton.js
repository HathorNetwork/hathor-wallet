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
