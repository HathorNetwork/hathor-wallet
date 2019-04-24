/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import helpers from '../utils/helpers';
import axios from 'axios';
import store from '../store/index';
import { TIMEOUT } from '../constants';
import { lastFailedRequest } from '../actions/index';
import $ from 'jquery';

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
  if (timeout === undefined) {
    timeout = TIMEOUT;
  }
  const defaultOptions = {
    baseURL: helpers.getServerURL(),
    timeout: timeout,
    headers: {
      'Content-Type': 'application/json',
    },
  }

  let instance = axios.create(defaultOptions);
  instance.interceptors.response.use((response) => {
    return response;
  }, (error) => {
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
