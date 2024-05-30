/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import store from '../store/index';
import { lastFailedRequest, updateRequestErrorStatusCode } from '../actions/index';
import $ from 'jquery';
import hathorLib from '@hathor/wallet-lib';
import url from 'url';

const URL_WHITELIST = [
  'graphviz/neighbours.dot',
  'transaction',
  'transaction_acc_weight',
];

/**
 * Create axios instance settings base URL and content type  
 * Besides that, it captures error to show modal error and save in Redux
 *
 * @module Axios
 */

/**
 * Create an axios instance to be used when sending requests
 *
 * @param {callback} resolve Callback to be stored and used in case of a retry after a fail
 * @param {number} timeout Timeout in milliseconds for the request
 */
const createRequestInstance = (resolve, timeout) => {
  const instance = hathorLib.axios.defaultCreateRequestInstance(resolve, timeout);

  instance.interceptors.response.use((response) => {
    return response;
  }, (error) => {
    const parsedUrl = url.parse(error.config.url);
    // URLs in this whitelist won't be handled by the
    // request error interceptor.
    if (URL_WHITELIST.indexOf(parsedUrl.pathname) > -1) {
      return;
    }

    // Update status code of the last failed request in redux
    // Adding conditional because if the server forgets to send back the CORS
    // headers, error.response will be undefined
    const statusCode = error.response ? error.response.status : -1;
    if (statusCode < 500) {
      // This request error is to handle problems in the server, so the user
      // can retry a request. So 404 and 400 errors shouldn't show the error modal
      return Promise.reject(error);
    }
    store.dispatch(updateRequestErrorStatusCode(statusCode));
    // Save request config in redux
    let config = error.config;
    config.resolve = resolve;
    store.dispatch(lastFailedRequest(error.config));
    $('#requestErrorModal').modal('show');
    return Promise.reject(error);
  });
  return instance;
}

export default createRequestInstance;
