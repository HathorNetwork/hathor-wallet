/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';
import { useNavigate } from 'react-router-dom';
import ResetNavigationLink from './ResetNavigationLink';


/**
 * Component that adds a left arrow and a link to go back one page
 *
 * @memberof Components
 */
function BackButton() {
  const navigate = useNavigate();

  /**
   * Called when link is clicked and goes back one page
   */
  const goBack = () => {
    navigate(-1);
  }

  return <ResetNavigationLink to={goBack} name={t`Back`} />;
}

export default BackButton;
