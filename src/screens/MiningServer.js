/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useRef, useState } from 'react';
import { t } from 'ttag';
import {
  colors,
} from '../constants';
import LOCAL_STORE from '../storage';
import ReactLoading from 'react-loading';
import { getGlobalWallet } from "../modules/wallet";
import { useDispatch, useSelector } from 'react-redux';
import BackButton from '../components/BackButton';
import HathorAlert from '../components/HathorAlert';
import { updateMiningServer } from "../actions";
import isURL from 'validator/lib/isURL';

/**
 * Screen to change the tx-mining server that the wallet uses to mine transactions
 *
 * @memberof Screens
 */
function MiningServer() {
  const wallet = getGlobalWallet();
  const dispatch  = useDispatch();
  const currentServer = useSelector(state => state.miningServer);

  /* errorMessage {string} Message to be shown in case of error in form */
  const [errorMessage, setErrorMessage] = useState('');
  /* isHardwareWallet {boolean} If the application is using a hardware wallet */
  const isHardwareWallet = LOCAL_STORE.isHardwareWallet();
  /* loading {boolean} If should show spinner while waiting for server response */
  const [loading, setLoading] = useState(false);

  // Declare refs
  const newServerRef = useRef(null);
  const pinRef = useRef(null);
  const alertSuccessRef = useRef();

  useEffect(() => {
    if (loading) {
      alertSuccessRef.current.show(3000);
    }
    setLoading(false);
  }, [currentServer]);

  /**
   * Called after user click the button to change the server
   */
  const changeServer = async (reset) => {
    let newServer;

    if (reset) {
      if (currentServer === null) {
        setErrorMessage(t`Already using the default server`);
        return;
      }
    } else {
      if (newServerRef.current.value === '') {
        setErrorMessage(t`New server cannot be empty`);
        return;
      }

      if (!isURL(
          newServerRef.current.value,
          { require_protocol: true, protocols: ['http', 'https'] },
      )) {
        setErrorMessage(t`New server is not valid`);
        return;
      }

      newServer = newServerRef.current.value;

      if (newServer === currentServer) {
        setErrorMessage(t`New server is the same as the current server`);
        return;
      }
    }

    // we don't ask for the pin on the hardware wallet
    if (!isHardwareWallet) {
      if (!await wallet.checkPin(pinRef.current.value)) {
        setErrorMessage(t`Invalid PIN`);
        return;
      }
    }

    setErrorMessage('');
    newServerRef.current.value = '';
    pinRef.current.value = '';

    setLoading(true);
    dispatch(updateMiningServer(newServer, reset));
  }

  return (
    <div className="content-wrapper">
      <BackButton />
      <p><strong>{t`Change the transaction mining server`}</strong></p>
      <form onSubmit={e => { e.preventDefault(); }}>
        <div className="row mt-3">
          <div className="col-12">
            {currentServer === null
              && <p className="input-label">{t`You are currently using the default mining server.`}</p>
              || <p className="input-label">{t`You are not using the default mining server.`}</p>
            }
            <p className="input-label">{t`Current server`}: {currentServer || wallet.storage.config.getTxMiningUrl()}</p>
          </div>
        </div>
        <div className="mt-3">
          <input type="text" placeholder={t`New mining server`} ref={newServerRef} className="form-control col-4" />
        </div>
        {(!isHardwareWallet) && <input required ref={pinRef} type="password" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off" placeholder={t`PIN`} className="form-control col-4 mt-3" />}
      </form>
      <div className="d-flex flex-row align-items-center mt-3">
        <button onClick={() => changeServer(false)} type="button" className="btn btn-hathor mr-3">{t`Set mining server`}</button>
        {currentServer !== null && <button onClick={() => changeServer(true)} type="button" className="btn btn-hathor mr-3">{t`Reset mining server`}</button>}
        {loading && <ReactLoading type='spin' color={colors.purpleHathor} width={24} height={24} delay={200} />}
      </div>
      <p className="text-danger mt-3">{errorMessage}</p>
      <HathorAlert ref={alertSuccessRef} text={t`Mining server changed`} type="success" extraClasses="hathor-floating-alert" />
    </div>
  )
}

export default MiningServer;
