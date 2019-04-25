/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import ReactLoading from 'react-loading';
import RequestErrorModal from '../components/RequestError';
import logo from '../assets/images/hathor-logo.png';
import { dataLoaded } from "../actions/index";
import { connect } from "react-redux";

const mapDispatchToProps = dispatch => {
  return {
    dataLoaded: (data) => dispatch(dataLoaded(data)),
  };
};


const mapStateToProps = (state) => {
  return {
    addressesFound: state.addressesFound,
    transactionsFound: state.transactionsFound,
    loadingAddresses: state.loadingAddresses
  };
};


/**
 * Screen that appears while the wallet is loading transactions from the addresses
 *
 * @memberof Screens
 */
class LoadingAddresses extends React.Component {
  /**
   * canRedirect {boolean} set if can already redirect to the screen after loading
   */
  state = { canRedirect: false };

  componentDidMount = () => {
    this.props.dataLoaded({addressesFound: 0, transactionsFound: 0});
    // To prevent only a blink in this screen when user loads the addresses really fast
    // I set that the user will see this screen at least for 2 seconds
    setTimeout(() => {
      this.setState({ canRedirect: true });
    }, 2000);
  }

  render() {
    // If finished loading addresses we redirect back to the page was supposed to load at first
    if (this.state.canRedirect && !this.props.loadingAddresses) {
      return <Redirect to={{ pathname: this.props.location.state.path }} />;
    }

    return (
      <div className="outside-content-wrapper">
        <div className="inside-white-wrapper col-sm-12 col-md-8">
          <div>
            <div className="d-flex align-items-center flex-column">
              <img className="hathor-logo" src={logo} alt="" />
              <div className="mt-5 mb-4 d-flex flex-row align-items-center">
                <p className="mr-3 mb-0"><strong>Loading transactions...</strong></p>
                <ReactLoading type='spin' color='#0081af' width={24} height={24} delay={0} />
              </div>
            </div>
            <p>Please wait while we load the transactions of all your addresses.</p>
            <p>You will be automatically redirected to the wallet when we finish loading them.</p>
            <p><strong>Addresses found:</strong> {this.props.addressesFound}</p>
            <p><strong>Transactions found:</strong> {this.props.transactionsFound}</p>
          </div>
        </div>
        <RequestErrorModal {...this.props} />
      </div>
    )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(LoadingAddresses);