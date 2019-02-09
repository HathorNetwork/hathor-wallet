import React from 'react';
import { connect } from 'react-redux';
import { MIN_API_VERSION } from '../constants';
import versionApi from '../api/version';
import helpers from '../utils/helpers';
import { isVersionAllowedUpdate } from "../actions/index";
import logo from '../assets/images/hathor-white-logo.png';
import Version from '../components/Version';


const mapDispatchToProps = dispatch => {
  return {
    isVersionAllowedUpdate: data => dispatch(isVersionAllowedUpdate(data)),
  };
};


class VersionError extends React.Component {
  versionUpdated = () => {
    versionApi.getVersion().then((data) => {
      this.props.isVersionAllowedUpdate({allowed: helpers.isVersionAllowed(data.version)});
    }, (e) => {
      // Error in request
      console.log(e);
    });
  }

  render() {
    return (
      <div>
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
          <button className="btn btn-primary" onClick={this.versionUpdated}>Try again</button>
        </div>
      </div>
    );
  }
}

export default connect(null, mapDispatchToProps)(VersionError);