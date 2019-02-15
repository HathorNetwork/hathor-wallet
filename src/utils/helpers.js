import { GENESIS_BLOCK, GENESIS_TX, DECIMAL_PLACES, MIN_API_VERSION } from '../constants';
import path from 'path';

const helpers = {
  updateListWs(list, newEl, max) {
    // We remove the last element if we already have the max
    if (list.length === max) {
      list.pop();
    }
    // Then we add the new on in the first position
    list.splice(0, 0, newEl);
    return list;
  },

  getTxType(tx) {
    if (GENESIS_TX.indexOf(tx.hash) > -1) {
      return 'Tx';
    } else if (GENESIS_BLOCK.indexOf(tx.hash) > -1) {
      return 'Block';
    } else {
      if (tx.inputs.length > 0) {
        return 'Tx';
      } else {
        return 'Block';
      }
    }
  },

  roundFloat(n) {
    return Math.round(n*100)/100
  },

  prettyValue(value) {
    return (value/10**DECIMAL_PLACES).toFixed(DECIMAL_PLACES);
  },

  isVersionAllowed(version) {
    // Verifies if the version in parameter is allowed to make requests to the API backend
    // We check with our min api version
    if (version.includes('beta') !== MIN_API_VERSION.includes('beta')) {
      // If one version is beta and the other is not, it's not allowed to use it
      return false;
    }

    // Clean the version string to have an array of integers
    // Check for each value if the version is allowed
    let versionTestArr = this.getCleanVersionArray(version);
    let minVersionArr = this.getCleanVersionArray(MIN_API_VERSION);
    for (let i=0; i<minVersionArr.length; i++) {
      if (minVersionArr[i] > versionTestArr[i]) {
        return false;
      } else if (minVersionArr[i] < versionTestArr[i]) {
        return true;
      }
    }

    return true;
  },

  getCleanVersionArray(version) {
    return version.replace(/[^\d.]/g, '').split('.');
  },

  isServerChosen() {
    return this.getServerURL() !== null;
  },

  getServerURL() {
    return localStorage.getItem('wallet:server');
  },

  getWSServerURL() {
    let serverURL = localStorage.getItem('wallet:server');
    if (serverURL) {
      let pieces = serverURL.split(':');
      let firstPiece = pieces.splice(0, 1);
      let protocol = '';
      if (firstPiece[0].indexOf('s') > -1) {
        // Has ssl
        protocol = 'wss';
      } else {
        // No ssl
        protocol = 'ws';
      }
      serverURL = path.join(`${protocol}:${pieces.join(':')}`, 'ws/');
    }
    return serverURL;
  },

  fixAxiosConfig(axios, config) {
    // Axios fails merging this configuration to the default configuration because it has an issue
    // with circular structures: https://github.com/mzabriskie/axios/issues/370
    // Got it from https://github.com/softonic/axios-retry/blob/master/es/index.js#L203
    if (axios.defaults.agent === config.agent) {
      delete config.agent;
    }
    if (axios.defaults.httpAgent === config.httpAgent) {
      delete config.httpAgent;
    }
    if (axios.defaults.httpsAgent === config.httpsAgent) {
      delete config.httpsAgent;
    }

    config.transformRequest = [data => data];
  }
}

export default helpers;
