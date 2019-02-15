import createRequestInstance from './axiosInstance';

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
};

export default txApi;
