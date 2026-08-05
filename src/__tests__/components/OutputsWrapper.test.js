/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { Provider } from 'react-redux';
import { render, screen, act, fireEvent } from '@testing-library/react';
import OutputsWrapper from '../../components/OutputsWrapper';
import { THOTH_ID_ERROR, resolveThothName } from '../../utils/thothId';

// The number field pulls the wallet's decimal places from redux and the lib;
// none of that takes part in resolving a name
jest.mock('../../components/InputNumber', () => () => <input className="output-value" />);

// Only the hardware wallet check is read from the store here, and pulling the
// real one in would load the whole wallet lib
jest.mock('../../storage', () => ({
  __esModule: true,
  default: { isHardwareWallet: () => false },
}));

jest.mock('../../utils/thothId', () => {
  const THOTH_ID_ERROR_MOCK = {
    NAME_NOT_FOUND: 'name-not-found',
    UNKNOWN_DOMAIN: 'unknown-domain',
    UNSUPPORTED_NETWORK: 'unsupported-network',
    INVALID_ADDRESS: 'invalid-address',
    REQUEST_FAILED: 'request-failed',
  };
  const normalize = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
  return {
    THOTH_ID_ERROR: THOTH_ID_ERROR_MOCK,
    normalizeThothName: normalize,
    isThothIdEnabled: (network) => network === 'testnet',
    isThothIdName: (value) => /^[a-z0-9][a-z0-9_-]*\.[a-z0-9]{2,20}$/.test(normalize(value)),
    resolveThothName: jest.fn(),
  };
});

const ADDRESS = 'WSoSypkhE8i3iZxZvXCq91vWDwr8wKFVVq';
const NAME = 'alice.htr';

const makeStore = (network) => ({
  getState: () => ({ serverInfo: { network, decimalPlaces: 2 } }),
  subscribe: () => () => {},
  dispatch: () => {},
});

/**
 * Renders one output and returns the component instance, which is what the
 * Send Tokens screen reads the address from.
 */
const renderOutput = (network = 'testnet') => {
  let instance = null;
  const onValueChange = jest.fn();
  render(
    <Provider store={makeStore(network)}>
      <OutputsWrapper
        index={0}
        outputsCount={1}
        setRef={(node) => { instance = node; }}
        removeOutput={jest.fn()}
        isNFT={false}
        onValueChange={onValueChange}
      />
    </Provider>
  );
  return { getInstance: () => instance, onValueChange };
};

const typeAddress = (value) => {
  fireEvent.change(document.querySelector('.output-address'), { target: { value } });
};

/** Lets the debounce fire and the resolution promise settle */
const flushResolution = async () => {
  await act(async () => {
    jest.runOnlyPendingTimers();
  });
};

beforeEach(() => {
  jest.useFakeTimers();
  resolveThothName.mockReset();
});

afterEach(() => {
  jest.useRealTimers();
});

describe('address field', () => {
  it('uses a typed address as is, without resolving anything', async () => {
    const { getInstance } = renderOutput();
    typeAddress(ADDRESS);
    await flushResolution();

    expect(resolveThothName).not.toHaveBeenCalled();
    expect(getInstance().getAddress()).toBe(ADDRESS);
    expect(getInstance().getResolvedName()).toBeNull();
  });

  it('strips spaces from a pasted address', async () => {
    const { getInstance } = renderOutput();
    typeAddress(`  ${ADDRESS} `);
    expect(getInstance().getAddress()).toBe(ADDRESS);
  });
});

describe('thoth.id name resolution', () => {
  it('resolves a typed name and sends to the resolved address', async () => {
    resolveThothName.mockResolvedValue({ name: NAME, address: ADDRESS });
    const { getInstance, onValueChange } = renderOutput();

    typeAddress(NAME);
    expect(screen.getByText(/Resolving/)).toBeTruthy();
    // Nothing to send to while the name is still being resolved
    expect(getInstance().getAddress()).toBeNull();

    await flushResolution();

    expect(resolveThothName).toHaveBeenCalledWith(NAME, { network: 'testnet' });
    expect(screen.getByText(ADDRESS)).toBeTruthy();
    expect(screen.getByText(NAME)).toBeTruthy();
    expect(getInstance().getAddress()).toBe(ADDRESS);
    expect(getInstance().getResolvedName()).toBe(NAME);
    // The screen recalculates the fee once the address is known
    expect(onValueChange).toHaveBeenCalled();
  });

  it('resolves the lower-case name regardless of how it was typed', async () => {
    resolveThothName.mockResolvedValue({ name: NAME, address: ADDRESS });
    const { getInstance } = renderOutput();

    typeAddress('ALICE.HTR');
    await flushResolution();

    expect(resolveThothName).toHaveBeenCalledWith(NAME, { network: 'testnet' });
    expect(getInstance().getAddress()).toBe(ADDRESS);
  });

  it('shows why a name could not be resolved and refuses to send', async () => {
    const error = new Error('not registered');
    error.code = THOTH_ID_ERROR.NAME_NOT_FOUND;
    resolveThothName.mockRejectedValue(error);
    const { getInstance } = renderOutput();

    typeAddress('nobody.htr');
    await flushResolution();

    expect(screen.getByText(/is not registered/)).toBeTruthy();
    expect(getInstance().getAddress()).toBeNull();
    expect(getInstance().getResolvedName()).toBeNull();
  });

  it('drops a resolution that lands after the field changed again', async () => {
    let resolveFirst;
    resolveThothName.mockImplementationOnce(() => new Promise((resolve) => { resolveFirst = resolve; }));
    resolveThothName.mockResolvedValue({ name: 'bob.htr', address: 'WbobAddress' });

    const { getInstance } = renderOutput();

    typeAddress(NAME);
    await act(async () => { jest.runOnlyPendingTimers(); });

    typeAddress('bob.htr');
    await flushResolution();

    // The first lookup answers only now, for a name that is no longer typed
    await act(async () => { resolveFirst({ name: NAME, address: ADDRESS }); });

    expect(getInstance().getAddress()).toBe('WbobAddress');
    expect(getInstance().getResolvedName()).toBe('bob.htr');
  });

  it('clears the resolution when the name is replaced by an address', async () => {
    resolveThothName.mockResolvedValue({ name: NAME, address: ADDRESS });
    const { getInstance } = renderOutput();

    typeAddress(NAME);
    await flushResolution();
    expect(getInstance().getAddress()).toBe(ADDRESS);

    typeAddress(ADDRESS);
    await flushResolution();

    expect(screen.queryByText(NAME)).toBeNull();
    expect(getInstance().getAddress()).toBe(ADDRESS);
    expect(getInstance().getResolvedName()).toBeNull();
  });

  it('does not resolve names outside testnet', async () => {
    const { getInstance } = renderOutput('mainnet');

    typeAddress(NAME);
    await flushResolution();

    expect(resolveThothName).not.toHaveBeenCalled();
    // The text goes through as an address, where the usual validation rejects it
    expect(getInstance().getAddress()).toBe(NAME);
  });
});
