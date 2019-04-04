import createRequestInstance from './axiosInstance';

/**
 * Api calls for transaction
 *
 * @namespace ApiTransaction
 */

const txApi = {
  /**
   * Call get transaction API with data passed as parameter
   *
   * @param {Object} data Data to be sent in the request
   * @param {function} resolve Method to be called after response arrives
   *
   * @return {Promise}
   * @memberof ApiTransaction
   * @inner
   */
  getTransactionBase(data, resolve) {
    return createRequestInstance(resolve).get(`transaction`, {params: data}).then((res) => {
      resolve(res.data);
    }, (res) => {
      return Promise.reject(res);
    });
  },

  /**
   * Call api to get many transactions
   *
   * @param {string} type 'block' or 'tx' (if we are getting txs or blocks)
   * @param {number} count How many objects we want
   * @param {number} timestamp (optional) timestamp reference for the pagination (works together with 'page' parameter)
   * @param {string} hash (optional)  hash reference for the pagination (works together with 'page' parameter)
   * @param {string} page (optional) 'previous' or 'next': if 'previous', we get the objects before the hash reference. If 'next', we get the objects after the hash reference
   * @params {function} resolve Method to be called after response arrives
   *
   * @return {Promise}
   * @memberof ApiTransaction
   * @inner
   */
  getTransactions(type, count, timestamp, hash, page, resolve) {
    const data = {type, count};
    if (hash) {
      data['hash'] = hash;
      data['timestamp'] = timestamp;
      data['page'] = page;
    }
    return this.getTransactionBase(data, resolve);
  },

  /**
   * Call api to get one transaction
   *
   * @param {string} id Transaction ID to search
   * @params {function} resolve Method to be called after response arrives
   *
   * @return {Promise}
   * @memberof ApiTransaction
   * @inner
   */
  getTransaction(id, resolve) {
    const data = {id};
    return this.getTransactionBase(data, resolve);
  },

  /*
   * Call api to get confirmation data of a tx
   *
   * @param {string} id Transaction hash in hex
   * @param {function} resolve Method to be called after response arrives
   *
   * @return {Promise}
   * @memberof ApiTransaction
   * @inner
   */
  getConfirmationData(id, resolve) {
    const data = {id};
    return createRequestInstance(resolve).get(`transaction_acc_weight`, {params: data}).then((res) => {
      resolve(res.data);
    }, (res) => {
      return Promise.reject(res);
    });
  },

  /*
   * Call api to decode a transaction
   *
   * @param {string} hex_tx Full transaction in hexadecimal
   * @param {function} resolve Method to be called after response arrives
   *
   * @return {Promise}
   * @memberof ApiTransaction
   * @inner
   */
  decodeTx(hex_tx, resolve) {
    const data = {hex_tx}
    return createRequestInstance(resolve).get(`decode_tx`, {params: data}).then((res) => {
      resolve(res.data);
    }, (res) => {
      return Promise.reject(res);
    });
  },

  /*
   * Call api to push a transaction
   *
   * @param {string} hex_tx Full transaction in hexadecimal
   * @param {function} resolve Method to be called after response arrives
   *
   * @return {Promise}
   * @memberof ApiTransaction
   * @inner
   */
  pushTx(hex_tx, force, resolve) {
    const data = {hex_tx, force}
    return createRequestInstance(resolve).get(`push_tx`, {params: data}).then((res) => {
      resolve(res.data);
    }, (res) => {
      return Promise.reject(res);
    });
  },

  /*
   * Call api to get dashboard data
   *
   * @param {number} block Quantity of blocks to return
   * @param {number} tx Quantity of transactions to return
   * @param {function} resolve Method to be called after response arrives
   *
   * @return {Promise}
   * @memberof ApiTransaction
   * @inner
   */
  getDashboardTx(block, tx, resolve) {
    const data = {block, tx}
    return createRequestInstance(resolve).get(`dashboard_tx`, {params: data}).then((res) => {
      resolve(res.data);
    }, (res) => {
      return Promise.reject(res);
    });
  },
};

export default txApi;
