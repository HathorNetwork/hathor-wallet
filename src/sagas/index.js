import { all, fork } from 'redux-saga/effects';
import { saga as walletSagas } from './wallet';
import { saga as tokensSagas } from './tokens';
import { saga as proposalsSagas } from './atomicSwap';
import { saga as featureToggleSagas } from './featureToggle';
import { saga as nanoContractSagas } from './nanoContract';
import { saga as networkSettingsSagas } from './networkSettings';
import { saga as reownSagas } from './reown';

function* defaultSaga() {
  yield all([
    fork(walletSagas),
    fork(tokensSagas),
    fork(proposalsSagas),
    fork(featureToggleSagas),
    fork(nanoContractSagas),
    fork(networkSettingsSagas),
    fork(reownSagas),
  ]);
}

export default defaultSaga;
