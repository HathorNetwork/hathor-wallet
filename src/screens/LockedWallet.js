/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect, useRef, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { t } from 'ttag';
import { useSelector, useDispatch } from "react-redux";
import wallet from '../utils/wallet';
import ReactLoading from 'react-loading';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import { resolveLockWalletPromise, startWalletRequested, walletReset } from '../actions';
import { colors } from '../constants';
import LOCAL_STORE from '../storage';

/**
 * When wallet is locked show this screen and ask for PIN to unlock the wallet
 *
 * @memberof Screens
 */
function LockedWallet() {

  /**
   * errorMessage {string} Message to be shown in case of error in modal
   */
  const [errorMessage, setErrorMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const pinRef = useRef(null);
  const formRef = useRef(null);
  const context = useContext(GlobalModalContext);
  const lockWalletPromise = useSelector(state => state.lockWalletPromise);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    pinRef.current.focus();
    window.scrollTo(0, 0); // Ensures the user interface is correct when loading this screen
    wallet.updateSentryState(); // Update Sentry when user started wallet now
  }, []);

  /**
   * When user clicks on the unlock button
   * Checks if form is valid and if PIN is correct, then unlocks the wallet loading the data and redirecting
   *
   * @param {Object} e Event of when the button is clicked
   */
  const unlockClicked = async (e) => {
    e.preventDefault();

    if (loading) {
      return;
    }

    const isValid = formRef.current.checkValidity();
    if (!isValid) {
      formRef.current.classList.add('was-validated')
      return;
    }

    const pin = pinRef.current.value;
    formRef.current.classList.remove('was-validated')
    if (!await LOCAL_STORE.checkPin(pin)) {
      setErrorMessage(t`Invalid PIN`);
      return;
    }

    await LOCAL_STORE.handleDataMigration(pin);
    // We block the wallet from being showed if it was locked or closed.
    // So we need to mark it as opened for the UI to proceed.
    LOCAL_STORE.open();

    // LockedWallet screen was called for a result, so we should resolve the promise with the PIN after
    // it is validated.
    if (lockWalletPromise) {
      dispatch(resolveLockWalletPromise(pin));
      // return to the last screen
      navigate(-1);
      return;
    }

    setLoading(true);

    dispatch(startWalletRequested({ pin }));
  }

  /**
   * When reset modal validates, then execute method to reset all data from the wallet and redirect to Welcome screen
   */
  const handleReset = () => {
    context.hideModal();
    dispatch(walletReset());
    navigate('/welcome/');
  }

  /**
   * When user clicks on the reset link, then raises a modal to asks for reset confirmation
   *
   * @param {Object} e Event of when the link is clicked
   */
  const resetClicked = (e) => {
    e.preventDefault();
    context.showModal(MODAL_TYPES.RESET_ALL_DATA, {
      success: handleReset,
    });
  }

  return (
    <div className="content-wrapper flex align-items-center">
      <div className="col-sm-12 col-md-8 offset-md-2 col-lg-6 offset-lg-3">
        <div className="d-flex align-items-start flex-column">
          <p>{t`Your wallet is locked. Please write down your PIN to unlock it.`}</p>
          <form ref={formRef} className="w-100" onSubmit={unlockClicked}>
            <input required ref={pinRef} type="password" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off" placeholder={t`PIN`} className="form-control" />
          </form>
          {errorMessage && <p className="mt-4 text-danger">{errorMessage}</p>}
          <div className="d-flex align-items-center justify-content-between flex-row w-100 mt-4">
            <a className="mt-4" onClick={(e) => resetClicked(e)} href="true">{t`Reset all data`}</a>
            <div className="d-flex align-items-center justify-content-between btn-hathor-loading-wrapper">
              {loading && (
                <ReactLoading color={colors.purpleHathor} type='spin' width={24} height={24} className="loading" />
              )}
              <button
                onClick={unlockClicked}
                type="button"
                className="btn btn-hathor"
                disabled={loading}>
                {t`Unlock`}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LockedWallet;
