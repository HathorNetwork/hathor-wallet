import React from 'react';
import { unmountComponentAtNode } from 'react-dom';
import { act, render, screen } from '@testing-library/react';
import $ from 'jquery'
import { SendTransaction } from '@hathor/wallet-lib';
import { ModalSendTx } from '../../components/ModalSendTx';
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
    // Using doMock instead of mock due to a bug in jest.
    // @see https://github.com/facebook/create-react-app/issues/9896#issuecomment-885029868
    jest.doMock('../../components/SendTxHandler', (props) => {
      mockChildComponent(props);
      return <mock-child-component/>
    })

    const mockPrepareSendTransaction = () => {
      const sendTransactionObj = new SendTransaction();
      sendTransactionObj.on = jest.fn();
      sendTransactionObj.run = jest.fn().mockImplementation(async () => {
        return ({ mockedTransaction: true });
      })
      return sendTransactionObj;
    };
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
    $(MODAL_ID).trigger('shown.bs.modal');
    await helpers.delay(0);

    // Simulating click ok button (by hiding the modal) and validating the onSuccess call
    $(MODAL_ID).trigger('hidden.bs.modal');
    expect(mockOnSuccess).toHaveBeenCalledWith({ mockedTransaction: true });
    expect(mockOnError).not.toHaveBeenCalled();
  });

  it('invokes onSendError callback on failure', async () => {
    const mockChildComponent = jest.fn();
    // Using doMock instead of mock due to a bug in jest.
    // @see https://github.com/facebook/create-react-app/issues/9896#issuecomment-885029868
    jest.doMock('../../components/SendTxHandler', (props) => {
      mockChildComponent(props);
      return <mock-child-component/>
    })

    const mockPrepareSendTransaction = () => {
      const sendTransactionObj = new SendTransaction();
      sendTransactionObj.on = jest.fn();
      sendTransactionObj.run = jest.fn().mockImplementation(async () => {
        throw new Error('SendTransaction Error')
      })
      return sendTransactionObj;
    };
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
    $(MODAL_ID).trigger('shown.bs.modal');
    await helpers.delay(0);

    // Simulating click ok button (by hiding the modal) and validating the onSuccess call
    $(MODAL_ID).trigger('hidden.bs.modal');
    expect(mockOnError).toHaveBeenCalledWith('SendTransaction Error');
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
