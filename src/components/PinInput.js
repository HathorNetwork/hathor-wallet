/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';


/**
 * Component that shows an input for the PIN with the regex pattern
 *
 * @memberof Components
 */
class PinInput extends React.Component {
  render() {
    return (
      <div>
        <label htmlFor="pin">Pin*</label>
        <small> (6 digits password)</small>
        <input
          type="password"
          ref="pin"
          pattern="[0-9]{6}"
          autoComplete="off"
          inputMode="numeric"
          className="pin-input form-control"
          required
          data-testid="pin-input" // Necessary for unit tests
          onChange={this.props.handleChangePin} />
      </div>
    )
  }
}

export default PinInput;
