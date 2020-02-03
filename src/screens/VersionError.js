/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';

import version from '../utils/version';
import logo from '../assets/images/hathor-white-logo.png';
import Version from '../components/Version';
import hathorLib from '@hathor/wallet-lib';


/**
 * Screen that appears when the API version of the connected server is not valid
 *
 * @memberof Screens
 */
class VersionError extends React.Component {
  /**
   * Called when user clicks to Try Again, then check the API version again
   */
  versionUpdated = () => {
    version.checkApiVersion();
  }

  /**
   * Called when user clicks to Change Server, then redirects to change server screen
   */
  changeServer = () => {
    this.props.history.push('/server/');
  }

  render() {
    const min_api_version = hathorLib.constants.MIN_API_VERSION;
    return (
      <div className="component-div">
        <div className="main-nav">
          <nav className="navbar navbar-expand-lg navbar-dark">
            <div className="d-flex flex-column align-items-center navbar-brand">
              <img src={logo} alt="" />
            </div>
            <div className="collapse navbar-collapse d-flex flex-column align-items-end" id="navbarSupportedContent">
              <div>
                <Version />
              </div>
            </div>
          </nav>
        </div>
        <div className="content-wrapper">
          <p>{t`Your API backend version is not compatible with this admin. We expect at least version `}{min_api_version}</p>
          <p>{t`Please update you API version and try again`}</p>
          <button className="btn btn-hathor" onClick={this.versionUpdated}>{t`Try again`}</button>
          <button className="btn btn-hathor ml-3" onClick={this.changeServer}>{t`Change Server`}</button>
        </div>
      </div>
    );
  }
}

export default VersionError;
