/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';


/**
 * Component that adds a left arrow and a link to go back one page
 *
 * @memberof Components
 */
class BackButton extends React.Component {

  /**
   * Called when link is clicked and goes back one page
   *
   * @param {Object} e Event emitted when link is clicked
   */
  goBack = (e) => {
    e.preventDefault();
    this.props.history.goBack();
  }

  render = () => {
    return (
      <div className="d-flex flex-row align-items-center back-div mb-3">
        <i className="fa fa-long-arrow-left mr-2" />
        <a href="true" onClick={(e) => this.goBack(e)}>{t`Back`}</a>
      </div>
    )
  }
}

export default BackButton;
