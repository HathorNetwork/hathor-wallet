import React from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { render, act, screen } from '@testing-library/react';
import { WalletAddress } from '../../components/WalletAddress';
import * as _ from 'lodash';

const sampleAddress = 'WPhehTyNHTPz954CskfuSgLEfuKXbXeK3f';

jest.mock('../../components/ModalAddressQRCode', () => () => {
  const MockName = "modal-address-qrcode-mock";
  return <MockName />;
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
    window.localStorage.setItem('localstorage:ishardware', 'false');
    render(
      <WalletAddress
        goToAllAddresses={jest.fn()}
        lastSharedAddress={sampleAddress}
        lastSharedIndex={''}
      />,
      container);

    // Ensure we found the full address text
    const elements = screen.getAllByText(sampleAddress);
    expect(elements).toHaveProperty('length');

    // No obscured addresses on screen
    const obscuredAddress = `${sampleAddress.substring(0, 10)}...`
    const element = screen.queryByText(obscuredAddress);
    expect(element).toBeNull();
  });

  it('renders the correct address on a hardware wallet', () => {
    window.localStorage.setItem('localstorage:ishardware', 'true');

    render(
      <WalletAddress
        goToAllAddresses={jest.fn()}
        lastSharedAddress={sampleAddress}
        lastSharedIndex={''}
      />,
      container);

    // Ensure the address is obscured
    const obscuredAddress = `${sampleAddress.substring(0, 10)}...`
    const obscuredElement = screen.getByText(obscuredAddress);
    expect(obscuredElement instanceof HTMLElement).toStrictEqual(true);

    // Ensure the full address text is not shown
    const clearElement = screen.queryByText(sampleAddress);
    expect(clearElement).toBeNull();
  });

  it('renders the "see all addresses" option on a software wallet', () => {
    window.localStorage.setItem('localstorage:ishardware', 'false');
    render(
      <WalletAddress
        goToAllAddresses={jest.fn()}
        lastSharedAddress={sampleAddress}
        lastSharedIndex={''}
      />,
      container);

    // Ensure we found the full address text
    const element = screen.getByText('See all addresses');
    expect(element instanceof HTMLElement).toStrictEqual(true);
  });

  it('does not render the "see all addresses" option on a hardware wallet', () => {
    window.localStorage.setItem('localstorage:ishardware', 'true');

    render(
      <WalletAddress
        goToAllAddresses={jest.fn()}
        lastSharedAddress={sampleAddress}
        lastSharedIndex={''}
      />,
      container);

    // Ensure we found the full address text
    const element = screen.queryByText('See all addresses');
    expect(element).toBeNull();
  });
});
