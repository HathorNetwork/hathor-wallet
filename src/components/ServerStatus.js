import React from 'react';
import { connect } from "react-redux";


const mapStateToProps = (state) => {
  return {
    isOnline: state.isOnline,
    network: state.network
  };
};


const ServerStatus = (props) => {
  return (
    props.isOnline !== undefined && 
    <div className="d-flex flex-column version-wrapper align-items-center">
      <span className={props.network === "testnet" ? "text-testnet" : ""}>{props.network}</span>
      <span className={props.isOnline ? "" : "text-danger"}>{props.isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
};

export default connect(mapStateToProps)(ServerStatus);
