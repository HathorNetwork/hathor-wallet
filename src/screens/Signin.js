/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'

import logo from '../assets/images/hathor-logo.png';
import wallet from '../utils/wallet';
import InitialImages from '../components/InitialImages';


/**
 * Screen used to select between create a new wallet or import an old one
 *
 * @memberof Screens
 */
class Signin extends React.Component {
  /**
   * Go to the new wallet screen
   */
  goToNewWallet = () => {
    this.props.history.push('/new_wallet/');
  }

  /**
   * Go to the load wallet screen
   */
  goToLoadWallet = () => {
    this.props.history.push('/load_wallet/');
  }

  render() {
    return (
      <div className="outside-content-wrapper">
        <div className="inside-white-wrapper col-sm-12 col-md-8">
          <div className="d-flex align-items-center flex-column inside-div">
            <img className="hathor-logo" src={logo} alt="" />
            <p className="mt-4 mb-4">{t`You can start a new wallet or import data from a wallet that already exists.`}</p>
            <div className="d-flex align-items-center flex-row justify-content-between w-100 mt-4">
              <button onClick={this.props.history.goBack} type="button" className="btn btn-secondary">{t`Back`}</button>
              <button onClick={this.goToNewWallet} type="button" className="btn btn-hathor mr-3">{t`New wallet`}</button>
              <button onClick={this.goToLoadWallet} type="button" className="btn btn-hathor">{t`Import wallet`}</button>
            </div>
          </div>
          <InitialImages />
        </div>
      </div>
    )
  }
}

export default Signin;
