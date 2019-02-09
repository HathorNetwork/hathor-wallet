import React from 'react';


class HathorAlert extends React.Component {
  constructor(props) {
    super(props);

    this.state = {
      show: false
    }

    this.timer = null;
  }

  componentWillUnmount = () => {
    // Preventing calling setState when the component is not mounted
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  show = (duration) => {
    this.setState({ show: true });
    this.timer = setTimeout(() => {
      this.setState({ show: false });
    }, duration);
  }

  render() {
    return (
      <div ref="alertDiv" className={`hathor-alert alert alert-${this.props.type} alert-dismissible fade col-10 col-sm-3 ${this.state.show ? 'show' : ''}`} role="alert">
        {this.props.text}
        <button type="button" className="close" data-dismiss="alert" aria-label="Close">
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    );
  }
}

export default HathorAlert;