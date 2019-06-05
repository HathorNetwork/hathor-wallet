/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import HathorAlert from './HathorAlert';
import ModalAddressQRCode from './ModalAddressQRCode';
import wallet from '../utils/wallet';
import $ from 'jquery';
import { connect } from "react-redux";
import hathorLib from '@hathor/wallet-lib';


const mapStateToProps = (state) => {
  return { lastSharedAddress: state.lastSharedAddress };
};


/**
 * Component that renders the address part of the wallet with base58 address, qrcode and the links
 *
 * @memberof Components
 */
class WalletAddress extends React.Component {
  /**
   * Called when user clicks to generate a new address
   *
   * @param {Object} e Event emitted by the link clicked
   */
  generateNewAddress = (e) => {
    e.preventDefault();
    // We check if the next address was already generated, otherwise we generate, in case we can do it
    if (hathorLib.wallet.hasNewAddress()) {
      wallet.getNextAddress();
    } else {
      if (hathorLib.wallet.canGenerateNewAddress()) {
        wallet.generateNewAddress();
      } else {
        this.refs.alertError.show(3000);
      }
    }
  }

  /**
   * Called when user clicks to show the qrcode
   *
   * @param {Object} e Event emitted by the link clicked
   */
  showQRCode = (e) => {
    e.preventDefault();
    $('#addressQRCodeModal').modal('show');
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
      this.refs.alertCopied.show(1000);
    }
  }

  render() {
    const renderAddress = () => {
      return (
        <div className="d-flex flex-column align-items-center address-wrapper card">
          <p><strong>Address to receive tokens</strong></p>
          <span ref="address" className="mt-1 mb-2">
            {this.props.lastSharedAddress}
            <CopyToClipboard text={this.props.lastSharedAddress} onCopy={this.copied}>
              <i className="fa fa-clone pointer ml-1" title="Copy to clipboard"></i>
            </CopyToClipboard>
          </span> 
          <div className="d-flex flex-row align-items-center">
            <a className="new-address" onClick={(e) => this.generateNewAddress(e)} href="true">Generate new address <i className="fa fa-refresh ml-1" title="Get new address"></i></a>
            <span className="ml-3 mr-3">|</span>
            <a href="true" onClick={(e) => this.showQRCode(e)}>QR Code <i className="fa fa-qrcode ml-1" title="Get qrcode"></i></a>
          </div>
        </div>
      );
    }

    return (
      <div>
        {renderAddress()}
        <HathorAlert ref="alertCopied" text="Copied to clipboard!" type="success" />
        <HathorAlert ref="alertError" text="You must use an old address before generating new ones" type="danger" />
        <ModalAddressQRCode  />
      </div>
    );
  }
}

export default connect(mapStateToProps)(WalletAddress);
