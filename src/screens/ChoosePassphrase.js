import React from 'react';
import ModalConfirm from '../components/ModalConfirm';
import $ from 'jquery';
import wallet from '../utils/wallet';


class ChoosePassphrase extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      errorMessage: ''
    }
  }

  handlePassphrase = () => {
    $('#confirmModal').modal('hide');
    wallet.addPassphrase(this.refs.passphrase.value, this.refs.pin.value, this.refs.password.value);
    this.props.history.push('/wallet/');
  }

  addClicked = () => {
    const isValid = this.refs.passphraseForm.checkValidity();
    if (isValid) {
      this.refs.passphraseForm.classList.remove('was-validated')
      const passphrase = this.refs.passphrase.value;
      const confirmPassphrase = this.refs.confirmPassphrase.value;
      if (passphrase !== confirmPassphrase) {
        this.setState({ errorMessage: 'Passphrase and confirm passphrase must be equal' });
        return;
      }

      if (!wallet.isPasswordCorrect(this.refs.password.value)) {
        this.setState({ errorMessage: 'Invalid password' });
        return;
      }

      if (!wallet.isPinCorrect(this.refs.pin.value)) {
        this.setState({ errorMessage: 'Invalid PIN' });
        return;
      }

      this.setState({ errorMessage: '' });
      // Everything is fine, so show confirm modal
      $('#confirmModal').modal('show');
    } else {
      this.refs.passphraseForm.classList.add('was-validated')
    }
  }

  render() {
    const getModalBody = () => {
      return (
        <div>
          <p>Are you sure you want to change your whole wallet adding this passphrase and start a new one?</p>
        </div>
      )
    }

    return (
      <div className="content-wrapper flex align-items-center">
        <div className="col-sm-12 col-md-8 offset-md-2 col-lg-6 offset-lg-3">
          <div className="d-flex align-items-start flex-column">
            <p>Adding a passphrase will change your whole wallet and all your addresses. You will lose everything that is loaded now and start a new one.</p>
            <p>If you add this passphrase you will also have to save it to access your wallet in the future.</p>
            <form ref="passphraseForm" className="w-100">
              <input required ref="passphrase" type="password" autoComplete="off" placeholder="Passphrase" className="form-control" />
              <input required ref="confirmPassphrase" type="password" autoComplete="off" placeholder="Confirm passphrase" className="form-control mt-4" />
              <p className="mt-4">Please, enter your password and PIN to confirm the operation.</p>
              <input required ref="password" type="password" autoComplete="off" placeholder="Password" className="form-control mt-4 mb-4" />
              <input required ref="pin" type="password" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off" placeholder="PIN" className="form-control" />
            </form>
            {this.state.errorMessage && <p className="mt-4 text-danger">{this.state.errorMessage}</p>}
            <div className="d-flex align-items-end flex-column w-100">
              <button onClick={this.addClicked} type="button" className="btn btn-hathor mt-4">Confirm</button>
            </div>
          </div>
        </div>
        <ModalConfirm title="Add passphrase" body={getModalBody()} handleYes={this.handlePassphrase} />
      </div>
    )
  }
}

export default ChoosePassphrase;