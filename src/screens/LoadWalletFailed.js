/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useCallback, useRef, useState } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { t } from 'ttag';
import { str2jsx } from '../utils/i18n';
import logo from '../assets/images/hathor-logo.png';
import InitialImages from '../components/InitialImages';
import { networkSettingsRequestUpdate, setNetworkSettingsStatus, walletReset } from '../actions';
import { NETWORK_SETTINGS, NETWORK_SETTINGS_STATUS, colors } from '../constants';
import LOCAL_STORE from '../storage';
import ReactLoading from 'react-loading';
import { getGlobalWallet } from '../modules/wallet';

export default function LoadFailed(props) {
  const lastAction = useSelector((state) => state.startWalletAction);
  const dispatch = useDispatch();

  // If the user clicked to connect to mainnet
  const [connectToMainnetClicked, setConnectToMainnetClicked] = useState(false);
  const isHardwareWallet = LOCAL_STORE.isHardwareWallet();
  // Use selector to fetch current network settings
  const { networkSettings } = useSelector(state => ({
    networkSettings: state.networkSettings
  }));
  const pinRef = useRef(null);
  const wallet = getGlobalWallet();
  const navigate = useNavigate();
  
  const retry = useCallback((e) => {
    e.preventDefault();
    dispatch(lastAction);
  }, [lastAction, dispatch]);

  const executeConnectToMainnet = useCallback(async (e) => {
    e.preventDefault();
    const pin = pinRef.current.value;
    if (!await wallet.checkPin(pin)) {
      dispatch(setNetworkSettingsStatus({ status: NETWORK_SETTINGS_STATUS.ERROR, error: t`Invalid PIN.` }));
      return;
    }

    dispatch(setNetworkSettingsStatus({ status: NETWORK_SETTINGS_STATUS.LOADING }));
    dispatch(networkSettingsRequestUpdate(NETWORK_SETTINGS['mainnet'], pin));
  }, [dispatch]);

  const connectToMainnet = useCallback((e) => {
    e.preventDefault();
    setConnectToMainnetClicked(true);
  }, [setConnectToMainnetClicked]);

  const reset = useCallback((e) => {
    e.preventDefault();
    dispatch(walletReset());
  }, [dispatch]);

  const isLoading = networkSettings.status === NETWORK_SETTINGS_STATUS.LOADING;

  const renderConditionalComponent = () => {
    if (!isHardwareWallet && !connectToMainnetClicked) {
      return <a onClick={connectToMainnet} href='true'>{t`Connect to mainnet`}</a>;
    }

    if (connectToMainnetClicked) {
      return (
        <div className="d-flex flex-row align-items-center justify-content-end">
          <input required ref={pinRef} type="password" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off" placeholder={t`PIN`} className="form-control col-4 mr-3" />
          <button onClick={executeConnectToMainnet} disabled={isLoading} type="button" className="btn btn-hathor mr-3">{t`Connect`}</button>
          {isLoading && <ReactLoading type='spin' color={colors.purpleHathor} width={24} height={24} delay={200} />}
        </div>
      );
    }
  }

  return (
    <div className="outside-content-wrapper">
      <div className="inside-white-wrapper col-sm-12 col-md-8">
        <div className="inside-div">
          <div className="d-flex align-items-center flex-column">
            <img className="hathor-logo" src={logo} alt="" />
          </div>
          <p style={{ marginTop: 48 }}>
            {str2jsx(t`There has been a problem loading your wallet, click |fn:here| to retry.`,
              {
                fn: (x, i) => <a key={i} onClick={retry} href="true">{x}</a>
              }
            )}
          </p>
          <div className="d-flex flex-row justify-content-around mt-5 align-items-center">
            <a onClick={reset} href='true'>{t`Reset wallet`}</a>
            {renderConditionalComponent()}
          </div>
          <p className="text-danger mt-3">{networkSettings.status === NETWORK_SETTINGS_STATUS.ERROR && networkSettings.error}</p>
        </div>
        <InitialImages />
      </div>
    </div>
  );
}
