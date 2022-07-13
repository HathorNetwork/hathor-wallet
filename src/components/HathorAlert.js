/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';


/**
 * Component to show an alert on the bottom right corner of the screen
 *
 * @memberof Components
 */
class HathorAlert extends React.Component {
  constructor(props) {
    super(props);

    /**
     * show {boolean} If should show the alert or not
     */
    this.state = {
      show: false
    }

    // Set timeout timer to be cleared in case of unmount
    this.timer = null;
  }

  componentWillUnmount = () => {
    // Preventing calling setState when the component is not mounted
    if (this.timer) {
      clearTimeout(this.timer);
    }
  }

  /**
   * Show the alert. Change state and set a new state change for the future
   * Duration of -1 will not auto hide the alert.
   *
   * @param {number} Duration that the alert will appear on the screen (in milliseconds)
   */
  show = (duration) => {
    this.setState({ show: true });
    if (duration >= 0) {
      this.timer = setTimeout(() => {
        this.setState({ show: false });
      }, duration);
    }
  }

  dismiss = () => {
    if (this.props.onDismiss) {
      this.props.onDismiss();
    }
  }

  render() {
    return (
      <div ref="alertDiv" className={`hathor-alert alert alert-${this.props.type} alert-dismissible fade ${ this.props.extraClasses || 'col-10 col-sm-3' } ${this.state.show ? 'show' : ''}`} role="alert">
        {this.props.text}
        <button type="button" className="close" data-dismiss="alert" aria-label="Close" onClick={this.dismiss}>
          <span aria-hidden="true">&times;</span>
        </button>
      </div>
    );
  }
}

export default HathorAlert;
