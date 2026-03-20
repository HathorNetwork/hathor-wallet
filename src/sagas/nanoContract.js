import {
  ncApi,
  errors as hathorLibErrors,
  nanoUtils,
} from '@hathor/wallet-lib';

import { t } from 'ttag';

import { getGlobalWallet } from "../modules/wallet";
import hathorLib from '@hathor/wallet-lib';

import {
  addBlueprintInformation,
  nanoContractDetailLoaded,
  nanoContractDetailSetStatus,
  nanoContractRegisterError,
  nanoContractRegisterSuccess,
  types,
} from '../actions';

import { NANO_CONTRACT_DETAIL_STATUS, NANOCONTRACT_REGISTER_STATUS } from '../constants';

import { all, call, delay, put, select, takeEvery } from 'redux-saga/effects';

const NANOCONTRACT_WAIT_TX_CONFIRMED_DELAY = 5000;

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


  let blueprintId;
  try {
    blueprintId = yield call([nanoUtils, nanoUtils.getBlueprintId], ncId, wallet);
  } catch (error) {
    console.error('Error while registering Nano Contract.', error);
    yield put(nanoContractRegisterError(t`Error while registering the nano contract.`));
    return;
  }

  let blueprintInformation = blueprintsData[blueprintId];
  if (!(blueprintInformation)) {
    // We store the blueprint information in redux because it's used in some screens
    // then we don't need to request it every time
    try {
      blueprintInformation = yield call([ncApi, ncApi.getBlueprintInformation], blueprintId);
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
    blueprintId,
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


/**
 * Check if nano ID is valid and waits until the
 * contract is confirmed by a block, if it's not yet
 *
 * @param {string} ncId
 *
 * @return {boolean} If the nano ID is valid
 */
export function* checkNanoIdValid(ncId) {
  // If the state API returns successful, it means the ncId is valid
  // and the tx is already confirmed by a block, even if it's
  // a contract created by another contract
  try {
    const _ = yield call([ncApi, ncApi.getNanoContractState], ncId, [], [], []);
    return true;
  } catch {
    // Do nothing, the tx might be still unconfirmed
  }

  const wallet = getGlobalWallet();
  let response;
  try {
    response = yield call([wallet, wallet.getFullTxById], ncId);
  } catch (e) {
    // invalid tx
    console.debug(`Fail loading Nano Contract detail because [ncId=${ncId}] is an invalid tx.`);
    yield put(nanoContractDetailSetStatus({ status: NANO_CONTRACT_DETAIL_STATUS.ERROR, error: t`Transaction is invalid.` }));
    return false;
  }

  const isVoided = response.meta.voided_by.length > 0;
  if (isVoided) {
    console.debug(`Fail loading Nano Contract detail because [ncId=${ncId}] is a voided tx.`);
    yield put(nanoContractDetailSetStatus({ status: NANO_CONTRACT_DETAIL_STATUS.ERROR, error: t`Transaction is voided.` }));
    return false;
  }

  const isNanoContractCreate = nanoUtils.isNanoContractCreateTx(response.tx);
  if (!isNanoContractCreate) {
    console.debug(`Fail loading Nano Contract detail because [ncId=${ncId}] is not a nano contract creation tx.`);
    yield put(nanoContractDetailSetStatus({ status: NANO_CONTRACT_DETAIL_STATUS.ERROR, error: t`Transaction must be a nano contract creation.` }));
    return false;
  }

  const isConfirmed = response.meta.first_block !== null;
  if (!isConfirmed) {
    // Wait for transaction to be confirmed
    yield put(nanoContractDetailSetStatus({ status: NANO_CONTRACT_DETAIL_STATUS.WAITING_TX_CONFIRMATION }));

    // This confirmation might take some minutes, depending on network mining power
    // then it's ok to wait until it's confirmed, or until the user gives up and
    // leaves the screen
    while (true) {
      // Wait 5s, then we fetch the data again to check if is has been confirmed
      yield delay(NANOCONTRACT_WAIT_TX_CONFIRMED_DELAY);
      const nanoContractDetailState = yield select((state) => state.nanoContractDetailState);
      if (nanoContractDetailState.status !== NANO_CONTRACT_DETAIL_STATUS.WAITING_TX_CONFIRMATION) {
        // User unmounted the screen, so we must stop the saga
        return false;
      }

      try {
        const responseFullTx = yield call([wallet, wallet.getFullTxById], ncId);
        const isConfirmed = responseFullTx.meta.first_block !== null;
        if (isConfirmed) {
          break;
        }
      } catch (e) {
        // error loading full tx
        console.error('Error while loading full tx.', e);
        yield put(nanoContractDetailSetStatus({ status: NANO_CONTRACT_DETAIL_STATUS.ERROR, error: t`Error loading transaction data.` }));
        return false;
      }
    }
  }

  // After the while, return true
  return true;
}

/**
 * Load nano contract detail state
 * @param {{
 *   payload: {
 *     ncId: string,
 *   }
 * }} action with request payload.
 */
export function* loadNanoContractDetail({ ncId }) {
  yield put(nanoContractDetailSetStatus({ status: NANO_CONTRACT_DETAIL_STATUS.LOADING }));

  const ncIdValid = yield call(checkNanoIdValid, ncId);
  if (!ncIdValid) {
    // The error messages were already put in the method above
    return;
  }

  const nanoContracts = yield select((state) => state.nanoContracts);
  const nc = nanoContracts[ncId];

  yield call(fetchBlueprintInformation, { payload: nc.blueprintId });

  // Get the updated blueprints data after the fetch
  const blueprintsData = yield select((state) => state.blueprintsData);
  const blueprintInformation = blueprintsData[nc.blueprintId];

  if (!blueprintInformation) {
    // If we still don't have the blueprint information, there was an error
    yield put(nanoContractDetailSetStatus({
      status: NANO_CONTRACT_DETAIL_STATUS.ERROR,
      error: t`Error getting blueprint details.`
    }));
    return;
  }

  try {
    const state = yield call([ncApi, ncApi.getNanoContractState], ncId, Object.keys(blueprintInformation.attributes), ['__all__'], []);
    yield put(nanoContractDetailLoaded(state));
  } catch (e) {
    // Error in request
    console.error('Error while loading nano contract state.', e);
    yield put(nanoContractDetailSetStatus({ status: NANO_CONTRACT_DETAIL_STATUS.ERROR, error: t`Error getting nano contract state.` }));
    return;
  }
}

/**
 * Fetch blueprint information and store it in redux
 * @param {Object} action
 * @param {string} action.payload Blueprint ID to fetch information for
 */
export function* fetchBlueprintInformation({ payload: blueprintId }) {
  const blueprintsData = yield select((state) => state.blueprintsData);
  if (blueprintsData[blueprintId]) {
    // If we already have it, no need to fetch again
    return;
  }

  try {
    const blueprintInformation = yield call([ncApi, ncApi.getBlueprintInformation], blueprintId);
    yield put(addBlueprintInformation(blueprintInformation));
    console.debug(`Success fetching blueprint info. id = ${blueprintId}`);
  } catch (error) {
    if (error instanceof hathorLibErrors.NanoRequest404Error) {
      console.debug(`Blueprint not found. id = ${blueprintId}`);
      // For now, we'll just log the 404 - the UI can handle missing blueprint info gracefully
    } else {
      console.error('Error while loading blueprint information.', error);
    }
    // Note: We don't throw the error here so the modal can still function without blueprint info
  }
}

export function* saga() {
  yield all([
    takeEvery(types.NANOCONTRACT_REGISTER_REQUEST, registerNanoContract),
    takeEvery(types.NANOCONTRACT_EDIT_ADDRESS, updateNanoContractRegisteredAddress),
    takeEvery(types.NANOCONTRACT_LOAD_DETAILS_REQUESTED, loadNanoContractDetail),
    takeEvery(types.BLUEPRINT_FETCH_REQUESTED, fetchBlueprintInformation),
  ]);
}
