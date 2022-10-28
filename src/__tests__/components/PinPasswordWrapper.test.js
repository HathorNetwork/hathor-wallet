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
  const div = document.createElement('div');
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
    div);
});

it('calls change handler method on change', async () => {
  expect.assertions(2);

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
        pattern={'\\'}
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
