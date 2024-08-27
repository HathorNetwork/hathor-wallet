/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';


/**
 * Component that has a left arrow and a link to another page
 *
 * @memberof Components
 */
function ResetNavigationLink({ to, name }) {
  /**
   * Called when link is clicked
   *
   * @param {Object} e Event emitted when link is clicked
   */
  const go = (e) => {
    e.preventDefault();
    to();
  }

  return (
    <div className="d-flex flex-row align-items-center back-div mb-3">
      <i className="fa fa-long-arrow-left mr-2" />
      <a href="true" onClick={(e) => go(e)}>{name}</a>
    </div>
  )
}

export default ResetNavigationLink;
