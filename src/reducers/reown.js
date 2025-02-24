/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { types } from '../actions';

const initialState = {
  client: null,
  modal: {
    show: false,
    type: null,
    data: null,
    onAcceptAction: null,
    onRejectAction: null,
  },
  sessions: {},
  connectionFailed: false,
  nanoContractStatus: 'ready', // 'ready' | 'loading' | 'success' | 'failure'
  createTokenStatus: 'ready', // 'ready' | 'loading' | 'success' | 'failure'
};

export default function reownReducer(state = initialState, action) {
  switch (action.type) {
    case types.REOWN_SET_CLIENT:
      return {
        ...state,
        client: action.payload,
      };

    case types.REOWN_SET_MODAL:
      return {
        ...state,
        modal: {
          ...state.modal,
          ...action.payload,
        },
      };

    case types.REOWN_SET_SESSIONS:
      return {
        ...state,
        sessions: action.payload,
      };

    case types.REOWN_SET_CONNECTION_FAILED:
      return {
        ...state,
        connectionFailed: action.payload,
      };

    case types.REOWN_NEW_NANOCONTRACT_STATUS_LOADING:
      return {
        ...state,
        nanoContractStatus: 'loading',
      };

    case types.REOWN_NEW_NANOCONTRACT_STATUS_READY:
      return {
        ...state,
        nanoContractStatus: 'ready',
      };

    case types.REOWN_NEW_NANOCONTRACT_STATUS_SUCCESS:
      return {
        ...state,
        nanoContractStatus: 'success',
      };

    case types.REOWN_NEW_NANOCONTRACT_STATUS_FAILED:
      return {
        ...state,
        nanoContractStatus: 'failure',
      };

    case types.REOWN_CREATE_TOKEN_STATUS_LOADING:
      return {
        ...state,
        createTokenStatus: 'loading',
      };

    case types.REOWN_CREATE_TOKEN_STATUS_READY:
      return {
        ...state,
        createTokenStatus: 'ready',
      };

    case types.REOWN_CREATE_TOKEN_STATUS_SUCCESSFUL:
      return {
        ...state,
        createTokenStatus: 'success',
      };

    case types.REOWN_CREATE_TOKEN_STATUS_FAILED:
      return {
        ...state,
        createTokenStatus: 'failure',
      };

    default:
      return state;
  }
} 