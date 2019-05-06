/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import $ from 'jquery';
import _ from 'lodash';
import hathorLib from 'hathor-wallet-utils';


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
        <input type="text" ref={this.address} placeholder="Address" className="form-control output-address col-4" />
        <input type="number" ref={this.value} step={hathorLib.helpers.prettyValue(1)} min={hathorLib.helpers.prettyValue(1)} placeholder={hathorLib.helpers.prettyValue(0)} className="form-control output-value col-2" />
        <div className="form-check mr-3 d-flex flex-column justify-content-center">
          <input className="form-check-input mt-0 has-timelock" ref={this.timelockCheckbox} type="checkbox" onChange={this.handleCheckboxTimelockChange} id={this.uniqueID}/>
          <label className="form-check-label" htmlFor={this.uniqueID}>
            Time lock
          </label>
        </div>
        <input type="datetime-local" placeholder="Date and time in GMT" ref={this.timelock} step="1" className="form-control output-timelock col-4" style={{display: 'none'}}/>
        {this.props.index === 0 ? <button type="button" className="btn btn-hathor" onClick={this.props.addOutput}>+</button> : null}
      </div>
    );
  }
}

export default OutputsWrapper;
