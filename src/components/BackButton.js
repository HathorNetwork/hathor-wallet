/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { useNavigate } from 'react-router-dom';


/**
 * Component that adds a left arrow and a link to go back one page
 *
 * @memberof Components
 */
function BackButton() {
  const navigate = useNavigate();

  /**
   * Called when link is clicked and goes back one page
   *
   * @param {Object} e Event emitted when link is clicked
   */
  const goBack = (e) => {
    e.preventDefault();
    navigate(-1);
  }

  return (
    <div className="d-flex flex-row align-items-center back-div mb-3">
      <i className="fa fa-long-arrow-left mr-2" />
      <a href="true" onClick={(e) => goBack(e)}>{t`Back`}</a>
    </div>
  )
}

export default BackButton;
