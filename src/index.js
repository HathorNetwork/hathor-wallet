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

import hathorLib from '@hathor/wallet-lib';
import createRequestInstance from './api/axiosInstance';
// This code used to be on the componentDidMount of App.js file
// However there is a checkVersion request that is executed before the screen is mounted for the first time
// This request was being called using the default axios instance, so I need to register the custom axios instance
// here, where the code is executed before anything
hathorLib.axios.registerNewCreateRequestInstance(createRequestInstance);

ReactDOM.render(
  <Provider store={store}>
    <Router>
      <Route path="/" component={ErrorWrapper} />
    </Router>
  </Provider>,
  document.getElementById('root')
);
