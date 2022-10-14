/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'
import $ from 'jquery';
import BackButton from '../../components/BackButton';
import ReactLoading from 'react-loading';
import colors from '../../index.scss';
import ModalChangeAddress from '../../components/nano/ModalChangeAddress';
import { connect } from 'react-redux';
import helpers from '../../utils/helpers';
import hathorLib from '@hathor/wallet-lib';

const mapStateToProps = (state) => {
  return {
    nanoContracts: state.nanoContracts,
    tokenMetadata: state.tokenMetadata,
  };
};


/**
 * Details of a Nano Contract
 *
 * @memberof Screens
 */
class NanoContractDetail extends React.Component {

  state = {
    loading: true,
    data: null,
    errorMessage: null,
  }

  componentDidMount = () => {
    const nc = this.props.nanoContracts[this.props.match.params.nc_id];
    this.loadNCData(nc.address);
  }

  /**
   * Method executed when link to execute a method is clicked
   *
   * @param {Object} e Event emitted by the link clicked
   * @param {String} method Method to be executed
   */
  executeMethod = (e, method) => {
    e.preventDefault();
    this.props.history.push(`/nano_contract/${this.props.match.params.nc_id}/execute_method/${method}`);
  }

  /**
   * Method executed when link to change the address is clicked
   *
   * @param {Object} e Event emitted by the link clicked
   */
  changeAddress = (e) => {
    e.preventDefault();
    $('#changeAddressModal').modal('show');
  }

  loadNCData = (address) => {
    this.setState({ loading: true, data: null });
    hathorLib.ncApi.getNanoContractState(this.props.match.params.nc_id, address, (data) => {
      this.setState({ loading: false, data });
    }, (e) => {
      // Error in request
      this.setState({ loading: false, errorMessage: 'Error getting nano contract state.' });
    });
  }

  onAddressChanged = (newAddress) => {
    this.loadNCData(newAddress);
  }

  render() {
    const nc = this.props.nanoContracts[this.props.match.params.nc_id];

    const renderBody = () => {
      if (this.state.loading) {
        return <ReactLoading type='spin' color={colors.purpleHathor} delay={500} />;
      }

      if (this.state.errorMessage) {
        return <p className='text-danger mb-4'>{this.state.errorMessage}</p>;
      }

      return renderNCData();
    }

    const isNFT = (uid) => {
      return helpers.isTokenNFT(uid, this.props.tokenMetadata);
    }

    const renderBets = () => {
      if (!this.state.data.nc_address_data.bets) {
        return;
      }

      return Object.keys(this.state.data.nc_address_data.bets).map((result) => {
        return (
          <p key={result}>{result}: {helpers.renderValue(this.state.data.nc_address_data.bets[result], isNFT(this.state.data.nc_data.token))}</p>
        );
      });
    }

    const renderNCData = () => {
      const isTokenNFT = isNFT(this.state.data.nc_data.token);
      return (
        <div className="nc-detail-wrapper">
          <p><strong>Blueprint: </strong>{nc.blueprint.name}</p>
          <p><strong>Address: </strong>{nc.address} (<a href="true" onClick={this.changeAddress}>{t`Change`}</a>)</p>
          <p><strong>Token UID: </strong>{this.state.data.nc_data.token}</p>
          <p><strong>Total deposited: </strong>{helpers.renderValue(this.state.data.nc_data.total, isTokenNFT)}</p>
          <p><strong>Last offer date: </strong>{hathorLib.dateFormatter.parseTimestamp(this.state.data.nc_data.last_offer)}</p>
          <p><strong>Final result: </strong>{this.state.data.nc_data.final_result || ' - '}</p>
          <hr />
          <p><strong>Bets: </strong>{!this.state.data.nc_address_data.bets && ' - '}</p>
          {renderBets()}
          <p><strong>Withdrawal: </strong>{this.state.data.nc_address_data.withdrawals ? helpers.renderValue(this.state.data.nc_address_data.withdrawals, isTokenNFT) : ' - '}</p>
          <hr />
          <div>
            <p className="text-center mb-4"><strong>Available actions:</strong></p>
            <div className="d-flex flex-row justify-content-around mt-3">
              <div>
                <a href="true" onClick={(e) => this.executeMethod(e, 'make_a_bet')}>{t`Deposit`}</a>
              </div>
              <div>
                <a href="true" onClick={(e) => this.executeMethod(e, 'withdraw')}>{t`Withdraw`}</a>
              </div>
              <div>
                <a href="true" onClick={(e) => this.executeMethod(e, 'set-result')}>{t`Set result`}</a>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="content-wrapper">
        <BackButton {...this.props} />
        <h3 className="mt-4">{t`Nano Contract Detail`}</h3>
        <div className="mt-5">
          <p><strong>ID: </strong>{nc.id}</p>
          <div className="d-flex flex-row justify-content-center mt-5">
            {renderBody()}
          </div>
        </div>
        <ModalChangeAddress nanoContractID={this.props.match.params.nc_id} onAddressChanged={this.onAddressChanged} />
      </div>
    );
  }
}

export default connect(mapStateToProps)(NanoContractDetail);