import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import logo from '../assets/images/hathor-white-logo.png';
import Version from './Version';
import ServerStatus from './ServerStatus';


/**
 * Component that shows a navigation bar with the menu options
 *
 * @memberof Components
 */
class Navigation extends React.Component {
  render() {
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
                <NavLink to="/wallet/" exact className="nav-link" activeClassName="active" activeStyle={{ fontWeight: 'bold' }}>Wallet</NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/wallet/send_tokens/" exact className="nav-link" activeClassName="active" activeStyle={{ fontWeight: 'bold' }}>Send tokens</NavLink>
              </li>
              <li className="nav-item">
                <NavLink to="/create_token/" exact className="nav-link" activeClassName="active" activeStyle={{ fontWeight: 'bold' }}>Create token</NavLink>
              </li>
              <li className="nav-item dropdown">
                <a href="true" className="nav-link dropdown-toggle" id="navbarDropdown" role="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">
                  Explorer
                </a>
                <div className="dropdown-menu" aria-labelledby="navbarDropdown">
                  <NavLink to="/dashboard-tx/" exact className="nav-link">Transactions</NavLink>
                  <NavLink to="/decode-tx/" exact className="nav-link">Decode Tx</NavLink>
                  <NavLink to="/push-tx/" exact className="nav-link">Push Tx</NavLink>
                </div>
              </li>
            </ul>
            <div className="navbar-right d-flex flex-row align-items-center navigation-search">
              <ServerStatus />
              <Version />
            </div>
          </div>
        </nav>
      </div>
    );
  }
};

export default Navigation;
