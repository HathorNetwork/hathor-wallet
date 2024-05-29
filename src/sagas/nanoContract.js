import {
  ncApi,
  errors as hathorLibErrors
} from '@hathor/wallet-lib';

import { t } from 'ttag';

import { getGlobalWallet } from "../modules/wallet";

import {
  addBlueprintInformation,
  nanoContractRegisterError,
  nanoContractRegisterSuccess,
  types,
} from '../actions';

import nanoUtils from '../utils/nanoContracts';

import { all, call, put, select, takeEvery } from 'redux-saga/effects';

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

  const blueprintsData = yield select((state) => state.blueprintsData);

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

  let tx = null;
  try {
    const response = yield call([wallet, wallet.getFullTxById], ncId);
    tx = response.tx;
  } catch (error) {
    console.error('Error while registering Nano Contract.', error);
    yield put(nanoContractRegisterError(t`Error while registering the nano contract.`));
    return;
  }

  if (!nanoUtils.isNanoContractCreate(tx)) {
    console.debug('Transaction is not a nano contract creation transaction.');
    yield put(nanoContractRegisterError(t`Invalid nano contract creation transaction.`));
    return;
  }

  let blueprintInformation = blueprintsData[tx.nc_blueprint_id];
  if (!(blueprintInformation)) {
    // We store the blueprint information in redux because it's used in some screens
    // then we don't need to request it every time
    try {
      blueprintInformation = yield call([ncApi, ncApi.getBlueprintInformation], tx.nc_blueprint_id);
    } catch (error) {
      if (error instanceof hathorLibErrors.NanoRequest404Error) {
        yield put(nanoContractRegisterError(t`Blueprint not found.`));
      } else {
        console.error('Error while registering Nano Contract.', error);
        yield put(nanoContractRegisterError(t`Error while registering the nano contract.`));
      }
      return;
    }

    yield put(addBlueprintInformation(blueprintInformation));
  }

  const nc = {
    address,
    ncId,
    blueprintId: tx.nc_blueprint_id,
    blueprintName: blueprintInformation.name
  };

  try {
    yield call([wallet.storage, wallet.storage.registerNanoContract], ncId, nc);
  } catch (error) {
    console.error('Error while registering Nano Contract.', error);
    yield put(nanoContractRegisterError(t`Error while registering the nano contract.`));
  }

  console.debug('Success registering Nano Contract.');
  // emit action NANOCONTRACT_REGISTER_SUCCESS
  yield put(nanoContractRegisterSuccess(nc));
}

/**
 * Updates nano contract registered address in the wallet storage
 * @param {Object} action with request payload.
 * @param {string} action.payload.ncId
 * @param {string} action.payload.address
 */
export function* updateNanoContractRegisteredAddress({ payload }) {
  const wallet = getGlobalWallet();
  yield call([wallet.storage, wallet.storage.updateNanoContractRegisteredAddress], payload.ncId, payload.address);
}

export function* saga() {
  yield all([
    takeEvery(types.NANOCONTRACT_REGISTER_REQUEST, registerNanoContract),
    takeEvery(types.NANOCONTRACT_EDIT_ADDRESS, updateNanoContractRegisteredAddress),
  ]);
}