/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import createRequestInstance from '../api/axiosInstance';
import { connect } from 'react-redux';
import helpers from '../utils/helpers';


const mapStateToProps = (state) => {
  return {
    lastFailedRequest: state.lastFailedRequest,
    requestErrorMessage: state.requestErrorMessage,
  };
};


/**
 * Component that shows a modal when a request error happens. Gives the user the option to retry the request or change server
 *
 * @memberof Components
 */
class RequestErrorModal extends React.Component {
  constructor(props) {
    super(props);

    /**
     * retry {boolean} If user selected to retry the request
     */
    this.state = {
      retry: false
    };
  }

  componentDidMount = () => {
    $('#requestErrorModal').on('hidden.bs.modal', (e) => {
      if (this.state.retry) {
        // If modal is closing and user selected retry should get last request from Redux and try again
        this.modalHiddenRetry();
      }
    });
  }

  /**
   * User clicked to change server, then push to choose server screen
   */
  handleChangeServer = () => {
    $('#requestErrorModal').modal('hide');
    this.props.history.push('/server/');
  }

  /**
   * User clicked to retry request, then update the state, hide the modal and when hidden will try again
   */
  handleRetryRequest = () => {
    this.setState({ retry: true }, () => {
      $('#requestErrorModal').modal('hide');
    });
  }

  /**
   * When modal is hidden and user selected to retry we get data from last request from Redux and execute again
   */
  modalHiddenRetry = () => {
    let config = this.props.lastFailedRequest;
    let axios = createRequestInstance(config.resolve);
    helpers.fixAxiosConfig(axios, config);
    axios(config).then((response) => {
      config.resolve(response.data);
    });
    this.setState({ retry: false });
  }

  render() {
    return (
      <div className="modal fade" id="requestErrorModal" tabIndex="-1" role="dialog" aria-labelledby="requestErrorModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">Request failed</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <p>{this.props.requestErrorMessage}</p>
              <p>You are connected to <strong>{helpers.getServerURL()}</strong></p>
            </div>
            <div className="modal-footer">
              <button onClick={this.handleChangeServer} type="button" className="btn btn-secondary">Change server</button>
              <button onClick={this.handleRetryRequest} type="button" className="btn btn-hathor">Retry request</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(mapStateToProps)(RequestErrorModal);
