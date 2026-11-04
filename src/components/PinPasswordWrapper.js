/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'


/**
 * Component to choose a password
 * Shows two password fields with required pattern and validations
 *
 * @memberof Components
 */
class PinPasswordWrapper extends React.Component {
  constructor(props) {
    super(props);

    /**
     * errorMessage {string} Message to be shown when an error happens
     */
    this.state = {
      errorMessage: '',
    }
  }

  /**
   * Test id of a child element, from the `testId` prop (e.g. `choose-pin-next`)
   *
   * @param {string} element
   * @return {string|undefined} undefined without a `testId` prop, so React adds no attribute
   */
  testId = (element) => (this.props.testId ? `${this.props.testId}-${element}` : undefined);

  /**
   * Called when user finish filling the inputs
   * Validates the form and call the success message
   */
  next = () => {
    const isValid = this.refs.passwordForm.checkValidity();
    if (isValid) {
      this.refs.passwordForm.classList.remove('was-validated')
      const password = this.refs.password.value;
      const confirmPassword = this.refs.confirmPassword.value;
      if (password !== confirmPassword) {
        this.setState({ errorMessage: t`Both fields must be equal` });
      } else {
        this.props.success();
      }
    } else {
      this.refs.passwordForm.classList.add('was-validated')
    }
  }

  render() {
    return (
      <div className="d-flex align-items-start flex-column" data-testid={this.props.testId}>
        {this.props.message}
        <form ref="passwordForm" className="w-100" id="passwordWrapperForm" data-testid={this.testId('form')}>
          <input required ref="password" data-testid={this.testId('input')} type="password" pattern={this.props.pattern} inputMode={this.props.inputMode} autoComplete="off" placeholder={this.props.field} className="form-control" onChange={(e) => {this.props.handleChange(e.target.value)}}/>
          <input required ref="confirmPassword" data-testid={this.testId('confirm')} type="password" pattern={this.props.pattern} inputMode={this.props.inputMode} autoComplete="off" placeholder={`Confirm ${this.props.field}`} className="form-control mt-4 mb-4" />
        </form>
        {this.state.errorMessage && <p className="mb-4 text-danger" data-testid={this.testId('error')}>{this.state.errorMessage}</p>}
        <div className="d-flex justify-content-between flex-row w-100">
          <button onClick={this.props.back} type="button" data-testid={this.testId('back')} className="btn btn-secondary">{t`Back`}</button>
          <button onClick={this.next} type="button" data-testid={this.testId('next')} className="btn btn-hathor">{this.props.button}</button>
        </div>
      </div>
    )
  }
}

export default PinPasswordWrapper;
