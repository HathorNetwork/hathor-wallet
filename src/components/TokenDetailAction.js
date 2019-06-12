/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import ModalPin from '../components/ModalPin';
import ReactLoading from 'react-loading';
import hathorLib from '@hathor/wallet-lib';


class TokenMint extends React.Component {
  constructor(props) {
    super(props);

    // Reference to amount input
    this.amount = React.createRef();
    // Reference to create another mint checkbox
    this.createAnother = React.createRef();
    // Reference to choose address automatically checkbox
    this.chooseAddress = React.createRef();
    // Reference to address input
    this.address = React.createRef();
    // Reference to address input wrapper (to show/hide it)
    this.addressWrapper = React.createRef();
  }

  /**
   * Execute mint method after form validation
   *
   * @param {string} pin PIN user wrote on modal
   *
   * @return {Object} Object with promise and success message to be shown
   */
  executeMint = (pin) => {
    const amountValue = this.amount.current.value*(10**hathorLib.constants.DECIMAL_PLACES);
    const output = this.props.mintOutputs[0];
    const address = this.chooseAddress.current.checked ? hathorLib.wallet.getAddressToUse() : this.address.current.value;
    const promise = hathorLib.tokens.mintTokens(output.tx_id, output.index, output.decoded.address, this.props.token.uid, address, amountValue, pin, this.createAnother.current.checked, false);
    return { promise, message: `${hathorLib.helpers.prettyValue(amountValue)} ${this.props.token.symbol} minted!` };
  }

  /**
   * Method executed after user clicks on mint button. Validates the form.
   *
   * @return {string} Error message, in case of form invalid. Nothing, otherwise.
   */
  mint = () => {
    if (this.chooseAddress.current.checked === false && this.address.current.value === '') {
      return 'Address is required when not selected automatically';
    }
  }

  /**
   * Shows/hides address field depending on the checkbox click
   *
   * @param {Object} e Event for the address checkbox input change
   */
  handleCheckboxAddress = (e) => {
    const value = e.target.checked;
    if (value) {
      $(this.addressWrapper.current).hide(400);
    } else {
      $(this.addressWrapper.current).show(400);
    }
  }

  render() {
    const renderMintAddress = () => {
      return (
        <div className="d-flex flex-row align-items-center justify-content-start col-9">
          <div className="d-flex flex-row align-items-center address-checkbox">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={this.chooseAddress} id="autoselectAddress" defaultChecked={true} onChange={this.handleCheckboxAddress} />
              <label className="form-check-label" htmlFor="autoselectAddress">
                Select address automatically
              </label>
            </div>
          </div>
          <div className="form-group col-8" ref={this.addressWrapper} style={{display: 'none'}}>
            <label>Destination address</label>
            <input ref={this.address} type="text" placeholder="Address" className="form-control" />
          </div>
        </div>
      );
    }

    const renderForm = () => {
      return (
        <div>
          <div className="row">
            <div className="form-group col-3">
              <label>Amount</label>
              <input required type="number" ref={this.amount} step={hathorLib.helpers.prettyValue(1)} min={hathorLib.helpers.prettyValue(1)} placeholder={hathorLib.helpers.prettyValue(0)} className="form-control" />
            </div>
            {renderMintAddress()}
          </div>
          <div className="form-group d-flex flex-row align-items-center">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={this.createAnother} id="keepMint" defaultChecked={true} />
              <label className="form-check-label" htmlFor="keepMint">
                Create another mint output for you?
              </label>
            </div>
          </div>
        </div>
      )
    }

    return <TokenAction renderForm={renderForm} title='Mint tokens' buttonName='Go' validateForm={this.mint} onPinSuccess={this.executeMint} {...this.props} />
  }
}

class TokenMelt extends React.Component {
  constructor(props) {
    super(props);

    // Reference to amount input
    this.amount = React.createRef();
    // Reference to create another melt output checkbox
    this.createAnother = React.createRef();
  }

