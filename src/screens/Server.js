/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import SpanFmt from '../components/SpanFmt';
import $ from 'jquery';
import version from '../utils/version';
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
import ModalAlert from '../components/ModalAlert';
import { connect } from "react-redux";

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
  constructor(props) {
    super(props);

    /**
     * errorMessage {string} Message to be shown in case of error in form
     * loading {boolean} If should show spinner while waiting for server response
     * newServer {boolean} If user selected checkbox that he wants to set a new server
     * selectedValue {string} Server selected from the user
     * selectedServer {string} Server that the user wants to connect
     * testnetError {string} Message to be shown in case of error when changing to a testnet server.
     */
    this.state = {
      newServer: false,
      errorMessage: '',
      selectedValue: '',
      loading: false,
      selectedServer: '',
      testnetError: '',
    }
  }

  componentDidMount = () => {
    $('#requestErrorModal').on('hidden.bs.modal', (e) => {
      this.setState({ loading: false });
    });

    $('#alertModal').on('hidden.bs.modal', (e) => {
      this.setState({ testnetError: '' });
      this.refs.testnetTest.value = '';
    });
  }

  /**
   * Called after user click the button to change the server  
   * Check if form is valid and then reload that from new server
   */
  serverSelected = async () => {
    this.setState({ errorMessage: '' });

    if ((this.state.newServer && this.refs.newServer.value === '') || (!this.state.newServer && this.state.selectedValue === '')) {
      this.setState({ errorMessage: t`New server is not valid` });
      return;
    }
    let newServer = null;
    if (this.state.newServer) {
      newServer = this.refs.newServer.value;
    } else {
      newServer = this.state.selectedValue;
    }

    // we don't ask for the pin on the hardware wallet
    if (hathorLib.wallet.isSoftwareWallet() && !hathorLib.wallet.isPinCorrect(this.refs.pin.value)) {
      this.setState({ errorMessage: t`Invalid PIN` });
      return;
    }

    this.setState({ loading: true, errorMessage: '', selectedServer: newServer });
    const currentServer = this.props.useWalletService ?
      hathorLib.config.getWalletServiceBaseUrl() : 
      hathorLib.config.getServerUrl();

    // Update new server in storage and in the config singleton
    this.props.wallet.changeServer(newServer);

    try {
      const versionData = await this.props.wallet.getVersionData();
      if (versionData.network !== 'mainnet') {
        // Go back to the previous server
        // If the user decides to continue with this change, we will update again
        this.props.wallet.changeServer(currentServer);
        $('#alertModal').modal('show');
      } else {
        this.executeServerChange();
      }
    } catch (e) {
      // Go back to the previous server
      this.props.wallet.changeServer(currentServer);
      this.setState({ loading: false });
    }
  }

  /**
   * Method called when user confirms that wants to connect to a testnet server
   * Validate that the user has written 'testnet' on the input and then execute the change
   */
  confirmTestnetServer = () => {
    if (this.refs.testnetTest.value.toLowerCase() !== 'testnet') {
      this.setState({ testnetError: t`Invalid value.` });
      return;
    }
    hathorLib.wallet.changeServer(this.state.selectedServer);
    $('#alertModal').on('hidden.bs.modal', (e) => {
      this.setState({ loading: true });
      this.executeServerChange();
    });
    $('#alertModal').modal('hide');
  }

  /**
   * Execute server change checking server API and, in case of success
   * reloads data and redirects to wallet screen
   */
  executeServerChange = () => {
    // We don't have PIN on hardware wallet
    const pin = hathorLib.wallet.isSoftwareWallet() ? this.refs.pin.value : null;
    const promise = wallet.changeServer(this.props.wallet, pin, this.props.history);
    promise.then(() => {
      this.props.history.push('/wallet/');
    }, () => {
      this.setState({ loading: false });
    });
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
    if (this.props.useWalletService) {
      this.setState({ selectedBaseServer: DEFAULT_WALLET_SERVICE_SERVERS[e.target.value] });
    } else {
      this.setState({ selectedBaseServer: DEFAULT_SERVERS[e.target.value] });
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

    this.setState({ selectedBaseServer: DEFAULT_WALLET_SERVICE_WS_SERVERS[e.target.value] });
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

    const renderConfirmBody = () => {
      return (
        <div>
          <p><SpanFmt>{t`The selected server connects you to a testnet. Beware if someone asked you to do it, the **tokens from testnet have no value**. Only continue if you know what you are doing.`}</SpanFmt></p>
          <p>{t`To continue with the server change you must type 'testnet' in the box below and click on 'Connect to testnet' button.`}</p>
          <div ref="testnetWrapper" className="mt-2 d-flex flex-row align-items-center">
            <input type="text" ref="testnetTest" className="form-control col-4" />
            <span className="text-danger ml-2">{this.state.testnetError}</span>
          </div>
        </div>
      );
    }

    const renderSecondaryModalButton = () => {
      return (
        <button onClick={this.confirmTestnetServer} type="button" className="btn btn-secondary">{t`Connect to testnet`}</button>
      );
    }

    return (
      <div className="content-wrapper">
        <p><strong>{t`Select one of the default servers to connect or choose a new one`}</strong></p>
        <form onSubmit={e => { e.preventDefault(); }}>
          <div className="row mt-3">
            <div className="col-12">
              { this.props.useWalletService && (
                  <span>
                    <p>{t`Base server`}:</p>
                  </span>
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
                  { this.props.useWalletService && (
                      <span>
                        <p>{t`Real-time server`}:</p>
                      </span>
                    )
                  }
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
            <input type="text" placeholder={t`New server`} ref="newServer" className="form-control col-4" />
          </div>
          {hathorLib.wallet.isSoftwareWallet() && <input required ref="pin" type="password" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off" placeholder={t`PIN`} className="form-control col-4 mt-3" />}
        </form>
        <div className="d-flex flex-row align-items-center mt-3">
          <button onClick={this.serverSelected} type="button" className="btn btn-hathor mr-3">{t`Connect to server`}</button>
          {this.state.loading && <ReactLoading type='spin' color={colors.purpleHathor} width={24} height={24} delay={200} />}
        </div>
        <p className="text-danger mt-3">{this.state.errorMessage}</p>
        <ModalAlert title={t`Confirm testnet server`} body={renderConfirmBody()} buttonName={t`Cancel change`} handleButton={() => $('#alertModal').modal('hide')} secondaryButton={renderSecondaryModalButton()} />
      </div>
    )
  }
}

export default connect(mapStateToProps)(Server);
