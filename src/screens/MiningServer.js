/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useRef, useState } from 'react';
import { t } from 'ttag';
import {
  DEFAULT_MINING_SERVERS,
} from '../constants';
import LOCAL_STORE from '../storage';
import { getGlobalWallet } from "../modules/wallet";

/**
 * Screen to change the tx-mining server that the wallet uses to mine transactions
 *
 * @memberof Screens
 */
function MiningServer() {
  const wallet = getGlobalWallet();

  /* errorMessage {string} Message to be shown in case of error in form */
  const [errorMessage, setErrorMessage] = useState('');
  /* isHardwareWallet {boolean} If the application is using a hardware wallet */
  const [isHardwareWallet] = useState(LOCAL_STORE.isHardwareWallet());
  /* currentServer {string} currently connected tx-mining server url */
  const [currentServer, setCurrentServer] = useState('');

  const currentNetwork = wallet.getNetwork();
  const defaultServer = DEFAULT_MINING_SERVERS[currentNetwork]

  useEffect(() => {
    setCurrentServer(wallet.storage.config.getServerUrl());
  }, []);

  // Declare refs
  const newServerRef = useRef(null);
  const pinRef = useRef(null);

  /**
   * Called after user click the button to change the server
   * Check if form is valid and then reload that from new server
   */
  const serverSelected = async () => {
    if (newServerRef.current.value === '') {
      setErrorMessage(t`New server is not valid`);
      return;
    }

    const newServer = newServerRef.current.value;

    // we don't ask for the pin on the hardware wallet
    if (!isHardwareWallet) {
      if (!await wallet.checkPin(pinRef.current.value)) {
        setErrorMessage(`Invalid PIN`);
        return;
      }
    }

    setErrorMessage('');

    // Update new server the wallet config
    wallet.config.setTxMiningUrl(newServer);
    setCurrentServer(newServer);
  }

  return (
    <div className="content-wrapper">
      <p><strong>{t`Change the transaction mining service server`}</strong></p>
      <form onSubmit={e => { e.preventDefault(); }}>
        <div className="row mt-3">
          <div className="col-12">
            <p className="input-label">{t`Default server`}: {defaultServer}</p>
            <p className="input-label">{t`Current server`}: {currentServer}</p>
          </div>
        </div>
        <div className="mt-3">
          <input type="text" placeholder={t`New mining server`} ref={newServerRef} className="form-control col-4" />
        </div>
        {(!isHardwareWallet) && <input required ref={pinRef} type="password" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off" placeholder={t`PIN`} className="form-control col-4 mt-3" />}
      </form>
      <div className="d-flex flex-row align-items-center mt-3">
        <button onClick={serverSelected} type="button" className="btn btn-hathor mr-3">{t`Connect to server`}</button>
      </div>
      <p className="text-danger mt-3">{errorMessage}</p>
    </div>
  )
}

export default MiningServer;
