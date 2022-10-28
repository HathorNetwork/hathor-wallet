import React from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { render, act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PinPasswordWrapper from '../../components/PinPasswordWrapper';

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
})

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
})
