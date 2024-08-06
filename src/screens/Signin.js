/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'

import logo from '../assets/images/hathor-logo.png';
import hathorLib from '@hathor/wallet-lib';
import InitialImages from '../components/InitialImages';
import { useNavigate } from 'react-router-dom';
import { setInitWalletName } from '../actions/index';
import { connect } from "react-redux";

// XXX: Adjust to the function component

/**
 * Screen used to select between create a new wallet or import an old one
 *
 * @memberof Screens
 */
function Signin() {
  const navigate = useNavigate();

  /**
   * errorMessage {string} Message to be shown when an error happens
   */
  state = { errorMessage: '' };

  /**
   * Check wallet name is not blank or already in use
   */
  validateWalletName = (name) => {
    let errorMessage = null;
    if (!name) {
      errorMessage = t`Wallet name is required`;
    }
    const walletNames = Object.values(hathorLib.storage.store.getListOfWallets()).map(walletInfo => walletInfo.name);
    if (walletNames.includes(name)) {
      errorMessage = t`Wallet name is already in use`;
    }
    return errorMessage;
  }

  /**
   * Go to the new wallet screen
   */
  const goToNewWallet = () => {
    navigate('/new_wallet/');
  }

  /**
   * Go to the load wallet screen
   */
  const goToLoadWallet = () => {
    const errorMessage = this.validateWalletName(this.name);
    if (errorMessage) {
      this.setState({ errorMessage });
      return;
    }
    this.props.setInitWalletName(this.name);
    navigate('/load_wallet/');
  }

  const handleNameChange = (name) => {
    this.name = name;
  };

  return (
    <div className="outside-content-wrapper">
      <div className="inside-white-wrapper col-sm-12 col-md-8">
        <div className="d-flex align-items-center flex-column inside-div">
          <img className="hathor-logo" src={logo} alt="" />
          <p className="mb-2 mt-4 w-100">
            {t`You may have different wallets started at the same time. You should have a name for each wallet.`}
          </p>
          <input className="w-100 form-control" required ref="walletName" type="text" maxLength="24" autoComplete="off" placeholder={t`Wallet name`} onChange={(e) => {this.handleNameChange(e.target.value)}}/>
          {this.state.errorMessage && <p className="mb-2 mt-2 w-100 text-danger">{this.state.errorMessage}</p>}
          <p className="mt-4 mb-4">{t`You can start a new wallet or import data from a wallet that already exists.`}</p>
          <div className="d-flex align-items-center flex-row justify-content-between w-100 mt-4">
            <button onClick={() => navigate(-1)} type="button" className="btn btn-secondary">{t`Back`}</button>
            <button onClick={goToNewWallet} type="button" className="btn btn-hathor mr-3">{t`New wallet`}</button>
            <button onClick={goToLoadWallet} type="button" className="btn btn-hathor">{t`Import wallet`}</button>
          </div>
        </div>
        <InitialImages />
      </div>
    </div>
  )
}

export default connect(null, mapDispatchToProps)(Signin);
