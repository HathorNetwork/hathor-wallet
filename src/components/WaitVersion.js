import React from 'react';
import RequestErrorModal from '../components/RequestError';


class WaitVersion extends React.Component {
  render() {
    return (
        <RequestErrorModal {...this.props} />
    )
  }
}

export default WaitVersion;