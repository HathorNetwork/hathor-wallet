/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import PropTypes from 'prop-types';
import AddressList from '../../components/AddressList';
import { CHANGE_ADDRESS_LIST_COUNT } from '../../constants';
import { connect } from 'react-redux';
import { editAddressNC } from '../../actions/index';

const mapDispatchToProps = dispatch => {
  return {
    editAddressNC: (id, address) => dispatch(editAddressNC(id, address)),
  };
};

const mapStateToProps = (state) => {
  return {
    nanoContracts: state.nanoContracts,
    wallet: state.wallet,
  };
};

/**
 * Component that shows a modal to change the address of a Nano Contract
 *
 * @memberof Components
 */
class ModalChangeAddress extends React.Component {
  /**
   * @property {number} step The modal has 3 steps: 0 is the warning screen, 1 is the address list and 2 is the confirmation
   * @property {Object} oldAddress Old nano contract address data {'address': string, 'index': number}
   * @property {Object} newAddress New nano contract selected address data {'address': string, 'index': number}
   */
  state = {
    step: 0,
    address: null,
  }

  componentDidMount = () => {
    $('#changeAddressModal').on('hidden.bs.modal', (e) => {
      this.setState({ step: 0 });
    })
  }

  componentWillUnmount = () => {
    // Removing all event listeners
    $('#changeAddressModal').off();
  }

  /**
   * Called when user clicks to continue after reading the warning message in step 0
   *
   * @param {Object} e Event emitted on click
   */
  goToStep1 = (e) => {
    e.preventDefault();
    this.setState({ step: 1 });
  }

  /**
   * Called when user clicks in one of the addresses in step 1
   *
   * @param {string} address Address clicked
   */
  onAddressClick = (address) => {
    const oldAddress = this.props.nanoContracts[this.props.nanoContractID].address;
    const oldAddressIndex = this.props.wallet.getAddressIndex(oldAddress);
    const newAddressIndex = this.props.wallet.getAddressIndex(address);

    this.setState({
      step: 2,
      oldAddress: {
        address: oldAddress,
        index: oldAddressIndex
      },
      newAddress: {
        address,
        index: newAddressIndex
      }
    });
  }

  /**
   * Called when user clicks to change the address in step 2
   *
   * @param {Object} e Event emitted on click
   */
  executeChange = (e) => {
    e.preventDefault();
    this.props.editAddressNC(this.props.nanoContractID, this.state.newAddress.address);
    this.props.onAddressChanged(this.state.newAddress.address);
    $('#changeAddressModal').modal('hide');
  }

  render() {
    const renderSteps = () => {
      switch (this.state.step) {
        case 0:
          return renderWarning();
        case 1:
          return renderAddressList();
        case 2:
          return renderConfirmation();
        default:
          return null;
      }
    }

    const renderWarning = () => {
      return (
        <div>
          <p>{t`You can have only one address associated with a nano contract at a time. If you decide to change your address, you will see the state of the nano contract for this new address.`}</p>
          <p>{t`Apart from that, any action that you execute in the nano contract from now on, will be associated with this new address, then you must remember it to see the history in the future.`}</p>
          <p><strong>{t`Please continue only if you understand your risks and know what you are doing.`}</strong></p>
          <div className="d-flex flex-row justify-content-center">
            <a href="true" onClick={this.goToStep1}>{t`Continue`}</a>
          </div>
        </div>
      );
    }

    const renderAddressList = () => {
      return (
        <div>
          <p>{t`Please select the new address below`}</p>
          <AddressList showNumberOfTransaction={false} onAddressClick={this.onAddressClick} count={CHANGE_ADDRESS_LIST_COUNT} />
        </div>
      );
    }

    const renderConfirmation = () => {
      return (
        <div>
          <p>{t`Please confirm the information below`}</p>
          <p><strong>Old address: </strong>{this.state.oldAddress.address} (Index {this.state.oldAddress.index})</p>
          <p><strong>New address: </strong>{this.state.newAddress.address} (Index {this.state.newAddress.index})</p>
          <div className="d-flex flex-row justify-content-center">
            <a href="true" onClick={this.executeChange}>{t`Change address`}</a>
          </div>
        </div>
      );
    }

    return (
      <div className="modal fade" id="changeAddressModal" tabIndex="-1" role="dialog" aria-labelledby="changeAddressModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">{t`Change address`}</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              {renderSteps()}
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">{t`Cancel`}</button>
            </div>
          </div>
        </div>
      </div>
    );
  }
}

/*
 * nanoContractID: ID of nano contract to change address
 * onAddressChanged: function executed after address is changed
 */
ModalChangeAddress.propTypes = {
  nanoContractID: PropTypes.string.isRequired,
  onAddressChanged: PropTypes.func.isRequired,
};

export default connect(mapStateToProps, mapDispatchToProps)(ModalChangeAddress);