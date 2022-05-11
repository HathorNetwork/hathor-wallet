/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import QRCode from 'qrcode.react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import hathorLib from '@hathor/wallet-lib';
import HathorAlert from '../components/HathorAlert';
import PropTypes from 'prop-types';
import { connect } from 'react-redux';
import helpers from '../utils/helpers';
import { get } from 'lodash';
import wallet from "../utils/wallet";


const mapStateToProps = (state) => {
  return {
    tokenMetadata: state.tokenMetadata,
    wallet: state.wallet,
  };
};

/**
 * Component to show a token general info
 *
 * @memberof Components
 */
class TokenGeneralInfo extends React.Component {
  /**
   * errorMessage {String} Message to show in case of error getting token info
   * totalSupply {number} Token total supply
   * canMint {boolean} If this token can still be minted
   * canMelt {boolean} If this token can still be melted
   * transactionsCount {number} Total number of transactions of this token
   */
  state = {
    errorMessage: '',
    totalSupply: 0,
    canMint: null,
    canMelt: null,
    transactionsCount: 0,
    alwaysShow: false,
  };

  componentDidMount() {
    this.updateTokenInfo();
  }


  componentDidUpdate = (prevProps) => {
    if (this.props.token.uid !== prevProps.token.uid) {
      this.updateTokenInfo();
    }
  }

  /**
   * Update token info getting data from the facade (can mint, can melt, total supply and total transactions)
   */
  updateTokenInfo = async () => {
    this.setState({ errorMessage: '' });

    try {
      const tokenUid = this.props.token.uid;
      const tokenDetails = await this.props.wallet.getTokenDetails(tokenUid);
      const alwaysShow = wallet.isTokenAlwaysShow(tokenUid)
      const { totalSupply, totalTransactions, authorities } = tokenDetails;

      this.setState({
        totalSupply,
        canMint: authorities.mint,
        canMelt: authorities.melt,
        transactionsCount: totalTransactions,
        alwaysShow,
      });
    } catch (e) {
      this.setState({ errorMessage: e.message });
    }
  }

  handleToggleAlwaysShow = (e) => {
    e.preventDefault();
    const newValue = !this.state.alwaysShow;
    wallet.setTokenAlwaysShow(this.props.token.uid, newValue);
    this.setState( { alwaysShow: newValue });
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
      this.showSuccess(t`Configuration string copied to clipboard!`);
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

    if (!this.props.token) return null;

    const configurationString = hathorLib.tokens.getConfigurationString(this.props.token.uid, this.props.token.name, this.props.token.symbol);

    const getShortConfigurationString = () => {
      const configArr = configurationString.split(':');
      return `${configArr[0]}:${configArr[1]}...${configArr[3]}`;
    }

    const isNFT = helpers.isTokenNFT(get(this.props, 'token.uid'), this.props.tokenMetadata);

    const renderTokenInfo = () => {
      return (
        <div className="token-general-info">
          <p className="mb-2"><strong>{t`UID:`} </strong>{this.props.token.uid}</p>
          <p className="mt-2 mb-2"><strong>{t`Type:`} </strong>{isNFT ? 'NFT' : 'Custom Token'}</p>
          <p className="mt-2 mb-2"><strong>{t`Name:`} </strong>{this.props.token.name}</p>
          <p className="mt-2 mb-2"><strong>{t`Symbol:`} </strong>{this.props.token.symbol}</p>
          <p className="mt-2 mb-2"><strong>{t`Total supply:`} </strong>{helpers.renderValue(this.state.totalSupply, isNFT)} {this.props.token.symbol}</p>
          <p className="mt-2 mb-0"><strong>{t`Can mint new tokens:`} </strong>{this.state.canMint ? 'Yes' : 'No'}</p>
          <p className="mb-2 subtitle">{t`Indicates whether the token owner can create new tokens, increasing the total supply`}</p>
          <p className="mt-2 mb-0"><strong>{t`Can melt tokens:`} </strong>{this.state.canMelt ? 'Yes' : 'No'}</p>
          <p className="mb-2 subtitle">{t`Indicates whether the token owner can destroy tokens, decreasing the total supply`}</p>
          <p className="mt-2 mb-4"><strong>{t`Total number of transactions:`} </strong>{this.state.transactionsCount}</p>
          <p className="mt-2 mb-4">
            <strong>{t`Always show this token:`}</strong> {
            this.state.alwaysShow
              ? <span>{t`Yes`}</span>
              : <span>{t`No`}</span>
          }
            <a className="ml-3" href="true" onClick={this.handleToggleAlwaysShow}> {t`Change`} </a>
            <i className="fa fa-question-circle pointer ml-3"
               title={t`If selected, it will overwrite the "Hide zero-balance tokens settings".`}>
            </i>
          </p>
        </div>
      );
    }

    const renderConfigString = () => {
      return (
        <div className='d-flex flex-row align-items-center justify-content-center mt-4 w-100'>
          <div className='d-flex flex-column align-items-center config-string-wrapper'>
            <p><strong>{t`Configuration String`}</strong></p>
            <span ref="configurationString" className="mb-2">
              {getShortConfigurationString()}
              <CopyToClipboard text={configurationString} onCopy={this.copied}>
                <i className="fa fa-clone pointer ml-1" title={t`Copy to clipboard`}></i>
              </CopyToClipboard>
            </span>
            <QRCode size={200} value={configurationString} />
            <a className="mt-2" onClick={(e) => this.downloadQrCode(e)} download={`${this.props.token.name} (${this.props.token.symbol}) - ${configurationString}`} href="true" ref="downloadLink">{t`Download`} <i className="fa fa-download ml-1" title={t`Download QRCode`}></i></a>
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
 * token: Token to show the information {name, symbol, uid}
 * showConfigString: If should show the configuration string of the token with the qrcode
 */
TokenGeneralInfo.propTypes = {
  token: PropTypes.shape({
    name: PropTypes.string.isRequired,
    symbol: PropTypes.string.isRequired,
    uid: PropTypes.string.isRequired,
  }),
  showConfigString: PropTypes.bool.isRequired,
};

export default connect(mapStateToProps, null, null, {forwardRef: true})(TokenGeneralInfo);
