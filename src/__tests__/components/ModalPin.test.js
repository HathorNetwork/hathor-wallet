import React from 'react';
import { unmountComponentAtNode } from "react-dom";
import { act, fireEvent, render, screen } from '@testing-library/react';
import $ from 'jquery'
import hathorLib from '@hathor/wallet-lib';
import { ModalPin } from "../../components/ModalPin";
import userEvent from "@testing-library/user-event";
import '@testing-library/jest-dom';

let container = null;

// This allows the calls to Bootstrap's $('#modalId').modal('show') to work.
$.fn.modal = jest.fn();

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
      <ModalPin
        wallet={{ }}
      />,
      container
    )
  })

  it('renders the bodyTop prop', () => {
    const bodyTop = <p>This is an extra element</p>;

    render(
      <ModalPin
        wallet={{ }}
        bodyTop={bodyTop}
      />,
      container
    )

    // Force creating the event, since the whole `modal` bootstrap class is mocked
    $('#modalPin').trigger('shown.bs.modal');
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
          wallet={{ }}
        />,
        container
      )
    });

    expect(new RegExp(validationPattern).test(failingPin)).toStrictEqual(false);
    expect(new RegExp(validationPattern).test(passingPin)).toStrictEqual(true);

    const pinMock = jest.spyOn(hathorLib.wallet, 'isPinCorrect')
      .mockImplementation(() => false);

    // Get the element
    /** @type HTMLElement */
    const pinInput = screen.getByTestId('pin-input');
    const goButton = screen.getByText('Go');
    await userEvent.type(pinInput, failingPin);
    await userEvent.click(goButton);
    expect(pinInput.validity.patternMismatch).toStrictEqual(true);
    expect(pinInput.checkValidity()).toStrictEqual(false);

    await userEvent.clear(pinInput);
    await userEvent.type(pinInput, passingPin);
    await userEvent.click(goButton);
    expect(pinInput.validity.patternMismatch).toStrictEqual(false);
    expect(pinInput.checkValidity()).toStrictEqual(true);

    pinMock.mockRestore();
  });

  it('displays error on incorrect pin', async () => {
    act(() => {
      render(
        <ModalPin
          wallet={{ }}
        />,
        container
      )
    });

    // Get the element
    /** @type HTMLElement */
    const pinInput = screen.getByTestId('pin-input');
    const goButton = screen.getByText('Go');
    await userEvent.type(pinInput, '123321');

    const pinMock = jest.spyOn(hathorLib.wallet, 'isPinCorrect')
      .mockImplementation(() => false);
    await userEvent.click(goButton);
    pinMock.mockRestore();

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
          wallet={{ }}
          onSuccess={successCallback}
          onClose={closeCallback}
        />,
        container
      )
    });

    // Get the pin input element
    /** @type HTMLElement */
    const pinInput = screen.getByTestId('pin-input');
    const goButton = screen.getByText('Go');

    await userEvent.type(pinInput, pinText);
    const pinMock = jest.spyOn(hathorLib.wallet, 'isPinCorrect')
      .mockImplementation(() => true);
    await userEvent.click(goButton);
    pinMock.mockRestore();

    const element = screen.queryByText('Invalid PIN');
    expect(element).toBeNull();

    // Force creating the event, since the whole `modal` bootstrap class is mocked
    $('#modalPin').trigger('hidden.bs.modal');
    expect(successCallback).toHaveBeenCalledWith({ pin: pinText });
    expect(closeCallback).toHaveBeenCalled();
  });
});
