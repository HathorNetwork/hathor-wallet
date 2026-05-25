/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState } from 'react';
import { t } from 'ttag'
import { useDispatch } from 'react-redux';
import { useLocation, useNavigate } from 'react-router-dom';

import logo from '../assets/images/hathor-logo.png';
import InitialImages from '../components/InitialImages';
import ChoosePassword from '../components/ChoosePassword';
import ChoosePin from '../components/ChoosePin';
import LOCAL_STORE from '../storage';
import { startWalletRequested } from '../actions';


/**
 * Screen used to select between create a new wallet or import an old one.
 *
 * When reached from the Web3Auth flow, `location.state.walletType === 'web3auth'`
 * triggers a PIN + password mini-flow that bootstraps a single-key wallet from
 * the social-login private key, instead of showing the menu options.
 *
 * @memberof Screens
 */
function Signin() {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const location = useLocation();
  const web3authState = location.state || {};
  const isWeb3AuthFlow = web3authState.walletType === 'web3auth';

  const [askPIN, setAskPIN] = useState(false);
  const [password, setPassword] = useState('');

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
    navigate('/load_wallet/');
  }

  /**
   * User succeeded on choosing a password in the Web3Auth flow, advance to PIN.
   * @param {string} newPassword New password, already validated
   */
  const passwordSuccess = (newPassword) => {
    setPassword(newPassword);
    setAskPIN(true);
  }

  /**
   * Going back from the Choose PIN component to Choose Password.
   */
  const pinBack = () => {
    setAskPIN(false);
  }

  /**
   * Going back from the Choose Password component returns to the Web3Auth
   * provider picker so the user can pick a different login method.
   */
  const passwordBack = () => {
    navigate('/web3auth_login/');
  }

  /**
   * After choosing a PIN, persist the Web3Auth single-key storage, dispatch
   * the wallet start, and forward to the loading screen. `replace: true`
   * drops the navigation state so a subsequent navigate(-1) cannot leak the
   * privateKey back into the URL history.
   * @param {string} newPin New pin, already validated
   */
  const pinSuccess = async (newPin) => {
    const { privateKey, publicKey } = web3authState;
    LOCAL_STORE.unlock();
    await LOCAL_STORE.initWeb3AuthStorage(privateKey, publicKey, newPin, password);
    LOCAL_STORE.markBackupDone();
    LOCAL_STORE.open();
    dispatch(startWalletRequested({
      privateKey,
      publicKey,
      pin: newPin,
      password,
      walletType: 'web3auth',
    }));
    // Clear sensitive in-memory copy of the password.
    setPassword('');
    navigate('/loading_addresses/', { replace: true });
  }

  const renderWeb3AuthFlow = () => {
    if (askPIN) {
      return <ChoosePin back={pinBack} success={pinSuccess} />;
    }
    return <ChoosePassword back={passwordBack} success={passwordSuccess} />;
  }

  const renderMenu = () => {
    return (
      <>
        <p className="mt-4 mb-4">{t`You can start a new wallet or import data from a wallet that already exists.`}</p>
        <div className="d-flex align-items-center flex-row justify-content-between w-100 mt-4">
          <button onClick={() => navigate(-1)} type="button" className="btn btn-secondary">{t`Back`}</button>
          <button onClick={goToNewWallet} type="button" className="btn btn-hathor mr-3">{t`New wallet`}</button>
          <button onClick={goToLoadWallet} type="button" className="btn btn-hathor">{t`Import wallet`}</button>
        </div>
      </>
    );
  }

  return (
    <div className="outside-content-wrapper">
      <div className="inside-white-wrapper col-sm-12 col-md-8">
        <div className="d-flex align-items-center flex-column inside-div">
          <img className="hathor-logo" src={logo} alt="" />
          {isWeb3AuthFlow ? renderWeb3AuthFlow() : renderMenu()}
        </div>
        <InitialImages />
      </div>
    </div>
  )
}

export default Signin;
