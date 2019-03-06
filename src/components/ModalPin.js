import React from 'react';
import $ from 'jquery';
import PinInput from './PinInput';
import wallet from '../utils/wallet';


class ModalPin extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      errorMessage: '',
    }
  }

  componentDidMount = () => {
    $('#pinModal').on('hide.bs.modal', (e) => {
      this.setState({ errorMessage: '' });
      this.refs.pinInput.refs.pin.value = '';
    })

    $('#pinModal').on('shown.bs.modal', (e) => {
      this.refs.pinInput.refs.pin.focus();
    })
  }

  handlePin = (e) => {
    e.preventDefault();
    if (this.refs.formPin.checkValidity() === false) {
      this.refs.formPin.classList.add('was-validated');
    } else {
      this.refs.formPin.classList.remove('was-validated');
      if (wallet.isPinCorrect(this.refs.pinInput.refs.pin.value)) {
        this.props.execute();
      } else {
        this.setState({errorMessage: 'Invalid PIN'})
      }
    }
  }

  render() {
    return (
      <div className="modal fade" id="pinModal" tabIndex="-1" role="dialog" aria-labelledby="pinModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">Write your PIN</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <form ref="formPin" onSubmit={this.handlePin} noValidate>
                <div className="form-group">
                  <PinInput ref="pinInput" handleChangePin={this.props.handleChangePin} />
                </div>
                <div className="row">
                  <div className="col-12 col-sm-10">
                      <p className="error-message text-danger">
                        {this.state.errorMessage}
                      </p>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              <button onClick={this.handlePin} type="button" className="btn btn-hathor">Go</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ModalPin;