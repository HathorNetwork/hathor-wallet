import React from 'react';
import wallet from '../utils/wallet';
import logo from '../assets/images/hathor-logo.png';


class Welcome extends React.Component {
  getStarted = () => {
    wallet.markWalletAsStarted();
    this.props.history.push('/signin/');
  }

  render() {
    return (
      <div className="outside-content-wrapper">
        <div className="inside-white-wrapper col-sm-12 col-md-8 offset-md-2 col-lg-6 offset-lg-3">
          <div className="d-flex align-items-center flex-column">
            <img className="hathor-logo" src={logo} alt="" />
            <p className="mt-4 mb-4">Welome to Hathor Wallet!</p>
            <button onClick={this.getStarted} type="button" className="btn btn-hathor">Get started</button>
          </div>
        </div>
      </div>
    )
  }
}

export default Welcome;