/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';


/**
 * Component that shows a confirm modal with two buttons (close modal, or execute action from props.handleYes)
 *
 * @memberof Components
 */
class ModalConfirm extends React.Component {
  /**
   * errorMessage {string} Error message to be shown in case of failure on yes handling
   */
  state = {
    errorMessage: '',
  }

  updateErrorMessage = (errorMessage) => {
    this.setState({ errorMessage });
  }

  render() {
    return (
      <div className="modal fade" id={this.props.modalID ? this.props.modalID : "confirmModal"} tabIndex="-1" role="dialog" aria-labelledby="confirmModal" aria-hidden="true">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">{this.props.title}</h5>
              <button type="button" className="close" data-dismiss="modal" aria-label="Close">
                <span aria-hidden="true">&times;</span>
              </button>
            </div>
            <div className="modal-body">
              {this.props.body}
              <p className="text-danger">{this.state.errorMessage}</p>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-secondary" data-dismiss="modal">No</button>
              <button onClick={this.props.handleYes} type="button" className="btn btn-hathor">Yes</button>
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ModalConfirm;
