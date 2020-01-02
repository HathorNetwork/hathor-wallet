/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import logo from '../assets/images/hathor-logo.png';
import hathorLib from '@hathor/wallet-lib';
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
      this.props.history.push('/permission/');
    }
  }

  render() {
    return (
      <div className="outside-content-wrapper">
        <div className="inside-white-wrapper col-sm-12 col-md-8">
          <div className="inside-div">
            <div className="d-flex align-items-center flex-column">
              <img className="hathor-logo" src={logo} alt="" />
              <p className="mt-4 mb-4">Welome to Hathor Wallet!</p>
            </div>
            <p className="mb-4">This wallet is connected to the <strong>mainnet</strong>.</p>
            <p>In this wallet you can send tokens and see the history of your transactions. Besides that, you can also create and manage new tokens.</p>
            <p>You are responsible for your tokens and the safety of them.</p>
            <p>For further information, check our website (https://hathor.network/).</p>
          <form ref="agreeForm" className={`w-100 mb-4 ${this.state.formValidated ? 'was-validated' : ''}`}>
            <div className="form-check">
              <input required type="checkbox" className="form-check-input" id="confirmAgree" />
              <label className="form-check-label" htmlFor="confirmAgree"> I understand that I am responsible for my wallet and the tokens.</label>
            </div>
          </form>
            <div className="d-flex align-items-center flex-column">
              <button onClick={this.getStarted} type="button" className="btn btn-hathor">Get started</button>
            </div>
          </div>
          <InitialImages />
        </div>
      </div>
    )
  }
}

export default Welcome;
