import React from 'react';
import ReactDOM from 'react-dom';
import PinPasswordWrapper from '../../components/PinPasswordWrapper';

it('renders without crashing', () => {
  const div = document.createElement('div');
  ReactDOM.render(
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
