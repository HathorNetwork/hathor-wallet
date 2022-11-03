import React from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { render, act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { WalletAddress } from '../../components/WalletAddress';
import * as _ from 'lodash';
import hathorLib from '@hathor/wallet-lib'

const sampleAddress = 'WPhehTyNHTPz954CskfuSgLEfuKXbXeK3f';

class ModalAddressQRCodeMock extends React.Component {
  render() { return <div/> }
}
jest.mock('../../components/ModalAddressQRCode', () => () => {
  const MockName = "modal-address-qrcode-mock";
  return <MockName />;
});

// Mocking the underlying hathor wallet to better manage the tests
let oldWallet;
beforeAll(() => {
  oldWallet = hathorLib.wallet;
  hathorLib.wallet = {
    isSoftwareWallet: () => true,
    isHardwareWallet: () => false
  }
});

afterAll(() => {
  hathorLib.wallet = oldWallet;
});

let container = null;
beforeEach(() => {
  // setup a DOM element as a render target
  container = document.createElement("div");
  document.body.appendChild(container);
});

afterEach(() => {
  // cleanup on exiting
  unmountComponentAtNode(container);
  container.remove();
  container = null;
});

describe('rendering tests', () => {
  it('renders without crashing', () => {
    render(
      <WalletAddress
        goToAllAddresses={jest.fn()}
        lastSharedAddress={''}
        lastSharedIndex={''}
      />,
      container);
  });

  it('renders the correct address on a software wallet', () => {
    render(
      <WalletAddress
        goToAllAddresses={jest.fn()}
        lastSharedAddress={sampleAddress}
        lastSharedIndex={''}
      />,
      container);

    const elements = screen.getAllByText(sampleAddress);
    expect(elements).toHaveProperty('length'); // Just to know we've found something
  });

  it('renders the correct address on a hardware wallet', () => {
    hathorLib.wallet.isSoftwareWallet = () => false;
    hathorLib.wallet.isHardwareWallet = () => true;

    render(
      <WalletAddress
        goToAllAddresses={jest.fn()}
        lastSharedAddress={sampleAddress}
        lastSharedIndex={''}
      />,
      container);

    const obscuredAddress = `${sampleAddress.substring(0, 10)}...`

    const element = screen.getByText(obscuredAddress);
    expect(element instanceof HTMLElement).toStrictEqual(true);
  });

});
