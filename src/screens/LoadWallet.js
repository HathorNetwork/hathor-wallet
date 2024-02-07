/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useRef, useState } from 'react';
import { t } from 'ttag'

import wallet from '../utils/wallet';
import ChoosePassword from '../components/ChoosePassword';
import ChoosePin from '../components/ChoosePin';
import logo from '../assets/images/hathor-logo.png';
import { updatePassword, updatePin } from '../actions/index';
import { useDispatch, useSelector } from 'react-redux';
import { useHistory } from 'react-router-dom';
import hathorLib from '@hathor/wallet-lib';
import InitialImages from '../components/InitialImages';
import LOCAL_STORE from '../storage';

/**
 * Screen used to load a wallet that already exists
 * Depending on the state can show:
 * - Write words component
 * - Choose password component
 * - Choose pin component
 *
 * @memberof Screens
 */
function LoadWallet() {
  /** errorMessage {string} Message to be shown in case of error in modal */
  const [errorMessage, setErrorMessage] = useState('');
  /** words {string} Text of words input */
  const [words, setWords] = useState('');
  /** askPassword {boolean} If should show password component */
  const [askPassword, setAskPassword] = useState(false);
  /** askPIN {boolean} If should show PIN component */
  const [askPIN, setAskPIN] = useState(false);
  /** wordsCount {number} Number of words written on words input */
  const [wordsCount, setWordsCount] = useState(0);
  const wordsInputRef = useRef();
  const dispatch = useDispatch();
  const { pin, password } = useSelector((state) => ({ pin: state.pin, password: state.password }));
  const history = useHistory();

  /**
   * Method called when user clicks the 'Import' button
   * Checks if words are valid and, if true, show component to choose password
   */
  const importClick = () => {
    const words = wordsInputRef.current.value.trim();
    try {
      const ret = hathorLib.walletUtils.wordsValid(words);

      // Using ret.words because this method returns a string with all words
      // separated by a single space, after removing duplicate spaces and possible break lines
      setWords(ret.words);
      setErrorMessage('');
      setAskPassword(true);
      setWordsCount(0);
    } catch(e) {
      setErrorMessage(e.message);
    }
  }

  /**
   * Method called when user selects the password with success, so show component to choose pin
   */
  const passwordSuccess = () => {
    // This method is called after the ChoosePassword component has a valid password and succeeds
    setAskPIN(true);
  }

  /**
   * This method is called after the ChoosePin component has a valid PIN and succeeds
   */
  const pinSuccess = () => {
    LOCAL_STORE.unlock();
    // First we clean what can still be there of a last wallet
    wallet.generateWallet(words, '', pin, password);
    LOCAL_STORE.markBackupDone();
    LOCAL_STORE.open(); // Mark this wallet as open, so that it does not appear locked after loading
    // Clean pin and password from redux
    dispatch(updatePassword(null));
    dispatch(updatePin(null));
  }

  /**
   * User clicked to go back from PIN component to Choose password
   */
  const pinBack = () => {
    setAskPIN(false);
  }

  /**
   * User clicked to go back from Choose password component to write words
   */
  const passwordBack = () => {
    setAskPassword(false);
  }

  /**
   * Calculate number of words written in the input
   *
   * @param {Event} e Input change event
   */
  const onWordsChange = (e) => {
    const trimValue = e.target.value.trim(/\s+/);
    let wordsCount = 0;
    if (trimValue !== '') {
      wordsCount = trimValue.replace(/\s+/g, ' ').split(' ').length;
    }
    setWordsCount(wordsCount);
  }

  /**
   * Get css class for the words count.
   *
   * If number of words is correct, returns text-success.
   * If number of words is more than 24, returns text-danger.
   * Otherwise returns empty string.
   *
   * @return {String} CSS class to add in <p> tag
   */
  const getWordsCountClassName = () => {
    if (wordsCount > 24) {
      return 'text-danger';
    } else if (wordsCount === 24) {
      return 'text-success';
    } else {
      return '';
    }
  }

  const renderLoad = () => {
    return (
      <div>
        <p className="mt-4 mb-4">{t`Write the 24 words of your wallet (separated by space).`}</p>
        <textarea className="form-control one-word-input mb-4" placeholder={t`Words separated by single space`} ref={wordsInputRef} rows={5} onChange={onWordsChange} />
        <p className={`mb-4 ${getWordsCountClassName()}`}>{`${wordsCount}/24 words`}</p>
        {errorMessage && <p className="mb-4 text-danger">{errorMessage}</p>}
        <div className="d-flex justify-content-between flex-row w-100">
          <button onClick={() => history.goBack()} type="button" className="btn btn-secondary">{t`Back`}</button>
          <button onClick={importClick} type="button" className="btn btn-hathor">{t`Import data`}</button>
        </div>
      </div>
    )
  }

  return (
    <div className="outside-content-wrapper">
      <div className="inside-white-wrapper col-sm-12 col-md-8">
        <div className="d-flex align-items-center flex-column inside-div">
          <img className="hathor-logo" src={logo} alt="" />
          <div className="d-flex align-items-start flex-column">
            {askPIN
              ? <ChoosePin back={pinBack} success={pinSuccess} />
              : (askPassword
                ? <ChoosePassword back={passwordBack} success={passwordSuccess} />
                : renderLoad()
              )
            }
          </div>
        </div>
        <InitialImages />
      </div>
    </div>
  )
}

export default LoadWallet;
