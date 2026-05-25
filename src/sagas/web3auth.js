/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { Web3AuthNoModal } from '@web3auth/no-modal';
import { CHAIN_NAMESPACES, WALLET_ADAPTERS } from '@web3auth/base';
import { CommonPrivateKeyProvider } from '@web3auth/base-provider';
import { AuthAdapter } from '@web3auth/auth-adapter';
import { PrivateKey } from 'bitcore-lib';
import {
  WEB3AUTH_CONFIG,
  WEB3AUTH_WALLET_TYPE_KEY,
  WEB3AUTH_EMAIL_KEY,
} from '../constants';
import { setWalletType, setWeb3authEmail } from '../actions';
import LOCAL_STORE from '../storage';

let web3authInstance = null;

export const WEB3AUTH_ERROR_TYPES = Object.freeze({
  USER_CANCELLED: 'user_cancelled',
  NETWORK: 'network',
  VERIFIER_CONFIG: 'verifier_config',
  MFA_REQUIRED: 'mfa_required',
  KEY_DERIVATION: 'key_derivation',
  UNKNOWN: 'unknown',
});

/**
 * Map a Web3Auth SDK error to one of the WEB3AUTH_ERROR_TYPES values.
 *
 * The SDK does not expose a stable error enum; we string-match on message
 * patterns we have observed in practice. Unknown patterns fall back to UNKNOWN
 * so the observability layer can surface new cases.
 */
export function classifyWeb3AuthError(err) {
  if (!err) return WEB3AUTH_ERROR_TYPES.UNKNOWN;
  const msg = String(err.message || err).toLowerCase();

  if (
    msg.includes('user closed')
    || msg.includes('user_cancelled')
    || msg.includes('user cancelled')
  ) {
    return WEB3AUTH_ERROR_TYPES.USER_CANCELLED;
  }
  if (msg.includes('network') || msg.includes('timeout') || msg.includes('fetch')) {
    return WEB3AUTH_ERROR_TYPES.NETWORK;
  }
  if (
    msg.includes('verifier')
    || msg.includes('jwt')
    || msg.includes('invalid_token')
    || msg.includes('not configured for')
  ) {
    return WEB3AUTH_ERROR_TYPES.VERIFIER_CONFIG;
  }
  if (msg.includes('mfa') || msg.includes('factor')) {
    return WEB3AUTH_ERROR_TYPES.MFA_REQUIRED;
  }
  if (msg.includes('invalid') && msg.includes('key')) {
    return WEB3AUTH_ERROR_TYPES.KEY_DERIVATION;
  }
  return WEB3AUTH_ERROR_TYPES.UNKNOWN;
}

/**
 * Select the Web3Auth config matching the current Hathor network.
 *
 * Throws a controlled error if the matching entry is incomplete (e.g., mainnet
 * has not been provisioned in the dashboard yet). Callers surface the error to
 * the user instead of silently logging into the wrong project.
 *
 * @param {'testnet'|'mainnet'} hathorNetwork
 */
export function getWeb3AuthConfig(hathorNetwork) {
  const cfg = WEB3AUTH_CONFIG[hathorNetwork];
  if (!cfg) {
    throw new Error(`Unknown Hathor network: ${hathorNetwork}`);
  }
  if (!cfg.clientId || !cfg.googleClientId) {
    throw new Error(
      `Web3Auth is not configured for ${hathorNetwork} yet. `
      + 'Please contact support.'
    );
  }
  return cfg;
}

/**
 * Lazy singleton: build the Web3Auth SDK on first use.
 *
 * Top-level SDK construction must be avoided because it touches crypto
 * primitives that may not yet be initialized when the module is first
 * imported. Subsequent calls return the cached instance.
 *
 * @param {'testnet'|'mainnet'} hathorNetwork
 * @returns {Promise<Web3AuthNoModal>}
 */
