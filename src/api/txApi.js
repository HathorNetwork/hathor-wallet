import createRequestInstance from './axiosInstance';

/*
 * Api calls for transaction
 *
 * @namespace TransactionApi
 */

const txApi = {
  getTransactionBase(data, resolve) {
    return createRequestInstance(resolve).get(`transaction`, {params: data}).then((res) => {
      resolve(res.data);
    }, (res) => {
      return Promise.reject(res);
    });
  },

  getTransactions(type, count, timestamp, hash, page, resolve) {
    /*
     type: 'block' or 'tx' -> if we are getting txs or blocks
     count: int -> how many objects we want
     timestamp (optional): int -> timestamp reference for the pagination (works together with 'page' parameter)
     hash (optional): str -> hash reference for the pagination (works together with 'page' parameter)
     page (optional): 'previous' or 'next' -> if 'previous', we get the objects before the hash reference
                                   if 'next', we get the objects after the hash reference
    */
    const data = {type, count};
    if (hash) {
      data['hash'] = hash;
      data['timestamp'] = timestamp;
      data['page'] = page;
    }
    return this.getTransactionBase(data, resolve);
  },

  getTransaction(id, resolve) {
    const data = {id};
    return this.getTransactionBase(data, resolve);
  },

  /*
   * Call api to get confirmation data of a tx
   *
   * @params {string} id Transaction hash in hex
   * @params {function} resolve Method to be called after response arrives
   *
   * @return {Promise}
   * @memberof TransactionApi
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

  decodeTx(hex_tx, resolve) {
    const data = {hex_tx}
    return createRequestInstance(resolve).get(`decode_tx`, {params: data}).then((res) => {
      resolve(res.data);
    }, (res) => {
      return Promise.reject(res);
    });
  },

  pushTx(hex_tx, force, resolve) {
    const data = {hex_tx, force}
    return createRequestInstance(resolve).get(`push_tx`, {params: data}).then((res) => {
      resolve(res.data);
    }, (res) => {
      return Promise.reject(res);
    });
  },

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
