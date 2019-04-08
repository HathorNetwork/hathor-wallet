/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React from 'react';
import { Route } from 'react-router-dom';
import wallet from './utils/wallet';
import $ from 'jquery';
import App from './App';
import ModalUnhandledError from './components/ModalUnhandledError';

import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './index.css';

class ErrorBoundary extends React.Component {

  state = { hasUiError: false, }

  handleErrorEvent = (event) => {
    this.props.onError(event.error, false, {})
  }

  componentDidMount() {
    window.addEventListener('error', this.handleErrorEvent)
  }

  componentWillUnmount() {
    window.removeEventListener('error', this.handleErrorEvent)
  }

  static getDerivedStateFromError(error) {
    return { hasUiError: true };
  }

  componentDidCatch(error, info) {
    this.props.onError(error, true)
    wallet.sentryWithScope(error, info);
  }

  // Remove corrupted UI subtree to prevent error corrupt higher components
  render() {
    if (!this.props.error && this.state.hasUiError) {
      this.setState({ hasUiError: false })
    }

    return this.state.hasUiError ? null : <Route path="/" component={App} />
  }
}

class ErrorWrapper extends React.Component {
  state = { error: null, renderError: null, info: null }

  onError = (error, renderError, info) => {
    // Don't propagate error messages listened more than once
    if (error !== this.state.error) {
      this.setState({ error, renderError, info })
      $('#unhandledErrorModal').modal('show')
    }
  }

  render() {
    const renderApp = (props) => <ErrorBoundary {...props} onError={this.onError} error={this.state.error} info={this.state.info} />
    const renderModal = (props) => <ModalUnhandledError {...props} {...this.state} resetError={() => this.onError(null)} />
    return <div className="components-wrapper">
      <Route path="/" render={renderApp} />
      <Route path="/" render={renderModal} />
    </div>
  }
}

export default ErrorWrapper;
