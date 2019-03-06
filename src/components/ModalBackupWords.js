import React from 'react';
import $ from 'jquery';
import wallet from '../utils/wallet';
import helpers from '../utils/helpers';
import _ from 'lodash';
import { WORDS_VALIDATION } from '../constants';
import { updateWords } from '../actions/index';
import { connect } from "react-redux";


const mapDispatchToProps = dispatch => {
  return {
    updateWords: data => dispatch(updateWords(data)),
  };
};


const mapStateToProps = (state) => {
  return { words: state.words };
};


class ModalBackupWords extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      errorMessage: '',
      passwordSuccess: false,
      showValidation: false,
      passwordFormValidated: false,
      wordsValidation: [],
      chosenWords: [],
    }
  }

  componentDidMount = () => {
    $('#backupWordsModal').on('hide.bs.modal', (e) => {
      this.setState({ errorMessage: '', passwordSuccess: false, showValidation: false, wordsValidation: [], chosenWords: [] });
      if (this.props.needPassword) {
        this.props.updateWords(null);
      }
      if (this.refs.password) {
        this.refs.password.value = '';
      }
    })

    $('#backupWordsModal').on('shown.bs.modal', (e) => {
      if (this.refs.password) {
        this.refs.password.focus();
      }
    })
  }

  componentWillUnmount = () => {
    // Removing all event listeners
    $('#backupWordsModal').off();
  }

  handlePassword = (e) => {
    e.preventDefault();
    if (this.refs.formPassword.checkValidity() === false) {
      this.setState({ passwordFormValidated: true });
    } else {
      this.setState({ passwordFormValidated: false });
      const password = this.refs.password.value;
      if (wallet.isPasswordCorrect(password)) {
        const words = wallet.getWalletWords(password);
        this.props.updateWords(words);
        this.setState({ passwordSuccess: true, errorMessage: '' });
      } else {
        this.setState({errorMessage: 'Invalid password'})
      }
    }
  }

  handleWordsSaved = () => {
    const wordsValidation = _.shuffle(this.props.words.split(' ')).slice(0, WORDS_VALIDATION);
    this.setState({ showValidation: true, wordsValidation });
  }

  handleValidateBackup = () => {
    if (this.state.chosenWords.length !== WORDS_VALIDATION) {
      this.setState({ errorMessage: 'Invalid number of words' });
      return;
    }
    let validationArray = this.props.words.split(' ');
    for (const word of this.state.chosenWords) {
      const wordIdx = validationArray.indexOf(word);
      if (wordIdx === -1) {
        this.setState({ errorMessage: 'Invalid sequence of words' });
        return;
      }
      validationArray = validationArray.slice(wordIdx);
    }
    this.setState({ errorMessage: '' });
    this.props.validationSuccess();
  }

  chosenWordRemoved = (word) => {
    let chosenWords = this.state.chosenWords;
    const idx = chosenWords.indexOf(word);
    chosenWords.splice(idx, 1);
    this.setState({ chosenWords });
  }

  validationWordClicked = (word) => {
    let chosenWords = this.state.chosenWords;
    chosenWords.push(word);
    this.setState({ chosenWords });
  }

  render() {
    const renderAskPassword = () => {
      return (
        <div>
          <p>We need your password to show the words</p>
          <form ref="formPassword" className={this.state.passwordFormValidated ? 'was-validated' : ''} onSubmit={this.handlePassword} noValidate>
            <div className="form-group">
              <label htmlFor="password">Password*</label>
              <input type="password" ref="password" autoComplete="off" className="pin-input form-control" required />
            </div>
          </form>
        </div>
      )
    }

    const renderAskPasswordButtons = () => {
      return (
        <div>
          <button type="button" className="btn btn-secondary mr-3" data-dismiss="modal">Cancel</button>
          <button onClick={this.handlePassword} type="button" className="btn btn-hathor">Go</button>
        </div>
      )
    }

    const renderButtons = () => {
      if (this.props.needPassword && !this.state.passwordSuccess) {
        return renderAskPasswordButtons();
      } else if (this.props.words && !this.state.showValidation) {
        return renderShowWordsButtons();
      } else if (this.state.showValidation) {
        return renderValidateBackupButtons();
      }
    }

    const renderWordsTd = (start, end) => {
      return this.props.words.split(' ').slice(start, end).map((word, idx) => {
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
          <tr key={idx}>
            {renderWordsTd(start, end)}
          </tr>
        );
      });

    }

    const renderShowWords = () => {
      return (
        <div>
          <p>Save the words and never share them. Anyone who has access to them will control your tokens.</p>
          <table className="w-100">
            <tbody>
              {renderWords(6)}
            </tbody>
          </table>
        </div>
      )
    }

    const renderShowWordsButtons = () => {
      return (
        <div>
          <button type="button" className="btn btn-secondary mr-3" data-dismiss="modal">Do it later</button>
          <button onClick={this.handleWordsSaved} type="button" className="btn btn-hathor">Ok, I have saved them</button>
        </div>
      )
    }

    const renderWordsValidation = () => {
      return this.state.wordsValidation.map((word, idx) => {
        // The button will only be disabled when all instances of the words have been selected
        // Might have more than one instance of the same word
        return (
          <button key={`${word}${idx}`} className="btn btn-dark mr-2 mt-3" disabled={helpers.elementCount(this.state.chosenWords, word) === helpers.elementCount(this.state.wordsValidation, word)} onClick={(e) => {this.validationWordClicked(word)}}>{word}</button>
        )
      });
    }

    const renderChosenWords = () => {
      return this.state.chosenWords.map((word, idx) => {
        return (
          <div key={`${word}${idx}`}>
            <span className="word-chosen">{word}</span>
            <i className="fa fa-close" onClick={(e) => {this.chosenWordRemoved(word)}} />
          </div>
        )
      });
    }

    const renderValidateBackup = () => {
      return (
        <div>
          <p>Please, select the words below in the correct order. This is for your safety and to ensure you wrote them down correctly.</p>
          <div className="chosen-words-wrapper w-100 d-flex flex-row flex-wrap align-items-start">
            {renderChosenWords()}
          </div>
          <div className="words-validation d-flex flex-row align-items-start flex-wrap">
            {renderWordsValidation()}
          </div>
        </div>
      )
    }

    const renderValidateBackupButtons = () => {
      return (
        <div>
          <button type="button" className="btn btn-secondary mr-3" data-dismiss="modal">Cancel</button>
          <button onClick={this.handleValidateBackup} type="button" className="btn btn-hathor">Validate</button>
        </div>
      )
    }

    const renderBody = () => {
      if (this.props.needPassword && !this.state.passwordSuccess) {
        return renderAskPassword();
      } else if (this.props.words && !this.state.showValidation) {
        return renderShowWords();
      } else if (this.state.showValidation) {
        return renderValidateBackup();
      }
    }

    return (
      <div className="modal fade" id="backupWordsModal" tabIndex="-1" role="dialog" aria-labelledby="backupWordsModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">Backup Words</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              {renderBody()}
              <div className="row mt-3">
                <div className="col-12 col-sm-10">
                    <p className="error-message text-danger">
                      {this.state.errorMessage}
                    </p>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              {renderButtons()}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ModalBackupWords);