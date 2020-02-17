/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'

import SpanFmt from '../components/SpanFmt';
import logo from '../assets/images/hathor-logo.png';
import hathorLib from '@hathor/wallet-lib';
import wallet from '../utils/wallet';
import InitialImages from '../components/InitialImages';


/**
 * First screen of the wallet to show a welcome message and brief explanation
 *
 * @memberof Screens
 */
class Welcome extends React.Component {
  /**
   * formValidated {boolean} If required checkbox of form was checked
   */
  state = { formValidated: false }

  /**
   * When user clicks the button to start the wallet, then check form and redirect to Sentry Permission screen
   */
  getStarted = () => {
    const isValid = this.refs.agreeForm.checkValidity();
    this.setState({ formValidated: !isValid });
    if (isValid) {
      hathorLib.wallet.markWalletAsStarted();
      // For the mainnet sentry will be disabled by default and the user can change this on Settings
      wallet.disallowSentry();
      this.props.history.push('/signin/');
    }
  }

  render() {
    return (
      <div className="outside-content-wrapper">
        <div className="inside-white-wrapper col-sm-12 col-md-8">
          <div className="inside-div">
            <div className="d-flex align-items-center flex-column">
              <img className="hathor-logo" src={logo} alt="" />
              <p className="mt-4 mb-4">{t`Welcome to Hathor Wallet!`}</p>
            </div>
            <p className="mb-4"><SpanFmt>{t`This wallet is connected to the **mainnet**.`}</SpanFmt></p>
            <p>{t`Using this wallet you can (i) check your balance and history, (ii) send & receive HTR and other tokens running on Hathor, and (iii) create and manage your own tokens.`}</p>
            <p>{t`You should never share any information besides your addresses to other people. You're fully responsible for keeping your tokens safe.`}</p>
            <p>{t`For further information, check our website (https://hathor.network/).`}</p>
          <form ref="agreeForm" className={`w-100 mb-4 ${this.state.formValidated ? 'was-validated' : ''}`}>
            <div className="form-check">
              <input required type="checkbox" className="form-check-input" id="confirmAgree" />
              <label className="form-check-label" htmlFor="confirmAgree"> {t`I understand that I am fully responsible for keeping my tokens safe and that it is not possible to revert transactions after they are executed.`}</label>
            </div>
          </form>
            <div className="d-flex align-items-center flex-column">
              <button onClick={this.getStarted} type="button" className="btn btn-hathor">{t`Get started`}</button>
            </div>
          </div>
          <InitialImages />
        </div>
      </div>
    )
  }
}

export default Welcome;
