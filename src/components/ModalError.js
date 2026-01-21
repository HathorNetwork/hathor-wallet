/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from 'react';
import { t } from 'ttag';

/**
 * Component that shows a modal with an error message
 *
 * @memberof Components
 */
export function ModalError({ title, message, onClose, manageDomLifecycle }) {
  useEffect(() => {
    manageDomLifecycle('#errorModal');
  }, [manageDomLifecycle]);

  return (
    <div
      className="modal fade"
      id="errorModal"
      tabIndex="-1"
      role="dialog"
      aria-labelledby="errorModal"
      aria-hidden="true"
      data-backdrop="static"
      data-keyboard="false"
    >
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{title || t`Error`}</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close" onClick={onClose}>
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <p>{message}</p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-hathor" onClick={onClose} data-dismiss="modal">
              {t`Close`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalError; 