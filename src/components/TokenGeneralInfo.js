/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import QRCode from 'qrcode.react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import hathorLib from '@hathor/wallet-lib';
import HathorAlert from '../components/HathorAlert';
import PropTypes from 'prop-types';

/**
 * Component to show a token general info
 *
 * @memberof Components
 */
class TokenGeneralInfo extends React.Component {
  /**
   * errorMessage {String} Message to show in case of error getting token info
   * tokenInfo {Object} Token information from server with data about uid, name, symbol, mint, melt and total supply and txs
   */
  state = {
    errorMessage: '',
    tokenInfo: null,
  };

  componentDidUpdate = (prevProps) => {
    if (this.props.tokenInfo !== prevProps.tokenInfo || this.props.errorMessage !== prevProps.errorMessage) {
      this.setState({ tokenInfo: this.props.tokenInfo, errorMessage: this.props.errorMessage });
    }
  }

  /**
   * Called when user clicks to download the qrcode
   * Add the href from the qrcode canvas
   *
   * @param {Object} e Event emitted by the link clicked
   */
  downloadQrCode = (e) => {
    e.currentTarget.href = document.getElementsByTagName('canvas')[0].toDataURL();
  }

  /**
   * Show alert success message
   *
   * @param {string} message Success message
   */
  showSuccess = (message) => {
    this.setState({ successMessage: message }, () => {
      this.refs.alertSuccess.show(3000);
    })
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
      this.showSuccess('Configuration string copied to clipboard!');
    }
  }

  render() {
    if (this.state.errorMessage) {
      return (
        <div className="content-wrapper flex align-items-start">
          <p className="text-danger">{this.state.errorMessage}</p>
        </div>
      )
    }

    if (!this.state.tokenInfo) return null;

    const configurationString = hathorLib.tokens.getConfigurationString(this.state.tokenInfo.uid, this.state.tokenInfo.name, this.state.tokenInfo.symbol);

    const getShortConfigurationString = () => {
      const configArr = configurationString.split(':');
      return `${configArr[0]}:${configArr[1]}...${configArr[3]}`;
    }

    const renderTokenInfo = () => {
      return (
        <div className="token-general-info">
          <p className="mb-2"><strong>UID: </strong>{this.state.tokenInfo.uid}</p>
          <p className="mt-2 mb-2"><strong>Name: </strong>{this.state.tokenInfo.name}</p>
          <p className="mt-2 mb-2"><strong>Symbol: </strong>{this.state.tokenInfo.symbol}</p>
          <p className="mt-2 mb-2"><strong>Total supply: </strong>{hathorLib.helpers.prettyValue(this.state.tokenInfo.total)} {this.state.tokenInfo.symbol}</p>
          <p className="mt-2 mb-0"><strong>Can mint new tokens: </strong>{this.state.tokenInfo.mint.length > 0 ? 'Yes' : 'No'}</p>
          <p className="mb-2 subtitle">Indicates whether the token owner can create new tokens, increasing the total supply</p>
          <p className="mt-2 mb-0"><strong>Can melt tokens: </strong>{this.state.tokenInfo.melt.length > 0 ? 'Yes' : 'No'}</p>
          <p className="mb-2 subtitle">Indicates whether the token owner can destroy tokens, decreasing the total supply</p>
          <p className="mt-2 mb-4"><strong>Total number of transactions: </strong>{this.state.tokenInfo.transactions_count}</p>
        </div>
      );
    }

    const renderConfigString = () => {
      return (
        <div className='d-flex flex-row align-items-center justify-content-center mt-4 w-100'>
          <div className='d-flex flex-column align-items-center config-string-wrapper'>
            <p><strong>Configuration String</strong></p>
            <span ref="configurationString" className="mb-2">
              {getShortConfigurationString()}
              <CopyToClipboard text={configurationString} onCopy={this.copied}>
                <i className="fa fa-clone pointer ml-1" title="Copy to clipboard"></i>
              </CopyToClipboard>
            </span> 
            <QRCode size={200} value={configurationString} />
            <a className="mt-2" onClick={(e) => this.downloadQrCode(e)} download={`${this.state.tokenInfo.name} (${this.state.tokenInfo.symbol}) - ${configurationString}`} href="true" ref="downloadLink">Download <i className="fa fa-download ml-1" title="Download QRCode"></i></a>
          </div>
        </div>
      );
    }

    return (
      <div className="flex align-items-center">
        <div className='d-flex flex-column align-items-start justify-content-between token-detail-top'>
          <div className='d-flex flex-column justify-content-between mr-3'>
            {renderTokenInfo()}
          </div>
          {this.props.showConfigString && renderConfigString()}
        </div>
        <HathorAlert ref="alertSuccess" text={this.state.successMessage} type="success" />
      </div>
    )
  }
}

/*
 * tokenInfo: Token to show the information {name, symbol, uid, total, mint, melt, total_transactions}
 * showConfigString: If should show the configuration string of the token with the qrcode
 * errorMessage: In case getting token info failed, this is the message to be shown
 */
TokenGeneralInfo.propTypes = {
  tokenInfo: PropTypes.object,
  showConfigString: PropTypes.bool.isRequired,
  errorMessage: PropTypes.string,
};

export default TokenGeneralInfo;
