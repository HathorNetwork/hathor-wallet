import React from 'react';
import logo from '../assets/images/hathor-logo.png';


class Signin extends React.Component {
  goToNewWallet = () => {
    this.props.history.push('/new_wallet/');
  }

  goToLoadWallet = () => {
    this.props.history.push('/load_wallet/');
  }

  render() {
    return (
      <div className="outside-content-wrapper">
        <div className="inside-white-wrapper col-sm-12 col-md-8 offset-md-2 col-lg-6 offset-lg-3">
          <div className="d-flex align-items-center flex-column">
            <img className="hathor-logo" src={logo} alt="" />
            <p className="mt-4 mb-4">You can start a new wallet or import data from a wallet that already exists</p>
            <div className="d-flex align-items-center flex-row justify-content-between w-100 mt-4">
              <button onClick={this.goToNewWallet} type="button" className="btn btn-hathor mr-3">New wallet</button>
              <button onClick={this.goToLoadWallet} type="button" className="btn btn-hathor">Import wallet</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default Signin;