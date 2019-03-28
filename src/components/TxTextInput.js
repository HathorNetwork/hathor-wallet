import React from 'react';
import { Link } from 'react-router-dom';


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