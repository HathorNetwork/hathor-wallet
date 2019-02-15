import createRequestInstance from './axiosInstance';

const versionApi = {
  getVersion(resolve) {
    return createRequestInstance(resolve).get(`version`).then((res) => {
      resolve(res.data);
    }, (res) => {
      return Promise.reject(res);
    });
  }
};

export default versionApi;