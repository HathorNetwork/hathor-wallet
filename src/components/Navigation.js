/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { t } from 'ttag';
import logo from '../assets/images/hathor-white-logo.png';
import Version from './Version';
import ServerStatus from './ServerStatus';
import helpers from '../utils/helpers';
import { useSelector } from 'react-redux';

/**
 * Component that shows a navigation bar with the menu options
 *
 * @memberof Components
 */
function Navigation() {
  const useAtomicSwap = useSelector(state => state.useAtomicSwap);
  const fullNodeVersionData = useSelector(state => state.fullNodeVersionData);

  /**
   * Method called when user clicked on Explorer menu
   *
   * @param {Object} e Event for the click
   */
  const goToExplorer = (e) => {
    e.preventDefault();
    helpers.openExternalURL(helpers.getExplorerURL());
  }

  const renderNCNavigation = () => {
    if (fullNodeVersionData.capabilities && fullNodeVersionData.capabilities.indexOf('nano-contract') > -1) {
      return (
        <li className="nav-item">
          <NavLink to="/nano_contract/" exact className="nav-link" activeClassName="active" activeStyle={{ fontWeight: 'bold' }}>{t`Nano Contract`}</NavLink>
        </li>
      );
    }

    return null;
  }

  return (
    <div className="main-nav">
      <nav className="navbar navbar-expand-lg navbar-dark">
        <div className="d-flex flex-column align-items-center">
          <Link className="navbar-brand" to="/wallet/" href="/wallet/">
            <img src={logo} alt="" />
          </Link>
        </div>
        <button className="navbar-toggler" type="button" data-toggle="collapse" data-target="#navbarSupportedContent" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="Toggle navigation">
          <span className="navbar-toggler-icon" />
        </button>
        <div className="collapse navbar-collapse" id="navbarSupportedContent">
          <ul className="navbar-nav mr-auto">
            <li className="nav-item">
              <NavLink to="/wallet/" exact className="nav-link" activeClassName="active" activeStyle={{ fontWeight: 'bold' }}>{t`Wallet`}</NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/wallet/send_tokens/" exact className="nav-link" activeClassName="active" activeStyle={{ fontWeight: 'bold' }}>{t`Send tokens`}</NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/custom_tokens/" exact className="nav-link" activeClassName="active" activeStyle={{ fontWeight: 'bold' }}>{t`Custom tokens`}</NavLink>
            </li>
            <li className="nav-item">
              <NavLink to="/nft/" exact className="nav-link" activeClassName="active" activeStyle={{ fontWeight: 'bold' }}>{t`NFTs`}</NavLink>
            </li>
            {useAtomicSwap && <li className="nav-item">
              <NavLink to="/wallet/atomic_swap/" exact className="nav-link" activeClassName="active" activeStyle={{ fontWeight: 'bold' }}>{t`Atomic Swap`}</NavLink>
            </li>}
            <li className="nav-item">
              <a className="nav-link" href="true" onClick={goToExplorer}>{t`Public Explorer`}</a>
            </li>
            {renderNCNavigation()}
          </ul>
          <div className="navbar-right d-flex flex-row align-items-center navigation-search">
            <ServerStatus />
            <Version />
          </div>
        </div>
      </nav>
    </div>
  );
};

export default Navigation;
