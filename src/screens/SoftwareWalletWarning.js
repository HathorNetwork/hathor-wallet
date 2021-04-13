/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';

import logo from '../assets/images/hathor-logo.png';
import SoftwareWalletWarningMessage from '../components/SoftwareWalletWarningMessage';
import InitialImages from '../components/InitialImages';


/**
 * Confirm that want to continue to software wallet
 *
 * @memberof Screens
 */
class SoftwareWalletWarning extends React.Component {
  /**
   * formValidated {boolean} If checkbox form was validated
   */
  state = {
    formValidated: false,
  }

  create = () => {
    let isValid = this.refs.confirmForm.checkValidity();
    if (isValid) {
      this.props.history.push('/signin/');
    } else {
      this.setState({ formValidated: true });
    }
  }

  render() {
    return (
      <div className="outside-content-wrapper">
        <div className="inside-white-wrapper col-sm-12 col-md-8">
          <div className="d-flex align-items-center flex-column inside-div">
            <img className="hathor-logo" src={logo} alt="" />
            <div className="d-flex align-items-start flex-column">
              <div>
                <SoftwareWalletWarningMessage />
                <form ref="confirmForm" className={`w-100 mb-4 ${this.state.formValidated && 'was-validated'}`}>
                  <div className="form-check">
                    <input required type="checkbox" className="form-check-input" id="confirmWallet" />
                    <label className="form-check-label" htmlFor="confirmWallet">{t`Ok, I got it! I want to continue using a software wallet.`}</label>
                  </div>
                </form>
                <div className="d-flex justify-content-between flex-row w-100">
                  <button onClick={this.props.history.goBack} type="button" className="btn btn-secondary">{t`Back`}</button>
                  <button onClick={this.create} type="button" className="btn btn-hathor">{t`Continue`}</button>
                </div>
              </div>
            </div>
          </div>
          <InitialImages />
        </div>
      </div>
    )
  }
}

export default SoftwareWalletWarning;
