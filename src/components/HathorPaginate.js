import React from 'react';
import ReactPaginate from 'react-paginate';


/**
 * Component to show a pagination
 *
 * @memberof Components
 */
class HathorPaginate extends React.Component {
  render() {
    return (
      <ReactPaginate previousLabel={"Previous"}
         nextLabel={"Next"}
         pageCount={this.props.pageCount}
         marginPagesDisplayed={1}
         pageRangeDisplayed={2}
         onPageChange={this.props.onPageChange}
         containerClassName={"pagination justify-content-center"}
         subContainerClassName={"pages pagination"}
         activeClassName={"active"}
         breakClassName="page-item"
         breakLabel={<span className="page-link">...</span>}
         pageClassName="page-item"
         previousClassName="page-item"
         nextClassName="page-item"
         pageLinkClassName="page-link"
         previousLinkClassName="page-link"
         nextLinkClassName="page-link" />
    );
  }
}

export default HathorPaginate;