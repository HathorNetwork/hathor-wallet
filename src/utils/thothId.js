/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { ThothIdSDK } from 'thoth-id-sdk';
import hathorLib from '@hathor/wallet-lib';
import LOCAL_STORE, { THOTH_ID_CONTRACTS_KEY } from '../storage';
import {
  THOTH_ID_NETWORKS,
  THOTH_ID_DISCOVERY_TTL,
  THOTH_ID_RESOLUTION_TTL,
} from '../constants';
import walletUtils from './wallet';

/**
 * thoth.id resolution: a name such as `alice.htr` stands for an address, the
 * same way a domain name stands for an IP. Each domain suffix is a nano
 * contract created from the ThothNamer blueprint, and the Sdk collects the
 * `suffix -> contract` map from the node itself, so nothing here is hardcoded
 * beyond the blueprint the Sdk already knows.
 *
 * The registries only exist on testnet, so every entry point in this module
 * refuses to resolve on any other network instead of silently querying a node
 * that has no ThothNamer contract at all.
 *
 * @namespace ThothId
 */

/** Reasons a resolution can fail. The UI turns these into readable messages. */
export const THOTH_ID_ERROR = {
  /** The wallet is not connected to a network where thoth.id is deployed. */
  UNSUPPORTED_NETWORK: 'unsupported-network',
  /** The text is not shaped like a name, so there is nothing to resolve. */
  INVALID_NAME: 'invalid-name',
  /** No registry on this network answers for the name's domain suffix. */
  UNKNOWN_DOMAIN: 'unknown-domain',
  /** The domain exists but nobody registered this name (or it expired). */
  NAME_NOT_FOUND: 'name-not-found',
  /** The registry answered with something that is not a valid address. */
  INVALID_ADDRESS: 'invalid-address',
  /** The node could not be reached, or answered with an error. */
  REQUEST_FAILED: 'request-failed',
};

export class ThothIdError extends Error {
  /**
   * @param {string} code One of THOTH_ID_ERROR
   * @param {string} message Message aimed at developers/logs, not at the user
   */
  constructor(code, message) {
    super(message);
    this.name = 'ThothIdError';
    this.code = code;
  }
}

/**
 * A name is a label plus a domain suffix, e.g. `alice.htr`. Labels accept the
 * characters the registries accept; the suffix is letters and digits only.
 * Addresses are base58 and never contain a dot, so this never matches one.
 */
const THOTH_NAME_REGEX = /^[a-z0-9](?:[a-z0-9_-]{0,62}[a-z0-9])?\.[a-z0-9]{2,20}$/i;

/**
 * Sdk instance shared by every resolution, plus the context it was built for.
 * Changing network or node builds a new one, and every cache is keyed by that
 * same context, so a map collected from one chain is never used against
 * another — including two chains that call themselves `testnet`.
 */
let sdkInstance = null;
let sdkContextKey = null;
/** In-flight collection, so simultaneous lookups share a single discovery. */
let discoveryPromise = null;
/** In-memory `<context>|<name> -> { address, resolvedAt }` cache. */
const resolutionCache = new Map();

/**
 * Whether thoth.id names can be resolved on the given network.
 *
 * @param {string} [network] Network name, defaults to the wallet's network
 * @returns {boolean}
 */
export function isThothIdEnabled(network) {
  const { network: currentNetwork } = getNetworkContext({ network });
  return THOTH_ID_NETWORKS.includes(currentNetwork);
}

/**
 * Whether the text looks like a thoth.id name, i.e. whether it should be
 * resolved instead of being used as an address. Says nothing about the name
 * existing — only resolution can answer that.
 *
 * @param {string} value Text typed by the user
 * @returns {boolean}
 */
export function isThothIdName(value) {
  return THOTH_NAME_REGEX.test(normalizeThothName(value));
}

/**
 * Names are case-insensitive and the registries store them lower-case.
 *
 * @param {string} value Text typed by the user
 * @returns {string}
 */
export function normalizeThothName(value) {
  if (typeof value !== 'string') {
    return '';
  }
  return value.trim().toLowerCase();
}

/**
 * The domain suffix of a name, e.g. `htr` for `alice.htr`.
 *
 * @param {string} name
 * @returns {string} Empty string when the name has no suffix
 */
