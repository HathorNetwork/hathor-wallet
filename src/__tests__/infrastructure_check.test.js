import { render, screen } from '../test-utils';
import React from 'react';
import { expectSaga } from 'redux-saga-test-plan';
import rootReducer from '../reducers';

// Sample Component
const TestComponent = () => <div>Test Component</div>;

describe('Infrastructure Check', () => {
  test('Component render', () => {
    render(<TestComponent />);
    expect(screen.getByText('Test Component')).toBeInTheDocument();
  });

  test('Reducer initial state', () => {
    const initialState = rootReducer(undefined, { type: '@@INIT' });
    expect(initialState).toHaveProperty('tokens');
  });

  test('Saga test', () => {
    function* sampleSaga() {
      yield 1;
      return 1;
    }
    return expectSaga(sampleSaga)
      .returns(1)
      .run();
  });
});
