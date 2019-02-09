import React from 'react';
import QRCode from 'qrcode.react';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import HathorAlert from './HathorAlert';
import ModalPin from './ModalPin'
import $ from 'jquery';
import wallet from '../utils/wallet';
import { connect } from "react-redux";


const mapStateToProps = (state) => {
  return { lastSharedAddress: state.lastSharedAddress };
};


class WalletAddress extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loaded: true,
      pin: '',
    }
  }

  getNewAddress = () => {
    $('#pinModal').modal('hide');
    wallet.generateNewAddress(this.state.pin);
  }

  generateNewAddress = (e) => {
    e.preventDefault();
    // If we have already generated the next address we don't need to
    // ask for the PIN. Otherwise we open the modal to ask for the PIN
    if (wallet.hasNewAddress()) {
      wallet.getNextAddress();
    } else {
      if (wallet.canGenerateNewAddress()) {
        $('#pinModal').modal('show');
      } else {
        this.refs.alertError.show(3000);
      }
    }
  }

  handleChangePin = (e) => {
    this.setState({ pin: e.target.value });
  }

  downloadQrCode = (e) => {
    e.currentTarget.href = document.getElementsByTagName('canvas')[0].toDataURL();
    e.currentTarget.download = "QrCode.png";
  }

  copied = (text, result) => {
    if (result) {
      // If copied with success
      this.refs.alertCopied.show(1000);
    }
  }

  render() {
    const renderAddress = () => {
      return (
        <div className="d-flex flex-column align-items-center address-wrapper">
          <QRCode onClick={this.openQrCode} size={200} value={`hathor:${this.props.lastSharedAddress}`} />
          <span ref="address" className="mt-1">
            {this.props.lastSharedAddress}
            <CopyToClipboard text={this.props.lastSharedAddress} onCopy={this.copied}>
              <i className="fa fa-clone pointer ml-1" title="Copy to clipboard"></i>
            </CopyToClipboard>
          </span> 
          <a className="new-address" onClick={(e) => this.generateNewAddress(e)} href="true">Generate new address</a>
          <a className="download-qrcode" href="true" onClick={(e) => this.downloadQrCode(e)}>Download</a>
        </div>
      );
    }

    return (
      <div>
        {this.state.loaded ? renderAddress() : null}
        <HathorAlert ref="alertCopied" text="Copied to clipboard!" type="success" />
        <HathorAlert ref="alertError" text="You must use an old address before generating new ones" type="danger" />
        <ModalPin execute={this.getNewAddress} handleChangePin={this.handleChangePin} />
      </div>
    );
  }
}

export default connect(mapStateToProps)(WalletAddress);