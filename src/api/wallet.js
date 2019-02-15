import createRequestInstance from './axiosInstance';

const walletApi = {
  getAddressHistory(addresses, resolve) {
    const data = {addresses};
    return createRequestInstance().get('thin_wallet/address_history', {'params': data}).then((res) => {
      resolve(res.data)
    }, (res) => {
      return Promise.reject(res);
    });
  },

  sendTokens(txHex, resolve) {
    const postData = {tx_hex: txHex};
    return createRequestInstance().post('thin_wallet/send_tokens', postData).then((res) => {
      resolve(res.data)
    }, (res) => {
      return Promise.reject(res);
    });
  },

};

export default walletApi;
