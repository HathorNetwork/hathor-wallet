import React from 'react';
import wallet from '../utils/wallet';
import logo from '../assets/images/hathor-logo.png';


/**
 * First screen of the wallet to show a welcome message and brief explanation
 *
 * @memberof Screens
 */
class Welcome extends React.Component {
  /**
   * formValidated {boolean} If required checkbox of form was checked
   */
  state = { formValidated: false }

  /**
   * When user clicks the button to start the wallet, then check form and redirect to signin screen
   */
  getStarted = () => {
    const isValid = this.refs.agreeForm.checkValidity();
    this.setState({ formValidated: !isValid });
    if (isValid) {
      wallet.markWalletAsStarted();
      this.props.history.push('/signin/');
    }
  }

  render() {
    return (
      <div className="outside-content-wrapper">
        <div className="inside-white-wrapper col-sm-12 col-md-8 offset-md-2 col-lg-6 offset-lg-3">
          <div>
            <div className="d-flex align-items-center flex-column">
              <img className="hathor-logo" src={logo} alt="" />
              <p className="mt-4 mb-4">Welome to Hathor Wallet!</p>
            </div>
            <p className="mb-4">This wallet is connected to a <strong>testnet</strong>.</p>
            <p>Your HTR and other tokens may be reset at any time.</p>
            <p>If one offers to sell some tokens to you, one is a scammer.</p>
            <p>For further information, check our website (https://hathor.network/).</p>
          <form ref="agreeForm" className={`w-100 mb-4 ${this.state.formValidated ? 'was-validated' : ''}`}>
            <div className="form-check">
              <input required type="checkbox" className="form-check-input" id="confirmAgree" />
              <label className="form-check-label" htmlFor="confirmAgree"> I agree to participate in the testnet of Hathor, and I acknowledge that the tokens are not for real</label>
            </div>
          </form>
            <div className="d-flex align-items-center flex-column">
              <button onClick={this.getStarted} type="button" className="btn btn-hathor">Get started</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default Welcome;