/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import './i18nInit';
import React from 'react';
import ReactDOM from 'react-dom';
import ErrorWrapper from './ErrorWrapper';
import { BrowserRouter as Router, Route } from 'react-router-dom';

import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './index.css';

import store from "./store/index";
import { Provider } from "react-redux";

ReactDOM.render(
  <Provider store={store}>
    <Router>
      <Route path="/" component={ErrorWrapper} />
    </Router>
  </Provider>,
  document.getElementById('root')
);
