/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import ModalResetAllData from '../components/ModalResetAllData';
import $ from 'jquery';
import wallet from '../utils/wallet';
import RequestErrorModal from '../components/RequestError';
import hathorLib from '@hathor/wallet-lib';


/**
 * When wallet is locked show this screen and ask for PIN to unlock the wallet
 *
 * @memberof Screens
 */
class LockedWallet extends React.Component {
  constructor(props) {
    super(props);

    /**
     * errorMessage {string} Message to be shown in case of error in modal
     */
    this.state = {
      errorMessage: ''
    }
  }

  componentDidMount() {
   this.refs.pin.focus();
    // Update Sentry when user started wallet now
    wallet.updateSentryState();
  }

  /**
   * When user clicks on the unlock button  
   * Checks if form is valid and if PIN is correct, then unlocks the wallet loading the data and redirecting
   *
   * @param {Object} e Event of when the button is clicked
   */
  unlockClicked = (e) => {
    e.preventDefault();
    const isValid = this.refs.unlockForm.checkValidity();
    if (isValid) {
      const pin = this.refs.pin.value;
      this.refs.unlockForm.classList.remove('was-validated')
      if (!hathorLib.wallet.isPinCorrect(pin)) {
        this.setState({ errorMessage: t`Invalid PIN` });
        return;
      }

      // The last parameter being true means that we are going to start the wallet from an xpriv
      // that's already in localStorage encrypted. Because of that we don't need to send the
      // seed (first parameter) neither the password (second parameter).
      const promise = wallet.startWallet(null, '', pin, '', this.props.history, true);
      promise.then(() => {
        this.props.history.push('/wallet/');
      });
    } else {
      this.refs.unlockForm.classList.add('was-validated')
    }
  }

  /**
   * When user clicks on the reset link, then raises a modal to asks for reset confirmation
   *
   * @param {Object} e Event of when the link is clicked
   */
  resetClicked = (e) => {
    e.preventDefault();
    $('#confirmResetModal').modal('show');
  }

  /**
   * When user clicks to change the wallet, it will change the current selected wallet
   *
   * @param {Object} e Event of when the link is clicked
   */
   changeWalletClicked = (e) => {
    e.preventDefault();
    hathorLib.storage.store.prefix = e.target.value;
  }

  /**
   * When reset modal validates, then execute method to reset all data from the wallet and redirect to Welcome screen
   */
  handleReset = () => {
    $('#confirmResetModal').modal('hide');
    wallet.resetWalletData();
    this.props.history.push('/welcome/');
  }

  render() {
    const listOfWallets = hathorLib.storage.store.getListOfWallets();
    const walletName = hathorLib.storage.store.getWalletName();

    const renderWalletSelect = () => {
      const walletOptions = Object.entries(listOfWallets).filter(([prefix, walletInfo]) => {
        // only show software wallets
        const walletType = hathorLib.storage.store.getPrefixedItem(prefix, 'wallet:type');
        return walletType === 'software';
      }).map(([prefix, walletInfo]) => {
        return (
          <option value={prefix} selected={prefix === hathorLib.storage.store.prefix? true : false}>{walletInfo.name}</option>
        );
      });

      return (<div className="d-flex align-items-center flex-row w-100 mt-4 form-group">
        <label>
          {t`Wallet`}:
          <select onChange={(e) => this.changeWalletClicked(e)}>
            {walletOptions}
          </select>
        </label>
      </div>);
    }

    return (
      <div className="content-wrapper flex align-items-center">
        <div className="col-sm-12 col-md-8 offset-md-2 col-lg-6 offset-lg-3">
          <div className="d-flex align-items-start flex-column">
            {renderWalletSelect()}
            <p>{t`Your wallet is locked. Please write down your PIN to unlock it.`}</p>
            <form ref="unlockForm" className="w-100" onSubmit={this.unlockClicked}>
              <input required ref="pin" type="password" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off" placeholder={t`PIN`} className="form-control" />
            </form>
            {this.state.errorMessage && <p className="mt-4 text-danger">{this.state.errorMessage}</p>}
            <div className="d-flex align-items-center justify-content-between flex-row w-100 mt-4">
              <a className="mt-4" onClick={(e) => this.resetClicked(e)} href="true">{t`Reset all data`}</a>
              <button onClick={this.unlockClicked} type="button" className="btn btn-hathor">{t`Unlock`}</button>
            </div>
          </div>
        </div>
        <ModalResetAllData success={this.handleReset} />
        <RequestErrorModal {...this.props} />
      </div>
    )
  }
}

export default LockedWallet;
