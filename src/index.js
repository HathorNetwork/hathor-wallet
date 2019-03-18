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
