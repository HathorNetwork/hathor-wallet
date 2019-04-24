/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import logo from '../assets/images/hathor-logo.png';
import BackButton from '../components/BackButton';


/**
 * Screen that shows 404 error message to the user
 *
 * @memberof Screens
 */
const Page404 = (props) => {
  return (
    <div className="outside-content-wrapper">
      <div className="inside-white-wrapper col-sm-12 col-md-8">
        <BackButton {...props} />
        <div>
          <div className="d-flex align-items-center flex-column">
            <img className="hathor-logo" src={logo} alt="" />
            <h2 className="mt-5 mb-4"><strong>Page not found</strong></h2>
          </div>
          <p className="mb-4">You tried to access a page that does not exist in Hathor Wallet</p>
        </div>
      </div>
    </div>
  );
}

export default Page404;
