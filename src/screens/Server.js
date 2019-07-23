/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import version from '../utils/version';
import wallet from '../utils/wallet';
import ReactLoading from 'react-loading';
import hathorLib from '@hathor/wallet-lib';


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
     */
    this.state = {
      newServer: false,
      errorMessage: '',
      selectedValue: '',
      loading: false,
    }
  }

  componentDidMount = () => {
    $('#requestErrorModal').on('hidden.bs.modal', (e) => {
      this.setState({ loading: false });
    });
  }

  /**
   * Called after user click the button to change the server  
   * Check if form is valid and then reload that from new server
   */
  serverSelected = () => {
    this.setState({ errorMessage: '' });
    if ((this.state.newServer && this.refs.newServer.value === '') || (!this.state.newServer && this.state.selectedValue === '')) {
      this.setState({ errorMessage: 'New server is not valid' });
      return;
    }
    let newServer = null;
    if (this.state.newServer) {
      newServer = this.refs.newServer.value;
    } else {
      newServer = this.state.selectedValue;
    }

    if (!hathorLib.wallet.isPinCorrect(this.refs.pin.value)) {
      this.setState({ errorMessage: 'Invalid PIN' });
      return;
    }

    this.setState({ loading: true, errorMessage: '' });
    // Update new server in local storage
    hathorLib.wallet.changeServer(newServer)
    const promise = version.checkApiVersion();
    promise.then(() => {
      wallet.reloadData();
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
   * Update state of the selected server
   *
   * @param {Object} e Event of select change
   */
  handleSelectChange = (e) => {
    this.setState({ selectedValue: hathorLib.constants.DEFAULT_SERVERS[e.target.value] });
  }

  render() {
    const renderServerOptions = () => {
      return hathorLib.constants.DEFAULT_SERVERS.map((server, idx) => {
        return (
          <option key={idx} value={idx}>{server}</option>
        );
      });
    }

    return (
      <div className="content-wrapper">
        <p><strong>Select one of the default servers to connect or choose a new one</strong></p>
        <form id="formSelectServer">
          <div className="row mt-3">
            <div className="col-12">
              <select onChange={this.handleSelectChange}>
                <option value=""> -- </option>
                {renderServerOptions()}
              </select>
            </div>
          </div>
          <div className="form-check checkbox-wrapper mt-3">
            <input className="form-check-input" type="checkbox" id="newServerCheckbox" onChange={this.handleCheckboxChange} />
            <label className="form-check-label" htmlFor="newServerCheckbox">
              Select a new server
            </label>
          </div>
          <div ref="newServerWrapper" className="mt-3" style={{display: 'none'}}>
            <input type="text" placeholder="New server" ref="newServer" className="form-control col-4" />
          </div>
          <input required ref="pin" type="password" pattern='[0-9]{6}' inputMode='numeric' autoComplete="off" placeholder="PIN" className="form-control col-4 mt-3" />
        </form>
        <div className="d-flex flex-row align-items-center mt-3">
          <button onClick={this.serverSelected} type="button" className="btn btn-hathor mr-3">Connect to server</button>
          {this.state.loading && <ReactLoading type='spin' color='#0081af' width={24} height={24} delay={200} />}
        </div>
        <p className="text-danger mt-3">{this.state.errorMessage}</p>
      </div>
    )
  }
}

export default Server;
