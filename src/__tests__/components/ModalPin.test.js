import React from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { act, render, screen } from '@testing-library/react';
import $ from 'jquery'
import hathorLib from '@hathor/wallet-lib';
import { ModalPin } from '../../components/ModalPin';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

let container = null;
const MODAL_ID = '#modalPin';

// This allows the calls to Bootstrap's $('#modalId').modal('show') to work.
$.fn.modal = jest.fn();

beforeEach(() => {
  // setup a DOM element as a render target
  container = document.createElement('div');
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
      <ModalPin
        onSuccess={jest.fn()}
        onClose={jest.fn()}
      />,
      container
    )
  })

  it('renders the bodyTop prop', () => {
    const bodyTop = <p>This is an extra element</p>;

    render(
      <ModalPin
        onSuccess={jest.fn()}
        onClose={jest.fn()}
        bodyTop={bodyTop}
      />,
      container
    )

    // Force creating the event, since the whole `modal` bootstrap class is mocked
    $(MODAL_ID).trigger('shown.bs.modal');
    const element = screen.getByText('This is an extra element');
    expect(element instanceof HTMLElement).toStrictEqual(true);
  })
});
describe('pin validation', () => {

  it('displays correctly on invalid pin pattern', async () => {
    const validationPattern = '[0-9]{6}';
    const failingPin = 'abc123';
    const passingPin = '123321'
    act(() => {
      render(
        <ModalPin
          onSuccess={jest.fn()}
          onClose={jest.fn()}
        />,
        container
      )
    });

    expect(new RegExp(validationPattern).test(failingPin)).toStrictEqual(false);
    expect(new RegExp(validationPattern).test(passingPin)).toStrictEqual(true);

    const pinMock = jest.spyOn(hathorLib.wallet, 'isPinCorrect')
      .mockImplementation(() => false);

    // Gets the input element, types the pin and clicks "Go"
    /** @type HTMLElement */
    const pinInput = screen.getByTestId('pin-input');
    const goButton = screen.getByText('Go');
    await userEvent.type(pinInput, failingPin);
    await userEvent.click(goButton);

    // Validating form
    expect(pinInput.validity.patternMismatch).toStrictEqual(true);
    expect(pinInput.checkValidity()).toStrictEqual(false);

    // Clears input, types again
    await userEvent.clear(pinInput);
    await userEvent.type(pinInput, passingPin);
    await userEvent.click(goButton);

    // Validating form
    expect(pinInput.validity.patternMismatch).toStrictEqual(false);
    expect(pinInput.checkValidity()).toStrictEqual(true);

    pinMock.mockRestore();
  });

  it('displays error on incorrect pin', async () => {
    act(() => {
      render(
        <ModalPin
          onSuccess={jest.fn()}
          onClose={jest.fn()}
        />,
        container
      )
    });

    // Gets the input element, types the pin
    /** @type HTMLElement */
    const pinInput = screen.getByTestId('pin-input');
    const goButton = screen.getByText('Go');
    await userEvent.type(pinInput, '123321');

    // Clicks "Go"
    const pinMock = jest.spyOn(hathorLib.wallet, 'isPinCorrect')
      .mockImplementation(() => false);
    await userEvent.click(goButton);
    pinMock.mockRestore();

    // Validates error message
    const element = screen.getByText('Invalid PIN');
    expect(element instanceof HTMLElement).toStrictEqual(true);
  });

  it('invokes success callback when pin is correct', async () => {
    const successCallback = jest.fn();
    const closeCallback = jest.fn();
    const pinText = '123321';

    act(() => {
      render(
        <ModalPin
          onSuccess={successCallback}
          onClose={closeCallback}
        />,
        container
      )
    });

    // Gets the input element, types the pin
    /** @type HTMLElement */
    const pinInput = screen.getByTestId('pin-input');
    const goButton = screen.getByText('Go');
    await userEvent.type(pinInput, pinText);

    // Clicks "Go"
    const pinMock = jest.spyOn(hathorLib.wallet, 'isPinCorrect')
      .mockImplementation(() => true);
    await userEvent.click(goButton);
    pinMock.mockRestore();

    // Confirms there is no error message
    const element = screen.queryByText('Invalid PIN');
    expect(element).toBeNull();

    // Force creating the event, since the whole `modal` bootstrap class is mocked
    $(MODAL_ID).trigger('hidden.bs.modal');
    expect(successCallback).toHaveBeenCalledWith({ pin: pinText });
    expect(closeCallback).toHaveBeenCalled();
  });

  it('invokes handleChangePin callback correctly', async () => {
    const successCallback = jest.fn();
    const closeCallback = jest.fn();

    // Validating that all inputs are correctly processed in order
    const pinText = '123321';
    const receivedEvents = [];
    const expectedReceivedEvents = [
      '1',
      '12',
      '123',
      '1233',
      '12332',
      '123321',
    ]
    const changePinCallback = jest.fn().mockImplementation((e) => {
      receivedEvents.push(e.target.value);
    });

    act(() => {
      render(
        <ModalPin
          onSuccess={successCallback}
          onClose={closeCallback}
          handleChangePin={changePinCallback}
        />,
        container
      )
    });

    // Gets the input element, types the pin
    /** @type HTMLElement */
    const pinInput = screen.getByTestId('pin-input');
    await userEvent.type(pinInput, pinText);

    // Validates the handleChange callback results
    expect(changePinCallback).toHaveBeenCalledTimes(6);
    expect(receivedEvents).toStrictEqual(expectedReceivedEvents);
  });
});
