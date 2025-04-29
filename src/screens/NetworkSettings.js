/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import BackButton from '../components/BackButton';
import NetworkSettingsForm from '../components/NetworkSettingsForm';

/**
 * Screen to change the settings of the network the wallet is connected to.
 *
 * @memberof Screens
 */
function NetworkSettings(props) {
  // Only render the form with navigation/header
  return (
    <div className="content-wrapper">
      <BackButton />
      <h3 className="mt-4 mb-4">{t`Network Settings`}</h3>
      <NetworkSettingsForm {...props} />
    </div>
  );
}

export default NetworkSettings;
