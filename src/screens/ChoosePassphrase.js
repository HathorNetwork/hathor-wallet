/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useRef, useState, useContext } from 'react';
import { t } from 'ttag'

import $ from 'jquery';
import walletUtils from '../utils/wallet';
import BackButton from '../components/BackButton';
import { useSelector } from 'react-redux';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import { useNavigate } from 'react-router-dom';

/**
 * Screen used to choose a passphrase for your wallet
 *
 * @memberof Screens
 */
function ChoosePassphrase() {
  const wallet = useSelector(state => state.wallet)
  const passphraseFormRef = useRef();
  const confirmFormRef = useRef();
  const passphraseRef = useRef();
  const confirmPassphraseRef = useRef();
  const passwordRef = useRef();
  const pinRef = useRef();
  const blankPassphraseRef = useRef();
  const passphraseWrapperRef = useRef();
  const navigate =  useNavigate();

  /** errorMessage {string} Message to show when error happens on the form */
  const [errorMessage, setErrorMessage] = useState('');
  /** firstStep {boolean} If should show the first step of the form, or the second one */
  const [firstStep, setFirstStep] = useState(true);

  const modalContext = useContext(GlobalModalContext);

  /**
   * Method called after confirming modal that changes addresses in the wallet and redirects to the main wallet screen
   */
  const handlePassphrase = async () => {
    modalContext.hideModal();
    await walletUtils.addPassphrase(wallet, passphraseRef.current.value, pinRef.current.value, passwordRef.current.value)
    navigate('/wallet/');
  }

  /**
   * Method called when user clicks in the button to change the passphrase, then a modal opens to confirm the action
   * Validates if all form requirements are okay
   */
  const addClicked = async () => {
    const isValid = passphraseFormRef.current.checkValidity();
    if (isValid) {
      passphraseFormRef.current.classList.remove('was-validated')
      if (blankPassphraseRef.current.checked === false && passphraseRef.current.value === '') {
        setErrorMessage(t`To set a blank passphrase mark the corresponding checkbox above.`);
        return;
      }
      const newPassphrase = passphraseRef.current.value;
      const newConfirmPassphrase = confirmPassphraseRef.current.value;
      if (newPassphrase !== newConfirmPassphrase) {
        setErrorMessage(t`Passphrase and confirm passphrase must be equal`);
        return;
      }

      if (!await wallet.checkPassword(passwordRef.current.value)) {
        setErrorMessage(t`Invalid password`);
        return;
      }

      if (!await wallet.checkPin(pinRef.current.value)) {
        setErrorMessage(t`Invalid PIN`);
        return;
      }

      setErrorMessage('');
      // Everything is fine, so show confirm modal
      modalContext.showModal(MODAL_TYPES.CONFIRM, {
        title: t`Set a passphrase`,
        handleYes: handlePassphrase,
        body: (
          <div>
            <p>{t`Are you sure you want to change your whole wallet setting this passphrase?`}</p>
          </div>
        )
      });
    } else {
      passphraseFormRef.current.classList.add('was-validated')
    }
  }

  /**
   * Method called when user clicks in the button to continue and that he understand the risks of it.
   * Validates if checkbox is checked and shows the form to set the passphrase
   */
  const continueClicked = () => {
    const isValid = confirmFormRef.current.checkValidity();
    if (isValid) {
      confirmFormRef.current.classList.remove('was-validated')
      setFirstStep(false);
    } else {
      confirmFormRef.current.classList.add('was-validated')
    }
  }

  /**
   * Method called when checkbox for blank passphrase changes. We show/hide the passphrase fields depending if is checked.
   */
  const blankPasswordCheckboxChange = () => {
    if (blankPassphraseRef.current.checked) {
      $(passphraseWrapperRef.current).hide(300);
    } else {
      $(passphraseWrapperRef.current).show(300);
    }
  }

  const renderFirstForm = () =>
    (
      <form ref={confirmFormRef} className="w-100">
        <div className="form-check">
          <input required type="checkbox" className="form-check-input" id="confirmAgree" />
          <label className="form-check-label"
                 htmlFor="confirmAgree"> {t`I understand the risks of adding a passphrase.`}</label>
        </div>
      </form>
    )

  const renderSecondForm = () =>
    (
      <form ref={passphraseFormRef} className="w-100">
        <div className="row">
          <div className="col-6" ref={passphraseWrapperRef}>
            <input ref={passphraseRef} type="password" autoComplete="off" placeholder="Passphrase"
                   className="form-control" />
            <input ref={confirmPassphraseRef} type="password" autoComplete="off" placeholder="Confirm passphrase"
                   className="form-control mt-4" />
          </div>
          <div className="col-7 mt-4">
            <div className="form-check">
              <input type="checkbox" className="form-check-input" id="blankPassphrase" ref={blankPassphraseRef}
                     onChange={blankPasswordCheckboxChange} />
              <label className="form-check-label"
                     htmlFor="blankPassphrase"> {t`I want to set a blank passphrase.`}</label>
            </div>
          </div>
        </div>
        <p className="mt-4">{t`Please, enter your password and PIN to confirm the operation.`}</p>
        <div className="row">
          <div className="col-6">
            <input required ref={passwordRef} type="password" autoComplete="off" placeholder={t`Password`}
                   className="form-control mt-4 mb-4" />
            <input required ref={pinRef} type="password" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off"
                   placeholder={t`PIN`} className="form-control" />
          </div>
        </div>
      </form>
    )

  return (
    <div className="content-wrapper flex align-items-center">
      <BackButton />
      <h3 className="mt-4 mb-5">{t`Set Passphrase`}</h3>
      <div className="d-flex align-items-start flex-column">
        <p>{t`Adding a passphrase is an advanced feature, and you should not use it unless you know what you are doing.`}</p>
        <p>{t`It will change all your addresses, so it is like generating a completely new wallet.`}</p>
        <p>{t`You should take note of your passphrase for future use. If you lose your passphrase, you will never have access to your tokens again.`}</p>
        {firstStep ? renderFirstForm() : renderSecondForm()}
        {errorMessage && <p className="mt-4 text-danger">{errorMessage}</p>}
        {firstStep ?
          <button onClick={continueClicked} type="button" className="btn btn-hathor mt-5">{t`Continue`}</button> :
          <button onClick={addClicked} type="button" className="btn btn-hathor mt-5">{t`Confirm`}</button>}
      </div>
    </div>
  )
}

export default ChoosePassphrase;
