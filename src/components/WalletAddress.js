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
import { connect } from "react-redux";
import ledger from '../utils/ledger';
import { IPC_RENDERER } from '../constants';
import { sharedAddressUpdate } from '../actions/index';
import { GlobalModalContext, MODAL_TYPES } from './GlobalModal';
import LOCAL_STORE from '../storage';

const mapDispatchToProps = dispatch => {
  return {
    sharedAddressUpdate: (data) => dispatch(sharedAddressUpdate(data)),
  };
};

const mapStateToProps = (state) => {
  return {
    lastSharedAddress: state.lastSharedAddress,
    lastSharedIndex: state.lastSharedIndex,
    wallet: state.wallet,
  };
};


/**
 * Component that renders the address part of the wallet with base58 address, qrcode and the links
 *
 * @memberof Components
 */
export class WalletAddress extends React.Component {
  static contextType = GlobalModalContext;

  constructor(props) {
    super(props);

    this.alertCopiedRef = React.createRef();
    this.alertErrorRef = React.createRef();
  }

  componentDidMount() {
    if (IPC_RENDERER) {
      IPC_RENDERER.on("ledger:address", (event, arg) => {
        if (arg.success) {
          this.context.hideModal();
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
    const address = this.props.wallet.getNextAddress();

    if (address.address === this.props.lastSharedAddress) {
      this.alertErrorRef.current.show(3000);
    } else {
      this.props.sharedAddressUpdate({
        lastSharedAddress: address.address,
        lastSharedIndex: address.index,
      });
    }
  }

  openAddressModal = (e) => {
    e.preventDefault();

    if (LOCAL_STORE.isHardwareWallet()) {
      this.context.showModal(MODAL_TYPES.ALERT, {
        title: t`Validate address on Ledger`,
        id: 'ledgerAlert',
        showFooter: false,
        body: this.renderAlertBody(),
      });

      ledger.checkAddress(this.props.lastSharedIndex);
    }
  }

  /**
   * Called when user clicks to show the qrcode
   *
   * @param {Object} e Event emitted by the link clicked
   */
  showQRCode = (e) => {
    e.preventDefault();
    this.context.showModal(MODAL_TYPES.ADDRESS_QR_CODE)
  }

  /**
   * Method called on copy to clipboard success
   * Show alert success message
   *
   * @param {string} text Text copied to clipboard
   * @param {*} result Null in case of error
   */
  copied = (_text, result) => {
    if (result) {
      // If copied with success
      this.alertCopiedRef.current.show(1000);
    }
  }

  /**
   * Method executed when link to See all addresses is clicked
   * Redirect to address list screen
   *
   * @param {Object} e Event emitted by the link clicked
   */
  seeAllAddresses = (e) => {
    e.preventDefault();
    this.props.goToAllAddresses();
  }

  renderAlertBody() {
    return (
      <div>
        <p>{t`Validate that the address below is the same presented on the Ledger screen.`}</p>
        <p>{t`Press both buttons on your Ledger in case the address is valid.`}</p>
        <p><strong>{this.props.lastSharedAddress}</strong></p>
      </div>
    );
  }

  render() {
    const renderAddress = () => {
      return (
        <div className="d-flex flex-column align-items-center address-wrapper card">
          <p><strong>{t`Address to receive tokens`}</strong></p>
          {showAddressString()}
          <div className="d-flex flex-row align-items-center">
            <a className="new-address" onClick={(e) => this.generateNewAddress(e)} href="true">{t`Generate new address`} <i className="fa fa-refresh ml-1" title={t`Get new address`}></i></a>
            {(!LOCAL_STORE.isHardwareWallet()) &&   // hide the QR code for hardware wallet
              <div>
                <span className="ml-3 mr-3">|</span>
                <a href="true" onClick={(e) => this.showQRCode(e)}>{t`QR Code`} <i className="fa fa-qrcode ml-1" title={t`Get qrcode`}></i></a>
              </div>
            }
          </div>
          {(!LOCAL_STORE.isHardwareWallet()) &&   // hide all addresses for hardware wallet
            <a href="true" onClick={this.seeAllAddresses} className="mt-3 ">{t`See all addresses`}</a>
          }
        </div>
      );
    }

    const showAddressString = () => {
      if (!LOCAL_STORE.isHardwareWallet()) {
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

    return (
      <div>
        {renderAddress()}

        <HathorAlert ref={this.alertCopiedRef} text={t`Copied to clipboard!`} type="success" />
        <HathorAlert ref={this.alertErrorRef} text={t`You must use an old address before generating new ones`} type="danger" />
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(WalletAddress);
