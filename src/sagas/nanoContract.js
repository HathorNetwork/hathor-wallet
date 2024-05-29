import {
  ncApi,
  errors as hathorLibErrors
} from '@hathor/wallet-lib';

import { t } from 'ttag';

import { getGlobalWallet } from "../modules/wallet";

import {
  nanoContractRegisterError,
  nanoContractRegisterSuccess,
} from '../actions';

import { types } from '../actions';
import { all, call, put, takeEvery } from 'redux-saga/effects';

export const NANOCONTRACT_REGISTER_STATUS = {
  LOADING: 'loading',
  ERROR: 'error',
  SUCCESS: 'success',
};

/**
 * Process Nano Contract registration request.
 * @param {{
 *   payload: {
 *     address: string,
 *     ncId: string,
 *   }
 * }} action with request payload.
 */
export function* registerNanoContract({ payload }) {
  const { address, ncId } = payload;

  const wallet = getGlobalWallet();
  if (!wallet.isReady()) {
    console.debug('Fail registering Nano Contract because wallet is not ready yet.');
    yield put(nanoContractRegisterError(t`Wallet is not ready.`));
    return;
  }

  const isRegistered = yield call([wallet.storage, wallet.storage.isNanoContractRegistered], ncId);
  if (isRegistered) {
    console.debug('Fail registering Nano Contract because it is already registered.');
    yield put(nanoContractRegisterError(t`Nano contract is already registered.`));
    return;
  }

  const isAddressMine = yield call([wallet, wallet.isAddressMine], address);
  if (!isAddressMine) {
    console.debug('Fail registering Nano Contract because address do not belongs to this wallet.');
    yield put(nanoContractRegisterError(t`Address does not belong to the wallet.`));
    return;
  }

  let ncState = null;
  try {
    ncState = yield call([ncApi, ncApi.getNanoContractState], ncId);
  } catch (error) {
    if (error instanceof hathorLibErrors.NanoRequest404Error) {
      yield put(nanoContractRegisterError(t`Nano contract not found.`));
    } else {
      console.error('Error while registering Nano Contract.', error);
      yield put(nanoContractRegisterError(t`Error while registering the nano contract.`));
    }
    return;
  }

  const nc = {
    address,
    ncId,
    blueprintId: ncState.blueprint_id,
    blueprintName: ncState.blueprint_name
  };
  yield call([wallet.storage, wallet.storage.registerNanoContract], ncId, nc);

  console.debug('Success registering Nano Contract.');
  // emit action NANOCONTRACT_REGISTER_SUCCESS
  yield put(nanoContractRegisterSuccess(nc));
}


export function* saga() {
  yield all([
    takeEvery(types.NANOCONTRACT_REGISTER_REQUEST, registerNanoContract),
  ]);
}