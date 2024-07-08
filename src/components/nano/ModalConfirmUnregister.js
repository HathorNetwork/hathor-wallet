/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from 'react';
import { t } from 'ttag';
import $ from 'jquery';

export default function ModalConfirmUnregisterNanoContract({ onClose, ncId, success }) {
  const unregisterNCModalID = 'modalConfirmUnregister';

  useEffect(() => {
    $(`#${unregisterNCModalID}`).modal('show');
    $(`#${unregisterNCModalID}`).on('hidden.bs.modal', (e) => {
      onClose(`#${unregisterNCModalID}`);
    });
  }, []);

  const confirmUnregister = async () => {
    onClose(`#${unregisterNCModalID}`);
    await success();
  }

  return (
    <div className="modal fade" id={unregisterNCModalID} tabIndex="-1" role="dialog" aria-labelledby="alertModal" aria-hidden="true" data-backdrop="static" data-keyboard="false">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              { t`Confirm unregister nano contract?` }
            </h5>
          </div>
          <div className="modal-body">
            <div>
              <p>{t`Do you confirm that you want to unregister the nano contract with id`}</p>
              <p>{t`${ncId}?`}</p>
            </div>
          </div>
          <div className="modal-footer">
            <button onClick={onClose} type="button" className="btn btn-secondary">
              { t`Cancel` }
            </button>
            <button onClick={confirmUnregister} type="button" className="btn btn-hathor">
              {t`Unregister`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}