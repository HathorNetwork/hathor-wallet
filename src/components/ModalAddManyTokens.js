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
import emojiRegex from 'emoji-regex';


/**
 * Component that shows a modal to add many unknown tokens to the wallet (bulk import)
 *
 * @memberof Components
 */
class ModalAddManyTokens extends React.Component {
  /**
   * errorMessage {string} Message that will be shown to the user in case of error
   */
  state = { errorMessage: '' };

  componentDidMount = () => {
    $('#addManyTokensModal').on('hide.bs.modal', (e) => {
      this.refs.configs.value = '';
      this.setState({ errorMessage: '' });
    })

    $('#addManyTokensModal').on('shown.bs.modal', (e) => {
      this.refs.configs.focus();
    })
  }

  componentWillUnmount = () => {
    // Removing all event listeners
    $('#addManyTokensModal').off();
  }

  /**
   * Method called when user clicks the button to add the tokens  
   * Validates that all configuration strings written are valid
   *
   * @param {Object} e Event emitted when user clicks the button
   */
  handleAdd = (e) => {
    e.preventDefault();
    const configs = this.refs.configs.value.trim();
    if (configs === '') {
      this.setState({ errorMessage: 'Must provide configuration string' });
      return;
    }

    const emojiRegexString = emojiRegex().source;
    const regex = new RegExp(`(\\w|\\s|${emojiRegexString})+:(\\w|${emojiRegexString})+(:\\w+){2}`, 'g');
    const matches = configs.match(regex);

    if (matches === null) {
      this.setState({ errorMessage: 'Invalid configuration string' });
      return;
    }

    const validations = [];
    for (const config of matches) {
      // Preventing when the user forgets a comma in the end
      if (config !== '') {
        // Getting all validation promises
        validations.push(hathorLib.tokens.validateTokenToAddByConfigurationString(config));
      }
    }

    Promise.all(validations).then((toAdd) => {
      // If all promises succeed, we add the tokens and show success message
      for (const config of toAdd) {
        tokens.addToken(config.uid, config.name, config.symbol);
      }
      this.props.success(toAdd.length);
    }, (e) => {
      // If one fails, we show error message
      this.setState({ errorMessage: e.message });
    });
  }

  render() {
    return (
      <div className="modal fade" id="addManyTokensModal" tabIndex="-1" role="dialog" aria-labelledby="addManyTokensModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">Register Custom Tokens</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <p>You can register one or more tokens writing the configuration string of each one below.</p>
              <form ref="formAddToken">
                <div className="form-group">
                  <textarea className="form-control" rows={8} ref="configs" placeholder="Configuration strings" />
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

export default ModalAddManyTokens;
