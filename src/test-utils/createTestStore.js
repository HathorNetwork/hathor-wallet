/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Build a Redux store wired with the same middlewares as production
 * (redux-thunk + redux-saga), seeded with the root reducer's initial state
 * merged with whatever `preloadedState` the caller provides.
 *
 * Notably: this DOES NOT auto-run the root sagas. Saga integration tests
 * drive sagas explicitly via redux-saga-test-plan's `expectSaga`. Component
 * tests that exercise saga side effects should mock the relevant actions or
 * dispatch them manually.
 *
 * Refs RFC 0001 (auto-qa) § Helpers.
 */

import { configureStore } from '@reduxjs/toolkit';
import thunk from 'redux-thunk';
import createSagaMiddleware from 'redux-saga';
import rootReducer from '../reducers/index';
import { getInitialState } from './getInitialState';

/**
 * @param {object} [preloadedState] Partial state merged on top of the
 *   reducer's initial state. Keys in `preloadedState` override; everything
 *   else falls through to the reducer default.
 * @returns {{ store: import('@reduxjs/toolkit').EnhancedStore, sagaMiddleware: any }}
 */
export function createTestStore(preloadedState = {}) {
  const sagaMiddleware = createSagaMiddleware();

  const store = configureStore({
    reducer: rootReducer,
    preloadedState: { ...getInitialState(), ...preloadedState },
    middleware: (getDefaultMiddleware) =>
      getDefaultMiddleware({ serializableCheck: false }).concat(sagaMiddleware, thunk),
  });

  return { store, sagaMiddleware };
}

export default createTestStore;
