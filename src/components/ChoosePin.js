/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'
import version from '../utils/version';

import PinPasswordWrapper from '../components/PinPasswordWrapper'
import { updatePin } from '../actions/index';
import { connect } from "react-redux";


const mapDispatchToProps = dispatch => {
  return {
    updatePin: data => dispatch(updatePin(data)),
  };
};


/**
 * Component to choose a PIN  
 * Shows two PIN fields with required pattern and validations
 *
 * @memberof Components
 */
class ChoosePin extends React.Component {
  /**
   * Called when input PIN changes the value
   *
   * @param {string} New value in input
   */
  handleChange = (value) => {
    this.props.updatePin(value);
  }

  /**
   * Check API version and update server network before loading data
   */
  handleSuccess = () => {
    const promise = version.checkApiVersion();
    promise.then(() => {
      this.props.success();
    });
  }

  render() {
    const renderMessage = () => {
      return <p className="mt-4 mb-4">{t`The PIN is a 6-digit password requested to authorize actions in your wallet, such as generating new addresses and sending tokens.`}</p>;
    }

    return (
      <PinPasswordWrapper ref="wrapper" message={renderMessage()} success={this.handleSuccess} back={this.props.back} handleChange={this.handleChange} field='PIN' pattern='[0-9]{6}' inputMode='numeric' button={t`Next`} />
    )
  }
}

export default connect(null, mapDispatchToProps)(ChoosePin);
