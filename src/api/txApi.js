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
};

export default txApi;
