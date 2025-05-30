/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import ReactLoading from 'react-loading';
import { t } from 'ttag';
import { useDispatch, useSelector } from 'react-redux';

import SpanFmt from '../components/SpanFmt';
import logo from '../assets/images/hathor-logo.png';
import { updateLoadedData } from "../actions/index";
import { colors } from '../constants';
import InitialImages from '../components/InitialImages';

/**
 * Screen that appears while the wallet is loading transactions from the addresses
 *
 * @memberof Screens
 */
function LoadingAddresses() {
  /**
   * True if the app can already redirect to the desired screen after loading
   * @type {boolean}
   */
  const [canRedirect, setCanRedirect] = useState(false);
  /**
   * Reference to a timeout instance that helps with UX.
   * @type {Object}
   */
  const timeoutId = useRef(null);

  const dispatch = useDispatch();
  const location = useLocation();
  const { addressesFound, transactionsFound, loadingAddresses } = useSelector(state => ({
    addressesFound: state.loadedData.addresses,
    transactionsFound: state.loadedData.transactions,
    loadingAddresses: state.loadingAddresses,
  }));

  useEffect(() => {
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
    if (location.waitVersionCheck !== true) {
      dispatch(updateLoadedData({ addresses: 0, transactions: 0 }));
    }
    // To prevent only a blink in this screen when user loads the addresses really fast
    // I set that the user will see this screen at least for 2 seconds
    timeoutId.current = setTimeout(() => {
      setCanRedirect(true);
    }, 2000);

    return () => {
      clearTimeout(timeoutId.current);
    }
  }, []);

  // If finished loading addresses we redirect back to the page that was supposed to load at first
  if (canRedirect && !loadingAddresses) {
    // If we don't have state, we should default to /wallet/, this might happen if the page
    // was reloaded on the loading_addresses screen. This may happen during development
    // because of the auto reload
    if (!location.state) {
      return <Navigate to={'/wallet/'} />;
    }
    return <Navigate to={location.state.path} />;
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
          <p><SpanFmt>{t`**Addresses found:** ${addressesFound}`}</SpanFmt></p>
          <p><SpanFmt>{t`**Transactions found:** ${transactionsFound}`}</SpanFmt></p>
        </div>
        <InitialImages />
      </div>
    </div>
  )
}

export default LoadingAddresses;
