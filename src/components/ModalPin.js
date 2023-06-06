/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import PinInput from './PinInput';
import { connect } from 'react-redux';
import PropTypes from "prop-types";


const mapStateToProps = (state) => {
  return {
    wallet: state.wallet,
  };
};

/**
 * Component that shows a modal with a form to ask for the user PIN
 * and when the PIN succeeds, it invokes the callback function
 * @memberof Components
 */
export class ModalPin extends React.Component {
  /**
   * errorMessage {string} Message to be shown to the user in case of error in the form
   */
  state = {
    errorMessage: '',
  }

  pin = '';

  componentDidMount = () => {
    $('#modalPin').modal('show');
    $('#modalPin').on('hidden.bs.modal', (e) => {
      // Mandatory cleanup by GlobalModal
      this.props.onClose();

      // If the correct PIN was inserted, call the `onSuccess` callback
      if (this.pin) {
        this.props.onSuccess({ pin: this.pin })
      }
    });

    // Focus the PIN field on modal load
    $('#modalPin').on('shown.bs.modal', (e) => {
      this.refs.pinInput.refs.pin.focus();
    });
  }

  componentWillUnmount = () => {
    // Removing all event listeners
    $('#modalPin').off();
    $('#modalPin').modal('hide');
  }

  /**
   * Method called after user clicks the 'Go' button.
   * We validate the form and that the pin is correct, then call a method from props.
   *
   * @param {React.MouseEvent<HTMLElement>} e Event emitted when button is clicked
   */
  handlePin = async (e) => {
    e.preventDefault();

    // Invalid form, show error message and do nothing else
    if (this.refs.formPin.checkValidity() === false) {
      this.refs.formPin.classList.add('was-validated');
      return;
    }

    // Check if the pin is correct
    this.refs.formPin.classList.remove('was-validated');
    const pin = this.refs.pinInput.refs.pin.value;

    // Incorrect PIN, show error message and do nothing else
    if (!await this.props.wallet.checkPin(pin)) {
      this.setState({ errorMessage: t`Invalid PIN` })
      return;
    }

    // Set the PIN on the instance variable and close the modal.
    this.pin = pin;

    // Necessary callbacks will be executed at the `onHidden` modal event
    $('#modalPin').modal('hide');
  }

  render() {
    const renderBody = () => <div>
        {this.props.bodyTop}
        <form ref="formPin" onSubmit={this.handlePin} noValidate>
          <div className="form-group">
            <PinInput ref="pinInput" handleChangePin={this.props.handleChangePin}/>
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

    return <div>
        <div className="modal fade" id="modalPin" tabIndex="-1" role="dialog" aria-labelledby="modalPin"
             aria-hidden="true">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="exampleModalLabel">{t`Write your PIN`}</h5>
                <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                  <span aria-hidden="true">&times;</span>
                </button>
              </div>
              <div className="modal-body modal-body-pin">
                {renderBody()}
              </div>
              <div className="modal-footer">
                <div className="d-flex flex-row">
                  <button type="button" className="btn btn-secondary mr-3"
                          data-dismiss="modal">{t`Cancel`}</button>
                  <button onClick={this.handlePin} type="button"
                          className="btn btn-hathor">{t`Go`}</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
  }
}

export default connect(mapStateToProps)(ModalPin);


ModalPin.propTypes = {
  /**
   * A React element that can optionally be rendered before the PIN input
   */
  bodyTop: PropTypes.element,
  /**
   * An optional callback function called every time the PIN receives input
   */
  handleChangePin: PropTypes.func,
  /**
   * Callback invoked when tx is sent with success
   */
  onSuccess: PropTypes.func.isRequired,
  /**
   * Callback provided by the GlobalModal helper to manage the modal lifecycle
   */
  onClose: PropTypes.func.isRequired,
}
