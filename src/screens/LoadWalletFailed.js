/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useCallback, useContext } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { t } from 'ttag';
import { str2jsx } from '../utils/i18n';
import logo from '../assets/images/hathor-logo.png';
import InitialImages from '../components/InitialImages';
import { hideGlobalModal, networkSettingsRequestUpdate, setNetworkSettingsStatus, walletReset } from '../actions';
import { NETWORK_SETTINGS, NETWORK_SETTINGS_STATUS, colors } from '../constants';
import LOCAL_STORE from '../storage';
import ReactLoading from 'react-loading';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';

export default function LoadFailed(props) {
  const lastAction = useSelector((state) => state.startWalletAction);
  const dispatch = useDispatch();

  const context = useContext(GlobalModalContext);
  const isHardwareWallet = LOCAL_STORE.isHardwareWallet();
  // Use selector to fetch current network settings
  const { networkSettings } = useSelector(state => ({
    networkSettings: state.networkSettings
  }));
  
  const retry = useCallback((e) => {
    e.preventDefault();
    dispatch(lastAction);
  }, [lastAction, dispatch]);

  const connectToMainnet = useCallback((e) => {
    e.preventDefault();
    context.showModal(MODAL_TYPES.PIN_PAD, {
      onComplete: (pinCode) => {
        dispatch(hideGlobalModal());
        dispatch(setNetworkSettingsStatus({ status: NETWORK_SETTINGS_STATUS.LOADING }));
        dispatch(networkSettingsRequestUpdate(NETWORK_SETTINGS['mainnet'], pinCode));
      },
      onCancel: () => {
        dispatch(hideGlobalModal());
      }
    });
  }, [dispatch]);

  const reset = useCallback((e) => {
    e.preventDefault();
    dispatch(walletReset());
  }, [dispatch]);

  const isLoading = networkSettings.status === NETWORK_SETTINGS_STATUS.LOADING;

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
            {!isHardwareWallet && <a onClick={connectToMainnet} href='true'>{t`Connect to mainnet`}</a>}
          </div>
          <p className="text-danger mt-3">{networkSettings.status === NETWORK_SETTINGS_STATUS.ERROR && networkSettings.error}</p>
        </div>
        <InitialImages />
      </div>
    </div>
  );
}