  /**
   * Execute melt method after form validation
   *
   * @param {string} pin PIN user wrote on modal
   *
   * @return {Object} Object with promise (can be null in case of error) and message (success or error message)
   */
  executeMelt = (pin) => {
    const amountValue = this.amount.current.value*(10**hathorLib.constants.DECIMAL_PLACES);
    const output = this.props.meltOutputs[0];
    const promise = hathorLib.tokens.meltTokens(output.tx_id, output.index, output.decoded.address, this.props.token.uid, amountValue, pin, this.createAnother.current.checked);
    if (promise === null) {
      return { promise: null, message: 'Can\'t find outputs to melt the amount requested.' };
    } else {
      return { promise, message: `${hathorLib.helpers.prettyValue(amountValue)} ${this.props.token.symbol} melted!` };
    }
  }

  /**
   * Method executed after user clicks on melt button.
   * Validates the form and then opens the PIN modal
   *
   * @return {string} Error message, in case of form invalid. Nothing, otherwise.
   */
  melt = () => {
    const amountValue = this.amount.current.value*(10**hathorLib.constants.DECIMAL_PLACES);
    if (amountValue > this.props.walletAmount) {
      return `The total amount you have is only ${hathorLib.helpers.prettyValue(this.props.walletAmount)}.`;
    }
  }

  render() {
    const renderForm = () => {
      return (
        <div>
          <div className="row">
            <div className="form-group col-3">
              <label>Amount</label>
              <input required type="number" ref={this.amount} step={hathorLib.helpers.prettyValue(1)} min={hathorLib.helpers.prettyValue(1)} placeholder={hathorLib.helpers.prettyValue(0)} className="form-control" />
            </div>
          </div>
          <div className="form-group d-flex flex-row align-items-center">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={this.createAnother} id="keepMint" defaultChecked={true} />
              <label className="form-check-label" htmlFor="keepMint">
                Create another melt output for you?
              </label>
            </div>
          </div>
        </div>
      )
    }

    return <TokenAction renderForm={renderForm} title='Melt tokens' buttonName='Go' validateForm={this.melt} onPinSuccess={this.executeMelt} {...this.props} />
  }
}


class TokenDelegate extends React.Component {
  constructor(props) {
    super(props);

    // Reference to address input
    this.delegateAddress = React.createRef();
    // Reference to create another authority output checkbox
    this.delegateCreateAnother = React.createRef();
  }

  /**
   * Execute the delegate of outputs
   *
   * @param {string} pin PIN user wrote on modal
   *
   * @return {Object} Object with promise and success message
   */
  executeDelegate = (pin) => {
    const output = this.props.authorityOutputs[0];
    const type = this.props.action === 'delegate-mint' ? 'Mint' : 'Melt';
    const promise = hathorLib.tokens.delegateAuthority(output.tx_id, output.index, output.decoded.address, this.props.token.uid, this.delegateAddress.current.value, this.delegateCreateAnother.current.checked, type.toLowerCase(), pin);
    return { promise, message: `${type} output delegated!`};
  }

  render() {
    const renderForm = () => {
      return (
        <div>
          <div className="row">
            <div className="form-group col-6">
              <label>Address</label>
              <input required ref={this.delegateAddress} type="text" className="form-control" />
            </div>
          </div>
          <div className="form-group d-flex flex-row align-items-center">
            <div className="form-check">
              <input className="form-check-input" type="checkbox" ref={this.delegateCreateAnother} id="keepAuthority" defaultChecked={true} />
              <label className="form-check-label" htmlFor="keepAuthority">
                Create another {this.props.action === 'delegate-mint' ? 'mint' : 'melt'} output for you?
              </label>
            </div>
          </div>
        </div>
      )
    }

    const title = `Delegate ${this.props.action === 'destroy-mint' ? 'Mint' : 'Melt'}`;

    return <TokenAction renderForm={renderForm} title={title} buttonName='Delegate' onPinSuccess={this.executeDelegate} {...this.props} />
  }
}


class TokenDestroy extends React.Component {
  /**
   * destroyQuantity {number} Holds the quantity written by the user on the input (need to use state to fill the modal data)
   */
  state = {
    destroyQuantity: 0,
  }

  /**
   * Execute destroy method
   *
   * @param {string} pin PIN user wrote on modal
   *
   * @return {Object} Object with promise and success message
   */
  executeDestroy = (pin) => {
    const label = this.props.action === 'destroy-mint' ? 'Mint' : 'Melt';
    const array = this.props.authorityOutputs;
    const data = [];
    // Get the number of outputs the user requested to destroy in the expected format
    for (let i=0; i<this.state.destroyQuantity; i++) {
      data.push({
        'tx_id': array[i].tx_id,
        'index': array[i].index,
        'address': array[i].decoded.address,
        'token': this.props.token.uid
      });
    }
    const promise = hathorLib.tokens.destroyAuthority(data, pin);
    return { promise, message: `${label} outputs destroyed!`};
  }

