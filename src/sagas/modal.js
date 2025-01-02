/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * This module handles the global modal system through sagas.
 * It provides a way to show and hide modals from anywhere in the application
 * through Redux actions, while keeping the actual modal context in a central place.
 */

import { takeEvery, call } from 'redux-saga/effects';
import { types } from '../actions';

let modalContext = null;

/**
 * Sets the modal context that will be used to show/hide modals.
 * This should be called when the application starts with the GlobalModal context.
 *
 * @param {Object} context - The modal context containing showModal and hideModal methods
 */
export const setModalContext = (context) => {
  modalContext = context;
};

/**
 * Saga that handles showing a modal through the modal context.
 * It will use the provided modal context to display the modal with the given type and props.
 *
 * @param {Object} action - The Redux action containing the modal type and props
 * @param {string} action.payload.modalType - The type of modal to show
 * @param {Object} action.payload.modalProps - The props to pass to the modal
 */
function* showModal({ payload: { modalType, modalProps } }) {
  if (modalContext) {
    yield call([modalContext, modalContext.showModal], modalType, modalProps);
  }
}

function* hideModal() {
  if (modalContext) {
    yield call([modalContext, modalContext.hideModal]);
  }
}

export function* modalSaga() {
  yield takeEvery(types.SHOW_GLOBAL_MODAL, showModal);
  yield takeEvery(types.HIDE_GLOBAL_MODAL, hideModal);
} 
