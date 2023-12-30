/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useContext, useEffect, useRef, useState } from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import walletUtils from '../utils/wallet';
import helpers from '../utils/helpers';
import ReactLoading from 'react-loading';
import hathorLib from '@hathor/wallet-lib';
import { DEFAULT_SERVERS, DEFAULT_WALLET_SERVICE_SERVERS, DEFAULT_WALLET_SERVICE_WS_SERVERS, } from '../constants';
import colors from '../index.scss';
import { useSelector } from 'react-redux';
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import LOCAL_STORE from '../storage';
import { useHistory } from 'react-router-dom';


/**
 * Screen to change the server that the wallet is connected
 *
 * @memberof Screens
 */
function Server() {
  const context = useContext(GlobalModalContext);
  const history = useHistory();

  /* newServer {boolean} If user selected checkbox that he wants to set a new server */
  const [newServer, setNewServer] = useState(false);
  /* errorMessage {string} Message to be shown in case of error in form */
  const [errorMessage, setErrorMessage] = useState('');
  /* serverChangeFlag {{shouldExecute: boolean, networkChanged: boolean}} Triggers the sever changed execution */
  const [serverChangeFlag, setServerChangeFlag] = useState({ shouldExecute: false, networkChanged: false });
  /* loading {boolean} If should show spinner while waiting for server response */
  const [loading, setLoading] = useState(false);
  /* selectedServer {string} Server that the user wants to connect */
  const [selectedServer, setSelectedServer] = useState('');
  /* selectedWsServer {string} Websocket Server that the user wants to connect (only used when on the wallet-service facade) */
  const [selectedWsServer, setSelectedWsServer] = useState('');
  /* isHardwareWallet {boolean} If the application is using a hardware wallet */
  const [isHardwareWallet] = useState(LOCAL_STORE.isHardwareWallet());

  // Use selector to fetch wallet and useWalletService
  const { wallet, useWalletService } = useSelector(state => ({
    wallet: state.wallet,
    useWalletService: state.useWalletService
  }));

  // Declare refs
  const newServerRef = useRef(null);
  const newWsServerRef = useRef(null);
  const pinRef = useRef(null);
  const newServerWrapperRef = useRef(null);

  useEffect(() => {
    $('#requestErrorModal').on('hidden.bs.modal', (e) => {
      setLoading(false);
    });
  }, []);

  /**
   * Called after user click the button to change the server
   * Check if form is valid and then reload that from new server
   */
  const serverSelected = async () => {
    let newErrorMessage = '';

    let invalidServer = false;
    if (newServer) {
      if (newServerRef.current.value === '') {
        invalidServer = true;
        newErrorMessage = t`New server is not valid`
      }

      if (useWalletService && newWsServerRef.current.value === '') {
        invalidServer = true;
        newErrorMessage = t`New real-time server is not valid`
      }
    } else {
      if (selectedServer === '') {
        invalidServer = true;
        newErrorMessage = t`New server is not valid`
      }
      if (useWalletService && selectedWsServer === '') {
        invalidServer = true;
        newErrorMessage = t`New real-time server is not valid`
      }
    }

    setErrorMessage(newErrorMessage);

    if (invalidServer) {
      return;
    }

    const newBaseServerInputValue = newServerRef.current.value;
    let newWsServerInputValue = null;

    if (useWalletService) {
      newWsServerInputValue = newWsServerRef.current.value;
    }

    let newBaseServer = null;
    let newWsServer = null;
    if (newServer) {
      newBaseServer = newBaseServerInputValue;
      newWsServer = newWsServerInputValue;
    } else {
      newBaseServer = selectedServer;
      newWsServer = selectedWsServer;
    }

    // we don't ask for the pin on the hardware wallet
    if (!isHardwareWallet) {
      if (!await wallet.checkPin(pinRef.current.value)) {
        setErrorMessage(`Invalid PIN`);
        return;
      }
    }

    setLoading(true);
    setErrorMessage('');
    setSelectedServer(newBaseServer);
    setSelectedWsServer(newWsServer);

    const currentServer = useWalletService ?
      hathorLib.config.getWalletServiceBaseUrl() :
      hathorLib.config.getServerUrl();

    const currentWsServer = useWalletService ?
      hathorLib.config.getWalletServiceBaseWsUrl() :
      '';

    const currentNetwork = wallet.getNetwork();

    // Update new server in storage and in the config singleton
    wallet.changeServer(newBaseServer);

    // We only have a different websocket server on the wallet-service facade, so update the config singleton
    if (useWalletService) {
      await wallet.changeWsServer(newWsServer);
    }

    LOCAL_STORE.setServers(
      newBaseServer,
      useWalletService ? newWsServer : null,
    );

    try {
      const versionData = await wallet.getVersionData();

      if (versionData.network !== 'mainnet') {
        const network = versionData.network;
        let newSelectedNetwork = network;

        // Network might be 'testnet-golf' or 'testnet-charlie'
        if (network.startsWith('testnet')) {
          newSelectedNetwork = 'testnet';
        }

        // Go back to the previous server
        // If the user decides to continue with this change, we will update again
        wallet.changeServer(currentServer);
        if (useWalletService) {
          await wallet.changeWsServer(currentWsServer);
        }
        LOCAL_STORE.setServers(
          currentServer,
          useWalletService ? currentWsServer : null,
        );
        context.showModal(MODAL_TYPES.CONFIRM_TESTNET, {
          success: () => confirmTestnetServer(
            {
              selectedServer: newBaseServer,
              selectedWsServer: newWsServer,
              selectedNetwork: newSelectedNetwork,
            },
          ),
        });
        setLoading(false);
      } else {
        // We are on mainnet, so set the network on the singleton and storage
        const networkChanged = LOCAL_STORE.getNetwork() !== 'mainnet';
        hathorLib.config.setNetwork('mainnet');
        helpers.updateNetwork('mainnet');
        setServerChangeFlag({ shouldExecute: true, networkChanged });
      }
    } catch (e) {
      // Go back to the previous server
      wallet.changeServer(currentServer);
      if (useWalletService) {
        await wallet.changeWsServer(currentWsServer);
      }
      LOCAL_STORE.setServers(
        currentServer,
        useWalletService ? currentWsServer : null,
      );
      helpers.updateNetwork(currentNetwork);
      setLoading(false);
      setErrorMessage(e.message);
    }
  }

  /**
   * Method called when user confirms that wants to connect to a testnet server and
   * we successfully validated that the user has written 'testnet' on the input
   * so we can execute the change
   * @param {Object} params
   * @param {string} params.selectedServer - New server
   * @param {string} [params.selectedWsServer] - New websocket server
   * @param {string} params.selectedNetwork - New network
   */
	const confirmTestnetServer = async ({ // Renaming parameters to avoid naming conflict with the Component scope
																				selectedServer: _selectedServer,
																				selectedWsServer: _selectedWsServer,
																				selectedNetwork: _selectedNetwork,
																			}) => {
    wallet.changeServer(_selectedServer);
    if (useWalletService) {
      await wallet.changeWsServer(_selectedWsServer);
    }
    LOCAL_STORE.setServers(
      _selectedServer,
      useWalletService ? _selectedWsServer : null,
    );

    const networkChanged = !LOCAL_STORE.getNetwork()?.startsWith('testnet');

    // Set network on config singleton so the load wallet will get it properly
    hathorLib.config.setNetwork(_selectedNetwork);
    // Store on localStorage
    helpers.updateNetwork(_selectedNetwork);
    context.hideModal();
    setLoading(true);
    setServerChangeFlag({ shouldExecute: true, networkChanged });
  }

	/**
	 * Listens to the server change flag and executes the actual server change command.
	 */
  useEffect(() => {
    /**
     * Execute server change checking server API and, in case of success
     * reloads data and redirects to wallet screen
     */
    const executeServerChange = async (networkChanged) => {
      // We don't have PIN on hardware wallet
      const pin = isHardwareWallet ? null : pinRef.current.value;
      try {
        await walletUtils.changeServer(wallet, pin, history, networkChanged);
        history.push('/wallet/');
      } catch (err) {
        setLoading(false);
        setErrorMessage(err.message);
      }
      // Reset flag
      setServerChangeFlag({ shouldExecute: false, networkChanged: false });
    }

    if (serverChangeFlag.shouldExecute) {
			// React effects cannot be asynchronous, so we fire this promise and ignore its result
      executeServerChange(serverChangeFlag.networkChanged);
    }
  }, [serverChangeFlag]);

  /**
   * Update state if user wants to choose a new server or one of the default options
   *
   * @param {Object} e Event of checkbox change
   */
  const handleCheckboxChange = (e) => {
    const value = e.target.checked;
    setNewServer(value);
    if (value) {
      $(newServerWrapperRef.current).show(400);
    } else {
      $(newServerWrapperRef.current).hide(400);
    }
  }

  /**
   * Update state of the selected base server
   *
   * @param {Object} e Event of select change
   */
  const handleBaseURLSelectChange = (e) => {
    if (e.target.value === '') {
      setSelectedServer('');
    }

    if (useWalletService) {
      setSelectedServer(DEFAULT_WALLET_SERVICE_SERVERS[e.target.value]);
    } else {
      setSelectedServer(DEFAULT_SERVERS[e.target.value]);
    }
  }


  /**
   * Update state of the selected websocket server
   *
   * @param {Object} e Event of select change
   */
  const handleWsURLSelectChange = (e) => {
    if (!useWalletService) {
      // should never happen
      return;
    }

    if (e.target.value === '') {
      setSelectedWsServer('');
      return;
    }

    setSelectedWsServer(DEFAULT_WALLET_SERVICE_WS_SERVERS[e.target.value]);
  }

  const mapServerToOption = (servers) => servers.map((server, idx) => (
    <option key={idx} value={idx}>{server}</option>
  ));

  const renderServerOptions = () => {
    return useWalletService ?
      mapServerToOption(DEFAULT_WALLET_SERVICE_SERVERS) :
      mapServerToOption(DEFAULT_SERVERS);
  };

  const renderWsServerOptions = () => {
    if (!useWalletService) {
      // should never happen
      return null;
    }

    return mapServerToOption(DEFAULT_WALLET_SERVICE_WS_SERVERS);
  };

  return (
    <div className="content-wrapper">
      <p><strong>{t`Select one of the default servers to connect or choose a new one`}</strong></p>
      <form onSubmit={e => { e.preventDefault(); }}>
        <div className="row mt-3">
          <div className="col-12">
            { useWalletService && (
                <p className="input-label">{t`Base server`}:</p>
              )
            }
            <select onChange={handleBaseURLSelectChange}>
              <option value=""> -- </option>
              {renderServerOptions()}
            </select>
          </div>
        </div>
        {
          useWalletService && (
            <div className="row mt-3">
              <div className="col-12">
                <p className="input-label">{t`Real-time server`}:</p>
                <select onChange={handleWsURLSelectChange}>
                  <option value=""> -- </option>
                  {renderWsServerOptions()}
                </select>
              </div>
            </div>
          )
        }
        <div className="form-check checkbox-wrapper mt-3">
          <input className="form-check-input" type="checkbox" id="newServerCheckbox" onChange={handleCheckboxChange} />
          <label className="form-check-label" htmlFor="newServerCheckbox">
            {t`Select a new server`}
          </label>
        </div>
        <div ref={newServerWrapperRef} className="mt-3" style={{display: 'none'}}>
          { useWalletService && (
              <p className="input-label">{t`Base server`}:</p>
            )
          }
          <input type="text" placeholder={t`New server`} ref={newServerRef} className="form-control col-4" />

          { useWalletService && (
              <>
                <p className="input-label">{t`Real-time server`}:</p>
                <input type="text" placeholder={t`New real-time server`} ref={newWsServerRef} className="form-control col-4" />
              </>
            )
          }
        </div>
        {(!isHardwareWallet) && <input required ref={pinRef} type="password" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off" placeholder={t`PIN`} className="form-control col-4 mt-3" />}
      </form>
      <div className="d-flex flex-row align-items-center mt-3">
        <button onClick={serverSelected} type="button" className="btn btn-hathor mr-3">{t`Connect to server`}</button>
        {loading && <ReactLoading type='spin' color={colors.purpleHathor} width={24} height={24} delay={200} />}
      </div>
      <p className="text-danger mt-3">{errorMessage}</p>
    </div>
  )
}

export default Server;
