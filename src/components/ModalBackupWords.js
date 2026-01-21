/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';

import $ from 'jquery';
import _ from 'lodash';
import hathorLib from '@hathor/wallet-lib';
import { WORDS_VALIDATION } from '../constants';
import { getGlobalWallet } from '../modules/wallet';


/**
 * Component that shows a modal to do backup of words
 * If user is already inside the wallet asks for the user password
 *
 * @memberof Components
 */
class ModalBackupWords extends React.Component {
  constructor(props) {
    super(props);

    /**
     * errorMessage {string} Message to be shown to the user in case of error in the form
     * passwordSuccess {boolean} If user wrote the correct password
     * showValidation {boolean} If should show validation component
     * passwordFormValidated {boolean} If password form is valid or not
     * validationSteps {{backupIndex: Number, correctWord: String, options: string[], done: boolean, last: boolean}[]}
     *    Array of objects, which each object represents a validation step.
     *    validationStep.backupIndex keeps the original index of the correctWord.
     *    validationStep.correctWord keeps the string value of the correctWord.
     *    validationStep.options array of strings composed by the correctWord and four wrong options.
     *    validationStep.done if true the step was correctly completed.
     *    validationStep.last if true it is the last step of the array
     * words? {string} The 24 words that will be used, if there is still no password attached to them
     */
    this.state = {
      errorMessage: '',
      passwordSuccess: false,
      showValidation: false,
      passwordFormValidated: false,
      validationSteps: [],
      words: props.words || '',
    };
    this.modalRef = React.createRef();
  }

  componentDidMount = () => {
    $(this.modalRef.current).modal('show');
    $(this.modalRef.current).on('hide.bs.modal', (e) => {
      this.setState({
        errorMessage: '',
        passwordSuccess: false,
        showValidation: false,
        validationSteps: [],
        words: '',
      });
      if (this.refs.password) {
        this.refs.password.value = '';
      }
    });

    $(this.modalRef.current).on('hidden.bs.modal', this.props.onClose);

    $(this.modalRef.current).on('shown.bs.modal', (e) => {
      if (this.refs.password) {
        this.refs.password.focus();
      }
    });
  };

  componentWillUnmount = () => {
    this.setState({ words: '' }); // Being extra cautious with sensitive information
    $(this.modalRef.current).modal('hide');
    // Removing all event listeners
    $(this.modalRef.current).off();
  };

  /**
   * Called when the user writes the password, so we can decrypt the saved words and show to him
   *
   * @param {Object} e Event emitted when button is clicked
   */
  handlePassword = async (e) => {
    e.preventDefault();
    if (this.refs.formPassword.checkValidity() === false) {
      this.setState({ passwordFormValidated: true });
    } else {
      this.setState({ passwordFormValidated: false });
      const password = this.refs.password.value;
      try {
        const { storage } = getGlobalWallet();
        const accessData = await storage.getAccessData();
        const walletWords = hathorLib.cryptoUtils.decryptData(accessData.words, password);
        this.setState({ words: walletWords, passwordSuccess: true, errorMessage: '' });
      } catch (err) {
        // XXX: The `ErrorMessages.ErrorMessages` property from the lib needs fixing.
        if (err.errorCode === hathorLib.ErrorMessages.ErrorMessages.DECRYPTION_ERROR
          || err.errorCode === hathorLib.ErrorMessages.ErrorMessages.INVALID_PASSWD) {
          // If the password is invalid it will throw a DecryptionError
          this.setState({ errorMessage: t`Invalid password` });
          return; // No need to rethrow if the error is an incorrect password
        }
        throw err;
      }
    }
  };

