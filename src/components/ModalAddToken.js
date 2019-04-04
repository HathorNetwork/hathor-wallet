import React from 'react';
import $ from 'jquery';
import tokens from '../utils/tokens';


/**
 * Component that shows a modal to add one specific unknown token to the wallet
 *
 * @memberof Components
 */
class ModalAddToken extends React.Component {
  /**
   * errorMessage {string} Message that will be shown to the user in case of error
   */
  state = { errorMessage: '' };

  componentDidMount = () => {
    $('#addTokenModal').on('hide.bs.modal', (e) => {
      this.refs.uid.value = '';
      this.refs.shortName.value = '';
      this.refs.symbol.value = '';
      this.refs.config.value = '';
      this.setState({ errorMessage: '' });
    })

    $('#addTokenModal').on('shown.bs.modal', (e) => {
      this.refs.uid.focus();
    })
  }

  componentWillUnmount = () => {
    // Removing all event listeners
    $('#addTokenModal').off();
  }

  /**
   * Method called when user clicks the button to add the token  
   * Validates that the data written is valid
   *
   * @param {Object} e Event emitted when user clicks the button
   */
  handleAdd = (e) => {
    e.preventDefault();
    let uid = this.props.uid ? this.props.uid : this.refs.uid.value;
    let shortName = this.refs.shortName.value;
    let symbol = this.refs.symbol.value;
    if (this.refs.config.value === '') {
      if (uid === '' || shortName === '' || symbol === '') {
        this.setState({ errorMessage: 'Must provide configuration string or uid, name, and symbol' });
        return;
      }
      const validation = tokens.validateTokenToAddByUid(uid);
      if (validation.success === false) {
        this.setState({ errorMessage: validation.message });
        return;
      }
    } else {
      const validation = tokens.validateTokenToAddByConfigurationString(this.refs.config.value, this.props.uid);
      if (validation.success === false) {
        this.setState({ errorMessage: validation.message });
        return;
      }
      const tokenData = validation.tokenData;
      uid = tokenData.uid;
      shortName = tokenData.name;
      symbol = tokenData.symbol;
    }
    tokens.addToken(uid, shortName, symbol);
    this.props.success();
  }

  render() {
    return (
      <div className="modal fade" id="addTokenModal" tabIndex="-1" role="dialog" aria-labelledby="addTokenModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">Add a new token</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              <form ref="formAddToken">
                <div className="form-group">
                  {this.props.uid ? <span className="mb-2"><strong>Token uid:</strong> {this.props.uid}</span> : null}
                  <input type="text" defaultValue={this.props.uid ? this.props.uid : ''} className={`form-control ${this.props.uid ? 'hidden' : ''}`} ref="uid" placeholder="Token uid" />
                </div>
                <div className="form-group">
                  <input type="text" className="form-control" ref="shortName" placeholder="Short name" />
                </div>
                <div className="form-group">
                  <input type="text" className="form-control" pattern="\w{1,5}" ref="symbol" placeholder="Symbol" />
                </div>
                <div className="d-flex flex-column align-items-center mb-2">
                  <span> OR </span>
                </div>
                <div className="form-group">
                  <input type="text" className="form-control" ref="config" placeholder="Configuration string" />
                </div>
                <div className="row">
                  <div className="col-12 col-sm-10">
                      <p className="error-message text-danger">
                        {this.state.errorMessage}
                      </p>
                  </div>
                </div>
              </form>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">Cancel</button>
              <button onClick={this.handleAdd} type="button" className="btn btn-hathor">Add</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ModalAddToken;