import versionApi from '../api/version';
import store from '../store/index';
import { isVersionAllowedUpdate } from '../actions/index';
import helpers from './helpers';
import transaction from './transaction';

const version = {
  checkVersion(callbackSuccess, callbackError) {
    versionApi.getVersion((data) => {
      store.dispatch(isVersionAllowedUpdate({allowed: helpers.isVersionAllowed(data.version)}));
      transaction.updateTransactionWeightConstants(data.min_tx_weight, data.min_tx_weight_coefficient, data.min_tx_weight_k);
      if (callbackSuccess) {
        callbackSuccess();
      }
    }, (error) => {
      if (callbackError) {
        callbackError();
      }
    });
  }
}

export default version;
