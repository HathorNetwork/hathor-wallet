/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { types } from '../actions';
import { BASE_STATUS, REOWN_CONNECTION_STATE } from '../constants';

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
  connectionState: REOWN_CONNECTION_STATE.IDLE,
  nanoContractStatus: BASE_STATUS.READY,
  createTokenStatus: BASE_STATUS.READY,
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

    case types.REOWN_SET_CONNECTION_STATE:
      return {
        ...state,
        connectionState: action.payload,
      };

    case types.REOWN_NEW_NANOCONTRACT_STATUS_LOADING:
      return {
        ...state,
        nanoContractStatus: BASE_STATUS.LOADING,
      };

    case types.REOWN_NEW_NANOCONTRACT_STATUS_READY:
      return {
        ...state,
        nanoContractStatus: BASE_STATUS.READY,
      };

    case types.REOWN_NEW_NANOCONTRACT_STATUS_SUCCESS:
      return {
        ...state,
        nanoContractStatus: BASE_STATUS.SUCCESS,
      };

    case types.REOWN_NEW_NANOCONTRACT_STATUS_FAILED:
      return {
        ...state,
        nanoContractStatus: BASE_STATUS.ERROR,
      };

    case types.REOWN_CREATE_TOKEN_STATUS_LOADING:
      return {
        ...state,
        createTokenStatus: BASE_STATUS.LOADING,
      };

    case types.REOWN_CREATE_TOKEN_STATUS_READY:
      return {
        ...state,
        createTokenStatus: BASE_STATUS.READY,
      };

    case types.REOWN_CREATE_TOKEN_STATUS_SUCCESSFUL:
      return {
        ...state,
        createTokenStatus: BASE_STATUS.SUCCESS,
      };

    case types.REOWN_CREATE_TOKEN_STATUS_FAILED:
      return {
        ...state,
        createTokenStatus: BASE_STATUS.ERROR,
      };

    default:
      return state;
  }
} 