  /**
   * Called when user clicks the button saying that he has saved the words already
   * Then, validation steps will ask the right word given an index between [1,24].
   * As the words were shown previosly, the user should be able to find any word given an index.
   */
  handleWordsSaved = () => {
    const wordsArray = this.state.words.split(' ');
    const wordsToValidate = _.shuffle(wordsArray).slice(0, WORDS_VALIDATION);
    const validationSteps = wordsToValidate.map((word, index) => {
      const backupIndex = wordsArray.indexOf(word);
      let optionsStartIndex = backupIndex - 2;
      let optionsEndIndex = backupIndex + 2;

      // If index is 0 or 1, startIndex would be negative
      // So we set start to 0 and end to 4
      if (optionsStartIndex < 0) {
        optionsStartIndex = 0;
        optionsEndIndex = optionsStartIndex + 4;
      }

      // If index is 22 or 23, endIndex would be greater than the max
      // So we set to the max and decrease the startIndex
      const maxIndex = wordsArray.length - 1;
      if (optionsEndIndex > maxIndex) {
        optionsEndIndex = maxIndex;
        optionsStartIndex = maxIndex - 4;
      }

      const options = _.shuffle(
        wordsArray.slice(optionsStartIndex, optionsEndIndex + 1)
      );

      return {
        backupIndex: backupIndex + 1,
        correctWord: word,
        options,
        done: false,
        last: index === wordsToValidate.length - 1,
      };
    });
    this.setState({ showValidation: true, validationSteps });
  };

  /**
   * Called when user finishes the backup. We validate the backup and shows a success message, in case of success
   */
  handleValidationStepOption = (option, validationStepIndex) => {
    const validationSteps = [ ...this.state.validationSteps ];
    const validationStep = validationSteps[validationStepIndex];
    validationStep.chosenOption = option;
    if (option !== validationStep.correctWord) {
      this.setState({
        validationSteps,
        errorMessage: (
          <span>
            <span>{t`Wrong word. Please double check the words you saved.`}</span>
            <strong onClick={() => this.setState({ showValidation: false, errorMessage: '' })}>{t`Click here to start the process again.`}</strong>
          </span>
        ),
      });
      return;
    }
    if (validationStep.last) {
      this.setState({ words: '' }); // Being extra cautious with sensitive information
      this.props.validationSuccess();
      return;
    }
    validationStep.done = true;
    this.setState({ validationSteps });
  };

