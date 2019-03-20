import { GENESIS_BLOCK, GENESIS_TX, DECIMAL_PLACES, DEFAULT_SERVER } from '../constants';
import path from 'path';

/*
 * Helper methods
 *
 * @namespace Helpers
 */

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
    const fixedPlaces = (value/10**DECIMAL_PLACES).toFixed(DECIMAL_PLACES);
    const integerPart = fixedPlaces.split('.')[0];
    const decimalPart = fixedPlaces.split('.')[1];
    const integerFormated = new Intl.NumberFormat('en-US').format(Math.abs(integerPart));
    const signal = value < 0 ? '-' : '';
    return `${signal}${integerFormated}.${decimalPart}`;
  },

  isVersionAllowed(version, minVersion) {
    // Verifies if the version in parameter is allowed to make requests to other min version
    if (version.includes('beta') !== minVersion.includes('beta')) {
      // If one version is beta and the other is not, it's not allowed to use it
      return false;
    }

    // Clean the version string to have an array of integers
    // Check for each value if the version is allowed
    let versionTestArr = this.getCleanVersionArray(version);
    let minVersionArr = this.getCleanVersionArray(minVersion);
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

  getServerURL() {
    let server = localStorage.getItem('wallet:server');
    if (server === null) {
      server = DEFAULT_SERVER;
    }
    return server;
  },

  getWSServerURL() {
    let serverURL = this.getServerURL();
    const pieces = serverURL.split(':');
    const firstPiece = pieces.splice(0, 1);
    let protocol = '';
    if (firstPiece[0].indexOf('s') > -1) {
      // Has ssl
      protocol = 'wss';
    } else {
      // No ssl
      protocol = 'ws';
    }
    serverURL = path.join(`${protocol}:${pieces.join(':')}`, 'ws/');
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
  },

  /*
   * Returns the right string depending on the quantity (plural or singular)
   *
   * @param {number} quantity Value considered to check plural or singular
   * @param {string} singular String to be returned in case of singular
   * @param {string} plural String to be returned in case of plural
   *
   * @return {string} plural or singular
   * @memberof Helpers
   * @inner
   *
   */
  plural(quantity, singular, plural) {
    if (quantity === 1) {
      return singular;
    } else {
      return plural;
    }
  },

  /*
   * Return the count of element inside the array
   *
   * @param {Array} array The array where the element is
   * @param {*} element The element that will be counted how many time appears in the array
   *
   * @return {number} count of the element inside the array
   * @memberof Helpers
   * @inner
   */
  elementCount(array, element) {
    let count = 0;
    for (const el of array) {
      if (el === element) {
        count++;
      }
    }
    return count;
  },

  minimumAmount() {
    return 1 / (10**DECIMAL_PLACES);
  }
}

export default helpers;
