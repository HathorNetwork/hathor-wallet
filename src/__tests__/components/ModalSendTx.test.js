import React from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { act, render, screen } from '@testing-library/react';
import $ from 'jquery'
import hathorLib from '@hathor/wallet-lib';
import { ModalSendTx } from '../../components/ModalSendTx';
import { SendTxHandler } from '../../components/SendTxHandler';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';
import helpers from '../../utils/helpers';

let container = null;

// This allows the calls to Bootstrap's $('#modalId').modal('show') to work.
$.fn.modal = jest.fn();
const MODAL_ID = '#sendTxModal';

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
      <ModalSendTx
        pin={'123321'}
        title={'Mock Title'}
        prepareSendTransaction={jest.fn()}
        onSendSuccess={jest.fn()}
        onClose={jest.fn()}
      />,
      container
    )
  })

  it('renders the title prop correctly', () => {
    render(
      <ModalSendTx
        pin={'123321'}
        title={'Mock Title'}
        prepareSendTransaction={jest.fn()}
        onSendSuccess={jest.fn()}
        onClose={jest.fn()}
      />,
      container
    )

    // Force creating the event, since the whole `modal` bootstrap class is mocked
    $('#modalPin').trigger('shown.bs.modal');
    const element = screen.getByText('Mock Title');
    expect(element instanceof HTMLElement).toStrictEqual(true);
  })

  // TODO: Test that Renders the button disabled and error message empty
});

describe('tx handling', () => {
  it.skip('handles errors from the prepareSendTransaction prop', () => {
    // TODO: Implement this handling
  });

  it('invokes onSendSuccess callback correctly', async () => {
    const mockChildComponent = jest.fn();
    jest.mock('../../components/SendTxHandler', (props) => {
      mockChildComponent(props);
      return <mock-child-component/>
    })

    const mockPrepareSendTransaction = () => ({
      on: () => jest.fn(), // Necessary for the event listeners
      run: async () => {
        return ({ mockedTransaction: true });
      }
    });
    const mockOnSuccess = jest.fn();
    const mockOnError = jest.fn();

    act(() => {
      render(
        <ModalSendTx
          pin={'123321'}
          title={'Mock Title'}
          prepareSendTransaction={mockPrepareSendTransaction}
          onSendSuccess={mockOnSuccess}
          onSendError={mockOnError}
          onClose={jest.fn()}
        />,
        container
      )
    });

    // Waiting until the transaction has been "processed"
    await helpers.delay(0);

    // Simulating click ok button (by hiding the modal) and validating the onSuccess call
    $(MODAL_ID).trigger('hidden.bs.modal');
    expect(mockOnSuccess).toHaveBeenCalledWith({ mockedTransaction: true });
    expect(mockOnError).not.toHaveBeenCalled();
  });

  it('invokes onSendError callback on failure', async () => {
    const mockChildComponent = jest.fn();
    jest.mock('../../components/SendTxHandler', (props) => {
      mockChildComponent(props);
      return <mock-child-component/>
    })

    const mockPrepareSendTransaction = () => ({
      on: () => jest.fn(), // Necessary for the event listeners
      run: async () => {
        throw new Error('SendTransaction Error')
      }
    });
    const mockOnSuccess = jest.fn();
    const mockOnError = jest.fn();

    act(() => {
      render(
        <ModalSendTx
          pin={'123321'}
          title={'Mock Title'}
          prepareSendTransaction={mockPrepareSendTransaction}
          onSendSuccess={mockOnSuccess}
          onSendError={mockOnError}
          onClose={jest.fn()}
        />,
        container
      )
    });

    // Waiting until the transaction has been "processed"
    await helpers.delay(0);

    // Simulating click ok button (by hiding the modal) and validating the onSuccess call
    $(MODAL_ID).trigger('hidden.bs.modal');
    expect(mockOnError).toHaveBeenCalledWith('SendTransaction Error');
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
