import React from 'react';
import { connect } from "react-redux";


const mapStateToProps = (state) => {
  return { isOnline: state.isOnline };
};


const Server = (props) => {
  return (
    props.isOnline !== undefined && 
    <div className="d-flex flex-column version-wrapper align-items-center">
      <span className={props.isOnline ? "" : "text-danger"}>Connection</span>
      <span className={props.isOnline ? "" : "text-danger"}>{props.isOnline ? 'Online' : 'Offline'}</span>
    </div>
  );
};

export default connect(mapStateToProps)(Server);
