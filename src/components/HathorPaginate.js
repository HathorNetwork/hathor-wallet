import React from 'react';
import ReactPaginate from 'react-paginate';


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

export default HathorPaginate;