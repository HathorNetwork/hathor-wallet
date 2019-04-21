/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import QRCode from 'qrcode.react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { connect } from "react-redux";


const mapStateToProps = (state) => {
  return { lastSharedAddress: state.lastSharedAddress };
};


/**
 * Component that shows the qrcode of an address and a button to download it
 *
 * @memberof Components
 */
class ModalAddressQRCode extends React.Component {
  constructor(props) {
    super(props);

    /**
     * successMessage {string} Success message after copy
     */
    this.state = { successMessage: '' };

    // Set timeout timer to be cleared in case of unmount
    this.timer = null;
  }

  componentWillUnmount = () => {
    // Preventing calling setState when the component is not mounted
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  /**
   * Called when user clicks to download the qrcode
   *
   * @param {Object} e Event emitted by the link clicked
   */
  download = (e) => {
    this.refs.downloadLink.click();
  }

  /**
   * Returns the download href for the qrcode
   */
  getHref = () => {
    const elements = document.getElementsByTagName('canvas');
    if (elements.length > 0) {
      return elements[0].toDataURL();
    }
    return '';
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
      this.setState({ successMessage: 'Address copied to clipboard!'});
      this.timer = setTimeout(() => {
        this.setState({ successMessage: '' });
      }, 2000);
    }
  }

  render() {
    return (
      <div className="modal fade" id="addressQRCodeModal" tabIndex="-1" role="dialog" aria-labelledby="addressQRCodeModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">Address to receive tokens</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body d-flex flex-column align-items-center">
              <QRCode onClick={this.openQrCode} size={200} value={`hathor:${this.props.lastSharedAddress}`} />
              <span ref="address" className="mt-1">
                {this.props.lastSharedAddress}
                <CopyToClipboard text={this.props.lastSharedAddress} onCopy={this.copied}>
                  <i className="fa fa-clone pointer ml-1" title="Copy to clipboard"></i>
                </CopyToClipboard>
              </span> 
              <a href={this.getHref()} download={`Hathor address - ${this.props.lastSharedAddress}`} className="hidden" ref="downloadLink">Download</a>
              <p className="text-success mt-4">{this.state.successMessage}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Close</button>
              <button onClick={this.download} type="button" className="btn btn-hathor">Download</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(mapStateToProps)(ModalAddressQRCode);