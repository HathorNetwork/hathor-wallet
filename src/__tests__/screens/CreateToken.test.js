/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import hathorLib from '@hathor/wallet-lib';
import { GlobalModalContext } from '../../components/GlobalModal';

const { TokenVersion } = hathorLib;

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock jquery
jest.mock('jquery', () => {
  const mockJQuery = jest.fn(() => ({
    hide: jest.fn(),
    show: jest.fn(),
  }));
  return mockJQuery;
});

// Mock the helpers module
jest.mock('../../utils/helpers', () => ({
  openExternalURL: jest.fn(),
}));

// Mock getGlobalWallet
const mockGetGlobalWallet = jest.fn();
jest.mock('../../modules/wallet', () => ({
  getGlobalWallet: () => mockGetGlobalWallet(),
}));

// Mock featureToggle saga
jest.mock('../../sagas/featureToggle.js', () => ({ saga: () => {} }));

// Import after mocks
import CreateToken from '../../screens/CreateToken';

describe('CreateToken - Token Version Handling', () => {
  let mockShowModal;
  let mockHideModal;

  const createMockStore = () => {
    const initialState = {
      tokensBalance: {
        '00': { data: { available: 1000000n } },
      },
      useWalletService: false,
      serverInfo: { decimalPlaces: 2 },
    };
    return createStore((state = initialState) => state);
  };

  const renderComponent = (typeParam) => {
    mockShowModal = jest.fn();
    mockHideModal = jest.fn();

    const modalContextValue = {
      showModal: mockShowModal,
      hideModal: mockHideModal,
    };

    const store = createMockStore();
    return render(
      <Provider store={store}>
        <GlobalModalContext.Provider value={modalContextValue}>
          <MemoryRouter initialEntries={[`/create_token/${typeParam}`]}>
            <Routes>
              <Route path="/create_token/:type" element={<CreateToken />} />
            </Routes>
          </MemoryRouter>
        </GlobalModalContext.Provider>
      </Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockGetGlobalWallet.mockReturnValue({
      storage: {
        getTokenDepositPercentage: () => 0.01,
        getNativeTokenData: () => ({ symbol: 'HTR', name: 'Hathor' }),
      },
    });
  });

  it('renders as deposit token when type param is TokenVersion.DEPOSIT', () => {
    renderComponent(TokenVersion.DEPOSIT);
    expect(screen.getByText('Create Deposit Token')).toBeInTheDocument();
  });

  it('renders as fee token when type param is TokenVersion.FEE', () => {
    renderComponent(TokenVersion.FEE);
    expect(screen.getByText('Create Fee Token')).toBeInTheDocument();
  });

  it('defaults to deposit token when type param is NaN', () => {
    renderComponent('invalid');
    expect(screen.getByText('Create Deposit Token')).toBeInTheDocument();
  });

  it('defaults to deposit token when type param is an invalid number', () => {
    renderComponent(999);
    expect(screen.getByText('Create Deposit Token')).toBeInTheDocument();
  });

  it('defaults to deposit token when type param is a negative number', () => {
    renderComponent(-1);
    expect(screen.getByText('Create Deposit Token')).toBeInTheDocument();
  });
});
