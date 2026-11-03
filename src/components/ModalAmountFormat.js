/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect } from 'react';
import $ from 'jquery';
import { t } from 'ttag';
import { AMOUNT_FORMAT } from '../constants';
import { compressAmountString } from '../utils/amount';

const MODAL_ID = 'amountFormatModal';

// A sub-1 value with a six-zero leading run, so both formats are meaningfully
// different in the preview. Compression is derived, never hardcoded — the Figma
// mock renders this example as 0.0₈5195, which is wrong.
const PREVIEW_EXPANDED = '0.0000005195';

function ModalAmountFormat({ currentFormat, onSave, onClose }) {
  const [selectedFormat, setSelectedFormat] = useState(currentFormat);

  useEffect(() => {
    $(`#${MODAL_ID}`).modal('show');
    $(`#${MODAL_ID}`).on('hidden.bs.modal', onClose);

    return () => {
      $(`#${MODAL_ID}`).modal('hide');
      $(`#${MODAL_ID}`).off();
    };
  }, []);

  const hasChanged = selectedFormat !== currentFormat;

  const renderPreviewValue = () => {
    if (selectedFormat === AMOUNT_FORMAT.COMPRESSED) {
      return `${compressAmountString(PREVIEW_EXPANDED)} HTR`;
    }
    return `${PREVIEW_EXPANDED} HTR`;
  };

  const renderOption = ({ format, title, description, isDefault }) => (
    <div className="amount-format-option" onClick={() => setSelectedFormat(format)}>
      <input
        type="radio"
        id={`amountFormat-${format}`}
        name="amountFormat"
        checked={selectedFormat === format}
        onChange={() => setSelectedFormat(format)}
      />
      <div className="amount-format-option-body">
        <div className="amount-format-option-header">
          <label className="amount-format-option-title" htmlFor={`amountFormat-${format}`}>
            {title}
          </label>
          {isDefault && <span className="amount-format-tag">{t`Default`}</span>}
        </div>
        <p className="amount-format-option-description">{description}</p>
      </div>
    </div>
  );

  return (
    <div className="modal fade amount-format-modal" id={MODAL_ID} tabIndex="-1" role="dialog" aria-labelledby={MODAL_ID} aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t`Amount format`}</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <p className="amount-format-description">
              {t`Choose how amounts are displayed across your wallet. You can change your default anytime.`}
            </p>

            <div className="amount-format-card">
              {renderOption({
                format: AMOUNT_FORMAT.EXPANDED,
                title: t`Expanded`,
                description: t`Standard notation. Leading zeros are written out in full (ex: 0.0000005195).`,
                isDefault: true,
              })}
              <hr className="amount-format-divider" />
              {renderOption({
                format: AMOUNT_FORMAT.COMPRESSED,
                title: t`Compressed`,
                description: t`Compresses leading zeros into a subscript count for shorter, easier-to-read small values (ex: 0.0₆5195).`,
                isDefault: false,
              })}
            </div>

            <p className="amount-format-preview-label">{t`PREVIEW`}</p>
            <div className="amount-format-preview">
              <span className="amount-format-preview-key">{t`Full amount`}</span>
              <span className="amount-format-preview-value">{renderPreviewValue()}</span>
            </div>
          </div>
          <div className="modal-footer justify-content-center">
            <button
              type="button"
              className={`amount-format-save-btn ${hasChanged ? 'amount-format-save-btn--active' : ''}`}
              disabled={!hasChanged}
              onClick={() => onSave(selectedFormat)}
            >
              {t`Save preferences`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalAmountFormat;
