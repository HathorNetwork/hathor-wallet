/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 *
 * Centralized mock for @hathor/hathor-rpc-handler.
 *
 * The handler depends transitively on the same ESM-only deps as wallet-lib
 * (axios, web crypto). Mocking the public surface keeps the dependency chain
 * out of Jest's transform pipeline.
 */

const handleRpcRequest = jest.fn();
const HathorRpcError = class HathorRpcError extends Error {};
const TriggerTypes = {
  SEND_TX: 'SEND_TX',
  SIGN_WITH_ADDRESS: 'SIGN_WITH_ADDRESS',
  GET_ADDRESS: 'GET_ADDRESS',
  GET_BALANCE: 'GET_BALANCE',
  SIGN_MESSAGE: 'SIGN_MESSAGE',
  CREATE_TOKEN: 'CREATE_TOKEN',
  SEND_NANO_CONTRACT_TX: 'SEND_NANO_CONTRACT_TX',
  CREATE_NANO_CONTRACT_CREATE_TOKEN_TX: 'CREATE_NANO_CONTRACT_CREATE_TOKEN_TX',
  SIGN_ORACLE_DATA: 'SIGN_ORACLE_DATA',
};
const RpcResponseTypes = {
  SendTransactionResponse: 'SendTransactionResponse',
  SignMessageResponse: 'SignMessageResponse',
};

module.exports = {
  __esModule: true,
  handleRpcRequest,
  HathorRpcError,
  TriggerTypes,
  RpcResponseTypes,
  default: { handleRpcRequest, HathorRpcError, TriggerTypes, RpcResponseTypes },
};
