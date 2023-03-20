/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import { connect } from 'react-redux';
import { saveNC } from '../../actions/index';

const mapDispatchToProps = dispatch => {
  return {
    saveNC: (id, blueprint, address) => dispatch(saveNC(id, blueprint, address)),
  };
};

const mapStateToProps = (state) => {
  return {
    nanoContracts: state.nanoContracts,
    wallet: state.wallet,
  };
};

/**
 * Component that shows a modal to register a Nano Contract
 *
 * @memberof Components
 */
class ModalRegisterNanoContract extends React.Component {
  /**
   * @property {string} errorMessage Message that will be shown to the user in case of error
   */
  state = {
    errorMessage: '',
  };

  componentDidMount = () => {
    $('#registerNCModal').on('hide.bs.modal', (e) => {
      this.refs.id.value = '';
      this.setState({
        errorMessage: '',
      });
    })

    $('#registerNCModal').on('shown.bs.modal', (e) => {
      this.refs.id.focus();
    })
  }

  componentWillUnmount = () => {
    // Removing all event listeners
    $('#registerNCModal').off();
  }

  /**
   * Method called when user clicks the button to register the NC
   *
   * @param {Object} e Event emitted when user clicks the button
   */
  handleRegister = (e) => {
    e.preventDefault();

    const isValid = this.refs.formRegisterNC.checkValidity();
    if (!isValid) {
      this.refs.formRegisterNC.classList.add('was-validated')
      return;
    }

    // Check if this NC is already registered
    if (this.refs.id.value in this.props.nanoContracts) {
      this.setState({ errorMessage: t`This nano contract is already registered.` });
      return;
    }

    const address0 = this.props.wallet.getAddressAtIndex(0);
    this.props.saveNC(this.refs.id.value, { name: 'Bet', id: '3cb032600bdf7db784800e4ea911b10676fa2f67591f82bb62628c234e771595' }, address0);
    $('#registerNCModal').modal('hide');

    // TODO Check if NC exists in the full node with a loading
    // TODO Register NC in the local storage
  }

  render() {
    return (
      <div className="modal fade" id="registerNCModal" tabIndex="-1" role="dialog" aria-labelledby="registerNCModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">{t`Register a nano contract`}</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <p>{t`To register your nano contract, just write down the ID of the contract.`}</p>
              <form ref="formRegisterNC">
                <div className="form-group">
                  <input required type="text" className="form-control" ref="id" placeholder={t`Nano Contract ID`} />
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
              <button type="button" className="btn btn-secondary" data-dismiss="modal">{t`Cancel`}</button>
              <button onClick={this.handleRegister} type="button" className="btn btn-hathor">{t`Register`}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

export default connect(mapStateToProps, mapDispatchToProps)(ModalRegisterNanoContract);