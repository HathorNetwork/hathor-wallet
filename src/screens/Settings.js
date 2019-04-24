/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import wallet from '../utils/wallet';
import { Link } from 'react-router-dom';
import helpers from '../utils/helpers';
import ModalResetAllData from '../components/ModalResetAllData';
import $ from 'jquery';
import BackButton from '../components/BackButton';


/**
 * Settings screen
 *
 * @memberof Screens
 */
class Settings extends React.Component {

  /**
   * Method called when user confirmed the reset, then we reset all data and redirect to Welcome screen
   */
  handleReset = () => {
    $('#confirmResetModal').modal('hide');
    wallet.resetAllData();
    this.props.history.push('/welcome/');
  }

  /**
   * When user clicks Reset button we open a modal to confirm it
   */
  resetClicked = () => {
    $('#confirmResetModal').modal('show');
  }

  /**
   * When user clicks Add Passphrase button we redirect to Passphrase screen
   */
  addPassphrase = () => {
    this.props.history.push('/wallet/passphrase/');
  }

  /**
   * When user clicks Change Server button we redirect to Change Server screen
   */
  changeServer = () => {
    this.props.history.push('/server/');
  }

  render() {
    return (
      <div className="content-wrapper settings">
        <BackButton {...this.props} />
        <div>
          <p><strong>Server:</strong> You are connected to {helpers.getServerURL()}</p>
          <button className="btn btn-hathor" onClick={this.changeServer}>Change server</button>
        </div>
        <hr />
        <div>
          <h4>Advanced Settings</h4>
          <div className="d-flex flex-column align-items-start mt-4">
            <p><strong>Automatically report bugs to Hathor:</strong> {wallet.isSentryAllowed() ? <span>Yes</span> : <span>No</span>} <Link className='ml-3' to='/permission/'> Change </Link></p>
            <button className="btn btn-hathor" onClick={this.addPassphrase}>Set a passphrase</button>
            <button className="btn btn-hathor mt-4" onClick={this.resetClicked}>Reset all data</button>
          </div>
        </div>
        <ModalResetAllData success={this.handleReset} />
      </div>
    );
  }
}

export default Settings;
