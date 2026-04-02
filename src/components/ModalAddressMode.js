/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState, useEffect } from 'react';
import $ from 'jquery';
import { t } from 'ttag';
import { getGlobalWallet } from '../modules/wallet';
import helpers from '../utils/helpers';

const LEARN_MORE_URL = 'https://www.google.com';

function ModalAddressMode({ currentMode, onSave, onClose }) {
  const [selectedMode, setSelectedMode] = useState(currentMode);
  const [hasTxOutside, setHasTxOutside] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    $('#addressModeModal').modal('show');
    $('#addressModeModal').on('hidden.bs.modal', onClose);

    const checkTxOutside = async () => {
      try {
        const wallet = getGlobalWallet();
        const result = await wallet.hasTxOutsideFirstAddress();
        setHasTxOutside(result);
      } catch (e) {
        console.error('Error checking hasTxOutsideFirstAddress:', e);
      } finally {
        setLoading(false);
      }
    };

    checkTxOutside();

    return () => {
      $('#addressModeModal').modal('hide');
      $('#addressModeModal').off();
    };
  }, []);

  const handleSave = () => {
    onSave(selectedMode);
  };

  const openLearnMore = (e) => {
    e.preventDefault();
    helpers.openExternalURL(LEARN_MORE_URL);
  };

  const isSingleDisabled = hasTxOutside && currentMode !== 'single';
  const hasChanged = selectedMode !== currentMode;

  return (
    <div className="modal fade" id="addressModeModal" tabIndex="-1" role="dialog" aria-labelledby="addressModeModal" aria-hidden="true">
      <div className="modal-dialog" role="document">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t`Address Mode`}</h5>
            <button type="button" className="close" data-dismiss="modal" aria-label="Close">
              <span aria-hidden="true">&times;</span>
            </button>
          </div>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column' }}>
            <p style={{ marginBottom: 40 }}>
              {t`You can set your wallet to `}<strong>{t`single or multi address mode`}</strong>{'.'}
              <br />
              {t`You can switch anytime in the settings.`}
            </p>

            <div>
              <div
                className={`address-mode-option ${selectedMode === 'single' ? 'address-mode-option--selected' : ''} ${isSingleDisabled ? 'address-mode-option--disabled' : ''}`}
                onClick={() => !isSingleDisabled && setSelectedMode('single')}
              >
                <div className="d-flex align-items-center mb-2" style={{ gap: '6px' }}>
                  <input
                    type="radio"
                    name="addressMode"
                    checked={selectedMode === 'single'}
                    disabled={isSingleDisabled}
                    onChange={() => setSelectedMode('single')}
                  />
                  <strong className="address-mode-label">{t`Single Address`}</strong>
                </div>
                <p className="address-mode-description">
                  {t`Your wallet will use only one address (index 0).`}
                  <br />
                  <span className="address-mode-hint">{t`Easier to manage and compatible with all dApps.`}</span>
                </p>
              </div>

              <div>
                <div
                  className={`address-mode-option ${selectedMode === 'multi' ? 'address-mode-option--selected' : ''}`}
                  onClick={() => setSelectedMode('multi')}
                >
                  <div className="d-flex align-items-center mb-2" style={{ gap: '6px' }}>
                    <input
                      type="radio"
                      name="addressMode"
                      checked={selectedMode === 'multi'}
                      onChange={() => setSelectedMode('multi')}
                    />
                    <strong className="address-mode-label">{t`Multi Address`}</strong>
                  </div>
                  <p className="address-mode-description">
                    {t`Your wallet will let you generate multiple addresses.`}
                    <br />
                    <span className="address-mode-hint">{t`Useful for advanced users.`}</span>
                  </p>
                </div>

                {hasTxOutside && (
                  <div className="address-mode-alert">
                    <i className="fa fa-exclamation-triangle" style={{ color: '#d97706' }}></i>
                    <span>
                      {t`You can't switch to single address mode because other addresses in your wallet are already in use.`}
                      {' '}
                      <a href="true" onClick={openLearnMore} style={{ textDecoration: 'underline', color: 'inherit' }}>{t`Learn more`}</a>{'.'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
          <div className="modal-footer justify-content-center" style={{ borderTop: 'none', marginTop: 12 }}>
            <button
              type="button"
              className={`address-mode-save-btn ${hasChanged && !loading ? 'address-mode-save-btn--active' : ''}`}
              disabled={!hasChanged || loading}
              onClick={handleSave}
            >
              {t`Save preferences`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalAddressMode;
