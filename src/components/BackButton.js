import React from 'react';


class BackButton extends React.Component {

  goBack = (e) => {
    e.preventDefault();
    this.props.history.goBack();
  }

  render = () => {
    return (
      <div className="d-flex flex-row align-items-center back-div mb-3">
        <i className="fa fa-long-arrow-left mr-2" />
        <a href="true" onClick={(e) => this.goBack(e)}>Back</a>
      </div>
    )
  }
}

export default BackButton;