function getThothDomainSuffix(name) {
  const parts = normalizeThothName(name).split('.');
  return parts.length > 1 ? parts[parts.length - 1] : '';
}

/**
 * Resolves a thoth.id name to the address it points at.
 *
 * @param {string} rawName Name typed by the user, e.g. `alice.htr`
 * @param {Object} [options]
 * @param {string} [options.network] Network name, defaults to the wallet's
 * @param {string} [options.nodeUrl] Node URL, defaults to the wallet's
 *
 * @throws {ThothIdError} With a `code` from THOTH_ID_ERROR
 * @returns {Promise<{ name: string, address: string }>}
 */
export async function resolveThothName(rawName, options = {}) {
  const name = normalizeThothName(rawName);
  const { network, nodeUrl } = getNetworkContext(options);

  if (!THOTH_ID_NETWORKS.includes(network)) {
    throw new ThothIdError(
      THOTH_ID_ERROR.UNSUPPORTED_NETWORK,
      `thoth.id names are not available on ${network || 'this network'}.`,
    );
  }

  if (!isThothIdName(name)) {
    throw new ThothIdError(THOTH_ID_ERROR.INVALID_NAME, `"${rawName}" is not a valid thoth.id name.`);
  }

  const contextKey = getContextKey(network, nodeUrl);
  const cached = readResolutionCache(contextKey, name);
  if (cached) {
    return { name, address: cached };
  }

  const sdk = getSdk(contextKey, nodeUrl);
  await ensureDomainIsKnown(sdk, contextKey, getThothDomainSuffix(name));

  let address;
  try {
    address = await sdk.resolveName(name);
  } catch (e) {
    throw toThothIdError(e);
  }

  // A registry answering with something the wallet cannot spend to would turn
  // into a confusing failure at send time, so it is rejected here instead.
  if (!walletUtils.validateAddress(address)) {
    throw new ThothIdError(
      THOTH_ID_ERROR.INVALID_ADDRESS,
      `The registry resolved "${name}" to "${address}", which is not a valid address on ${network}.`,
    );
  }

  writeResolutionCache(contextKey, name, address);
  return { name, address };
}

// --- Internals -------------------------------------------------------------

/**
 * Identifies the chain a map was collected from. Two networks with the same
 * name but different nodes (a public testnet and a local one, say) register
 * different contracts, so both take part in the key.
 */
function getContextKey(network, nodeUrl) {
  return `${network}|${toThothNodeUrl(nodeUrl)}`;
}

/**
 * Network and node the resolution runs against. Both default to what the
 * wallet is currently connected to.
 */
function getNetworkContext({ network, nodeUrl } = {}) {
  let currentNetwork = network;
  let currentNodeUrl = nodeUrl;

  if (!currentNetwork) {
    try {
      currentNetwork = hathorLib.config.getNetwork().name;
    } catch (e) {
      currentNetwork = null;
    }
  }

  if (!currentNodeUrl) {
    currentNodeUrl = hathorLib.config.getServerUrl();
  }

  return { network: currentNetwork, nodeUrl: currentNodeUrl };
}

/**
 * The Sdk builds its own `/v1a/nano_contract/...` paths from a node root, while
 * the wallet's node URL already ends in `/v1a/`. Handing over the wallet URL
 * unchanged would produce `/v1a/v1a/nano_contract/state`, so the API path is
 * stripped here.
 *
 * @param {string} nodeUrl e.g. `https://node1.testnet.hathor.network/v1a/`
 * @returns {string} e.g. `https://node1.testnet.hathor.network`
 */
export function toThothNodeUrl(nodeUrl) {
  if (!nodeUrl) {
    return '';
  }
  return nodeUrl.replace(/\/+$/, '').replace(/\/v1a(\/.*)?$/, '');
}

/**
 * The Sdk instance for the current network/node, seeded with the map cached in
 * localStorage so a wallet that already collected it makes zero discovery
 * requests.
 */
function getSdk(contextKey, nodeUrl) {
  if (sdkInstance && sdkContextKey === contextKey) {
    return sdkInstance;
  }

  const cached = readContractCache(contextKey);
  sdkInstance = new ThothIdSDK({
    nodeUrl: toThothNodeUrl(nodeUrl),
    ...(cached ? { contractIds: cached.contractIds } : {}),
  });
  sdkContextKey = contextKey;
  discoveryPromise = null;
  return sdkInstance;
}

