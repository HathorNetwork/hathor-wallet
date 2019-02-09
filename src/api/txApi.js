import requestInstance from './axiosInstance';

const txApi = {
  getTransactionBase(data) {
    return requestInstance.get(`transaction`, {params: data}).then((res) => {
      return res.data
    }, (res) => {
      throw new Error(res);
    });
  },

  getTransaction(id) {
    const data = {id};
    return this.getTransactionBase(data);
  },
};

export default txApi;
