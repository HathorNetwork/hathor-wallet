/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';

/**
 * Placeholder for the Web3Auth recovery flow.
 *
 * The actual recovery copy and link to the Web3Auth-hosted factor management
 * webview is deferred to a follow-up. PR1 just registers the route so links
 * pointing here from Settings (when added later) don't 404.
 *
 * @memberof Screens
 */
function Web3AuthRecovery() {
  return (
    <div className="outside-content-wrapper">
      <div className="inside-white-wrapper col-sm-12 col-md-8">
        <div className="inside-div">
          <h3>{t`Recovery`}</h3>
          <p>{t`Web3Auth recovery is managed through the Web3Auth-hosted recovery portal. A direct link from this screen will be added in a follow-up.`}</p>
        </div>
      </div>
    </div>
  );
}

export default Web3AuthRecovery;
