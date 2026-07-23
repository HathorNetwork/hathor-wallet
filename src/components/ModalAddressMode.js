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
import { ADDRESS_MODE } from '../constants';
import RadioGroup from './Radio/RadioGroup';
import PreferenceSaveButton from './PreferenceSaveButton';

const LEARN_MORE_URL = 'https://docs.hathor.network/explanations/features/wallet-service/address-mode';

function ModalAddressMode({ currentMode, onSave, onClose }) {
  const [selectedMode, setSelectedMode] = useState(currentMode);
  const [hasTxOutside, setHasTxOutside] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    $('#addressModeModal').modal('show');
    $('#addressModeModal').on('hidden.bs.modal', onClose);

    checkTxOutside();

    return () => {
      $('#addressModeModal').modal('hide');
      $('#addressModeModal').off();
    };
  }, []);

  const checkTxOutside = async () => {
    try {
      const wallet = getGlobalWallet();
      const result = await wallet.hasTxOutsideFirstAddress();
      setHasTxOutside(result);
    } catch (e) {
      console.error('Error checking hasTxOutsideFirstAddress:', e);
      setHasTxOutside(true);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    onSave(selectedMode);
  };

  const openLearnMore = (e) => {
    e.preventDefault();
    helpers.openExternalURL(LEARN_MORE_URL);
  };

  const isSingleDisabled = (loading || hasTxOutside) && currentMode !== ADDRESS_MODE.SINGLE;
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
          <div className="modal-body d-flex flex-column">
            <p className="address-mode-intro">
              {t`You can set your wallet to `}<strong>{t`single or multi address mode`}</strong>{'.'}
              <br />
              {t`You can switch anytime in the settings.`}
            </p>

            <div>
              <RadioGroup
                name="addressMode"
                value={selectedMode}
                onChange={setSelectedMode}
                options={[
                  {
                    value: ADDRESS_MODE.SINGLE,
                    title: t`Single Address`,
                    disabled: isSingleDisabled,
                    description: t`Your wallet will use only one address (index 0).`,
                    hint: t`Easier to manage and compatible with all dApps.`,
                  },
                  {
                    value: ADDRESS_MODE.MULTI,
                    title: t`Multi Address`,
                    description: t`Your wallet will let you generate multiple addresses.`,
                    hint: t`Useful for advanced users.`,
                  },
                ]}
              />

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
          <div className="modal-footer justify-content-center border-top-0 address-mode-footer">
            <PreferenceSaveButton
              title={t`Save preferences`}
              disabled={!hasChanged || loading}
              onClick={handleSave}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default ModalAddressMode;
