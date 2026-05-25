/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Crypto shim for the Web3Auth SDK in the renderer.
 *
 * Webpack's `node:` scheme plugin (see config-overrides.js) rewrites
 * `node:crypto` to `crypto`, which webpack resolves to this shim via the
 * `fallback.crypto` alias. The shim re-exports every symbol crypto-browserify
 * provides and additionally exposes:
 *   - `webcrypto`: the browser's WebCrypto API (globalThis.crypto), needed by
 *     newer @web3auth modules.
 *   - a default export pointing at the whole module, needed by nested older
 *     `@toruslabs/eccrypto` builds that do `import nodeCrypto from 'crypto'`.
 *
 * Other consumers (bitcore-lib, etc.) keep working because every
 * crypto-browserify named export is re-exported unchanged.
 */
import cryptoBrowserify from 'crypto-browserify';

const webcrypto = typeof globalThis !== 'undefined' && globalThis.crypto
  ? globalThis.crypto
  : undefined;

export const {
  randomBytes,
  rng,
  pseudoRandomBytes,
  prng,
  createHash,
  Hash,
  createHmac,
  Hmac,
  getHashes,
  pbkdf2,
  pbkdf2Sync,
  Cipher,
  createCipher,
  Cipheriv,
  createCipheriv,
  Decipher,
  createDecipher,
  Decipheriv,
  createDecipheriv,
  getCiphers,
  listCiphers,
  DiffieHellmanGroup,
  createDiffieHellmanGroup,
  getDiffieHellman,
  createDiffieHellman,
  DiffieHellman,
  createSign,
  Sign,
  createVerify,
  Verify,
  createECDH,
  publicEncrypt,
  privateEncrypt,
  publicDecrypt,
  privateDecrypt,
  randomFill,
  randomFillSync,
} = cryptoBrowserify;

export { webcrypto };

export default {
  ...cryptoBrowserify,
  webcrypto,
};
