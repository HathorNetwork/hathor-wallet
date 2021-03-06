/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import _ from 'lodash';
import hathorLib from '@hathor/wallet-lib';
import InputNumber from './InputNumber';


/**
 * Component that wraps the outputs of a token in the Send Tokens screen
 *
 * @memberof Components
 */
class OutputsWrapper extends React.Component {
  constructor(props) {
    super(props);

    this.address = React.createRef();
    this.value = React.createRef();
    this.timelock = React.createRef();
    this.timelockCheckbox = React.createRef();
    this.uniqueID = _.uniqueId()
  }

  /**
   * Handles the click on the timelock checkbox of each output to show/hide the timelock field
   *
   * @param {Object} event Event emitted when user clicks on the checkbox
   */
  handleCheckboxTimelockChange = (e) => {
    const value = e.target.checked;
    if (value) {
      $(this.timelock.current).show(400);
    } else {
      $(this.timelock.current).hide(400);
    }
  }

  render = () => {
    return (
      <div className="input-group mb-3">
        <input type="text" ref={this.address} placeholder={t`Address`} className="form-control output-address col-5" />
        <InputNumber ref={this.value} placeholder={hathorLib.helpers.prettyValue(0)} className="form-control output-value col-2" />
        <div className="form-check mr-2 d-flex flex-column justify-content-center">
          <input className="form-check-input mt-0 has-timelock" type="checkbox"
            ref={this.timelockCheckbox} onChange={this.handleCheckboxTimelockChange} id={this.uniqueID}
            title={hathorLib.wallet.isHardwareWallet() ? t`This feature is disabled for hardware wallet` : t`Timelock`}
            disabled={hathorLib.wallet.isHardwareWallet() ? true : null}/>
          <label className="form-check-label" htmlFor={this.uniqueID}>
            {t`Time lock`}
          </label>
        </div>
        <input type="datetime-local" placeholder={t`Date and time in GMT`} step="1"
          className="form-control output-timelock col-3" style={{display: 'none'}} ref={this.timelock}
          disabled={hathorLib.wallet.isHardwareWallet() ? true : null}/>
        {this.props.index === 0 ? <button type="button" className="btn btn-hathor" onClick={this.props.addOutput}>+</button> : null}
      </div>
    );
  }
}

export default OutputsWrapper;
