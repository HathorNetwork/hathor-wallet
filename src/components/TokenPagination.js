/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { t } from 'ttag';

/**
 * Component that shows the pagination buttons
 *
 * @memberof Components
 */
class TokenPagination extends React.Component {
  render() {
    if (this.props.history === null ||
        this.props.history === undefined ||
        this.props.history.length === 0 ||
        (this.props.hasBefore === false && this.props.hasAfter === false)) {
      return null;
    }

    return (
      <nav aria-label="Token pagination" className="d-flex justify-content-center">
        <ul className="pagination">
          <li className={(!this.props.hasBefore) ? "page-item mr-3 disabled" : "page-item mr-3"}><a className="page-link" onClick={(e) => this.props.previousClicked(e)} href="true">{t`Previous`}</a></li>
          <li className={(!this.props.hasAfter) ? "page-item disabled" : "page-item"}><a className="page-link" href="true" onClick={(e) => this.props.nextClicked(e)}>{t`Next`}</a></li>
        </ul>
      </nav>
    );
  }
}

export default TokenPagination;
