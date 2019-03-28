import React from 'react';
import wallet from '../utils/wallet';
import helpers from '../utils/helpers';
import ModalResetAllData from '../components/ModalResetAllData';
import $ from 'jquery';
import BackButton from '../components/BackButton';


class Settings extends React.Component {
  handleReset = () => {
    $('#confirmResetModal').modal('hide');
    wallet.resetAllData();
    this.props.history.push('/welcome/');
  }

  resetClicked = () => {
    $('#confirmResetModal').modal('show');
  }

  addPassphrase = () => {
    this.props.history.push('/wallet/passphrase/');
  }

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
            <button className="btn btn-hathor" onClick={this.addPassphrase}>Add passphrase</button>
            <button className="btn btn-hathor mt-4" onClick={this.resetClicked}>Reset all data</button>
          </div>
        </div>
        <ModalResetAllData success={this.handleReset} />
      </div>
    );
  }
}

export default Settings;