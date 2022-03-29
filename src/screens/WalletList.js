/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useRef } from 'react';
import { t } from 'ttag'
import { setWalletPrefix } from '../actions/index';
import { connect } from "react-redux";

import hathorLib from '@hathor/wallet-lib';

const mapStateToProps = (state) => {
  return {
    walletPrefix: state.walletPrefix,
  }
}

const mapDispatchToProps = dispatch => {
  return {
    setWalletPrefix: (data) => dispatch(setWalletPrefix(data)),
  };
};

/**
 * Screen that has a list of wallets available.
 *
 * @memberof Screens
 */
function WalletList(props) {
  // The method `getListOfWallets` will be called on the first render to init the state.
  // This is to prevent unnecessary access to the store.
  const [listOfWallets, setListOfWallets] = useState(hathorLib.storage.store.getListOfWallets());
  const [errorMessage, setError] = useState(null);
  const walletNameRef = useRef(null);
  const newWalletFormRef = useRef(null);

  /**
   * Called when user clicks on a wallet name.
   *
   * @param {Object} e Event for the click
   * @param {String} prefix Prefix of the chosen wallet
   */
  const goToWallet = (e, prefix) => {
    e.preventDefault();
    setError(null);
    props.setWalletPrefix(prefix);
    hathorLib.wallet.lock();
    props.history.push('/');
  }

  /**
   * Called when user wants to create a new wallet.
   *
   * @param {Object} e Event for the click
   */
  const onNewWalletClick = (e) => {
    e.preventDefault();
    setError(null);
    if (!walletNameRef.current) {
      return;
    }
    const walletName = walletNameRef.current?.value;
    try {
      hathorLib.storage.store.addWallet(walletName, walletName);
      // walletNameRef.current?.value = '';
      // This will trigger a state change which will reload the component.
      setListOfWallets(hathorLib.storage.store.getListOfWallets());
    } catch (ex) {
      // wallet already exists
      console.log(ex);
      setError(ex.message);
    }
  }

  const walletTable = Object.entries(listOfWallets).sort(([key1, v1], [key2, v2]) => {
    if (key1 === props.walletPrefix) {
      // Always start with current wallet
      return -1;
    }
    return key1 > key2;
  }).map(([prefix, walletInfo]) => {
    return (
      <tr key={prefix}>
        <td><a href="true" onClick={(e) => goToWallet(e, prefix)}>{prefix === props.walletPrefix ? t`Current`+": "+walletInfo.name : walletInfo.name}</a></td>
      </tr>
    );
  });

  const newWalletForm = (
    <form ref={newWalletFormRef} className="w-100">
      <div className="row">
        <div className="col-6">
          <input ref={walletNameRef} type="text" autoComplete="off" placeholder={t`Wallet Name`} className="form-control" required />
        </div>
        <div className="col-6">
          <button onClick={onNewWalletClick} type="button" className="btn btn-hathor">{t`Create new wallet`}</button>
        </div>
      </div>
    </form>
  );

  return (
    <div className="content-wrapper">
      <div className="d-flex flex-column">
        <p className="text-danger mt-3 white-space-pre-wrap">{errorMessage}</p>
        <div className="d-flex flex-row justify-content-between">
          <h2>{t`Wallets`}</h2>
        </div>
        {newWalletForm}
        <div className="table-responsive">
          <table className="mt-3 table table-striped">
            <tbody>
              {walletTable}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default connect(mapStateToProps, mapDispatchToProps)(WalletList);