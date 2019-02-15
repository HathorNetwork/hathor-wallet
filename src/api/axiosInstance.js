import helpers from '../utils/helpers';
import axios from 'axios';
import store from '../store/index';
import { lastFailedRequest } from '../actions/index';
import $ from 'jquery';

const createRequestInstance = (resolve) => {
  const defaultOptions = {
    baseURL: helpers.getServerURL(),
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
