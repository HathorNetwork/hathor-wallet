/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import logo from '../assets/images/hathor-logo.png';
import wallet from '../utils/wallet';
import hathorLib from '@hathor/wallet-lib';


/**
 * Screen used to select between hardware wallet or software wallet
 *
 * @memberof Screens
 */
class WalletType extends React.Component {
  componentDidMount() {
    // Update Sentry when user started wallet now
    wallet.updateSentryState();
  }

  /**
   * Go to signin screen
   */
  goToSoftwareWallet = () => {
    hathorLib.wallet.setWalletType('software');
    this.props.history.push('/software_warning/');
  }

  /**
   * Go to the hardware wallet screen
   */
  goToHardwareWallet = () => {
    hathorLib.wallet.setWalletType('hardware');
    //this.props.history.push('/hardware/');
  }

  render() {
    return (
      <div className="outside-content-wrapper">
        <div className="inside-white-wrapper col-sm-12 col-md-8">
          <div className="d-flex align-items-center flex-column">
            <img className="hathor-logo" src={logo} alt="" />
            <p className="mt-4 mb-4">Do you want to connect to a hardware device (we currently support only Ledger), or want to start a software wallet?</p>
            <div className="d-flex align-items-center flex-row justify-content-between w-100 mt-4">
              <button onClick={this.goToHardwareWallet} type="button" className="btn btn-hathor mr-3">Hardware wallet</button>
              <button onClick={this.goToSoftwareWallet} type="button" className="btn btn-hathor">Software wallet</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default WalletType;
