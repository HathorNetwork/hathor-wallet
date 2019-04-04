import React from 'react';
import { MIN_API_VERSION } from '../constants';
import version from '../utils/version';
import logo from '../assets/images/hathor-white-logo.png';
import Version from '../components/Version';


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
          <p>Your API backend version is not compatible with this admin. We expect at least the version {MIN_API_VERSION}</p>
          <p>Please update you API version and try again</p>
          <button className="btn btn-hathor" onClick={this.versionUpdated}>Try again</button>
          <button className="btn btn-hathor ml-3" onClick={this.changeServer}>Change Server</button>
        </div>
      </div>
    );
  }
}

export default VersionError;