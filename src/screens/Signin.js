import React from 'react';


class Signin extends React.Component {
  goToNewWallet = () => {
    this.props.history.push('/new_wallet/');
  }

  goToLoadWallet = () => {
    this.props.history.push('/load_wallet/');
  }

  render() {
    return (
      <div className="content-signin-wrapper d-flex flex-row justify-content-center align-items-center">
        <button onClick={this.goToNewWallet} type="button" className="btn btn-primary mr-3">New wallet</button>
        <button onClick={this.goToLoadWallet} type="button" className="btn btn-primary mr-3">Load wallet</button>
      </div>
    )
  }
}

export default Signin;