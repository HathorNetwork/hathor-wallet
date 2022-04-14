/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { connect } from "react-redux";
import ModalResetAllData from '../components/ModalResetAllData';
import $ from 'jquery';
import wallet from '../utils/wallet';
import RequestErrorModal from '../components/RequestError';
import hathorLib from '@hathor/wallet-lib';
import ReactLoading from 'react-loading';
import { resolveLockWalletPromise } from '../actions';
import colors from '../index.scss'


const mapStateToProps = (state) => {
  return {
    lockWalletPromise: state.lockWalletPromise,
  };
};

const mapDispatchToProps = dispatch => {
  return {
    resolveLockWalletPromise: pin => dispatch(resolveLockWalletPromise(pin)),
  };
};

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
      errorMessage: '',
      loading: false,
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

    if (this.state.loading) {
      return;
    }

    const isValid = this.refs.unlockForm.checkValidity();
    if (isValid) {
      const pin = this.refs.pin.value;
      this.refs.unlockForm.classList.remove('was-validated')
      if (!hathorLib.wallet.isPinCorrect(pin)) {
        this.setState({ errorMessage: t`Invalid PIN` });
        return;
      }

      // LockedWallet screen was called for a result, so we should resolve the promise with the PIN after
      // it is validated.
      if (this.props.lockWalletPromise) {
        this.props.resolveLockWalletPromise(pin);
        // return to the last screen
        this.props.history.goBack();
        return;
      }

      this.setState({
        loading: true,
      });

      // The last parameter being true means that we are going to start the wallet from an xpriv
      // that's already in localStorage encrypted. Because of that we don't need to send the
      // seed (first parameter) neither the password (second parameter).
      const promise = wallet.startWallet(null, '', pin, '', this.props.history, true);

      promise.then(() => {
        this.setState({
          loading: false,
        });
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
   * When reset modal validates, then execute method to reset all data from the wallet and redirect to Welcome screen
   */
  handleReset = () => {
    $('#confirmResetModal').modal('hide');
    wallet.resetWalletData();
    this.props.history.push('/welcome/');
  }

  render() {
    return (
      <div className="content-wrapper flex align-items-center">
        <div className="col-sm-12 col-md-8 offset-md-2 col-lg-6 offset-lg-3">
          <div className="d-flex align-items-start flex-column">
            <p>{t`Your wallet is locked. Please write down your PIN to unlock it.`}</p>
            <form ref="unlockForm" className="w-100" onSubmit={this.unlockClicked}>
              <input required ref="pin" type="password" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off" placeholder={t`PIN`} className="form-control" />
            </form>
            {this.state.errorMessage && <p className="mt-4 text-danger">{this.state.errorMessage}</p>}
            <div className="d-flex align-items-center justify-content-between flex-row w-100 mt-4">
              <a className="mt-4" onClick={(e) => this.resetClicked(e)} href="true">{t`Reset all data`}</a>
              <div className="d-flex align-items-center justify-content-between btn-hathor-loading-wrapper">
                {this.state.loading && (
                  <ReactLoading color={colors.purpleHathor} type='spin' width={24} height={24} className="loading" />
                )}
                <button
                  onClick={this.unlockClicked}
                  type="button"
                  className="btn btn-hathor"
                  disabled={this.state.loading}>
                  {t`Unlock`}
                </button>
              </div>
            </div>
          </div>
        </div>
        <ModalResetAllData success={this.handleReset} />
        <RequestErrorModal {...this.props} />
      </div>
    )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(LockedWallet);
