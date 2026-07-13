import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import hathorLib from '@hathor/wallet-lib';
import SelectTokenType from '../../screens/SelectTokenType';
import { TOKEN_FEE_RFC_URL } from '../../constants';

const { TokenVersion } = hathorLib;

// Mock the helpers module
jest.mock('../../utils/helpers', () => ({
  openExternalURL: jest.fn(),
}));

// Mock the wallet module
jest.mock('../../modules/wallet', () => ({
  getGlobalWallet: () => ({
    storage: {
      getTokenDepositPercentage: () => 0.01,
      getNativeTokenData: () => ({ symbol: 'HTR', name: 'Hathor' }),
    },
  }),
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Import helpers after mocking to get the mock
import helpers from '../../utils/helpers';

describe('SelectTokenType', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderComponent = () => {
    return render(
      <MemoryRouter>
        <SelectTokenType />
      </MemoryRouter>
    );
  };

  it('renders both token type cards', () => {
    renderComponent();

    const depositTitle = screen.getByText('Deposit Token:');
    const feeTitle = screen.getByText('Fee Token:');

    expect(depositTitle instanceof HTMLElement).toStrictEqual(true);
    expect(feeTitle instanceof HTMLElement).toStrictEqual(true);
  });

  it('renders deposit token card content', () => {
    renderComponent();

    expect(screen.getByText('Requires a 1% HTR deposit.') instanceof HTMLElement).toStrictEqual(true); // Dynamic based on fullnode config
    expect(screen.getByText('No transaction fees in future transfers.') instanceof HTMLElement).toStrictEqual(true);
    expect(screen.getByText('Refundable if token is burned.') instanceof HTMLElement).toStrictEqual(true);
    expect(screen.getByText('Recommended for frequent use.') instanceof HTMLElement).toStrictEqual(true);
  });

  it('renders fee token card content', () => {
    renderComponent();

    expect(screen.getByText('No deposit required.') instanceof HTMLElement).toStrictEqual(true);
    expect(screen.getByText('A small fee applies to every transfer.') instanceof HTMLElement).toStrictEqual(true);
    expect(screen.getByText('Recommended for occasional use.') instanceof HTMLElement).toStrictEqual(true);
  });

  it('navigates to deposit token creation when clicking Create Deposit Token', () => {
    renderComponent();

    const depositButton = screen.getByText('Create Deposit Token');
    fireEvent.click(depositButton);

    expect(mockNavigate).toHaveBeenCalledWith(`/create_token/${TokenVersion.DEPOSIT}`);
  });

  it('navigates to fee token creation when clicking Create Fee Token', () => {
    renderComponent();

    const feeButton = screen.getByText('Create Fee Token');
    fireEvent.click(feeButton);

    expect(mockNavigate).toHaveBeenCalledWith(`/create_token/${TokenVersion.FEE}`);
  });

  it('opens external URL when clicking Learn more link', () => {
    renderComponent();

    const learnMoreLink = screen.getByText(/Learn more about deposits and fees here/);
    fireEvent.click(learnMoreLink);

    expect(helpers.openExternalURL).toHaveBeenCalledWith(TOKEN_FEE_RFC_URL);
  });

  it('displays warning about irreversible choice', () => {
    renderComponent();

    const warningText = screen.getByText('Once selected, the token type cannot be changed later.');
    expect(warningText instanceof HTMLElement).toStrictEqual(true);
  });
});
