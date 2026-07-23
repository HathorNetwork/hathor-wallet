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
