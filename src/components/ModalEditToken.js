import React from 'react';
import tokens from '../utils/tokens';


class ModalEditToken extends React.Component {
  constructor(props) {
    super(props);

    this.shortName = React.createRef();
    this.symbol = React.createRef();

    this.state = {
      formValidated: false
    };
  }

  componentDidMount() {
    if (this.props.token) {
      this.updateInputs();
    }
  }

  componentDidUpdate(prevProps) {
    if (prevProps.token.uid !== this.props.token.uid) {
      this.updateInputs();
    }
  }

  updateInputs = () => {
    this.shortName.current.value = this.props.token.name;
    this.symbol.current.value = this.props.token.symbol;
  }

  handleSave = (e) => {
    e.preventDefault();
    const isValid = this.refs.formEditToken.checkValidity();
    this.setState({ formValidated: !isValid });
    if (isValid) {
      const shortName = this.shortName.current.value;
      const symbol = this.symbol.current.value;
      tokens.editToken(this.props.token.uid, shortName, symbol);
      this.props.success();
    }
  }

  render() {
    return (
      <div className="modal fade" id="editTokenModal" tabIndex="-1" role="dialog" aria-labelledby="editTokenModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">Edit token</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <p>You are editing the token with uid <strong>({this.props.token.uid})</strong></p>
              <form ref="formEditToken" className={this.state.formValidated ? 'was-validated' : ''}>
                <div className="form-group">
                  <input type="text" required className="form-control" ref={this.shortName} placeholder="Short name" />
                </div>
                <div className="form-group">
                  <input type="text" required className="form-control" pattern="\w{1,5}" ref={this.symbol} placeholder="Symbol" />
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              <button onClick={this.handleSave} type="button" className="btn btn-hathor">Save</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ModalEditToken;