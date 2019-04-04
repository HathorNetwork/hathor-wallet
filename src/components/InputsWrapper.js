import React from 'react';


/**
 * Component that wraps the inputs of a token in the Send Tokens screen
 *
 * @memberof Components
 */
class InputsWrapper extends React.Component {
  constructor(props) {
    super(props);

    this.txId = React.createRef();
    this.index = React.createRef();
  }

  render = () => {
    return (
      <div className="input-group mb-3">
        <input type="text" placeholder="Tx id" ref={this.txId} className="form-control input-id col-6" />
        <input type="text" placeholder="Index" ref={this.index} className="form-control input-index col-1" />
        {this.props.index === 0 ? <button type="button" className="btn btn-hathor" onClick={this.props.addInput}>+</button> : null}
      </div>
    );
  }
}

export default InputsWrapper;
