import versionApi from '../api/version';
import store from '../store/index';
import { isVersionAllowedUpdate, networkUpdate } from '../actions/index';
import { MIN_API_VERSION, FIRST_WALLET_COMPATIBLE_VERSION } from '../constants';
import helpers from './helpers';
import transaction from './transaction';

const version = {
  checkApiVersion() {
    const promise = new Promise((resolve, reject) => {
      versionApi.getVersion((data) => {
        // Update version allowed in redux
        store.dispatch(isVersionAllowedUpdate({allowed: helpers.isVersionAllowed(data.version, MIN_API_VERSION)}));
        // Update transaction weight constants
        transaction.updateTransactionWeightConstants(data.min_tx_weight, data.min_tx_weight_coefficient, data.min_tx_weight_k);
        // Update network in redux
        store.dispatch(networkUpdate({network: data.network}));
        resolve();
      }, (error) => {
        reject();
      });
    });
    return promise
  },

  checkWalletVersion() {
    const version = localStorage.getItem('wallet:version');
    if (version !== null && helpers.isVersionAllowed(version, FIRST_WALLET_COMPATIBLE_VERSION)) {
      return true;
    } else {
      return false;
    }
  }
}

export default version;
