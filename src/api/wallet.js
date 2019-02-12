import requestInstance from './axiosInstance';

const walletApi = {
  getAddressHistory(addresses) {
    const data = {addresses};
    return requestInstance.get('thin_wallet/address_history', {'params': data}).then((res) => {
      return res.data
    }, (res) => {
      throw new Error(res);
    });
  },

  sendTokens(txHex) {
    const postData = {tx_hex: txHex};
    return requestInstance.post('thin_wallet/send_tokens', postData).then((res) => {
      return res.data
    }, (res) => {
      throw new Error(res);
    });
  },

};

export default walletApi;
