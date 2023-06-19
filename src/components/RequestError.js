/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import createRequestInstance from '../api/axiosInstance';
import SpanFmt from './SpanFmt';
import { connect } from 'react-redux';
import hathorLib from '@hathor/wallet-lib';
import wallet from '../utils/wallet';


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
   * Check if the request error was an address history request
   *
   * @return {boolean} true if was address history request, false otherwise
   */
  isAddressHistoryRequest = () => {
    const addressHistoryURL = 'thin_wallet/address_history';

    if (this.props.lastFailedRequest && addressHistoryURL === this.props.lastFailedRequest.url) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * When modal is hidden and user selected to retry we get data from last request from Redux and execute again
   */
  modalHiddenRetry = () => {
    if (this.isAddressHistoryRequest()) {
      // The address history request is different from the others, so the retry does not work
      // it's paginated with async/await and does not use promise resolve/reject like the others
      // We already have an issue on the lib to track this (https://github.com/HathorNetwork/hathor-wallet-lib/issues/59)
      // So we handle here this retry manually with a reload (like the one when the connection is lost)
      wallet.reloadData();
    } else {
      let config = this.props.lastFailedRequest;
      let axios = createRequestInstance(config.resolve);
      hathorLib.helpersUtils.fixAxiosConfig(axios, config);
      axios(config).then((response) => {
        config.resolve(response.data);
      });
    }
    this.setState({ retry: false });
  }

  /**
   * Returns the string to be shown as error message depending on the status code
   */
  getErrorMessage = () => {
    if (this.isAddressHistoryRequest()) {
      return t`There was an error fetching your transactions from the server.\nThis might be caused by some reasons: (i) the server may be fully loaded, or (ii) you could be having internet problems.\n\nWe advise you to wait a few seconds and retry your request.`;
    } else {
      if (this.props.requestErrorStatusCode === 503 || this.props.requestErrorStatusCode === 429) {
        return t`Rate limit exceeded. Sorry about that. You should wait a few seconds and try again. What do you want to do?`;
      } else {
        return t`Your request failed to reach the server. What do you want to do?`;
      }
    }
  }

  /**
   * Returns the advanced message htmk
   */
  getAdvancedMessage = () => {
    if (this.props.lastFailedRequest === undefined) return null;
    return (
      <div>
        <p><strong>{t`URL:`} </strong>{this.props.lastFailedRequest.url}</p>
        <p><strong>{t`Method:`} </strong>{this.props.lastFailedRequest.method}</p>
        <p><strong>{t`Response status code:`} </strong>{this.props.requestErrorStatusCode}</p>
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
    const serverURL = hathorLib.config.getServerUrl();
    return (
      <div className="modal fade" id="requestErrorModal" tabIndex="-1" role="dialog" aria-labelledby="requestErrorModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">{t`Request failed`}</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <p className="white-space-pre-wrap">{this.getErrorMessage()}</p>
              <p><SpanFmt>{t`You are connected to **${serverURL}**`}</SpanFmt></p>
              <a onClick={(e) => this.showAdvanced(e)} ref="showAdvancedLink" href="true">{t`Show advanced data`}</a>
              <a onClick={(e) => this.hideAdvanced(e)} ref="hideAdvancedLink" href="true" style={{display: 'none'}}>{t`Hide advanced data`}</a>
              <div ref="advancedData" className="mt-3" style={{display: 'none'}}>{this.getAdvancedMessage()}</div>
            </div>
            <div className="modal-footer">
              <button onClick={this.handleChangeServer} type="button" className="btn btn-secondary">{t`Change server`}</button>
              <button onClick={this.handleRetryRequest} type="button" className="btn btn-hathor">{t`Retry request`}</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(mapStateToProps)(RequestErrorModal);
