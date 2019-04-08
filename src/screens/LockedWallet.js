/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import ModalResetAllData from '../components/ModalResetAllData';
import $ from 'jquery';
import wallet from '../utils/wallet';
import RequestErrorModal from '../components/RequestError';


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
      this.refs.unlockForm.classList.remove('was-validated')
      if (!wallet.isPinCorrect(this.refs.pin.value)) {
        this.setState({ errorMessage: 'Invalid PIN' });
        return;
      }

      // Everything is fine, so redirect to wallet
      wallet.unlock();
      // Reload wallet data
      wallet.reloadData();
      this.props.history.push('/wallet/');
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
   * When reset modal validates, then execute method to reset all data from the wallet and redirect to Welcome screen
   */
  handleReset = () => {
    $('#confirmResetModal').modal('hide');
    wallet.resetAllData();
    this.props.history.push('/welcome/');
  }

  render() {
    return (
      <div className="content-wrapper flex align-items-center">
        <div className="col-sm-12 col-md-8 offset-md-2 col-lg-6 offset-lg-3">
          <div className="d-flex align-items-start flex-column">
            <p>Your wallet is locked. Please write down your PIN to unlock it.</p>
            <form ref="unlockForm" className="w-100" onSubmit={this.unlockClicked}>
              <input required ref="pin" type="password" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off" placeholder="PIN" className="form-control" />
            </form>
            {this.state.errorMessage && <p className="mt-4 text-danger">{this.state.errorMessage}</p>}
            <div className="d-flex align-items-center justify-content-between flex-row w-100 mt-4">
              <a className="mt-4" onClick={(e) => this.resetClicked(e)} href="true">Reset all data</a>
              <button onClick={this.unlockClicked} type="button" className="btn btn-hathor">Unlock</button>
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