  /**
   * Called when clicking to destroy mint outputs.
   * Validate if we have the quantity of outputs requested to destroy and open the PIN modal
   *
   * @return {string} Error message, in case of form invalid. Nothing, otherwise.
   */
  destroy = () => {
    if (this.state.destroyQuantity > this.props.authorityOutputs.length) {
      return `You only have ${this.props.authorityOutputs.length} mint ${hathorLib.helpers.plural(this.props.authorityOutputs.length, 'output', 'outputs')} to destroy.`;
    }
  }

  render() {
    const getDestroyBody = () => {
      const quantity = parseInt(this.state.destroyQuantity, 10);
      const type = this.props.action === 'destroy-mint' ? 'mint' : 'melt';
      const plural = hathorLib.helpers.plural(quantity, 'output', 'outputs');

      return (
        <p>Are you sure you want to destroy <strong>{quantity} {type}</strong> authority {plural}?</p>
      )
    }

    const renderForm = () => {
      return (
        <div className="row">
          <div className="form-group col-6">
            <label>How many {this.props.action === 'destroy-mint' ? 'mint' : 'melt'} outputs you want to destroy?</label>
            <input required type="number" className="form-control" min="1" step="1" ref={this.destroyQuantity} onChange={(e) => this.setState({ destroyQuantity: e.target.value })} />
          </div>
        </div>
      );
    }

    const title = `Destroy ${this.props.action === 'destroy-mint' ? 'Mint' : 'Melt'}`;

    return <TokenAction renderForm={renderForm} validateForm={this.destroy} title={title} buttonName='Destroy' onPinSuccess={this.executeDestroy} pinBodyTop={getDestroyBody()} {...this.props} />
  }
}

class TokenAction extends React.Component {
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
   * Handle methods promise resolve and rejection
   * Clean states, show messages of error/success
   *
   * @param {Promise} promise Promise returned from management method
   * @param {string} successMessage Message to show in case of success
   */
  handlePromise = (promise, successMessage) => {
    promise.then(() => {
      this.props.cancelAction();
      this.props.showSuccess(successMessage);
    }, (message) => {
      this.setState({ loading: false, errorMessage: message });
    });
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
    $('#pinModal').modal('show');
  }

  /**
   * Method executed after user writes the PIN on the modal.
   * It closes the modal, update the state to loading and execute the action requested.
   */
  onPinSuccess = () => {
    $('#pinModal').modal('hide');
    this.setState({ loading: true });
    const { promise, message } = this.props.onPinSuccess(this.state.pin);
    if (promise === null) {
      this.setState({ errorMessage: message, loading: false });
    } else {
      this.handlePromise(promise, message);
    }
  }

  render() {
    const renderButtons = () => {
      return (
        <div className='d-flex mt-4 flex-column'>
          {this.state.errorMessage && <p className='text-danger mb-4'>{this.state.errorMessage}</p>}
          <div className='d-flex align-items-center'>
            <button className='btn btn-secondary mr-3' disabled={this.state.loading} onClick={this.props.cancelAction}>Cancel</button>
            <button className='btn btn-hathor mr-4' disabled={this.state.loading} onClick={this.validateForm}>{this.props.buttonName}</button>
            {this.state.loading && <ReactLoading type='spin' color='#0081af' width={32} height={32} delay={200} />}
          </div>
        </div>
      )
    }

    return (
      <div key={this.props.action}>
        <h2>{this.props.title}</h2>
        <form className={`mt-4 mb-3 ${this.state.formValidated ? 'was-validated' : ''}`} ref={this.form} onSubmit={(e) => e.preventDefault()}>
          {this.props.renderForm()}
        </form>
        {renderButtons(this.props.validateForm, this.props.buttonName)}
        <ModalPin execute={this.onPinSuccess} handleChangePin={this.handleChangePin} bodyTop={this.props.pinBodyTop} />
      </div>
    )
  }
}

export { TokenDestroy, TokenDelegate, TokenMint, TokenMelt };
