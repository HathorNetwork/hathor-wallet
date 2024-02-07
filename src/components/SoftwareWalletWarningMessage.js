/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'


/**
 * Component that shows a warning message if user decides to use a software wallet
 *
 * @memberof Components
 */
const SoftwareWalletWarningMessage = () => {
  return (
    <div>
      <p className="mt-4">{t`Using a software wallet is not the safest way to secure your tokens. As your private information is stored in your computer that is connected to the internet, it may be stolen by a virus.`}</p>
      <p className="mt-4">{t`If you want a safer method, you can use a hardware wallet. We currently have support for Ledger.`}</p>
    </div>
  )
}

export default SoftwareWalletWarningMessage;
