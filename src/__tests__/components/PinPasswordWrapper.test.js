import React from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { render, act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PinPasswordWrapper from '../../components/PinPasswordWrapper';
import * as _ from 'lodash';

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

// Rendering
it('renders without crashing', () => {
  render(
    <PinPasswordWrapper
      message={(<div/>)}
      success={jest.fn()}
      back={jest.fn()}
      handleChange={jest.fn()}
      field={`Password`}
      button={`Next`}
      pattern={'arbitrary_pattern'}
    />,
    container);
});

it('renders with the specified placeholder text', () => {
  expect.assertions();
  const placeholderText = `field-${Math.random()}`;

  // Render the element
  act(() => {
    render(
      <PinPasswordWrapper
        message={(<div/>)}
        success={jest.fn()}
        back={jest.fn()}
        handleChange={jest.fn()}
        field={placeholderText}
        button={`Next`}
        pattern={'*'}
      />,
      container
    )
  });

  // Get the element
  const passInput = screen.getByPlaceholderText(placeholderText);
  expect(passInput).toBeInstanceOf(HTMLElement);
});

it('renders with the specified message', () => {
  expect.assertions();
  const message = `Sample message ${Math.random()}`;

  // Render the element
  act(() => {
    render(
      <PinPasswordWrapper
        message={<div>{message}</div>}
        success={jest.fn()}
        back={jest.fn()}
        handleChange={jest.fn()}
        field={'Password'}
        button={`Next`}
        pattern={'*'}
      />,
      container
    )
  });

  // Get the element
  const element = screen.getByText(message);
  expect(element instanceof HTMLElement).toStrictEqual(true);
});

it('renders with the specified "next" button label', () => {
  expect.assertions();
  const message = `Btn ${Math.random()}`;

  // Render the element
  act(() => {
    render(
      <PinPasswordWrapper
        message={<div/>}
        success={jest.fn()}
        back={jest.fn()}
        handleChange={jest.fn()}
        field={'Password'}
        button={message}
        pattern={'*'}
      />,
      container
    )
  });

  // Get the element
  const button = screen.getByText(message);
  expect(button instanceof HTMLElement).toStrictEqual(true);
  expect(button.classList).toContain('btn-hathor')
});

// Methods
it('calls change handler method on change', async () => {
  expect.assertions();

  const changeHandler = jest.fn();
  // Render the element
  act(() => {
    render(
      <PinPasswordWrapper
        message={(<div/>)}
        success={jest.fn()}
        back={jest.fn()}
        handleChange={changeHandler}
        field={`Password`}
        button={`Next`}
        pattern={'*'}
      />,
      container
    )
  });

  // Get the element
  const passInput = screen.getByPlaceholderText('Password');
  await userEvent.type(passInput, 'abc123');
  expect(changeHandler).toHaveBeenCalledTimes(6);
  expect(changeHandler).toHaveBeenLastCalledWith('abc123')
});

it('calls back handler method on button click', async () => {
  expect.assertions();

  const backHandler = jest.fn();
  // Render the element
  act(() => {
    render(
      <PinPasswordWrapper
        message={(<div/>)}
        success={jest.fn()}
        back={backHandler}
        handleChange={jest.fn()}
        field={`Password`}
        button={`Next`}
        pattern={'*'}
      />,
      container
    )
  });

  // Get the element
  const backButton = screen.getByText('Back');
  await userEvent.click(backButton);
  expect(backHandler).toHaveBeenCalledTimes(1);
});

it('ensures the field pattern is applied', async () => {
  expect.assertions();
  const validationPattern = '[0-9]+';
  const failingText = 'abc';
  const passingText = '123';

  // Render the element
  act(() => {
    render(
      <PinPasswordWrapper
        message={(<div/>)}
        success={jest.fn()}
        back={jest.fn()}
        handleChange={jest.fn()}
        field={`Password`}
        button={`Next`}
        pattern={validationPattern}
      />,
      container
    )
  });

  expect(new RegExp(validationPattern).test(failingText)).toStrictEqual(false);
  expect(new RegExp(validationPattern).test(passingText)).toStrictEqual(true);

  /** @type HTMLElement */
  const passInput = screen.getByPlaceholderText('Password');
  await userEvent.type(passInput, failingText);
  expect(passInput.validity.patternMismatch).toStrictEqual(true);
  expect(passInput.checkValidity()).toStrictEqual(false);

  await userEvent.clear(passInput);
  await userEvent.type(passInput, passingText);
  expect(passInput.validity.patternMismatch).toStrictEqual(false);
  expect(passInput.checkValidity()).toStrictEqual(true);
});

it('validates password confirmation on button click', async () => {
  expect.assertions();

  const successHandler = jest.fn();
  // Render the element
  act(() => {
    render(
      <PinPasswordWrapper
        message={(<div/>)}
        success={successHandler}
        back={jest.fn()}
        handleChange={jest.fn()}
        field={`Password`}
        button={`Next`}
        pattern={'[0-9]+'} // Only numbers are allowed
      />,
      container
    )
  });

  // Get the elements
  const nextButton = screen.getByText('Next');
  const passInput = screen.getByPlaceholderText('Password');
  const confirmPassInput = screen.getByPlaceholderText(/^Confirm/);

  // Fill password field with invalid data and click
  await userEvent.type(passInput, 'abc');
  await userEvent.click(nextButton);
  expect(passInput.parentElement.classList).toContain('was-validated');
  expect(successHandler).not.toHaveBeenCalled();

  // Fill confirmation field with invalid data and click
  await userEvent.clear(passInput);
  await userEvent.type(passInput, '123');
  await userEvent.type(confirmPassInput, 'abc');
  expect(passInput.parentElement.classList).toContain('was-validated');
  expect(successHandler).not.toHaveBeenCalled();

  // Fill both with valid data, but not matching
  await userEvent.clear(confirmPassInput);
  await userEvent.type(confirmPassInput, '321');
  await userEvent.click(nextButton);
  expect(passInput.parentElement.classList).not.toContain('was-validated');
  expect(screen.getByText('Both fields must be equal')).toBeInstanceOf(HTMLElement);
  expect(successHandler).not.toHaveBeenCalled();
});

it('calls success handler method on button click', async () => {
  expect.assertions();

  const successHandler = jest.fn();
  // Render the element
  act(() => {
    render(
      <PinPasswordWrapper
        message={(<div/>)}
        success={successHandler}
        back={jest.fn()}
        handleChange={jest.fn()}
        field={`Password`}
        button={`Next`}
        pattern={'[0-9]+'} // Only numbers are allowed
      />,
      container
    )
  });

  // Get the elements
  const nextButton = screen.getByText('Next');
  const passInput = screen.getByPlaceholderText('Password');
  const confirmPassInput = screen.getByPlaceholderText(/^Confirm/);

  await userEvent.type(passInput, '123');
  await userEvent.type(confirmPassInput, '123');
  await userEvent.click(nextButton);
  expect(passInput.parentElement.classList).not.toContain('was-validated');
  expect(successHandler).toHaveBeenCalledTimes(1);
});
