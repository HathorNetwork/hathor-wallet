/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { configureStore } from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import createSagaMiddleware from 'redux-saga';
import rootReducer from '../reducers/index';
import rootSagas from '../sagas';

export const sagaMiddleware = createSagaMiddleware();
const middlewares = [sagaMiddleware, thunk];

const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => getDefaultMiddleware({
    // BigInt is currently not serializable, so we get serialization warnings
    // for BigInt values stored in redux. This flag silences them.
    serializableCheck: false,
  }).concat(middlewares)
});

sagaMiddleware.run(rootSagas);

export default store;
