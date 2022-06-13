/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { connect } from "react-redux";

import wallet from '../utils/wallet';
import hathorLib from '@hathor/wallet-lib';
import logo from '../assets/images/hathor-logo.png';
import InitialImages from '../components/InitialImages';

/**
 * When wallet is locked show this screen and ask for PIN to unlock the wallet
 *
 * @memberof Screens
 */
class ChooseWallet extends React.Component {

  /**
   * Called when user clicks on a wallet name.
   *
   * @param {Object} e Event for the click
   * @param {String} prefix Prefix of the chosen wallet
   */
  goToWallet = (e, prefix) => {
    e.preventDefault();
    wallet.setWalletPrefix(prefix);
    this.props.history.push('/');
  }

  /**
   * Called when user clicks on "Add Wallet" button.
   */
  addWallet = () => {
    wallet.setWalletPrefix(null);
    hathorLib.wallet.cleanWallet({ cleanAccessData: false });
    this.props.history.push('/signin');
  }

  render() {
    const walletTable = Object.entries(hathorLib.storage.store.getListOfWallets()).map(([prefix, walletInfo]) => {
      const onclick = (e) => this.goToWallet(e, prefix);
      return (
        <tr key={prefix}>
          <td><a href="true" onClick={onclick}>{walletInfo.name}</a></td>
        </tr>
      );
    });

    return (
      <div className="outside-content-wrapper">
        <div className="inside-white-wrapper col-sm-12 col-md-8">
          <div className="inside-div">
            <div className="d-flex mb-4 align-items-center flex-column">
              <img className="hathor-logo" src={logo} alt="" />
            </div>
            <p>{t`Select a software wallet or connect to a hardware wallet. You may also start a new software wallet.`}</p>
            <div className="d-flex align-items-start flex-column">
              <div className="table-responsive">
                <table className="mt-3 table table-striped">
                  <tbody>
                    {walletTable}
                  </tbody>
                </table>
              </div>
            </div>
            <button className="btn btn-hathor mt-4" onClick={this.addWallet}>{t`Add software wallet`}</button>
          </div>
          <InitialImages />
        </div>
      </div>
    )
  }
}

export default ChooseWallet;
