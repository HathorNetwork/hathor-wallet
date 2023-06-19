/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import wallet from '../utils/wallet';
import helpers from '../utils/helpers';
import ReactLoading from 'react-loading';
import hathorLib from '@hathor/wallet-lib';
import {
  DEFAULT_SERVERS,
  DEFAULT_WALLET_SERVICE_SERVERS,
  DEFAULT_WALLET_SERVICE_WS_SERVERS,
} from '../constants';
import colors from '../index.scss';
import { connect } from "react-redux";
import { GlobalModalContext, MODAL_TYPES } from '../components/GlobalModal';
import LOCAL_STORE from '../storage';

const mapStateToProps = (state) => {
  return {
    wallet: state.wallet,
    useWalletService: state.useWalletService,
  };
};


/**
 * Screen to change the server that the wallet is connected
 *
 * @memberof Screens
 */
class Server extends React.Component {
  static contextType = GlobalModalContext;

  constructor(props) {
    super(props);

    /**
     * errorMessage {string} Message to be shown in case of error in form
     * loading {boolean} If should show spinner while waiting for server response
     * newServer {boolean} If user selected checkbox that he wants to set a new server
     * selectedValue {string} Server selected from the user
     * selectedServer {string} Server that the user wants to connect
     * selectedWsServer {string} Websocket Server that the user wants to connect (only used when on the wallet-service facade)
     * selectedNetwork {string} Network that the user wants to connect
     */
    this.state = {
      newServer: false,
      errorMessage: '',
      selectedValue: '',
      loading: false,
      selectedServer: '',
      selectedWsServer: '',
      selectedNetwork: null,
    }
  }

  componentDidMount = () => {
    $('#requestErrorModal').on('hidden.bs.modal', (e) => {
      this.setState({
        loading: false,
      });
    });

    $('#alertModal').on('hidden.bs.modal', (e) => {
    });
  }

  /**
   * Called after user click the button to change the server
   * Check if form is valid and then reload that from new server
   */
  serverSelected = async () => {
    let errorMessage = '';

    let invalidServer = false;
    if (this.state.newServer) {
      if (this.refs.newServer.value === '') {
        invalidServer = true;
        errorMessage = t`New server is not valid`
      }

      if (this.props.useWalletService && this.refs.newWsServer.value === '') {
        invalidServer = true;
        errorMessage = t`New real-time server is not valid`
      }
    } else {
      if (this.state.selectedServer === '') {
        invalidServer = true;
        errorMessage = t`New server is not valid`
      }
      if (this.props.useWalletService && this.state.selectedWsServer === '') {
        invalidServer = true;
        errorMessage = t`New real-time server is not valid`
      }
    }

    this.setState({ errorMessage });

    if (invalidServer) {
      return;
    }

    const newBaseServerInputValue = this.refs.newServer.value;
    let newWsServerInputValue = null;

    if (this.props.useWalletService) {
      newWsServerInputValue = this.refs.newWsServer.value;
    }

    let newBaseServer = null;
    let newWsServer = null;
    if (this.state.newServer) {
      newBaseServer = newBaseServerInputValue;
      newWsServer = newWsServerInputValue;
    } else {
      newBaseServer = this.state.selectedServer;
      newWsServer = this.state.selectedWsServer;
    }

    // we don't ask for the pin on the hardware wallet
    if (!LOCAL_STORE.isHardwareWallet()) {
      if (!await this.props.wallet.checkPin(this.refs.pin.value)) {
        this.setState({ errorMessage: t`Invalid PIN` });
        return;
      }
    }

    this.setState({
      loading: true,
      errorMessage: '',
      selectedServer: newBaseServer,
      selectedWsServer: newWsServer,
    });

    const currentServer = this.props.useWalletService ?
      hathorLib.config.getWalletServiceBaseUrl() :
      hathorLib.config.getServerUrl();

    const currentWsServer = this.props.useWalletService ?
      hathorLib.config.getWalletServiceBaseWsUrl() :
      '';

    // Update new server in storage and in the config singleton
    await this.props.wallet.changeServer(newBaseServer);

    // We only have a different websocket server on the wallet-service facade, so update the config singleton
    if (this.props.useWalletService) {
      await this.props.wallet.changeWsServer(newWsServer);
    }

    try {
      const versionData = await this.props.wallet.getVersionData();

      if (versionData.network !== 'mainnet') {
        const network = versionData.network;
        let selectedNetwork = network;

        // Network might be 'testnet-golf' or 'testnet-charlie'
        if (network.startsWith('testnet')) {
          selectedNetwork = 'testnet';
        }

        this.setState({
          selectedNetwork,
        });

        // Go back to the previous server
        // If the user decides to continue with this change, we will update again
        await this.props.wallet.changeServer(currentServer);
        if (this.props.useWalletService) {
         await this.props.wallet.changeWsServer(currentWsServer);
        }
        this.context.showModal(MODAL_TYPES.CONFIRM_TESTNET, {
          success: this.confirmTestnetServer,
        });
        this.setState({ loading: false });
      } else {
        // We are on mainnet, so set the network on the singleton and storage
        hathorLib.config.setNetwork('mainnet');
        helpers.updateNetwork('mainnet');
        this.executeServerChange();
      }
    } catch (e) {
      // Go back to the previous server
      await this.props.wallet.changeServer(currentServer);
      if (this.props.useWalletService) {
        await this.props.wallet.changeWsServer(currentWsServer);
      }
      this.setState({
        loading: false,
        errorMessage: e.message,
      });
    }
  }

