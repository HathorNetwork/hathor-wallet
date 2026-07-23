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
import RadioGroup from './Radio/RadioGroup';
import PreferenceSaveButton from './PreferenceSaveButton';

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

            <RadioGroup
              name="amountFormat"
              value={selectedFormat}
              onChange={setSelectedFormat}
              options={[
                {
                  value: AMOUNT_FORMAT.EXPANDED,
                  title: t`Expanded`,
                  badge: t`Default`,
                  description: t`Standard notation. Leading zeros are written out in full (ex: 0.0000005195).`,
                },
                {
                  value: AMOUNT_FORMAT.COMPRESSED,
                  title: t`Compressed`,
                  description: t`Compresses leading zeros into a subscript count for shorter, easier-to-read small values (ex: 0.0₆5195).`,
                },
              ]}
            />

            <p className="amount-format-preview-label">{t`PREVIEW`}</p>
            <div className="amount-format-preview">
              <span className="amount-format-preview-key">{t`Full amount`}</span>
              <span className="amount-format-preview-value">{renderPreviewValue()}</span>
            </div>
          </div>
          <div className="modal-footer justify-content-center">
            <PreferenceSaveButton
              title={t`Save preferences`}
              disabled={!hasChanged}
              onClick={() => onSave(selectedFormat)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalAmountFormat;
