/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { connect } from "react-redux";


const mapStateToProps = (state) => {
  return {
    isOnline: state.isOnline,
    network: state.network
  };
};


/**
 * Component that shows the status of the server from the websocket connection
 *
 * @memberof Components
 */
const ServerStatus = (props) => {
  return null;
  return (
    props.isOnline !== undefined && 
    <div className="d-flex flex-column version-wrapper align-items-center">
      <span className={props.network.startsWith("testnet") ? "text-testnet" : ""}>{props.network}</span>
      <span className={props.isOnline ? "" : "text-danger"}>{props.isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
};

export default connect(mapStateToProps)(ServerStatus);
