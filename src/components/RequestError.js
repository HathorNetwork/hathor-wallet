import React from 'react';
import $ from 'jquery';
import createRequestInstance from '../api/axiosInstance';
import { connect } from 'react-redux';
import helpers from '../utils/helpers';
import wallet from '../utils/wallet';


const mapStateToProps = (state) => {
  return { lastFailedRequest: state.lastFailedRequest };
};


class RequestErrorModal extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      retry: false
    };
  }

  componentDidMount = () => {
    $('#requestErrorModal').on('hidden.bs.modal', (e) => {
      if (this.state.retry) {
        this.modalHiddenRetry();
      }
    });
  }

  handleChangeServer = () => {
    $('#requestErrorModal').modal('hide');
    wallet.cleanServer();
    this.props.history.push('/server/');
  }

  handleRetryRequest = () => {
    this.setState({ retry: true }, () => {
      $('#requestErrorModal').modal('hide');
    });
  }

  modalHiddenRetry = () => {
    let config = this.props.lastFailedRequest;
    let axios = createRequestInstance();
    helpers.fixAxiosConfig(axios, config);
    axios(config).then((response) => {
      config.resolve(response.data);
    });
    this.setState({ retry: false });
  }

  render() {
    return (
      <div className="modal fade" id="requestErrorModal" tabIndex="-1" role="dialog" aria-labelledby="requestErrorModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">Request failed</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <p>Your request failed to reach the server. What do you want to do?</p>
            </div>
            <div className="modal-footer">
              <button onClick={this.handleChangeServer} type="button" className="btn btn-secondary">Change server</button>
              <button onClick={this.handleRetryRequest} type="button" className="btn btn-primary">Retry request</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default connect(mapStateToProps)(RequestErrorModal);