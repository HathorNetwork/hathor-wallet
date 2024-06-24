import { all, fork } from 'redux-saga/effects';
import { saga as walletSagas } from './wallet';
import { saga as tokensSagas } from './tokens';
import { saga as proposalsSagas } from './atomicSwap';
import { saga as featureToggleSagas } from './featureToggle';
import { saga as walletConnectSagas } from './walletConnect';

function* defaultSaga() {
  yield all([
    fork(walletSagas),
    fork(tokensSagas),
    fork(proposalsSagas),
    fork(featureToggleSagas),
    fork(walletConnectSagas),
  ]);
}

export default defaultSaga;
