import React, { useEffect, useState, useCallback } from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import SpanFmt from './SpanFmt';

export default function ModalConfirmTestnet({ onClose, success }) {
  const [confirmText, setConfirmText] = useState('');
  const [testnetError, setTestnetError] = useState('');

  useEffect(() => {
    $('#modalConfirmTestnet').modal('show');
    $('#modalConfirmTestnet').on('hidden.bs.modal', onClose);

    return () => $('#modalConfirmTestnet').modal('hide');
  }, []);

  const confirmTestnetServer = useCallback(() => {
    if (confirmText.toLowerCase() !== 'testnet') {
      setTestnetError(t`Invalid value.`);
      return;
    }

    success();
  }, [confirmText, setTestnetError]);

  return (
    <div className="modal fade" id="modalConfirmTestnet" tabIndex="-1" role="dialog" aria-labelledby="alertModal" aria-hidden="true" data-backdrop="static" data-keyboard="false">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              { t`Confirm testnet server` }
            </h5>
          </div>
          <div className="modal-body">
            <div>
              <p><SpanFmt>{t`The selected server connects you to a testnet. Beware if someone asked you to do it, the **tokens from testnet have no value**. Only continue if you know what you are doing.`}</SpanFmt></p>
              <p>{t`To continue with the server change you must type 'testnet' in the box below and click on 'Connect to testnet' button.`}</p>
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
              {t`Connect to testnet`}
            </button>
            <button onClick={onClose} type="button" className="btn btn-hathor">
              { t`Ok` }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
