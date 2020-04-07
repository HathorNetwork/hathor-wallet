/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import ReactPaginate from 'react-paginate';
import PropTypes from 'prop-types';
import { t } from 'ttag'


/**
 * Component to add pagination buttons of a list
 *
 * @memberof Components
 */
class HathorPaginate extends React.Component {
  render() {
    return (
      <ReactPaginate previousLabel={t`Previous`}
         nextLabel={t`Next`}
         pageCount={this.props.pageCount}
         marginPagesDisplayed={1}
         pageRangeDisplayed={2}
         onPageChange={this.props.onPageChange}
         containerClassName={"pagination justify-content-center"}
         subContainerClassName={"pages pagination"}
         activeClassName={"active"}
         breakClassName="page-item"
         breakLabel={<a  href="true" className="page-link">...</a>}
         pageClassName="page-item"
         previousClassName="page-item"
         nextClassName="page-item"
         pageLinkClassName="page-link"
         previousLinkClassName="page-link"
         nextLinkClassName="page-link" />
    );
  }
}

/*
 * pageCount: Total number of pages of the list being paginated
 * onPageChange: Method to be executed when the page changes
 */
HathorPaginate.propTypes = {
  pageCount: PropTypes.number.isRequired,
  onPageChange: PropTypes.func.isRequired,
};

export default HathorPaginate;
