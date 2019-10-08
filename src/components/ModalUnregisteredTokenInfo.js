/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import tokens from '../utils/tokens';
import TokenGeneralInfo from '../components/TokenGeneralInfo';
import hathorLib from '@hathor/wallet-lib';
import PropTypes from 'prop-types';


/**
 * Component that shows a modal with information about an unregistered token
 *
 * @memberof Components
 */
class ModalUnregisteredTokenInfo extends React.Component {
  /**
   * token {Object} Token data to show info
   * errorMessage {String} Message to show in case of an error when registering the token
   */
  state = { token: null, errorMessage: '' };

  componentDidMount() {
    $('#unregisteredTokenInfoModal').on('hidden.bs.modal', () => {
      this.setState({ errorMessage: '' });
    });
  }

  componentDidUpdate = (prevProps) => {
    if (prevProps.token !== this.props.token) {
      this.setState({ token: this.props.token });
    }
  }

  /**
   * Method called when user clicks the button to register the token  
   *
   * @param {Object} e Event emitted when user clicks the button
   */
  register = (e) => {
    if (!this.state.token) return;

    e.preventDefault();

    const configurationString = hathorLib.tokens.getConfigurationString(this.state.token.uid, this.state.token.name, this.state.token.symbol);

    const promise = hathorLib.tokens.validateTokenToAddByConfigurationString(configurationString, null);
    promise.then((tokenData) => {
      tokens.addToken(tokenData.uid, tokenData.name, tokenData.symbol);
      $('#unregisteredTokenInfoModal').modal('hide');
      this.props.tokenRegistered(this.state.token);
    }, (e) => {
      this.setState({ errorMessage: e.message });
    });
  }

  render() {
    const renderModalBody = () => {
      if (!this.state.token) {
        return null;
      }
      return <TokenGeneralInfo token={this.state.token} showConfigString={false} />;
    }

    const renderHeader = () => {
      return (
        <div className="d-flex flex-row">
          <h5 className="modal-title" id="exampleModalLabel">{this.state.token.name} ({this.state.token.symbol})</h5>
          <span className='ml-2 unregistered-token-badge'> Unregistered token </span>
        </div>
      )
    }

    return (
      <div className="modal fade" id="unregisteredTokenInfoModal" tabIndex="-1" role="dialog" aria-labelledby="unregisteredTokenInfoModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              {this.state.token && renderHeader()}
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              {renderModalBody()}
              <p>This token is <strong>not registered</strong> in your wallet. You should <strong>always validate the token uid</strong>, to ensure you are registering the correct token.</p>
              <p>There might be more than one token with the same name and symbol but the uid will always be unique.</p>
              <p>If you decide to register this token, you will see it in your token bar and you be able to send it, if you have funds.</p>
               <p className="text-danger">{this.state.errorMessage}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              <button onClick={this.register} type="button" className="btn btn-hathor">Register token</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}


/*
 * token: Token to show general information {name, symbol, uid}
 * tokenRegistered: Method called after token is registered with success
 */
ModalUnregisteredTokenInfo.propTypes = {
  token: PropTypes.object,
  tokenRegistered: PropTypes.func.isRequired,
};

export default ModalUnregisteredTokenInfo;