/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import PropTypes from 'prop-types';
import $ from 'jquery';


/**
 * Component that shows a modal with a message, like an stylized alert
 *
 * @memberof Components
 */
class ModalAlert extends React.Component {
  static defaultProps = {
    id: 'alertModal',
    showFooter: true,
  }

  componentDidMount() {
    const id = this.props.id;
    $(`#${id}`).modal('show');
    $(`#${id}`).on('hidden.bs.modal', this.props.onClose);
  }

  componentWillUnmount() {
    const id = this.props.id;
    $(`#${id}`).modal('hide');
    $(`#${id}`).off();
  }

  /**
   * On modal button click
   * Can't set this as default props because it depends on another props (and I don't have access to this.props in defaultProps)
   * So, if handleButton was set on props, use it, otherwise call the default method
   */
  buttonClick = () => {
    if (this.props.handleButton) {
      this.props.handleButton();
    } else {
      $(`#${this.props.id}`).modal('hide');
    }
  }

  render() {
    const renderFooter = () => {
      if (this.props.showFooter) {
        return (
          <div className="modal-footer">
            {this.props.secondaryButton}
            <button onClick={this.buttonClick} type="button" className="btn btn-hathor">{this.props.buttonName}</button>
          </div>
        );
      }
      return null;
    }

    return (
      <div className="modal fade" id={this.props.id} tabIndex="-1" role="dialog" aria-labelledby="alertModal" aria-hidden="true" data-backdrop="static" data-keyboard="false">
        <div className="modal-dialog" role="document">
          <div className="modal-content">
            <div className="modal-header">
              <h5 className="modal-title" id="exampleModalLabel">{this.props.title}</h5>
            </div>
            <div className="modal-body">
              {this.props.body}
            </div>
            {renderFooter()}
          </div>
        </div>
      </div>
    );
  }
}

/**
 * id: modal element id
 * buttonName: name of the modal button
 * handleButton: method to be executed when button is clicked
 * title: modal title
 * body: modal body
 */
ModalAlert.propTypes = {
  id: PropTypes.string,
  buttonName: PropTypes.string,
  title: PropTypes.string.isRequired,
  handleButton: PropTypes.func,
  secondaryButton: PropTypes.element,
  body: PropTypes.element.isRequired,
  showFooter: PropTypes.bool,
};

export default ModalAlert;
