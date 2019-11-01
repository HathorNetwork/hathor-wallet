/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import HathorAlert from './HathorAlert';
import ModalAddressQRCode from './ModalAddressQRCode';
import ModalAlert from './ModalAlert';
import wallet from '../utils/wallet';
import $ from 'jquery';
import { connect } from "react-redux";
import hathorLib from '@hathor/wallet-lib';
import ledger from '../utils/ledger';
import { IPC_RENDERER } from '../constants';


const mapStateToProps = (state) => {
  return {
    lastSharedAddress: state.lastSharedAddress,
    lastSharedIndex: state.lastSharedIndex,
  };
};


/**
 * Component that renders the address part of the wallet with base58 address, qrcode and the links
 *
 * @memberof Components
 */
class WalletAddress extends React.Component {
  componentDidMount() {
    if (IPC_RENDERER) {
      IPC_RENDERER.on("ledger:address", (event, arg) => {
        if (arg.success) {
          $('#ledgerAlert').modal('hide');
        }
        // XXX is there any error handling here?
      });
    }
  }

  componentWillUnmount() {
    if (IPC_RENDERER) {
      // Removing ipc renderer listeners
      IPC_RENDERER.removeAllListeners("ledger:address");
    }
  }

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

  openAddressModal = (e) => {
    e.preventDefault();

    if (hathorLib.wallet.isHardwareWallet()) {
      $('#ledgerAlert').modal('show');
      ledger.checkAddress(hathorLib.transaction.intToBytes(this.props.lastSharedIndex, 4));
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
          <p><strong>{t`Address to receive tokens`}</strong></p>
          {showAddressString()}
          <div className="d-flex flex-row align-items-center">
            <a className="new-address" onClick={(e) => this.generateNewAddress(e)} href="true">{t`Generate new address`} <i className="fa fa-refresh ml-1" title={t`Get new address`}></i></a>
            <span className="ml-3 mr-3">|</span>
            <a href="true" onClick={(e) => this.showQRCode(e)}>{t`QR Code`} <i className="fa fa-qrcode ml-1" title={t`Get qrcode`}></i></a>
          </div>
        </div>
      );
    }

    const showAddressString = () => {
      if (hathorLib.wallet.isSoftwareWallet()) {
        return (
          <span ref="address" className="mt-1 mb-2">
            {this.props.lastSharedAddress}
            <CopyToClipboard text={this.props.lastSharedAddress} onCopy={this.copied}>
              <i className="fa fa-clone pointer ml-1" title={t`Copy to clipboard`}></i>
            </CopyToClipboard>
          </span>
        );
      } else {
        return (
          <div className="d-flex flex-row justify-content-between">
            <span ref="address" className="mt-1 mb-2 mr-2">
              {this.props.lastSharedAddress ? this.props.lastSharedAddress.substring(0, 10) : ''}...
            </span>
            <a className="new-address" onClick={(e) => this.openAddressModal(e)} href="true">{t`Show full address`}</a>
          </div>
        )
      }
    }

    const renderAlertBody = () => {
      return (
        <div>
          <p>{t`Validate that the address below is the same presented on the Ledger screen.`}</p>
          <p>{t`Press both buttons on your Ledger in case the address is valid.`}</p>
          <p><strong>{this.props.lastSharedAddress}</strong></p>
        </div>
      );
    }

    return (
      <div>
        {renderAddress()}
        <HathorAlert ref="alertCopied" text={t`Copied to clipboard!`} type="success" />
        <HathorAlert ref="alertError" text={t`You must use an old address before generating new ones`} type="danger" />
        <ModalAddressQRCode  />
        <ModalAlert id="ledgerAlert" title="Validate address on ledger" showFooter={false} body={renderAlertBody()} />
      </div>
    );
  }
}

export default connect(mapStateToProps)(WalletAddress);
