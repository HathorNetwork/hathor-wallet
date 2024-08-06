/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';

import wallet from '../utils/wallet';
import helpers from '../utils/helpers';
import hathorLib from '@hathor/wallet-lib';
import logo from '../assets/images/hathor-logo.png';
import InitialImages from '../components/InitialImages';
import ModalResetAllData from '../components/ModalResetAllData';
import colors from '../index.scss';
import ReactLoading from 'react-loading';
import $ from 'jquery';

// XXX: Convert to function component

/**
 * Show list of wallets for user to choose from and ask for PIN.
 *
 * @memberof Screens
 */
class ChooseWallet extends React.Component {
  constructor(props) {
    super(props);

    // update storage in case it did not support multiple wallets (wallet upgrade)
    const wallets = hathorLib.storage.store.getListOfWallets();
    if (!wallets || Object.keys(wallets).length === 0){
      const name = 'default';
      const prefix = wallet.walletNameToPrefix(name);
      hathorLib.storage.store.upgradeStorage(prefix, name);
    }

    this.state = {
      selectedWallet: null,
      errorMessage: null,
      loading: false,
      wallets: hathorLib.storage.store.getListOfWallets(),
    }
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevState.selectedWallet !== this.state.selectedWallet) {
      this.refs.pin.focus();
    }
  }

  /**
   * Called when user clicks on a wallet name.
   *
   * @param {Object} e Event for the click
   * @param {String} prefix Prefix of the chosen wallet
   */
  goToWallet = (e, prefix) => {
    e.preventDefault();

    if (this.state.loading) return;
    
    this.setState({ selectedWallet: prefix, errorMessage: null });
  }

  /**
   * Called when user clicks on "Add Wallet" button.
   */
  addWallet = () => {
    if (this.state.loading) return;
    wallet.setWalletPrefix(null);
    hathorLib.wallet.cleanWallet({ cleanAccessData: false });
    this.props.history.push('/signin');
  }

  /**
   * Called when user clicks on "Hardware Wallet" button.
   */
  goToHardwareWallet = () => {
    if (this.state.loading) return;
    wallet.setWalletPrefix(null);
    hathorLib.wallet.cleanWallet({ cleanAccessData: false });
    this.props.history.push('/hardware_wallet');
  }

  /**
   * When user clicks on the reset link, then raises a modal to asks for reset confirmation
   *
   * @param {Object} e Event of when the link is clicked
   */
  resetClicked = (prefix) => {
    wallet.setWalletPrefix(prefix);
    $('#confirmResetModal').modal('show');
  }

  /**
   * When reset modal validates, then execute method to reset all data from the wallet
   */
  handleReset = () => {
    $('#confirmResetModal').modal('hide');
    // Remove from list of wallets
    hathorLib.storage.store.removeWallet(hathorLib.storage.store.prefix);
    // change state to a copied object to make sure it will re-render
    this.setState({ wallets: Object.assign({}, hathorLib.storage.store.getListOfWallets()) });
    // reset data
    wallet.resetWalletData();
    wallet.setWalletPrefix(null);
    // If there are no wallets anymore, go to initial screen
    const firstWallet = wallet.getFirstWalletPrefix();
    if (!firstWallet) {
      this.props.history.push('/');
    }
  }

  /**
   * When user clicks on the unlock button
   * Checks if form is valid and if PIN is correct, then unlocks the wallet loading the data and redirecting
   *
   * @param {Object} e Event of when the button is clicked
   */
  unlockClicked = (e, prefix) => {
    if (e) e.preventDefault();
    if (this.state.loading) return;

    wallet.setWalletPrefix(prefix);

    const pin = this.refs.pin.value;
    if (!hathorLib.wallet.isPinCorrect(pin)) {
      this.setState({ errorMessage: t`Invalid PIN`, loading: false });
      return;
    }
    this.setState({ errorMessage: null, loading: true });

    // Make sure the correct network is used. The storage has already been set to the new
    // wallet, so fetching the info from storage will get the correct network
    const currentNetwork = hathorLib.storage.getItem('wallet:network') || 'mainnet';
    helpers.updateNetwork(currentNetwork);

    // The last parameter being true means that we are going to start the wallet from an xpriv
    // that's already in localStorage encrypted. Because of that we don't need to send the
    // seed (first parameter) neither the password (second parameter).
    const promise = wallet.startWallet(null, '', pin, '', this.props.history, true);

    promise.then(() => {
      this.props.history.push('/wallet/');
    });
  }

  render() {
    const walletTable = Object.entries(this.state.wallets).map(([prefix, walletInfo]) => {
      const onclick = (e) => this.goToWallet(e, prefix);
      const shouldDisplay = (this.state.selectedWallet === prefix);

      return (
        <tr key={prefix}>
          <td className="py-3 w-50 align-middle"><a href="true" onClick={onclick}>{walletInfo.name}</a></td>
          <td className="py-2 w-25">
            { shouldDisplay && (
            <form className="w-100" onSubmit={(e) => this.unlockClicked(e, prefix)}>
              <input required className="form-control" ref="pin" type="password" maxLength="6" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off" placeholder={t`PIN`} />
            </form> )}
          </td>
          <td className="py-2">
            { shouldDisplay && (
            <button
              onClick={() => this.unlockClicked(null, prefix)}
              type="button"
              className="btn btn-hathor">
              {t`Unlock`}
            </button> )}
          </td>
          <td className="py-3 pl-0 align-middle">
            <div role="button" onClick={() => this.resetClicked(prefix)}>
              <i className='fa fa-trash token-icon float-right' title={t`Reset wallet`}></i>
            </div>
          </td>
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
            <p>{t`Select a Software Wallet or connect to a Hardware Wallet. You may also start a new Software Wallet.`}</p>
            <div className="d-flex align-items-start flex-column">
              <div className="table-responsive">
                <table className="mt-3 table table-striped">
                  <tbody>
                    {walletTable}
                  </tbody>
                </table>
              </div>
            </div>
            {this.state.errorMessage && <p className="text-center text-danger">{this.state.errorMessage}</p>}
            <div className="d-flex align-items-center flex-row justify-content-between w-100 mt-4">
              <button className="btn btn-hathor mr-3" onClick={this.goToHardwareWallet}>{t`Hardware Wallet`}</button>
              {this.state.loading && (
                <ReactLoading color={colors.purpleHathor} type='spin' width={24} height={24} className="loading" />
              )}
              <button className="btn btn-hathor" onClick={this.addWallet}>{t`Add Software Wallet`}</button>
            </div>
          </div>
          <InitialImages />
        </div>
        <ModalResetAllData success={this.handleReset} />
      </div>
    )
  }
}

export default ChooseWallet;
