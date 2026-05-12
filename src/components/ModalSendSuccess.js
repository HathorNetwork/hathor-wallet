/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect } from 'react';
import { t } from 'ttag';
import $ from 'jquery';
import PropTypes from 'prop-types';
import hathorLib from '@hathor/wallet-lib';

const MODAL_ID = 'sendSuccessModal';

/**
 * Modal shown after a transaction is sent successfully.
 * Offers options to close (stay on page) or view transaction details.
 */
function ModalSendSuccess({
  tx,
  tokensSent,
  decimalPlaces,
  onClose,
  onViewDetails,
  manageDomLifecycle,
}) {
  useEffect(() => {
    manageDomLifecycle(`#${MODAL_ID}`);
  }, [manageDomLifecycle]);

  /**
   * Format sent amounts: "10 AAA" or "10 AAA and 5 BBB"
   */
  const formatSentAmounts = () => {
    const parts = tokensSent.map(({ symbol, amount }) =>
      `${hathorLib.numberUtils.prettyValue(amount, decimalPlaces)} ${symbol}`
    );

    if (parts.length === 1) {
      return parts[0];
    }

    const last = parts.pop();
    return `${parts.join(', ')} ${t`and`} ${last}`;
  };

  const handleClose = () => {
    $(`#${MODAL_ID}`).modal('hide');
    onClose();
  };

  const handleViewDetails = () => {
    $(`#${MODAL_ID}`).modal('hide');
    onViewDetails();
  };

  return (
    <div
      className="modal fade"
      id={MODAL_ID}
      tabIndex="-1"
      role="dialog"
      aria-labelledby="sendSuccessModalLabel"
      aria-hidden="true"
      data-backdrop="static"
      data-keyboard="false"
    >
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title" id="sendSuccessModalLabel">
              {t`Transaction sent`}
            </h5>
            <button type="button" className="close" onClick={handleClose} aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body">
            <p>{t`Your transaction was sent successfully!`}</p>
            <p>
              {t`You successfully sent`} <strong>{formatSentAmounts()}</strong>.
            </p>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={handleClose}>
              {t`Close`}
            </button>
            <button type="button" className="btn btn-hathor" onClick={handleViewDetails}>
              {t`View transaction details`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

ModalSendSuccess.propTypes = {
  tx: PropTypes.shape({
    tx_id: PropTypes.string.isRequired,
  }).isRequired,
  tokensSent: PropTypes.arrayOf(
    PropTypes.shape({
      symbol: PropTypes.string.isRequired,
      amount: PropTypes.any.isRequired,
    })
  ).isRequired,
  decimalPlaces: PropTypes.number.isRequired,
  onClose: PropTypes.func.isRequired,
  onViewDetails: PropTypes.func.isRequired,
  manageDomLifecycle: PropTypes.func.isRequired,
};

export default ModalSendSuccess;
