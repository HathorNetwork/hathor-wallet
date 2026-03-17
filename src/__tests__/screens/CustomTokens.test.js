/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { createStore } from 'redux';
import hathorLib from '@hathor/wallet-lib';
import { FEE_TOKEN_FEATURE_TOGGLE } from '../../constants';
import { GlobalModalContext, MODAL_TYPES } from '../../components/GlobalModal';

const { TokenVersion } = hathorLib;

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock LOCAL_STORE
jest.mock('../../storage', () => ({
  __esModule: true,
  default: {
    isHardwareWallet: jest.fn(),
  },
}));

// Mock getGlobalWallet
const mockGetGlobalWallet = jest.fn();
jest.mock('../../modules/wallet', () => ({
  getGlobalWallet: () => mockGetGlobalWallet(),
}));

// Mock featureToggle saga
jest.mock('../../sagas/featureToggle.js', () => ({ saga: () => {} }));

// Import after mocks are set up
import LOCAL_STORE from '../../storage';
import CustomTokens from '../../screens/CustomTokens';

describe('CustomTokens - Create Token Button Navigation', () => {
  let mockShowModal;
  let mockHideModal;

  const createMockStore = (feeTokenEnabled = false) => {
    const initialState = {
      tokensBalance: {},
      featureToggles: {
        [FEE_TOKEN_FEATURE_TOGGLE]: feeTokenEnabled,
      },
    };
    return createStore((state = initialState) => state);
  };

  const renderComponent = (store, modalContextOverrides = {}) => {
    mockShowModal = jest.fn();
    mockHideModal = jest.fn();

    const modalContextValue = {
      showModal: mockShowModal,
      hideModal: mockHideModal,
      ...modalContextOverrides,
    };

    return render(
      <Provider store={store}>
        <GlobalModalContext.Provider value={modalContextValue}>
          <MemoryRouter>
            <CustomTokens />
          </MemoryRouter>
        </GlobalModalContext.Provider>
      </Provider>
    );
  };

  beforeEach(() => {
    jest.clearAllMocks();
    LOCAL_STORE.isHardwareWallet.mockReturnValue(false);
    mockGetGlobalWallet.mockReturnValue({
      storage: {
        getNativeTokenData: () => ({ symbol: 'HTR', name: 'Hathor' }),
      },
    });
  });

  it('navigates to /select_token_type when fee token flag is enabled', () => {
    const store = createMockStore(true);
    renderComponent(store);

    const createButton = screen.getByText('Create a new token');
    fireEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith('/select_token_type');
    expect(mockShowModal).not.toHaveBeenCalled();
  });

  it('navigates to /create_token/:version when fee token flag is disabled', () => {
    const store = createMockStore(false);
    renderComponent(store);

    const createButton = screen.getByText('Create a new token');
    fireEvent.click(createButton);

    expect(mockNavigate).toHaveBeenCalledWith(`/create_token/${TokenVersion.DEPOSIT}`);
    expect(mockShowModal).not.toHaveBeenCalled();
  });

  it('shows modal for hardware wallet (no navigation)', () => {
    LOCAL_STORE.isHardwareWallet.mockReturnValue(true);
    const store = createMockStore(true);
    renderComponent(store);

    const createButton = screen.getByText('Create a new token');
    fireEvent.click(createButton);

    expect(mockShowModal).toHaveBeenCalledWith(MODAL_TYPES.ALERT_NOT_SUPPORTED);
    expect(mockNavigate).not.toHaveBeenCalled();
  });
});
