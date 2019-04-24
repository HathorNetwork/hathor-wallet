/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';


/**
 * Component that shows a modal with a message, like an stylized alert
 *
 * @memberof Components
 */
const ModalAlert = (props) => {
  return (
    <div className="modal fade" id="alertModal" tabIndex="-1" role="dialog" aria-labelledby="alertModal" aria-hidden="true" data-backdrop="static" data-keyboard="false">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="exampleModalLabel">{props.title}</h5>
          </div>
          <div className="modal-body">
            {props.body}
          </div>
          <div className="modal-footer">
            <button onClick={props.handleButton} type="button" className="btn btn-hathor">{props.buttonName}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ModalAlert;