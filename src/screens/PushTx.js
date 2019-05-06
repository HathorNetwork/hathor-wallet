/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import TxTextInput from '../components/TxTextInput';
import hathorLib from 'hathor-wallet-utils';


/**
 * Allow the user to push a transaction to the network from its hexadecimal serialization form
 *
 * @memberof Screens
 */
class PushTx extends React.Component {
  /**
   * errorMessage {string} Message to be shown in case of error in form
   * success {boolean} If push transaction replied success
   * canForce {boolean} If push transaction response allowed to force next request
   * force {boolean} If user decided to force this push
   * dataToPush {string} Text to push in the input
   */
  state = { success: false, errorMessage: null, canForce: false, force: false, dataToPush: ''}

  /**
   * Called when user clicks on the 'PushTx' button, so we call the API
   */
  buttonClicked = () => {
    this.setState({ success: false });
    hathorLib.txApi.pushTx(this.state.dataToPush, this.state.force, (data) => {
      if (data.success) {
        this.setState({ success: true, errorMessage: null, canForce: false, force: false });
      } else {
        this.setState({ success: false, errorMessage: data.message, canForce: data.can_force })
      }
    }, (e) => {
      // Error in request
      console.log(e);
    });
  }

  /**
   * Update the force state when user click on the 'Force' checkbox
   *
   * @param {Object} e Event called when changing checkbox state
   */
  handleCheckboxChange = (e) => {
    this.setState({ force: e.target.checked });
  }

  /**
   * Update the data state when user changes the textarea text
   *
   * @param {Object} e Event called when changing text
   */
  handleChangeData = (e) => {
    this.setState({ dataToPush: e.target.value });
  }

  render() {
    const renderForceCheckbox = () => {
      return (
        <div className="form-check checkbox-wrapper mb-3">
          <input className="form-check-input" type="checkbox" id="force" onChange={this.handleCheckboxChange} />
          <label className="form-check-label" htmlFor="force">
            Force push
          </label>
        </div>
      );
    }

    return (
      <div className="content-wrapper">
        <TxTextInput buttonClicked={this.buttonClicked} action='Push tx' onChange={this.handleChangeData} otherAction='decode' link='/decode-tx/' helpText='Write your transaction in hex value and click the button to send it to the network. (We do not push blocks to the network, only transactions)' />
        {this.state.canForce ? renderForceCheckbox() : null}
        {this.state.success ? <span className="text-success">Transaction pushed to the network with success!</span> : null}
        {this.state.errorMessage ? <span className="text-danger">{this.state.errorMessage}</span> : null}
      </div>
    );
  }
}

export default PushTx;
