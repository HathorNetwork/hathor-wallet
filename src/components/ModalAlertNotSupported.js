/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag'

import ModalAlert from './ModalAlert.js';


/**
 * Component that shows a message that is not supported
 *
 * @memberof Components
 */
class ModalAlertNotSupported extends React.Component {
  render() {
    const renderBody = () => {
      return (
        <div>
          <p>{t`Unfortunately this feature is currently not supported when using a hardware wallet. If you need this feature, you can use it switching to a software wallet.`}</p>
          <p>{t`We are sorry for the inconvenience. We are still working to support all features in hardware wallets.`}</p>
        </div>
      );
    }

    return (
      <ModalAlert
        id="notSupported"
        title={t`Action not supported`}
        buttonName={t`Close`}
        body={this.props.children || renderBody()}
      />
    );
  }
}

export default ModalAlertNotSupported;
