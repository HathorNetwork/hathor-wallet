/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useState } from 'react';
import { t } from 'ttag'

import PinPasswordWrapper from '../components/PinPasswordWrapper'
import { PASSWORD_PATTERN } from '../constants';


/**
 * Component to choose a password
 * Shows two password fields with required pattern and validations
 *
 * @memberof Components
 */
function ChoosePassword({ success, back }) {
  const [password, setPassword] = useState('');

  /**
   * Called when input password changes the value
   *
   * @param {string} value value in input
   */
  const handleChange = (value) => {
    setPassword(value);
  }

  const handleSuccess = () => {
    success(password);
  }

  const renderMessage = () => {
    return (
      <div className="mt-4 mb-4">
        <p>{t`Please, choose a password to encrypt your sensitive data while using the wallet.`}</p>
        <p className="mt-3">{t`Your password must have at least 8 characters and at least one lower case character, one upper case character, one number, and one special character.`}</p>
      </div>
    );
  }

  return (
    <PinPasswordWrapper
      message={renderMessage()}
      success={handleSuccess}
      back={back}
      handleChange={handleChange}
      field={t`Password`}
      button={t`Next`}
      pattern={PASSWORD_PATTERN}
    />
  )
}

export default ChoosePassword;
