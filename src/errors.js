/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

export class WalletDoesNotExistError extends Error {
  constructor(prefix) {
    super(`Wallet does not exist: ${prefix}`);
    this.name = "WalletDoesNotExistError";
  }
};

export class WalletAlreadyExistError extends Error {
  constructor() {
    super('Prefix already in use');
    this.name = "WalletAlreadyExistError";
  }
};

export class InvalidWalletNameError extends Error {
  constructor() {
    super('Invalid wallet name');
    this.name = "InvalidWalletNameError";
  }
};
