/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import wallet from '../utils/wallet';
import logo from '../assets/images/hathor-logo.png';
import InitialImages from '../components/InitialImages';


/**
 * Screen to ask for permission to send errors to Sentry
 *
 * @memberof Screens
 */
class SentryPermission extends React.Component {
  /**
   * savedPermission {boolean} If user has already a permission saved in the localStorage (can be null)
   * checkboxPermission {boolean} Checkbox value of permission
   */
  state = { savedPermission: null, checkboxPermission: true };

  componentDidMount() {
    const savedPermission = wallet.getSentryPermission();
    this.setState({ savedPermission, checkboxPermission: savedPermission === null ? true : savedPermission });
  }

  /**
   * When user clicks the button to continue to the wallet, it saves the user preference and redirects to the wallet type screen
   */
  goContinue = () => {
    // Set permission on localStorage
    if (this.state.checkboxPermission) {
      wallet.allowSentry();
    } else {
      wallet.disallowSentry();
    }

    // If state permission is null, user is still starting the wallet
    // Otherwise, user is changing it in the settings
    if (this.state.savedPermission === null) {
      this.props.history.push('/wallet_type/');
    } else {
      this.props.history.push('/settings/');
    }
  }

  /**
   * Method called when user clicks on the checkbox to change permission
   *
   * @param {Object} e Event emitted by checkbox click
   */
  checkboxChanged = (e) => {
    this.setState({ checkboxPermission: e.target.checked });
  }

  render() {
    return (
      <div className="outside-content-wrapper">
        <div className="inside-white-wrapper col-sm-12 col-md-8">
          <div className="inside-div">
            <div className="d-flex align-items-center flex-column">
              <img className="hathor-logo" src={logo} alt="" />
              <p className="mt-5"><strong>{t`Automatic bug report`}</strong></p>
            </div>
            <p>{t`We would like your permission to automatically report bugs to our development team. It really helps us to improve our Wallet faster for our community.`}</p>
            <p>{t`The report collects the following data:`}</p>
            <ul>
              <li>{t`The server your wallet is connected to;`}</li>
              <li>{t`The version of your wallet;`}</li>
              <li>{t`The version of your operating system;`}</li>
              <li>{t`The details of the bug, including the context it has happened.`}</li>
            </ul>
            <p>{t`The report NEVER collects any sensitive data, such as your seed, your private keys, your addresses, or your balances.`}</p>
          <form>
            <div className="form-check mt-4 mb-4">
              <input required type="checkbox" onChange={(e) => this.checkboxChanged(e)} checked={this.state.checkboxPermission} className="form-check-input" id="permission" ref="permission" />
              <label className="form-check-label" htmlFor="permission"> {t`I allow Hathor Wallet to report error information to Hathor team.`}</label>
            </div>
          </form>
            <div className="d-flex align-items-center flex-column">
              <button onClick={this.goContinue} type="button" className="btn btn-hathor">{t`Continue`}</button>
            </div>
          </div>
          <InitialImages />
        </div>
      </div>
    )
  }
}

export default SentryPermission;
