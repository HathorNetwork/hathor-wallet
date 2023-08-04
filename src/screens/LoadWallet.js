/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'

import wallet from '../utils/wallet';
import ChoosePassword from '../components/ChoosePassword';
import ChoosePin from '../components/ChoosePin';
import logo from '../assets/images/hathor-logo.png';
import { updatePassword, updatePin } from '../actions/index';
import { connect } from "react-redux";
import hathorLib from '@hathor/wallet-lib';
import InitialImages from '../components/InitialImages';
import LOCAL_STORE from '../storage';


const mapStateToProps = (state) => {
  return { password: state.password, pin: state.pin };
};


const mapDispatchToProps = dispatch => {
  return {
    updatePassword: data => dispatch(updatePassword(data)),
    updatePin: data => dispatch(updatePin(data)),
  };
};


/**
 * Screen used to load a wallet that already exists
 * Depending on the state can show:
 * - Write words component
 * - Choose password component
 * - Choose pin component
 *
 * @memberof Screens
 */
class LoadWallet extends React.Component {
  constructor(props) {
    super(props);

    /**
     * errorMessage {string} Message to be shown in case of error in modal
     * words {string} Text of words input
     * askPassword {boolean} If should show password component
     * askPIN {boolean} If should show PIN component
     * wordsCount {number} Number of words written on words input
     */
    this.state = {
      errorMessage: '',
      words: '',
      askPassword: false,
      askPIN: false,
      wordsCount: 0,
    }
  }

  /**
   * Method called when user clicks the 'Import' button
   * Checks if words are valid and, if true, show component to choose password
   */
  import = () => {
    const words = this.refs.wordsInput.value.trim();
    const ret = hathorLib.walletUtils.wordsValid(words);
    if (ret.valid) {
      // Using ret.words because this method returns a string with all words
      // separated by a single space, after removing duplicate spaces and possible break lines
      this.setState({ words: ret.words, errorMessage: '', askPassword: true, wordsCount: 0 });
    } else {
      this.setState({ errorMessage: ret.message });
    }
  }

  /**
   * Method called when user selects the password with success, so show component to choose pin
   */
  passwordSuccess = () => {
    // This method is called after the ChoosePassword component has a valid password and succeeds
    this.setState({ askPIN: true });
  }

  /**
   * This method is called after the ChoosePin component has a valid PIN and succeeds
   */
  pinSuccess = () => {
    // Getting redux variables before cleaning all data
    const { pin, password } = this.props;
    // First we clean what can still be there of a last wallet
    wallet.generateWallet(this.state.words, '', pin, password, this.props.history);
    LOCAL_STORE.markBackupDone();
    // Clean pin and password from redux
    this.props.updatePassword(null);
    this.props.updatePin(null);
    this.props.history.push('/wallet/');
  }

  /**
   * User clicked to go back from PIN component to Choose password
   */
  pinBack = () => {
    this.setState({ askPIN: false });
  }

  /**
   * User clicked to go back from Choose password component to write words
   */
  passwordBack = () => {
    this.setState({ askPassword: false });
  }

  /**
   * Calculate number of words written in the input
   *
   * @param {Event} e Input change event
   */
  onWordsChange = (e) => {
    const trimValue = e.target.value.trim(/\s+/);
    let wordsCount = 0;
    if (trimValue !== '') {
      wordsCount = trimValue.replace(/\s+/g, ' ').split(' ').length;
    }
    this.setState({ wordsCount });
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
  getWordsCountClassName = () => {
    if (this.state.wordsCount > 24) {
      return 'text-danger';
    } else if (this.state.wordsCount === 24) {
      return 'text-success';
    } else {
      return '';
    }
  }

  render() {
    const renderLoad = () => {
      return (
        <div>
          <p className="mt-4 mb-4">{t`Write the 24 words of your wallet (separated by space).`}</p>
          <textarea className="form-control one-word-input mb-4" placeholder={t`Words separated by single space`} ref="wordsInput" rows={5} onChange={this.onWordsChange} />
          <p className={`mb-4 ${this.getWordsCountClassName()}`}>{this.state.wordsCount}/24 words</p>
          {this.state.errorMessage && <p className="mb-4 text-danger">{this.state.errorMessage}</p>}
          <div className="d-flex justify-content-between flex-row w-100">
            <button onClick={this.props.history.goBack} type="button" className="btn btn-secondary">{t`Back`}</button>
            <button onClick={this.import} type="button" className="btn btn-hathor">{t`Import data`}</button>
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
              {this.state.askPIN ? <ChoosePin back={this.pinBack} success={this.pinSuccess} /> : (this.state.askPassword ? <ChoosePassword back={this.passwordBack} success={this.passwordSuccess} /> : renderLoad())}
            </div>
          </div>
          <InitialImages />
        </div>
      </div>
    )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(LoadWallet);
