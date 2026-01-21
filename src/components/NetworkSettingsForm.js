import React, { useContext, useEffect, useRef, useState, useCallback } from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import walletUtils from '../utils/wallet';
import helpers from '../utils/helpers';
import ReactLoading from 'react-loading';
import hathorLib from '@hathor/wallet-lib';
import {
  NETWORK_SETTINGS,
  NETWORK_SETTINGS_STATUS,
  colors
} from '../constants';
import { useDispatch, useSelector } from 'react-redux';
import { GlobalModalContext, MODAL_TYPES } from './GlobalModal';
import LOCAL_STORE from '../storage';
import { getGlobalWallet } from "../modules/wallet";
import { useNavigate } from 'react-router-dom';
import { networkSettingsRequestUpdate, setNetworkSettingsStatus } from "../actions";

function NetworkSettingsForm(props) {
  const context = useContext(GlobalModalContext);
  const navigate = useNavigate();
  const dispatch  = useDispatch();

  const networkSelectRef = useRef(null);
  const alertSuccessRef = useRef(null);
  const pinRef = useRef(null);
  const formRef = useRef(null);
  const nodeRef = useRef(null);
  const txMiningRef = useRef(null);
  const explorerRef = useRef(null);
  const explorerServiceRef = useRef(null);
  const walletServiceRef = useRef(null);
  const walletServiceWSRef = useRef(null);

  const wallet = getGlobalWallet();
  const isHardwareWallet = LOCAL_STORE.isHardwareWallet();

  // Use selector to fetch current network settings
  const { networkSettings } = useSelector(state => ({
    networkSettings: state.networkSettings
  }));

  /* networkSelected {string} Network that the user wants to connect */
  const [networkSelected, setNetworkSelected] = useState('');

  useEffect(() => {
    if (networkSettings.status === NETWORK_SETTINGS_STATUS.WAITING_NETWORK_CONFIRMATION) {
      // User requested to change to a node that is a testnet or privatenet
      // so we must show the confirmation modal before changing the network
      context.showModal(MODAL_TYPES.CONFIRM_TESTNET, {
        success: () => onNetworkConfirmed(),
        onUserCancel: () => onNetworkConfirmationCancel(),
        network: networkSettings.newNetwork,
      });
    }
  }, [networkSettings.status, context, networkSettings.newNetwork, onNetworkConfirmed, onNetworkConfirmationCancel]);

  useEffect(() => {
    // Start with the status change to READY, in case it had been left in an inconsistent state
    dispatch(setNetworkSettingsStatus({ status: NETWORK_SETTINGS_STATUS.READY }));
    return () => {
      // Reset status data on unmount
      dispatch(setNetworkSettingsStatus({ status: NETWORK_SETTINGS_STATUS.READY }));
    };
  }, []);

  if (!networkSettings || !networkSettings.data) {
    return <div>Loading network settings...</div>;
  }

  /**
   * Called when user confirms that wants to connect
   * to the testnet/privatenet in the confirmation modal
   */
  const onNetworkConfirmed = useCallback(() => {
    dispatch(setNetworkSettingsStatus({ status: NETWORK_SETTINGS_STATUS.NETWORK_CONFIRMED }));
  }, [dispatch]);

  /**
   * Called when user closes the modal to confirm testnet/privatenet connection
   */
  const onNetworkConfirmationCancel = useCallback(() => {
    dispatch(setNetworkSettingsStatus({ status: NETWORK_SETTINGS_STATUS.READY }));
  }, [dispatch]);

  /**
   * Called when user selects one network from the select
   *
   * @param {Object} e Event of checkbox change
   */
  const onNetworkSelected = (e) => {
    setNetworkSelected(e.target.value);
  }

  const onNetworkConnect = async () => {
    const isValid = formRef.current.checkValidity();
    if (!isValid) {
      formRef.current.classList.add('was-validated')
      return;
    }

    // we don't ask for the pin on the hardware wallet
    const pin = isHardwareWallet ? null : pinRef.current.value;
    if (!isHardwareWallet) {
      if (!await wallet.checkPin(pin)) {
        dispatch(setNetworkSettingsStatus({ status: NETWORK_SETTINGS_STATUS.ERROR, error: t`Invalid PIN.` }));
        return;
      }
    }

    dispatch(setNetworkSettingsStatus({ status: NETWORK_SETTINGS_STATUS.LOADING }));

    let data = {};
    const newNetwork = networkSelectRef.current.value;
    if (newNetwork === 'custom') {
      data.node = nodeRef.current.value;
      data.txMining = txMiningRef.current.value;
      data.explorer = explorerRef.current.value;
      data.explorerService = explorerServiceRef.current.value;
      data.walletService = walletServiceRef.current.value;
      data.walletServiceWS = walletServiceWSRef.current.value;
    } else {
      data = NETWORK_SETTINGS[newNetwork];
    }

    dispatch(networkSettingsRequestUpdate(data, pin));
  }

  const renderCustomNetworkFields = () => {
    return (
      <>
        <input type="text" ref={nodeRef} required placeholder={t`Full node URL *`} className="form-control col-8" />
        <input type="text" ref={txMiningRef} required placeholder={t`Transaction Mining Service URL *`} className="form-control col-8 mt-3" />
        <input type="text" ref={explorerRef} required placeholder={t`Explorer URL *`} className="form-control col-8 mt-3" />
        <input type="text" ref={explorerServiceRef} required placeholder={t`Explorer Service URL *`} className="form-control col-8 mt-3" />
        <input type="text" ref={walletServiceRef} placeholder={t`Wallet Service URL`} className="form-control col-8 mt-3" />
        <input type="text" ref={walletServiceWSRef} placeholder={t`Wallet Service Websocket URL`} className="form-control col-8 mt-3" />
      </>
    );
  }

  const isLoading = networkSettings.status === NETWORK_SETTINGS_STATUS.LOADING || networkSettings.status === NETWORK_SETTINGS_STATUS.NETWORK_CONFIRMED;
  return (
    <>
      <p><strong>{t`Full node URL`}:</strong> {networkSettings.data.node}</p>
      <p><strong>{t`Transaction Mining Service URL`}:</strong> {networkSettings.data.txMining}</p>
      <p><strong>{t`Explorer URL`}:</strong> {networkSettings.data.explorer}</p>
      <p><strong>{t`Explorer Service URL`}:</strong> {networkSettings.data.explorerService}</p>
      <p><strong>{t`Wallet Service URL`}:</strong> {networkSettings.data.walletService}</p>
      <p><strong>{t`Wallet Service Websocket URL`}:</strong> {networkSettings.data.walletServiceWS}</p>
      <hr />
      <p><strong>{t`Select the network if you want to change`}</strong></p>
      <form onSubmit={e => { e.preventDefault(); }} ref={formRef}>
        <div className="row mt-3">
          <div className="col-12">
            <select required ref={networkSelectRef} onChange={onNetworkSelected}>
              <option value=""> -- </option>
              <option value="mainnet">Mainnet</option>
              <option value="testnet">Testnet</option>
              <option value="custom">Custom network</option>
            </select>
          </div>
        </div>
        <div className="mt-3">
          {networkSelected === 'custom' && renderCustomNetworkFields()}
          {!isHardwareWallet && networkSelected && <input required ref={pinRef} type="password" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off" placeholder={t`PIN`} className="form-control col-2 mt-3" />}
        </div>
      </form>
      <div className="d-flex flex-row align-items-center mt-3">
        <button onClick={onNetworkConnect} disabled={isLoading} type="button" className="btn btn-hathor mr-3">{t`Connect`}</button>
        {
          isLoading && <ReactLoading type='spin' color={colors.purpleHathor} width={24} height={24} delay={200} />
        }
      </div>
      <p className="text-danger mt-3">{networkSettings.status === NETWORK_SETTINGS_STATUS.ERROR && networkSettings.error}</p>
    </>
  )
}

export default NetworkSettingsForm; 