/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useRef, useEffect } from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import createRequestInstance from '../api/axiosInstance';
import SpanFmt from './SpanFmt';
import { useDispatch, useSelector } from 'react-redux';
import hathorLib from '@hathor/wallet-lib';

/**
 * DOM Identifier for the modal
 * @type {string}
 */
const MODAL_DOM_ID = '#requestErrorModal';

/**
 * Component that shows a modal when a request error happens. Gives the user the option to retry the request or change server
 *
 * @memberof Components
 */
function RequestErrorModal({ lastFailedRequest, requestErrorStatusCode, onClose, onChangeServer }) {
  const dispatch = useDispatch();
  const modalRef = useRef();
  const [showAdvancedData, setShowAdvancedData] = React.useState(false);

  useEffect(() => {
    $(modalRef.current).modal('show');
  }, []);

  /**
   * User clicked to change server, then push to choose server screen
   */
  const handleChangeServer = () => {
    $(modalRef.current).modal('hide');
    if (onClose) onClose();
    if (onChangeServer) {
      onChangeServer();
    } else {
      window.location.hash = '#/network_settings_recovery';
    }
  }

  /**
   * User clicked to retry request: hide the modal and try again
   */
  const handleRetryRequest = () => {
    $(modalRef.current).modal('hide');
    if (onClose) onClose();
    modalHiddenRetry();
  }

  /**
   * Check if the request error was an address history request
   *
   * @return {boolean} true if was address history request, false otherwise
   */
  const isAddressHistoryRequest = () => {
    const addressHistoryURL = 'thin_wallet/address_history';

    if (lastFailedRequest && addressHistoryURL === lastFailedRequest.url) {
      return true;
    } else {
      return false;
    }
  }

  /**
   * When modal is hidden and user selected to retry we get data from last request from Redux and execute again
   */
  const modalHiddenRetry = () => {
    if (isAddressHistoryRequest()) {
      // The address history request is different from the others, so the retry does not work
      // it's paginated with async/await and does not use promise resolve/reject like the others
      // We already have an issue on the lib to track this (https://github.com/HathorNetwork/hathor-wallet-lib/issues/59)
      // So we handle here this retry manually with a reload (like the one when the connection is lost)
      dispatch({ type: 'WALLET_RELOADING' });
    } else {
      const config = lastFailedRequest;
      const axios = createRequestInstance(config.resolve);
      hathorLib.helpersUtils.fixAxiosConfig(axios, config);
      axios(config).then((response) => {
        config.resolve(response.data);
      });
    }
  }

  /**
   * Returns the string to be shown as error message depending on the status code
   */
  const getErrorMessage = () => {
    if (isAddressHistoryRequest()) {
      return t`There was an error fetching your transactions from the server.\nThis might be caused by some reasons: (i) the server may be fully loaded, or (ii) you could be having internet problems.\n\nWe advise you to wait a few seconds and retry your request.`;
    } else {
      if (requestErrorStatusCode === 503 || requestErrorStatusCode === 429) {
        return t`Rate limit exceeded. Sorry about that. You should wait a few seconds and try again. What do you want to do?`;
      } else {
        return t`Your request failed to reach the server. What do you want to do?`;
      }
    }
  }

  /**
   * Returns the advanced message htmk
   */
  const getAdvancedMessage = () => {
    if (lastFailedRequest === undefined) return null;
    return (
      <div>
        <p><strong>{t`URL:`} </strong>{lastFailedRequest.url}</p>
        <p><strong>{t`Method:`} </strong>{lastFailedRequest.method}</p>
        <p><strong>{t`Response status code:`} </strong>{requestErrorStatusCode}</p>
      </div>
    );
  }

  /**
   * Triggered when user clicks to show advanced data
   *
   * @param {Object} e Event emitted by the click
   */
  const showAdvanced = (e) => {
    e.preventDefault();
    setShowAdvancedData(true);
  }

  /**
   * Triggered when user clicks to hide advanced data
   *
   * @param {Object} e Event emitted by the click
   */
  const hideAdvanced = (e) => {
    e.preventDefault();
    setShowAdvancedData(false);
  }

  const serverURL = hathorLib.config.getServerUrl();

  return (
    <div ref={modalRef} className="modal fade" id="requestErrorModal" tabIndex="-1" role="dialog" aria-labelledby="requestErrorModal" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="exampleModalLabel">{t`Request failed`}</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={onClose}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <p className="white-space-pre-wrap">{getErrorMessage()}</p>
            <p><SpanFmt>{t`You are connected to **${serverURL}**`}</SpanFmt></p>
            {!showAdvancedData && <a onClick={showAdvanced} href="true">{t`Show advanced data`}</a>}
            {showAdvancedData && <a onClick={hideAdvanced} href="true">{t`Hide advanced data`}</a>}
            {showAdvancedData && <div className="mt-3">{getAdvancedMessage()}</div>}
          </div>
          <div className="modal-footer">
            <button onClick={handleChangeServer} type="button" className="btn btn-secondary">{t`Change server`}</button>
            <button onClick={handleRetryRequest} type="button" className="btn btn-hathor">{t`Retry request`}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RequestErrorModal;
