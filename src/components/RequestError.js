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
import hathorLib from '@hathor/wallet-lib';


const mapStateToProps = (state) => {
  return {
    lastFailedRequest: state.lastFailedRequest,
    requestErrorStatusCode: state.requestErrorStatusCode,
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

  componentWillUnmount = () => {
    // When unmounting this modal, we should hide it before
    $('#requestErrorModal').modal('hide');
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
    hathorLib.helpers.fixAxiosConfig(axios, config);
    axios(config).then((response) => {
      config.resolve(response.data);
    });
    this.setState({ retry: false });
  }

  /**
   * Returns the string to be shown as error message depending on the status code
   */
  getErrorMessage = () => {
    if (this.props.requestErrorStatusCode === 503 || this.props.requestErrorStatusCode === 429) {
      return 'Rate limit exceeded. Sorry about that. You should wait a few seconds and try again. What do you want to do?';
    } else {
      return 'Your request failed to reach the server. What do you want to do?';
    }
  }

  /**
   * Returns the advanced message htmk
   */
  getAdvancedMessage = () => {
    if (this.props.lastFailedRequest === undefined) return null;
    return (
      <div>
        <p><strong>URL: </strong>{this.props.lastFailedRequest.url}</p>
        <p><strong>Method: </strong>{this.props.lastFailedRequest.method}</p>
        <p><strong>Response status code: </strong>{this.props.requestErrorStatusCode}</p>
      </div>
    );
  }

  /**
   * Triggered when user clicks to show advanced data
   *
   * @param {Object} e Event emitted by the click
   */
  showAdvanced = (e) => {
    e.preventDefault();
    $(this.refs.advancedData).show(300);
    $(this.refs.showAdvancedLink).hide();
    $(this.refs.hideAdvancedLink).show();
  }

  /**
   * Triggered when user clicks to hide advanced data
   *
   * @param {Object} e Event emitted by the click
   */
  hideAdvanced = (e) => {
    e.preventDefault();
    $(this.refs.advancedData).hide(300);
    $(this.refs.hideAdvancedLink).hide();
    $(this.refs.showAdvancedLink).show();
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
              <p>{this.getErrorMessage()}</p>
              <p>You are connected to <strong>{hathorLib.helpers.getServerURL()}</strong></p>
              <a onClick={(e) => this.showAdvanced(e)} ref="showAdvancedLink" href="true">Show advanced data</a>
              <a onClick={(e) => this.hideAdvanced(e)} ref="hideAdvancedLink" href="true" style={{display: 'none'}}>Hide advanced data</a>
              <div ref="advancedData" className="mt-3" style={{display: 'none'}}>{this.getAdvancedMessage()}</div>
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
