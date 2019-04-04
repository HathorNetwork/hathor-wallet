import React from 'react';
import RequestErrorModal from '../components/RequestError';


/**
 * Component that renders only the request error modal (so a blank page)  
 * Used because when checking the API version for the first time we need to wait to show the page,
 * so if any error happens in this request we need the error modal
 *
 * @memberof Components
 */
class WaitVersion extends React.Component {
  render() {
    return (
        <RequestErrorModal {...this.props} />
    )
  }
}

export default WaitVersion;