/**
 * Makes sure a registry for the name's domain is known, collecting the map from
 * the node when it is not.
 *
 * A name under an unknown domain is a plain "no such domain" answer, but only
 * once the map is fresh: a domain created after the map was cached would
 * otherwise stay invisible forever. The collected map is trusted for
 * THOTH_ID_DISCOVERY_TTL so typing an unknown domain cannot make every
 * keystroke re-collect it.
 */
async function ensureDomainIsKnown(sdk, contextKey, suffix) {
  if (sdk.getContractIdForDomain(suffix)) {
    return;
  }

  const cached = readContractCache(contextKey);
  const isFresh = cached && Date.now() - cached.updatedAt < THOTH_ID_DISCOVERY_TTL;
  if (isFresh) {
    throw unknownDomainError(sdk, suffix);
  }

  await collectContractIds(sdk, contextKey);

  if (!sdk.getContractIdForDomain(suffix)) {
    throw unknownDomainError(sdk, suffix);
  }
}

/**
 * Collects the `domain suffix -> contract` map, sharing a single collection
 * between simultaneous callers and caching the result for later sessions.
 */
function collectContractIds(sdk, contextKey) {
  if (!discoveryPromise) {
    discoveryPromise = sdk.refreshContractIds()
      .then((contractIds) => {
        writeContractCache(contextKey, contractIds);
        return contractIds;
      })
      .catch((e) => {
        throw toThothIdError(e);
      })
      .finally(() => {
        // Cleared either way: a failed collection must be retryable, and a
        // successful one is already cached on the Sdk instance.
        discoveryPromise = null;
      });
  }
  return discoveryPromise;
}

function unknownDomainError(sdk, suffix) {
  const known = sdk.getDomains().map((domain) => `.${domain}`).join(', ') || 'none';
  return new ThothIdError(
    THOTH_ID_ERROR.UNKNOWN_DOMAIN,
    `No thoth.id registry answers for ".${suffix}" on this network. Known domains: ${known}.`,
  );
}

/**
 * Turns an Sdk/axios failure into a ThothIdError. The Sdk reports a contract
 * error as `Nano contract error: <errmsg>`, and a name nobody registered comes
 * back as `NameNotFound()` — the one failure that is an answer rather than a
 * problem.
 */
function toThothIdError(e) {
  if (e instanceof ThothIdError) {
    return e;
  }

  const message = e?.message || String(e);
  if (message.includes('NameNotFound')) {
    return new ThothIdError(THOTH_ID_ERROR.NAME_NOT_FOUND, message);
  }
  return new ThothIdError(THOTH_ID_ERROR.REQUEST_FAILED, message);
}

function readResolutionCache(contextKey, name) {
  const cacheKey = `${contextKey}|${name}`;
  const entry = resolutionCache.get(cacheKey);
  if (!entry) {
    return null;
  }
  if (Date.now() - entry.resolvedAt >= THOTH_ID_RESOLUTION_TTL) {
    resolutionCache.delete(cacheKey);
    return null;
  }
  return entry.address;
}

function writeResolutionCache(contextKey, name, address) {
  resolutionCache.set(`${contextKey}|${name}`, { address, resolvedAt: Date.now() });
}

/**
 * @returns {{ contractIds: Object, updatedAt: number }|null}
 */
function readContractCache(contextKey) {
  let cache;
  try {
    cache = LOCAL_STORE.getItem(THOTH_ID_CONTRACTS_KEY);
  } catch (e) {
    return null;
  }

  const entry = cache?.[contextKey];
  if (!entry?.contractIds || typeof entry.contractIds !== 'object') {
    return null;
  }
  return { contractIds: entry.contractIds, updatedAt: entry.updatedAt || 0 };
}

function writeContractCache(contextKey, contractIds) {
  const cache = LOCAL_STORE.getItem(THOTH_ID_CONTRACTS_KEY) || {};
  cache[contextKey] = { contractIds, updatedAt: Date.now() };
  LOCAL_STORE.setItem(THOTH_ID_CONTRACTS_KEY, cache);
}
