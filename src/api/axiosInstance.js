import { BASE_URL } from '../constants.js';
const axios = require('axios');

const createRequestInstance = () => {
  const defaultOptions = {
    baseURL: BASE_URL,
    headers: {
      'Content-Type': 'application/json',
    },
  }

  let instance = axios.create(defaultOptions);
  instance.interceptors.response.use((response) => {
    return response;
  }, (error) => {
    throw new Error(error);
  });
  return instance;
}

const requestInstance = createRequestInstance();

export default requestInstance;
