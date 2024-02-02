/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import ReactLoading from 'react-loading';
import colors from '../../index.module.scss';
import { connect } from "react-redux";
import { MODAL_TYPES, GlobalModalContext } from '../../components/GlobalModal';


const mapStateToProps = (state) => {
  return {
    metadataLoaded: state.metadataLoaded,
  };
};


/**
 * Component used by all form action in the token detail screen
 *
 * @memberof Components
 */
class TokenAction extends React.Component {
  static contextType = GlobalModalContext;

  constructor(props) {
    super(props);

    /**
     * successMessage {string} success message to show
     * errorMessage {string} error message to show
     * loading {boolean} if should show loading spinner
     * pin {string} pin typed on input
     * formValidated {boolean} if form was already validated
     */
    this.state = {
      successMessage: '',
      errorMessage: '',
      loading: false,
      pin: '',
      formValidated: false,
    }

    // Reference to the form
    this.form = React.createRef();
  }

  /**
   * Show alert success message
   *
   * @param {string} message Success message
   */
  showSuccess = (message) => {
    this.setState({ successMessage: message }, () => {
      this.refs.alertSuccess.show(3000);
    })
  }

  /**
   * Update PIN state when changing it on the PIN modal
   *
   * @param {Object} e Event when changing PIN text
   */
  handleChangePin = (e) => {
    this.setState({ pin: e.target.value });
  }

  /**
   * Method executed when user clicks the button to execute the action.
   * It will run the form validation and open the PIN modal, in case of success
   */
  validateForm = () => {
    const isValid = this.form.current.checkValidity();
    this.setState({ formValidated: true, errorMessage: '' });
    if (isValid) {
      if (this.props.validateForm) {
        // Some actions might not need to do a cystom form validation
        const errorMessage = this.props.validateForm();
        if (errorMessage) {
          this.setState({ errorMessage });
          return;
        }
      }
      this.openPinModal();
    }
  }

  /**
   * Opens the PIN modal
   */
  openPinModal = () => {
    this.context.showModal(MODAL_TYPES.PIN, {
      bodyTop: this.props.pinBodyTop,
      onSuccess: ({pin}) => {
        this.context.showModal(MODAL_TYPES.SEND_TX, {
          pin,
          title: this.props.modalTitle,
          prepareSendTransaction: this.onPrepareSendTransaction,
          onSendSuccess: this.onSendSuccess,
          onSendError: this.onSendError,
        });
      }
    })
  }

  /**
   * Method executed when transaction is sent and the action is done
   */
  onSendSuccess = () => {
    const successMessage = this.props.getSuccessMessage();
    this.props.cancelAction();
    this.props.showSuccess(successMessage);
  }

  /**
   * Method executed when there is an error sending the action transaction
   *
   * @param {String} message Error message
   */
  onSendError = (message) => {
    this.setState({ errorMessage: message, loading: false });
  }

  /**
   * Method executed after PIN is written
   * If success when preparing the tx, return the send tx object
   * Otherwise, show error message
   *
   * @param {String} pin PIN written by the user
   */
  onPrepareSendTransaction = async (pin) => {
    try {
      const sendTransaction = await this.props.prepareSendTransaction(pin);
      return sendTransaction;
    } catch (e) {
      this.onSendError(e.message);
    }
  }

  render() {
    if (!this.props.metadataLoaded) {
      return <p>{t`Loading metadata...`}</p>
    }

    const renderButtons = () => {
      return (
        <div className='d-flex mt-4 flex-column'>
          {this.state.errorMessage && <p className='text-danger mb-4'>{this.state.errorMessage}</p>}
          <div className='d-flex align-items-center'>
            <button className='btn btn-secondary mr-3' disabled={this.state.loading} onClick={this.props.cancelAction}>{t`Cancel`}</button>
            <button className='btn btn-hathor mr-4' disabled={this.state.loading} onClick={this.validateForm}>{this.props.buttonName}</button>
            {this.state.loading && <ReactLoading type='spin' color={colors.purpleHathor} width={32} height={32} delay={200} />}
          </div>
        </div>
      )
    }

    return (
      <div key={this.props.action}>
        <h2>{this.props.title}</h2>
        <p>{this.props.subtitle}</p>
        <p>{this.props.deposit}</p>
        <form className={`mt-4 mb-3 ${this.state.formValidated ? 'was-validated' : ''}`} ref={this.form} onSubmit={(e) => e.preventDefault()}>
          {this.props.renderForm()}
        </form>
        {renderButtons(this.props.validateForm, this.props.buttonName)}
      </div>
    )
  }
}

export default connect(mapStateToProps)(TokenAction);
