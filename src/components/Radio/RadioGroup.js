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
