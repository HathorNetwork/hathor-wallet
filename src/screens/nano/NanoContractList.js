/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useContext } from 'react';
import $ from 'jquery';
import { t } from 'ttag'
import { Link } from 'react-router-dom'
import hathorLib from '@hathor/wallet-lib';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { GlobalModalContext, MODAL_TYPES } from '../../components/GlobalModal';


/**
 * List of nano contracts of a blueprint
 *
 * @memberof Screens
 */
function NanoContractList() {
  const context = useContext(GlobalModalContext);
  const nanoContracts = useSelector(state => state.nanoContracts);
  const navigate = useNavigate();

  const registerNC = () => {
    context.showModal(MODAL_TYPES.NANOCONTRACT_REGISTER);
  }

  const createNC = () => {
    navigate('/nano_contract/select_blueprint/');
  }

  const renderTableData = () => {
    return Object.values(nanoContracts).map((nc) => {
      return (
        <tr key={nc.ncId}>
          <td>
            <Link to={`/nano_contract/detail/${nc.ncId}`}>{hathorLib.helpersUtils.getShortHash(nc.ncId)}</Link>
          </td>
          <td>{nc.blueprintName}</td>
          <td>{nc.address}</td>
        </tr>
      );
    });
  }

  return (
    <div className="content-wrapper">
      <div>
        <div className="d-flex flex-row justify-content-between mt-5 mb-4">
          <button className="btn btn-hathor" onClick={createNC}>{t`Create a nano contract`}</button>
          <button className="btn btn-hathor" onClick={registerNC}>{t`Register a nano contract`}</button>
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
    </div>
  );
}

export default NanoContractList;