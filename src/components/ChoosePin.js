/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState } from 'react';
import { t } from 'ttag'

import PinPasswordWrapper from '../components/PinPasswordWrapper'

/**
 * Component to choose a PIN
 * Shows two PIN fields with required pattern and validations
 *
 * @memberof Components
 */
function ChoosePin({ success, back }) {
  const [pin, setPin] = useState('');
  /**
   * Called when input PIN changes the value
   *
   * @param {string} value New value in input
   */
  const handleChange = (value) => {
    setPin(value);
  }

  const handleSuccess = () => {
    success(pin);
  }

  const renderMessage = () => {
    return <p className="mt-4 mb-4">{t`The PIN is a 6-digit password requested to authorize actions in your wallet, such as generating new addresses and sending tokens.`}</p>;
  }

  return (
    <PinPasswordWrapper
      message={renderMessage()}
      success={handleSuccess}
      back={back}
      handleChange={handleChange}
      field='PIN'
      pattern='[0-9]{6}'
      inputMode='numeric'
      button={t`Next`}
    />
  )
}

export default ChoosePin;
