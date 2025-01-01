/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { takeEvery, call } from 'redux-saga/effects';
import { types } from '../actions';

let modalContext = null;

export const setModalContext = (context) => {
  modalContext = context;
};

function* showModal({ payload: { modalType, modalProps } }) {
  console.log('Will show modal: ', modalType, modalProps);
  if (modalContext) {
    console.log('has modal context.', modalContext);
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
