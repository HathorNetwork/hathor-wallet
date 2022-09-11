import { all, fork } from 'redux-saga/effects';
import { saga as walletSagas } from './wallet';
import { saga as tokensSagas } from './tokens';

function* defaultSaga() {
  yield all([
    fork(walletSagas),
    fork(tokensSagas),
  ]);
}

export default defaultSaga;
