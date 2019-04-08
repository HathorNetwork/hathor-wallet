/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { Link } from 'react-router-dom';


/**
 * Component that renders a textarea to get the serialization of a transaction in hexadecimal  
 * Used in PushTx and DecodeTx screens
 *
 * @memberof Components
 */
const TxTextInput = (props) => {
  return (
    <div className="d-flex flex-column tx-input-wrapper">
      <span>{props.helpText}</span>
      <textarea rows="5" onChange={props.onChange}></textarea>
      <span>Click <Link to={props.link}>here</Link> to {props.otherAction} this transaction</span>
      <button className="btn btn-hathor" onClick={props.buttonClicked}>{props.action}</button>
    </div>
  );
}

export default TxTextInput;
