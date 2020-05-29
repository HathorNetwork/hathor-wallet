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
import hathorLib from '@hathor/wallet-lib';
import SendTxHandler from '../components/SendTxHandler';
import ReactLoading from 'react-loading';
import colors from '../index.scss';


/**
 * Component that shows a modal with a form to ask for the user PIN
 * and when the PIN succeeds, it sends a transaction
 *
 * @memberof Components
 */
class ModalSendTx extends React.Component {
  /**
   * errorMessage {string} Message to be shown to the user in case of error in the form
   */
  state = {
    errorMessage: '',
    step: 0,
    loading: false,
    tx: null,
    sendErrorMessage: '',
    pin: '',
  }

  componentDidMount = () => {
    $('#pinModal').on('hidden.bs.modal', (e) => {
      if (this.state.tx && this.props.onSendSuccess) {
        this.props.onSendSuccess(this.state.tx);
        return;
      }

      if (this.state.sendErrorMessage && this.props.onSendError) {
        this.props.onSendError(this.state.sendErrorMessage);
        return;
      }

      this.setState({ errorMessage: '', step: 0 }, () => {
        this.refs.pinInput.refs.pin.value = '';
      });
    })

    $('#pinModal').on('shown.bs.modal', (e) => {
      this.refs.pinInput.refs.pin.focus();
    })
  }

  componentWillUnmount = () => {
    // Removing all event listeners
    $('#pinModal').off();
  }

  /**
   * Method called after user clicks the 'Go' button. We validate the form and that the pin is correct, then call a method from props
   *
   * @param {Object} e Event emitted when button is clicked
   */
  handlePin = (e) => {
    e.preventDefault();
    if (this.refs.formPin.checkValidity() === false) {
      this.refs.formPin.classList.add('was-validated');
    } else {
      this.refs.formPin.classList.remove('was-validated');
      const pin = this.refs.pinInput.refs.pin.value;
      if (hathorLib.wallet.isPinCorrect(pin)) {
        $('#pinModal').data('bs.modal')._config.backdrop = 'static';
        $('#pinModal').data('bs.modal')._config.keyboard = false;
        const sendTransaction = this.props.prepareSendTransaction(pin);
        if (sendTransaction) {
          // Show send tx handler component and start sending
          this.setState({ step: 1, loading: true, sendTransaction });
        } else {
          // Close modal and show error
          $('#pinModal').modal('hide');
        }
      } else {
        this.setState({errorMessage: t`Invalid PIN`})
      }
    }
  }

  onClickOk = () => {
    $('#pinModal').modal('hide');
  }

  onSendSuccess = (tx) => {
    this.setState({ loading: false, tx });
  }

  onSendError = (message) => {
    this.setState({ loading: false, sendErrorMessage: message });
  }

  render() {
    const renderBody = () => {
      if (this.state.step === 0) {
        return (
          <div>
            {this.props.bodyTop}
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
        );
      } else {
        return <SendTxHandler
                sendTransaction={this.state.sendTransaction}
                onSendSuccess={this.onSendSuccess}
                onSendError={this.onSendError} />
      }
    }

    const renderTitle = () => {
      if (this.state.step === 0) {
        return "Write your PIN";
      } else {
        return this.props.title;
      }
    }

    const renderCloseButton = () => {
      return (
        <button type="button" className="close" data-dismiss="modal" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      );
    }

    const renderFooter = () => {
      if (this.state.step === 0) {
        return (
          <div className="d-flex flex-row">
            <button type="button" className="btn btn-secondary mr-3" data-dismiss="modal">{t`Cancel`}</button>
            <button onClick={this.handlePin} type="button" className="btn btn-hathor">{t`Go`}</button>
          </div>
        );
      } else {
        return (
          <div className="d-flex flex-row align-items-center">
            {this.state.loading && <ReactLoading type='spin' color={colors.purpleHathor} width={24} height={24} delay={200} />}
            <button type="button" className="btn btn-hathor ml-3" onClick={this.onClickOk} disabled={this.state.loading}>{t`Ok`}</button>
          </div>
        );
      }
    }

    return (
      <div>
        <div className="modal fade" id="pinModal" tabIndex="-1" role="dialog" aria-labelledby="pinModal" aria-hidden="true">
          <div className="modal-dialog" role="document">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title" id="exampleModalLabel">{renderTitle()}</h5>
                {this.state.step === 0 && renderCloseButton()}
              </div>
              <div className="modal-body modal-body-pin">
                {renderBody()}
              </div>
              <div className="modal-footer">
                {renderFooter()}
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ModalSendTx;
