/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { Redirect } from 'react-router-dom';
import ReactLoading from 'react-loading';
import { t } from 'ttag';

import SpanFmt from '../components/SpanFmt';
import RequestErrorModal from '../components/RequestError';
import logo from '../assets/images/hathor-logo.png';
import { updateLoadedData } from "../actions/index";
import { connect } from "react-redux";
import colors from '../index.scss';
import InitialImages from '../components/InitialImages';

const mapDispatchToProps = dispatch => {
  return {
    updateLoadedData: (data) => dispatch(updateLoadedData(data)),
  };
};


const mapStateToProps = (state) => {
  return {
    addressesFound: state.loadedData.addresses,
    transactionsFound: state.loadedData.transactions,
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
    // When the wallet was opened for the first time and the user is loading the transactions,
    // after loading all of them (and the update will be shown in this component)
    // the wallet will check the API version with the full node to check compatibility.
    // While the wallet waits for the full node response, it redirects to this same component,
    // and we were resetting the progress to 0 before changing screen, which was weird.
    // The best approach is to check full node API version compatibility before loading
    // the wallet data but this is a bigger refactor, so I just added a new flag when redirecting
    // the wallet to this screen when we are waiting for version check.
    // If this flag is true, then we don't need to reset the progress because it was already done
    // and the wallet is just waiting, so should continue showing the latest progress
    if (this.props.location.waitVersionCheck !== true) {
      this.props.updateLoadedData({addresses: 0, transactions: 0});
    }
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
          <div className="inside-div">
            <div className="d-flex align-items-center flex-column">
              <img className="hathor-logo" src={logo} alt="" />
              <div className="mt-5 mb-4 d-flex flex-row align-items-center">
                <p className="mr-3 mb-0"><strong>{t`Loading transactions...`}</strong></p>
                <ReactLoading type='spin' color={colors.purpleHathor} width={24} height={24} delay={0} />
              </div>
            </div>
            <p>{t`Please wait while we load the transactions of all your addresses.`}</p>
            <p>{t`You will be automatically redirected to the wallet when we finish loading them.`}</p>
            <p><SpanFmt>{t`**Addresses found:** ${this.props.addressesFound}`}</SpanFmt></p>
            <p><SpanFmt>{t`**Transactions found:** ${this.props.transactionsFound}`}</SpanFmt></p>
          </div>
          <InitialImages />
        </div>
        <RequestErrorModal {...this.props} />
      </div>
    )
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(LoadingAddresses);
