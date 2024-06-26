/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useRef, useState, useContext, useEffect } from 'react';
import { t } from 'ttag'
import { useNavigate } from 'react-router-dom';
import wallet from '../utils/wallet';
import logo from '../assets/images/hathor-logo.png';
import ChoosePassword from '../components/ChoosePassword';
import ChoosePin from '../components/ChoosePin';
import HathorAlert from '../components/HathorAlert';
import hathorLib from '@hathor/wallet-lib';
import InitialImages from '../components/InitialImages';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import LOCAL_STORE from '../storage';


/**
 * Screen used to generate a new wallet creating new words
 * Depending on the state can show:
 * - Message with checkbox, so user can understand what the creation of words means
 * - Component with option to backup the words
 * - Choose password component
 * - Choose pin component
 *
 * @memberof Screens
 */
function NewWallet() {
  const navigate = useNavigate();
  const context = useContext(GlobalModalContext);

  const [words, setWords] = useState('');
  const [password, setPassword] = useState('');
  const [step2, setStep2] = useState(false);
  const [askPassword, setAskPassword] = useState(false);
  const [askPIN, setAskPIN] = useState(false);

  const alertSuccessRef = useRef();
  const confirmFormRef = useRef();

  useEffect(() => {
    LOCAL_STORE.markBackupAsNotDone();
  }, []);

  const create = () => {
    const isValid = confirmFormRef.current.checkValidity();
    if (isValid) {
      confirmFormRef.current.classList.remove('was-validated')
      const newWords = hathorLib.walletUtils.generateWalletWords(hathorLib.constants.HD_WALLET_ENTROPY);
      setWords(newWords);
      setStep2(true);
    } else {
      confirmFormRef.current.classList.add('was-validated')
    }
  }

  /**
   * User clicked to do backup later, so shows Choose password component
   */
  const backupLater = () => {
    setAskPassword(true);
  }

  /**
   * After user backed up the words with success we mark it as done and show the component to Choose Password
   */
  const validationSuccess = () => {
    context.hideModal();
    LOCAL_STORE.markBackupDone();
    alertSuccessRef.current.show(3000);
    setAskPassword(true);
  }

  /**
   * When user decides to do the backup now (opens backup modal)
   */
  const backupNow = () => {
    context.showModal(MODAL_TYPES.BACKUP_WORDS, {
      words,
      needPassword: false,
      validationSuccess,
    });
  }

  /**
   * User succeded on choosing a password, then show the Choose PIN component
   * @param {string} newPassword New password, already validated
   */
  const passwordSuccess = (newPassword) => {
    setPassword(newPassword);
    setAskPIN(true);
  }

  /**
   * After choosing a new PIN with success, executes the wallet creation and redirect to the wallet
   * @param {string} newPin New pin, already validated
   */
  const pinSuccess = (newPin) => {
    // Generate addresses and load data
    LOCAL_STORE.unlock();
    wallet.generateWallet(words, '', newPin, password);

    // Being extra cautious with sensitive information
    setWords('');
    setPassword('');

    // Mark this wallet as open, so that it does not appear locked after loading
    LOCAL_STORE.open();
  }

  /**
   * Going back from Choose Password component to the Step2
   */
  const passwordBack = () => {
    setAskPassword(false);
  }

  /**
   * Going back from Choose PIN component to Choose Password
   */
  const pinBack = () => {
    setAskPIN(false);
  }

  /**
   * Going back from Step2 component to initial New Wallet component
   */
  const step2Back = () => {
    setStep2(false);
  }

  const renderStep1 = () => {
    return (
      <div>
        <p className="mt-4">{t`. A new wallet is generated by 24 words.`}</p>
        <p>{t`. To have access to this wallet you must have all the words saved in the same order we will show to you.`}</p>
        <p className="mb-4">{t`. If someone manages to discover your words they can steal your tokens, so we advise you to save your words physically and don't show them to anyone.`}</p>
        <form ref={confirmFormRef} className="w-100 mb-4">
          <div className="form-check">
            <input required type="checkbox" className="form-check-input" id="confirmWallet" />
            <label className="form-check-label" htmlFor="confirmWallet" >{t`Ok, I got it!`}</label>
          </div>
        </form>
        <div className="d-flex justify-content-between flex-row w-100">
          <button onClick={() => navigate(-1)} type="button" className="btn btn-secondary">{t`Back`}</button>
          <button onClick={create} type="button" className="btn btn-hathor">{t`Create my words`}</button>
        </div>
      </div>
    )
  }

  const renderNewWalletStep2 = () => {
    return (
      <div className="d-flex align-items-start flex-column">
        <p className="mt-4">{t`Your words have been created!`}</p>
        <p className="mb-4">{t`You should save them in a non-digital media, such as a piece of paper. We advise you to do it now, but you can do it later.`}</p>
        <div className="d-flex justify-content-between flex-row w-100">
          <button onClick={step2Back} type="button" className="btn btn-secondary">{t`Back`}</button>
          <button onClick={backupLater} type="button" className="btn btn-secondary">{t`Do it later`}</button>
          <button onClick={backupNow} type="button" className="btn btn-hathor">{t`Backup now`}</button>
        </div>
      </div>
    );
  }

  const renderMainData = () => {
    if (askPIN) {
      return <ChoosePin back={pinBack} success={pinSuccess} />;
    } else if (askPassword) {
      return <ChoosePassword back={passwordBack} success={passwordSuccess} />;
    } else if (step2) {
      return renderNewWalletStep2();
    } else {
      return renderStep1();
    }
  }

  return (
    <div className="outside-content-wrapper">
      <div className="inside-white-wrapper col-sm-12 col-md-8">
        <div className="d-flex align-items-center flex-column inside-div">
          <img className="hathor-logo" src={logo} alt="" />
          <div className="d-flex align-items-start flex-column">
            {renderMainData()}
          </div>
        </div>
        <InitialImages />
      </div>
      <HathorAlert ref={alertSuccessRef} text={t`Backup completed!`} type="success" />
    </div>
  )
}

export default NewWallet;
