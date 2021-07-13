/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'
import { connect } from "react-redux";

import hathorLib from '@hathor/wallet-lib';

const mapStateToProps = (state) => {
  return {
    listOfWallets: hathorLib.storage.store.getListOfWallets(),
  };
};

/**
 * Screen that has a list of wallets available.
 *
 * @memberof Screens
 */
class WalletList extends React.Component {
  /**
   * Called when user clicks on a wallet name.
   *
   * @param {Object} e Event for the click
   * @param {String} prefix Prefix of the chosen wallet
   */
  goToWallet = (e, prefix) => {
    e.preventDefault();
    hathorLib.storage.store.prefix = prefix;
    hathorLib.wallet.lock();
    this.props.history.push('/');
  }

  onNewWalletClick = (e) => {
    const walletName = this.refs.walletName.value;
    hathorLib.storage.store.addWallet(walletName, walletName);
    // FIXME Reload this screen. For now, user must go back and reopen this screen.
  }

  render() {
    const renderList = () => {
      return Object.entries(this.props.listOfWallets).map(([prefix, walletInfo]) => {
        return (
          <tr key={prefix}>
            <td><a href="true" onClick={(e) => this.goToWallet(e, prefix)}>{walletInfo.name}</a></td>
          </tr>
        );
      });
    }

    const newWalletForm = () => {
      return (
        <form ref="newWalletForm" className="w-100">
          <div className="row">
            <div className="col-6">
              <input ref="walletName" type="text" autoComplete="off" placeholder="Wallet Name" className="form-control" />
            </div>
            <div className="col-6">
              <button onClick={this.onNewWalletClick} type="button" className="btn btn-hathor">{t`Create new wallet`}</button>
            </div>
          </div>
        </form>
      );
    }

    return (
      <div className="content-wrapper">
        <div className="d-flex flex-column">
          <div className="d-flex flex-row justify-content-between">
            <h2>{t`Wallets`}</h2>
          </div>
          {newWalletForm()}
          <div className="table-responsive">
            <table className="mt-3 table table-striped" id="address-list">
              <tbody>
                {renderList()}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(mapStateToProps)(WalletList);
