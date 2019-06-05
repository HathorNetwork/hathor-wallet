/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { connect } from "react-redux";
import hathorLib from '@hathor/wallet-lib';


const mapStateToProps = (state) => {
  return {
    selectedToken: state.selectedToken,
    tokens: state.tokens
  };
};


/**
 * Component that shows a modal with information of a token (uid, name, symbol, and configuration string)
 *
 * @memberof Components
 */
class ModalTokenInfo extends React.Component {
  /**
   * errorMessage {string} Message that will be shown to the user in case of error
   * token {Object} Token config to show the info
   */
  state = { successMessage: '', token: null };
  timer = null;

  componentWillUnmount = () => {
    // Preventing calling setState when the component is not mounted
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  componentDidMount = () => {
    this.getToken();
  }

  componentDidUpdate(prevProps) {
    // If changed token should update the modal
    if (prevProps.selectedToken !== this.props.selectedToken) {
      this.getToken();
    }
  }

  /**
   * Get token config from Redux and save in the state
   */
  getToken = () => {
    const token = this.props.tokens.find((token) => token.uid === this.props.selectedToken);
    this.setState({ token });
  }

  /**
   * Method called on copy to clipboard success  
   * Show alert success message
   *
   * @param {string} text Text copied to clipboard
   * @param {*} result Null in case of error
   */
  copied = (text, result) => {
    if (result) {
      // If copied with success
      this.setState({ successMessage: 'Copied!' });
      this.timer = setTimeout(() => {
        this.setState({ successMessage: '' });
      }, 2000);
    }
  }

  /**
   * Get configuration string for the token
   */
  getTokenConfigurationString = () => {
    return hathorLib.tokens.getConfigurationString(this.state.token.uid, this.state.token.name, this.state.token.symbol);
  }

  render = () => {
    const renderBody = () => {
      return (
        <div className="modal-body">
          <p><strong>UID:</strong>
            <CopyToClipboard text={this.state.token.uid} onCopy={this.copied}>
              <i className="fa fa-clone pointer ml-2" title="Copy UID"></i>
            </CopyToClipboard>
          </p>
          <span>{this.state.token.uid}</span>
          <p className="mt-3"><strong>Configuration String:</strong>
            <CopyToClipboard text={this.getTokenConfigurationString()} onCopy={this.copied}>
              <i className="fa fa-clone pointer ml-2" title="Copy configuration string"></i>
            </CopyToClipboard>
          </p>
          <span>{this.getTokenConfigurationString()}</span>
        </div>
      );
    }

    const renderTitle = () => {
      return `${this.state.token.name} (${this.state.token.symbol})`;
    }

    return (
      <div className="modal fade" id="tokenInfoModal" tabIndex="-1" role="dialog" aria-labelledby="tokenInfoModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">{this.state.token && renderTitle()}</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            {this.state.token && renderBody()}
            <div className="col-12 col-sm-10">
                <p className="text-success">
                  {this.state.successMessage}
                </p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(mapStateToProps)(ModalTokenInfo);