  render() {
    const renderAskPassword = () => {
      return (
        <div>
          <p>{t`We need your password to show the words`}</p>
          <form ref="formPassword" className={this.state.passwordFormValidated ? 'was-validated' : ''} onSubmit={this.handlePassword} noValidate>
            <div className="form-group">
              <label htmlFor="password">{t`Password*`}</label>
              <input type="password" ref="password" autoComplete="off" className="pin-input form-control" required />
            </div>
          </form>
        </div>
      )
    }

    const renderAskPasswordButtons = () => {
      return (
        <div>
          <button type="button" className="btn btn-secondary mr-3" data-dismiss="modal">{t`Cancel`}</button>
          <button onClick={this.handlePassword} type="button" className="btn btn-hathor">{t`Go`}</button>
        </div>
      )
    }

    const renderButtons = () => {
      if (this.props.needPassword && !this.state.passwordSuccess) {
        return renderAskPasswordButtons();
      } else if (this.state.words && !this.state.showValidation) {
        return renderShowWordsButtons();
      }
    };

    const renderWordsTd = (start, end) => {
      return this.state.words.split(' ').slice(start, end).map((word, idx) => {
        return (
          <td key={word}><strong>{start+idx+1}.</strong> {word} </td>
        )
      })
    }

    const renderWords = (rows) => {
      const eachRow = 24 / rows;
      return _.fill(Array(rows), null).map((el, idx) => {
        const start = idx * eachRow;
        const end = start + eachRow;
        return (
          <tr key={`row-${idx}`}>
            {renderWordsTd(start, end)}
          </tr>
        );
      });

    }

    const renderShowWords = () => {
      return (
        <div>
          <p>{t`Save the words and never share them. Anyone who has access to them will control your tokens.`}</p>
          <table className="w-100">
            <tbody>
              {renderWords(6)}
            </tbody>
          </table>
          <div id="hiddenWordsForTest" style={{ display: 'none' }} >
            {this.state.words}
          </div>
        </div>
      )
    }

    const renderShowWordsButtons = () => {
      return (
        <div>
          <button type="button" className="btn btn-secondary mr-3" data-dismiss="modal">{t`Do it later`}</button>
          <button onClick={this.handleWordsSaved} type="button" className="btn btn-hathor">{t`Ok, I have saved them`}</button>
        </div>
      )
    }

    const renderValidationStep = (validationStep) => {
      return (
        <article className='w-100'>
          <h2 className='validation-step-index d-flex flex-row justify-content-center btn-block mb-16'>
            {validationStep.backupIndex}
          </h2>
          <section
            className='validation-step-words btn-group d-flex flex-row justify-content-center'
            role='list'
            aria-label='Backup Validation Options'
          >
            {validationStep.options.map((option, index) => (
              <div key={index} role='listitem'>
                <button
                  className={`btn btn-dark btn-block validate-step-option ${
                    validationStep.chosenOption === option
                      ? 'chosen-option'
                      : ''
                  }`}
                  onClick={() =>
                    this.handleValidationStepOption(option, this.state.validationSteps.indexOf(validationStep))
                  }
                  disabled={this.state.errorMessage}
                >
                  {option}
                </button>
              </div>
            ))}
          </section>
        </article>
      );
    };

    const renderValidationProgress = () => {
      const activeIndex = this.state.validationSteps.findIndex(
        (step) => !step.done
      )

      return (
        <div className='validation-progress d-flex flex-row justify-content-center'>
          {this.state.validationSteps.map((validationStep, index) => (
            <div
              key={index}
              className={`validation-progress-step ${
                index <= activeIndex ? 'validation-progress-step-active' : ''
              }`}
            />
          ))}
        </div>
      );
    };

    const renderValidation = () => {
      const validationStep = this.state.validationSteps.find(
        (step) => !step.done
      );

      return (
        <div>
          <p>{t`To make sure you saved, please select the word that corresponds to the number below.`}</p>
          <div className='w-100 d-flex flex-row flex-wrap align-items-start'>
            {renderValidationStep(validationStep)}
          </div>
        </div>
      );
    };

    const renderBody = () => {
      if (this.props.needPassword && !this.state.passwordSuccess) {
        return renderAskPassword();
      } else if (this.state.words && !this.state.showValidation) {
        return renderShowWords();
      } else if (this.state.showValidation) {
        return renderValidation();
      }
    };

    return (
      <div
        ref={this.modalRef}
        className='modal fade'
        id='backupWordsModal'
        tabIndex='-1'
        role='dialog'
        aria-labelledby='backupWordsModal'
        aria-hidden='true'
      >
        <div className={`modal-dialog ${this.state.showValidation ? 'show-validation' : ''}`} role='document'>
          <div className='modal-content'>
            <div className='modal-header'>
              <h5
                className='modal-title'
                id='exampleModalLabel'
              >{t`Backup Words`}</h5>
              <button
                type='button'
                className='close'
                aria-label='Close'
                data-dismiss="modal"
              >
                <span aria-hidden='true'>&times;</span>
              </button>
            </div>
            <div className='modal-body'>
              {renderBody()}
              <div className='row'>
                <div className='col-12'>
                  {this.state.errorMessage && (
                    <p className='error-message text-danger'>
                      <i className='fa fa-times-circle'/> {this.state.errorMessage}
                    </p>
                  )}
                </div>
              </div>
              {this.state.showValidation && (
                renderValidationProgress()
              )}
            </div>
            {!this.state.showValidation && (
              <div className='modal-footer'>{renderButtons()}</div>
            )}
          </div>
        </div>
      </div>
    );
  }
}

export default ModalBackupWords;
