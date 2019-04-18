/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import ModalAddToken from '../components/ModalAddToken';
import TokenBar from '../components/TokenBar';
import HathorAlert from '../components/HathorAlert';
import wallet from '../utils/wallet';
import $ from 'jquery';


/**
 * Initial screen of custom tokens
 *
 * @memberof Screens
 */
class CustomTokens extends React.Component {
  /**
   * Called when a new token was registered with success, then close the modal and show alert success
   */
  newTokenSuccess = () => {
    $('#addTokenModal').modal('hide');
    this.refs.alertSuccess.show(1000);
  }

  /**
   * Triggered when user clicks to do the register a token, then opens the new token modal
   *
   * @param {Object} e Event emitted when user click
   */
  addTokenClicked = (e) => {
    e.preventDefault()
    $('#addTokenModal').modal('show');
  }

  render() {
    return (
      <div>
        <div className="content-wrapper">
          ABC
        </div>
        <ModalAddToken success={this.newTokenSuccess} />
        <HathorAlert ref="alertSuccess" text="Token registered with success!" type="success" />
        <TokenBar {...this.props}  />
      </div>
    );
  }
}

export default CustomTokens;