/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import wallet from '../utils/wallet';
import { Link } from 'react-router-dom';
import ModalConfirm from '../components/ModalConfirm';
import ModalResetAllData from '../components/ModalResetAllData';
import $ from 'jquery';
import BackButton from '../components/BackButton';
import hathorLib from '@hathor/wallet-lib';


/**
 * Settings screen
 *
 * @memberof Screens
 */
class Settings extends React.Component {
  /**
   * confirmData {Object} data for the notification confirm modal (title, body and handleYes)
   * isNotificationOne {boolean} state to update if notification is turned on or off
   */
  state = { confirmData: {}, isNotificationOn: null }

  componentDidMount() {
    this.setState({ isNotificationOn: wallet.isNotificationOn() });
  }

  /**
   * Method called when user confirmed the reset, then we reset all data and redirect to Welcome screen
   */
  handleReset = () => {
    $('#confirmResetModal').modal('hide');
    wallet.resetWalletData();
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

  /**
   * Called when user clicks to change notification settings  
   * Sets modal state, depending on the current settings and open it
   *
   * @param {Object} e Event emitted on link click
   */
  toggleNotificationSettings = (e) => {
    e.preventDefault();
    if (wallet.isNotificationOn()) {
      this.setState({
        confirmData: {
          title: t`Turn notifications off`,
          body: t`Are you sure you don't want to receive wallet notifications?`,
          handleYes: this.handleToggleNotificationSettings
        }
      });
    } else {
      this.setState({
        confirmData: {
          title: t`Turn notifications on`,
          body: t`Are you sure you want to receive wallet notifications?`,
          handleYes: this.handleToggleNotificationSettings
        }
      });
    }
    $('#confirmModal').modal('show');
  }

  /**
   * Called after user confirms the notification toggle action  
   * Toggle user notification settings, update screen state and close the confirm modal
   */
  handleToggleNotificationSettings = () => {
    if (wallet.isNotificationOn()) {
      wallet.turnNotificationOff();
    } else {
      wallet.turnNotificationOn();
    }
    this.setState({ isNotificationOn: wallet.isNotificationOn() });
    $('#confirmModal').modal('hide');
  }



  render() {
    const serverURL = hathorLib.helpers.getServerURL();
    return (
      <div className="content-wrapper settings">
        <BackButton {...this.props} />
        <div>
          <p>{t`<strong>Server:</strong> You are connected to ${serverURL}`}</p>
          <button className="btn btn-hathor" onClick={this.changeServer}>{t`Change server`}</button>
        </div>
        <hr />
        <div>
          <h4>{t`Advanced Settings`}</h4>
          <div className="d-flex flex-column align-items-start mt-4">
            <p><strong>{t`Allow notifications:`}</strong> {this.state.isNotificationOn ? <span>{t`Yes`}</span> : <span>{t`No`}</span>} <a className='ml-3' href="true" onClick={this.toggleNotificationSettings}> {t`Change`} </a></p>
            <p><strong>{t`Automatically report bugs to Hathor:`}</strong> {wallet.isSentryAllowed() ? <span>{t`Yes`}</span> : <span>{t`No`}</span>} <Link className='ml-3' to='/permission/'> {t`Change`} </Link></p>
            <button className="btn btn-hathor" onClick={this.addPassphrase}>{t`Set a passphrase`}</button>
            <button className="btn btn-hathor mt-4" onClick={this.resetClicked}>{t`Reset all data`}</button>
          </div>
        </div>
        <ModalResetAllData success={this.handleReset} />
        <ModalConfirm title={this.state.confirmData.title} body={this.state.confirmData.body} handleYes={this.state.confirmData.handleYes} />
      </div>
    );
  }
}

export default Settings;
