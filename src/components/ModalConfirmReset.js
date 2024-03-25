import React, { useEffect, useState, useCallback } from 'react';
import { t } from 'ttag';
import $ from 'jquery';

export default function ModalConfirmResetAllData({ onClose, success }) {
  const [confirmText, setConfirmText] = useState('');
  const [confirmError, setConfirmError] = useState('');

  useEffect(() => {
    $('#modalConfirmResetAllData').modal('show');
    $('#modalConfirmResetAllData').on('hidden.bs.modal', onClose);

    return () => {
      $('#modalConfirmResetAllData').modal('hide');
      $('#modalConfirmResetAllData').off();
    };
  }, []);

  const confirmResetData = useCallback(() => {
    if (confirmText.toLowerCase() !== 'i want to reset all wallet data') {
      setConfirmError(t`Invalid value.`);
      return;
    }

    success();
  }, [confirmText, setConfirmError]);

  return (
    <div className="modal fade" id="modalConfirmResetAllData" tabIndex="-1" role="dialog" aria-labelledby="alertModal" aria-hidden="true" data-backdrop="static" data-keyboard="false">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              { t`Confirm reset all data` }
            </h5>
          </div>
          <div className="modal-body">
            <div>
              <p>{t`Do you want to reset all of your wallet data? Only continue if you know what you are doing.`}</p>
              <p>{t`This action cannot be undone. All your data will be lost.`}</p>
              <p>{t`Your wallet uniqueId will be reset.`} uniqueId: {localStorage.getItem('app:uniqueId')}</p>
              <p>{t`If you want to reset all data, please type 'I want to reset all wallet data' in the box below and click on 'Reset all data' button.`}</p>
              <div className="mt-2 d-flex flex-row align-items-center">
                <input type="text" className="form-control col-4" defaultValue={confirmText} onChange={(e) => setConfirmText(e.target.value)} />
                <span className="text-danger ml-2">
                  {confirmError}
                </span>
              </div>
            </div>
          </div>
          <div className="modal-footer">
            <button onClick={confirmResetData} type="button" className="btn btn-secondary">
              {t`Reset all data`}
            </button>
            <button onClick={onClose} type="button" className="btn btn-hathor">
              { t`Cancel` }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
