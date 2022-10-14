/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import { t } from 'ttag'
import { Link } from 'react-router-dom'
import { connect } from 'react-redux';
import hathorLib from '@hathor/wallet-lib';
import ModalRegisterNanoContract from '../../components/nano/ModalRegisterNanoContract';

const mapStateToProps = (state) => {
  return {
    nanoContracts: state.nanoContracts,
  };
};


/**
 * List of nano contracts of a blueprint
 *
 * @memberof Screens
 */
class NanoContractList extends React.Component {
  registerNC = () => {
    $('#registerNCModal').modal('show');
  }

  createNC = () => {
    this.props.history.push('/nano_contract/create/');
  }

  render() {
    const renderTableData = () => {
      return Object.values(this.props.nanoContracts).map((nc) => {
        return (
          <tr key={nc.id}>
            <td>
              <Link to={`/nano_contract/detail/${nc.id}`}>{hathorLib.helpers.getShortHash(nc.id)}</Link>
            </td>
            <td>{nc.blueprint.name}</td>
            <td>{nc.address}</td>
          </tr>
        );
      });
    }

    return (
      <div className="content-wrapper">
        <div>
          <div className="d-flex flex-row justify-content-between mt-5 mb-4">
            <button className="btn btn-hathor" onClick={this.createNC}>{t`Create a nano contract`}</button>
            <button className="btn btn-hathor" onClick={this.registerNC}>{t`Register a nano contract`}</button>
          </div>
          <div className="table-responsive">
            <table className="mt-3 table table-striped" id="nc-list">
              <thead>
                <tr>
                  <th>{t`ID`}</th>
                  <th>{t`Blueprint`}</th>
                  <th>{t`Address`}</th>
                </tr>
              </thead>
              <tbody>
                {renderTableData()}
              </tbody>
            </table>
          </div>
        </div>
        <ModalRegisterNanoContract />
      </div>
    );
  }
}

export default connect(mapStateToProps)(NanoContractList);