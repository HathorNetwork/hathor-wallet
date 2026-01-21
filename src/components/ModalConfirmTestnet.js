import React, { useEffect, useState, useCallback } from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import SpanFmt from './SpanFmt';

export default function ModalConfirmTestnet({ onClose, success, network, onUserCancel }) {
  const [confirmText, setConfirmText] = useState('');
  const [testnetError, setTestnetError] = useState('');

  const confirmTestnetModalID = 'modalConfirmTestnet';

  useEffect(() => {
    $(`#${confirmTestnetModalID}`).modal('show');
    $(`#${confirmTestnetModalID}`).on('hidden.bs.modal', (e) => {
      onClose(`#${confirmTestnetModalID}`);
    });
  }, [onClose]);

  const confirmTestnetServer = useCallback(() => {
    if (confirmText.toLowerCase() !== network) {
      setTestnetError(t`Invalid value.`);
      return;
    }

    onClose(`#${confirmTestnetModalID}`);
    success();
  }, [confirmText, setTestnetError]);

  const onCancelClicked = () => {
    onUserCancel();
    onClose(`#${confirmTestnetModalID}`);
  }

  return (
    <div className="modal fade" id={confirmTestnetModalID} tabIndex="-1" role="dialog" aria-labelledby="alertModal" aria-hidden="true" data-backdrop="static" data-keyboard="false">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              { t`Confirm ${network} server` }
            </h5>
          </div>
          <div className="modal-body">
            <div>
              <p><SpanFmt>{t`The selected server connects you to a ${network}. Beware if someone asked you to do it, the **tokens from ${network} have no value**. Only continue if you know what you are doing.`}</SpanFmt></p>
              <p>{t`To continue with the server change you must type '${network}' in the box below and click on 'Connect to ${network}' button.`}</p>
              <div className="mt-2 d-flex flex-row align-items-center">
                <input type="text" className="form-control col-4" defaultValue={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
                <span className="text-danger ml-2">
                  {testnetError}
                </span>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button onClick={confirmTestnetServer} type="button" className="btn btn-secondary">
              {t`Connect to ${network}`}
            </button>
            <button onClick={onCancelClicked} type="button" className="btn btn-hathor">
              { t`Cancel change` }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
