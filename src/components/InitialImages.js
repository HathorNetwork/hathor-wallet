/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import scalability from '../assets/images/high_scalability.png';
import easy from '../assets/images/easy_to_use.png';


/**
 * Component that shows auxiliary images on the initial screens
 *
 * @memberof Components
 */
const InitialImages = (props) => {
  return (
    <div className="p-0">
      <img className="scalability-img" src={scalability} alt="" />
      <img className="easy-img" src={easy} alt="" />
    </div>
  )
}

export default InitialImages;