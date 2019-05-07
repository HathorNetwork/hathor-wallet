/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PinPasswordWrapper from '../components/PinPasswordWrapper'
import { updatePassword } from '../actions/index';
import { connect } from 'react-redux';
import hathorLib from 'hathor-wallet-utils';
import { PASSWORD_PATTERN } from '../constants';


const mapDispatchToProps = dispatch => {
  return {
    updatePassword: data => dispatch(updatePassword(data)),
  };
};


/**
 * Component to choose a password  
 * Shows two password fields with required pattern and validations
 *
 * @memberof Components
 */
class ChoosePassword extends React.Component {
  /**
   * Called when input password changes the value
   *
   * @param {string} New value in input
   */
  handleChange = (value) => {
    this.props.updatePassword(value);
  }

  render() {
    const renderMessage = () => {
      return (
        <div className="mt-4 mb-4">
          <p>Please, choose a password to encrypt your sensitive data while using the wallet.</p>
          <p className="mt-3">Your password must have at least 8 characters and at least one lower case character, one upper case character, one number, and one special character.</p>
        </div>
      );
    }

    return (
      <PinPasswordWrapper message={renderMessage()} success={this.props.success} back={this.props.back} handleChange={this.handleChange} field='Password' button='Next' pattern={PASSWORD_PATTERN} />
    )
  }
}

export default connect(null, mapDispatchToProps)(ChoosePassword);
