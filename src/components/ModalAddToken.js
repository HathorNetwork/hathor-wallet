/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import tokens from '../utils/tokens';
import hathorLib from '@hathor/wallet-lib';


/**
 * Component that shows a modal to add one specific unknown token to the wallet
 *
 * @memberof Components
 */
class ModalAddToken extends React.Component {
  /**
   * errorMessage {string} Message that will be shown to the user in case of error
   */
  state = { errorMessage: '' };

  componentDidMount = () => {
    $('#addTokenModal').on('hide.bs.modal', (e) => {
      this.refs.config.value = '';
      this.setState({ errorMessage: '' });
    })

    $('#addTokenModal').on('shown.bs.modal', (e) => {
      this.refs.config.focus();
    })
  }

  componentWillUnmount = () => {
    // Removing all event listeners
    $('#addTokenModal').off();
  }

  /**
   * Method called when user clicks the button to register the token  
   * Validates that the data written is valid
   *
   * @param {Object} e Event emitted when user clicks the button
   */
  handleAdd = (e) => {
    e.preventDefault();
    if (this.refs.config.value === '') {
      this.setState({ errorMessage: 'Must provide configuration string or uid, name, and symbol' });
      return;
    }
    const promise = hathorLib.tokens.validateTokenToAddByConfigurationString(this.refs.config.value, null);
    promise.then((tokenData) => {
      tokens.addToken(tokenData.uid, tokenData.name, tokenData.symbol);
      this.props.success();
    }, (message) => {
      this.setState({ errorMessage: message });
      return;
    });
  }

  render() {
    return (
      <div className="modal fade" id="addTokenModal" tabIndex="-1" role="dialog" aria-labelledby="addTokenModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">Register a new token</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <p>To register a token that already exists, just write down its configuration string</p>
              <form ref="formAddToken">
                <div className="form-group">
                  <textarea type="text" className="form-control" ref="config" placeholder="Configuration string" />
                </div>
                <div className="row">
                  <div className="col-12 col-sm-10">
                      <p className="error-message text-danger">
                        {this.state.errorMessage}
                      </p>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              <button onClick={this.handleAdd} type="button" className="btn btn-hathor">Register</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ModalAddToken;