  /**
   * Method called when user confirms that wants to connect to a testnet server and
   * we successfully validated that the user has written 'testnet' on the input
   * so we can execute the change
   */
  confirmTestnetServer = async () => {
    await this.props.wallet.changeServer(this.state.selectedServer);
    if (this.props.useWalletService) {
      await this.props.wallet.changeWsServer(this.state.selectedWsServer);
    }

    // Set network on config singleton so the load wallet will get it properly
    hathorLib.config.setNetwork(this.state.selectedNetwork);
    // Store on localStorage
    helpers.updateNetwork(this.state.selectedNetwork);
    this.context.hideModal();
    this.setState({
      loading: true,
    });
    this.executeServerChange();
  }

  /**
   * Execute server change checking server API and, in case of success
   * reloads data and redirects to wallet screen
   */
  executeServerChange = async () => {
    // We don't have PIN on hardware wallet
    const pin = LOCAL_STORE.isHardwareWallet() ? null : this.refs.pin.value;
    try {
      await wallet.changeServer(this.props.wallet, pin, this.props.history);
      this.props.history.push('/wallet/');
    } catch (err) {
      this.setState({
        loading: false,
        errorMessage: err.message,
      });
    }
  }

  /**
   * Update state if user wants to choose a new server or one of the default options
   *
   * @param {Object} e Event of checkbox change
   */
  handleCheckboxChange = (e) => {
    const value = e.target.checked;
    this.setState({ newServer: value });
    if (value) {
      $(this.refs.newServerWrapper).show(400);
    } else {
      $(this.refs.newServerWrapper).hide(400);
    }
  }

  /**
   * Update state of the selected base server
   *
   * @param {Object} e Event of select change
   */
  handleBaseURLSelectChange = (e) => {
    if (e.target.value === '') {
      return this.setState({
        selectedServer: '',
      });
    }

    if (this.props.useWalletService) {
      this.setState({ selectedServer: DEFAULT_WALLET_SERVICE_SERVERS[e.target.value] });
    } else {
      this.setState({ selectedServer: DEFAULT_SERVERS[e.target.value] });
    }
  }


  /**
   * Update state of the selected websocket server
   *
   * @param {Object} e Event of select change
   */
  handleWsURLSelectChange = (e) => {
    if (!this.props.useWalletService) {
      // should never happen
      return;
    }

    if (e.target.value === '') {
      return this.setState({
        selectedWsServer: '',
      });
    }

    this.setState({ selectedWsServer: DEFAULT_WALLET_SERVICE_WS_SERVERS[e.target.value] });
  }

  render() {
    const mapServerToOption = (servers) => servers.map((server, idx) => (
      <option key={idx} value={idx}>{server}</option>
    ));

    const renderServerOptions = () => {
      return this.props.useWalletService ?
        mapServerToOption(DEFAULT_WALLET_SERVICE_SERVERS) :
        mapServerToOption(DEFAULT_SERVERS);
    };

    const renderWsServerOptions = () => {
      if (!this.props.useWalletService) {
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
              { this.props.useWalletService && (
                  <p className="input-label">{t`Base server`}:</p>
                )
              }
              <select onChange={this.handleBaseURLSelectChange}>
                <option value=""> -- </option>
                {renderServerOptions()}
              </select>
            </div>
          </div>
          {
            this.props.useWalletService && (
              <div className="row mt-3">
                <div className="col-12">
                  <p className="input-label">{t`Real-time server`}:</p>
                  <select onChange={this.handleWsURLSelectChange}>
                    <option value=""> -- </option>
                    {renderWsServerOptions()}
                  </select>
                </div>
              </div>
            )
          }
          <div className="form-check checkbox-wrapper mt-3">
            <input className="form-check-input" type="checkbox" id="newServerCheckbox" onChange={this.handleCheckboxChange} />
            <label className="form-check-label" htmlFor="newServerCheckbox">
              {t`Select a new server`}
            </label>
          </div>
          <div ref="newServerWrapper" className="mt-3" style={{display: 'none'}}>
            { this.props.useWalletService && (
                <p className="input-label">{t`Base server`}:</p>
              )
            }
            <input type="text" placeholder={t`New server`} ref="newServer" className="form-control col-4" />

            { this.props.useWalletService && (
                <>
                  <p className="input-label">{t`Real-time server`}:</p>
                  <input type="text" placeholder={t`New real-time server`} ref="newWsServer" className="form-control col-4" />
                </>
              )
            }
          </div>
          {(!LOCAL_STORE.isHardwareWallet()) && <input required ref="pin" type="password" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off" placeholder={t`PIN`} className="form-control col-4 mt-3" />}
        </form>
        <div className="d-flex flex-row align-items-center mt-3">
          <button onClick={this.serverSelected} type="button" className="btn btn-hathor mr-3">{t`Connect to server`}</button>
          {this.state.loading && <ReactLoading type='spin' color={colors.purpleHathor} width={24} height={24} delay={200} />}
        </div>
        <p className="text-danger mt-3">{this.state.errorMessage}</p>
      </div>
    )
  }
}

export default connect(mapStateToProps)(Server);
