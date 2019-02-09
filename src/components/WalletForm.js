import React from 'react';
import ReactLoading from 'react-loading';
import PinInput from './PinInput';


class WalletForm extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      loading: false,
      errorMessage: '',
      formInvalid: null,
      pin: '',
      passphrase: '',
      words: null,
      wordInput: '24inputs'
    }
  }

  handleSubmit = (e) => {
    const formInvalid = !this.refs.formWallet.checkValidity();
    if (formInvalid) {
      let errorMessage = '';
      if (this.state.pin) {
        errorMessage = 'Pin must have 6 digits';
      } else {
        errorMessage = 'Pin is required';
      }
      this.setState({ formInvalid, errorMessage });
      this.setState({ formInvalid: formInvalid });
    } else {
      this.setState({ formInvalid: formInvalid, loading: true, errorMessage: '' });
      this.props.submit();
    }
  }

  handleChangePassphrase = (e) => {
    this.setState({ passphrase: e.target.value });
  }

  handleOptionChange = (e) => {
    this.setState({ wordInput: e.target.value });
  }

  handleChangePin = (e) => {
    this.setState({ pin: e.target.value });
  }

  render() {
    const renderNewWords = () => {
      return (
        <div>
          <p>Your generated words are: <strong>{this.state.words}</strong></p>
          <p>Backup those words because this is the last time you will see them.</p>
          <button onClick={this.props.goToWallet} type="button" className="btn btn-primary">Ok, I have already saved them!</button>
        </div>
      );
    }

    const render24WordsInputs = () => {
      return Array(24).fill().map((_, idx) => {
        return (
          <div key={idx} className="col-md-2 mb-3">
            <input type="text" className="form-control word-input" placeholder={`${idx+1}.`} ref={`word${idx+1}`} id={`word${idx+1}`} />
          </div>
        )
      })
    }

    const renderOneWordInput = () => {
      return (
        <div className="col-md-12">
          <textarea className="form-control one-word-input" placeholder="Words separated by single space" ref="oneWordInput" id="oneWordInput" rows={2} />
        </div>
      )
    }

    const renderWordsInputs = () => {
      return (
        <div className="row">
          <div className="col-12 mb-3">
            <div className="form-check">
              <label>
                <input type="radio" name="words-choice" value="24inputs" onChange={this.handleOptionChange} checked={this.state.wordInput === '24inputs'} className="form-check-input" />
                24 words input
              </label>
            </div>
            <div className="form-check">
              <label>
                <input type="radio" name="words-choice" value="1input" onChange={this.handleOptionChange} checked={this.state.wordInput === '1input'} className="form-check-input" />
                One input with words separated by space
              </label>
            </div>
          </div>
          {this.state.wordInput === '24inputs' ? render24WordsInputs() : renderOneWordInput()}
        </div>
      );
    }

    const renderWordWrapper = () => {
      return (
        <div className="form-group col-12 pl-0">
          <label>Words*</label>
          {renderWordsInputs()}
        </div>
      );
    }

    const renderWalletForm = () => {
      return (
        <div>
          <p><strong>{this.props.description}</strong></p>
          <form ref="formWallet" className={this.state.formInvalid ? 'was-validated' : ''} onSubmit={(e) => {e.preventDefault(); this.handleSubmit()}} noValidate>
            {this.props.loadWallet && renderWordWrapper()}
            <div className="form-group col-md-6 pl-0 mt-3">
              <PinInput handleChangePin={this.handleChangePin} />
            </div>
            <div className="form-group col-md-6 pl-0 mt-3">
                <label htmlFor="passphrase">Passphrase</label>
                <input type="password" autoComplete="off" ref="passphrase" className="form-control" id="passphrase" onChange={this.handleChangePassphrase} />
            </div>
            <div className="d-flex align-items-center">
              <button onClick={this.handleSubmit} type="button" disabled={this.state.loading} className="btn btn-primary mr-3">{this.props.button}</button>
              {this.state.loading ? <ReactLoading type='spin' color='#0081af' width={32} height={32} delay={500} /> : null}
            </div>
          </form>
          <p className="text-danger mt-3" id="loadError" ref="loadError">{this.state.errorMessage}</p>
        </div>
      )
    }

    return (
      <div className="content-wrapper">
        {this.state.words ? renderNewWords() : renderWalletForm()}
      </div>
    )
  }
}

export default WalletForm;