import requestInstance from './axiosInstance';

const versionApi = {
  getVersion() {
    return requestInstance.get(`version`).then((res) => {
      return res.data
    }, (res) => {
      throw new Error(res);
    });
  }
};

export default versionApi;