async function getWeb3AuthInstance(hathorNetwork) {
  if (web3authInstance) return web3authInstance;

  const cfg = getWeb3AuthConfig(hathorNetwork);

  const privateKeyProvider = new CommonPrivateKeyProvider({
    config: {
      chainConfig: {
        chainNamespace: CHAIN_NAMESPACES.OTHER,
        chainId: '0x1',
        rpcTarget: 'https://node1.mainnet.hathor.network/v1a/',
        displayName: 'Hathor Network',
        ticker: 'HTR',
        tickerName: 'Hathor',
      },
    },
  });

  web3authInstance = new Web3AuthNoModal({
    clientId: cfg.clientId,
    web3AuthNetwork: cfg.network,
    privateKeyProvider,
  });

  const authAdapter = new AuthAdapter({
    adapterSettings: {
      uxMode: 'popup',
      loginConfig: {
        google: {
          verifier: cfg.verifier,
          typeOfLogin: 'google',
          clientId: cfg.googleClientId,
        },
        ...(cfg.appleClientId
          ? {
            apple: {
              verifier: cfg.appleVerifier,
              typeOfLogin: 'apple',
              clientId: cfg.appleClientId,
            },
          }
          : {}),
      },
      mfaLevel: 'mandatory',
    },
    privateKeyProvider,
  });
  web3authInstance.configureAdapter(authAdapter);

  await web3authInstance.init();
  return web3authInstance;
}

/**
 * Perform social login via Web3Auth.
 *
 * Triggers the OAuth popup, requires MFA setup on first login, and returns the
 * raw secp256k1 private key plus the user's email. Throws when the user
 * cancels, the network is unreachable, or the verifier rejects the JWT.
 *
 * @param {'google'|'apple'} provider
 * @param {'testnet'|'mainnet'} hathorNetwork
 * @returns {Promise<{ privateKey: string, email: string }>}
 */
export async function web3authLogin(provider, hathorNetwork) {
  const web3auth = await getWeb3AuthInstance(hathorNetwork);
  await web3auth.connectTo(WALLET_ADAPTERS.AUTH, {
    loginProvider: provider,
    curve: 'secp256k1',
    mfaLevel: 'mandatory',
  });

  const userInfo = await web3auth.getUserInfo();
  const email = userInfo?.email || userInfo?.name || '';
  const privateKey = await web3auth.provider.request({ method: 'private_key' });

  return { privateKey, email };
}

/**
 * Derive the 33-byte compressed public key hex from a raw private key hex.
 *
 * The wallet-lib will also derive this internally; we precompute it so the
 * caller can pass both privateKey + publicKey into HathorWallet and into
 * initWeb3AuthStorage, matching the API the wallet-lib's
 * generateAccessDataFromPrivateKey expects.
 *
 * @param {string} privateKeyHex
 * @returns {string} compressed public key hex
 */
export function derivePublicKey(privateKeyHex) {
  return new PrivateKey(privateKeyHex).toPublicKey().toString();
}

/**
 * Persist Web3Auth identity to localStorage and Redux.
 *
 * Called immediately after a successful login so a subsequent app restart
 * restores the walletType + email and lets the user unlock with PIN alone.
 *
 * @param {Function} dispatch Redux dispatch
 * @param {'web3auth'} walletType
 * @param {string} email
 */
export function persistWeb3AuthState(dispatch, walletType, email) {
  LOCAL_STORE.setItem(WEB3AUTH_WALLET_TYPE_KEY, walletType);
  if (email) {
    LOCAL_STORE.setItem(WEB3AUTH_EMAIL_KEY, email);
  }
  dispatch(setWalletType(walletType));
  dispatch(setWeb3authEmail(email));
}

/**
 * Restore walletType + email from localStorage into Redux on app startup.
 *
 * @param {Function} dispatch Redux dispatch
 */
export function restoreWeb3AuthState(dispatch) {
  const walletType = LOCAL_STORE.getItem(WEB3AUTH_WALLET_TYPE_KEY);
  const email = LOCAL_STORE.getItem(WEB3AUTH_EMAIL_KEY);
  if (walletType) dispatch(setWalletType(walletType));
  if (email) dispatch(setWeb3authEmail(email));
}

/**
 * Log out of Web3Auth: clears the SDK session and drops the singleton.
 *
 * Idempotent: calling when no session exists is a no-op. Errors are swallowed
 * (logged) because logout failures must not prevent the wallet-side reset
 * from completing.
 */
export async function web3authLogout() {
  try {
    if (web3authInstance) {
      await web3authInstance.logout();
    }
  } catch (err) {
    // eslint-disable-next-line no-console
    console.warn('[web3auth] logout error', err);
  }
  web3authInstance = null;
}

/**
 * Remove walletType + email from localStorage and reset Redux state.
 *
 * @param {Function} dispatch Redux dispatch
 */
export function cleanWeb3AuthState(dispatch) {
  LOCAL_STORE.removeItem(WEB3AUTH_WALLET_TYPE_KEY);
  LOCAL_STORE.removeItem(WEB3AUTH_EMAIL_KEY);
  dispatch(setWalletType(null));
  dispatch(setWeb3authEmail(null));
}
