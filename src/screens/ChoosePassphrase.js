/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'

import $ from 'jquery';
import wallet from '../utils/wallet';
import BackButton from '../components/BackButton';
import { connect } from 'react-redux';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';


const mapStateToProps = (state) => {
  return { wallet: state.wallet };
};

/**
 * Screen used to choose a passphrase for your wallet
 *
 * @memberof Screens
 */
class ChoosePassphrase extends React.Component {
  static contextType = GlobalModalContext;

  /**
   * errorMessage {string} Message to show when error happens on the form
   * firstStep {boolean} If should show the first step of the form, or the second one
   */
  state = { errorMessage: '', firstStep: true };

  /**
   * Method called after confirming modal that changes addresses in the wallet and redirects to the main wallet screen
   */
  handlePassphrase = () => {
    this.context.hideModal();
    wallet.addPassphrase(this.props.wallet, this.refs.passphrase.value, this.refs.pin.value, this.refs.password.value, this.props.history)
      .then(() => {
        this.props.history.push('/wallet/');
      });
  }

  /**
   * Method called when user clicks in the button to change the passphrase, then a modal opens to confirm the action
   * Validates if all form requirements are okay
   */
  addClicked = async () => {
    const isValid = this.refs.passphraseForm.checkValidity();
    if (isValid) {
      this.refs.passphraseForm.classList.remove('was-validated')
      if (this.refs.blankPassphrase.checked === false && this.refs.passphrase.value === '') {
        this.setState({ errorMessage: t`To set a blank passphrase mark the corresponding checkbox above.` });
        return;
      }
      const passphrase = this.refs.passphrase.value;
      const confirmPassphrase = this.refs.confirmPassphrase.value;
      if (passphrase !== confirmPassphrase) {
        this.setState({ errorMessage: t`Passphrase and confirm passphrase must be equal` });
        return;
      }

      if (!await this.props.wallet.checkPassword(this.refs.password.value)) {
        this.setState({ errorMessage: t`Invalid password` });
        return;
      }

      if (!await this.props.wallet.checkPin(this.refs.pin.value)) {
        this.setState({ errorMessage: t`Invalid PIN` });
        return;
      }

      this.setState({ errorMessage: '' });
      // Everything is fine, so show confirm modal
      this.context.showModal(MODAL_TYPES.CONFIRM, {
        title: t`Set a passphrase`,
        handleYes: this.handlePassphrase,
        body: (
          <div>
            <p>{t`Are you sure you want to change your whole wallet setting this passphrase?`}</p>
          </div>
        )
      });
    } else {
      this.refs.passphraseForm.classList.add('was-validated')
    }
  }

  /**
   * Method called when user clicks in the button to continue and that he understand the risks of it.
   * Validates if checkbox is checked and shows the form to set the passphrase
   */
  continueClicked = () => {
    const isValid = this.refs.confirmForm.checkValidity();
    if (isValid) {
      this.refs.confirmForm.classList.remove('was-validated')
      this.setState({ firstStep: false });
    } else {
      this.refs.confirmForm.classList.add('was-validated')
    }
  }

  /**
   * Method called when checkbox for blank passphrase changes. We show/hide the passphrase fields depending if is checked.
   */
  checkboxChange = () => {
    if (this.refs.blankPassphrase.checked) {
      $(this.refs.passphraseWrapper).hide(300);
    } else {
      $(this.refs.passphraseWrapper).show(300);
    }
  }

  render() {
    const renderFirstForm = () => {
      return (
        <form ref="confirmForm" className="w-100">
          <div className="form-check">
            <input required type="checkbox" className="form-check-input" id="confirmAgree" />
            <label className="form-check-label" htmlFor="confirmAgree"> {t`I understand the risks of adding a passphrase.`}</label>
          </div>
        </form>
      );
    }

    const renderSecondForm = () => {
      return (
        <form ref="passphraseForm" className="w-100">
          <div className="row">
            <div className="col-6" ref="passphraseWrapper">
              <input ref="passphrase" type="password" autoComplete="off" placeholder="Passphrase" className="form-control" />
              <input ref="confirmPassphrase" type="password" autoComplete="off" placeholder="Confirm passphrase" className="form-control mt-4" />
            </div>
            <div className="col-7 mt-4">
              <div className="form-check">
                <input type="checkbox" className="form-check-input" id="blankPassphrase" ref="blankPassphrase" onChange={this.checkboxChange} />
                <label className="form-check-label" htmlFor="blankPassphrase"> {t`I want to set a blank passphrase.`}</label>
              </div>
            </div>
          </div>
          <p className="mt-4">{t`Please, enter your password and PIN to confirm the operation.`}</p>
          <div className="row">
            <div className="col-6">
              <input required ref="password" type="password" autoComplete="off" placeholder={t`Password`} className="form-control mt-4 mb-4" />
              <input required ref="pin" type="password" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off" placeholder={t`PIN`} className="form-control" />
            </div>
          </div>
        </form>
      );
    }

    return (
      <div className="content-wrapper flex align-items-center">
        <BackButton {...this.props} />
        <h3 className="mt-4 mb-5">{t`Set Passphrase`}</h3>
        <div className="d-flex align-items-start flex-column">
          <p>{t`Adding a passphrase is an advanced feature, and you should not use it unless you know what you are doing.`}</p>
          <p>{t`It will change all your addresses, so it is like generating a completely new wallet.`}</p>
          <p>{t`You should take note of your passphrase for future use. If you lose your passphrase, you will never have access to your tokens again.`}</p>
          {this.state.firstStep ? renderFirstForm() : renderSecondForm()}
          {this.state.errorMessage && <p className="mt-4 text-danger">{this.state.errorMessage}</p>}
          {this.state.firstStep ?
              <button onClick={this.continueClicked} type="button" className="btn btn-hathor mt-5">{t`Continue`}</button> :
              <button onClick={this.addClicked} type="button" className="btn btn-hathor mt-5">{t`Confirm`}</button>}
        </div>
      </div>
    )
  }
}

export default connect(mapStateToProps)(ChoosePassphrase);
