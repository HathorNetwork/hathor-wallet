/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useState } from 'react';
import { Route, withRouter } from 'react-router-dom';
import $ from 'jquery';
import App from './App';
import ModalUnhandledError from './components/ModalUnhandledError';

import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './index.css';

function ErrorBoundary(props) {
	const { onError } = props;

	const handleErrorEvent = (event) => {
		onError(event.error);
	}

	// Handling errors on the window level
	useEffect(() => {
		window.addEventListener('error', handleErrorEvent);
		return () => {
			window.removeEventListener('error', handleErrorEvent);
		};
	}, []);

	return (
		<Route path="/">
			<App {...props}/>
		</Route>
	)
}

function ErrorWrapper(props) {
	const [error, setError] = useState(null);

	const onError = (newError) => {
		// Don't propagate error messages listened more than once
		if (newError !== error) {
			setError(error);
			$('#unhandledErrorModal').modal('show');
		}
	}

	return (
		<div className="components-wrapper">
			<ErrorBoundary
				{...props}
				onError={onError}
			/>
			<ModalUnhandledError
				{...props}
				resetError={() => onError(null)}
			/>
		</div>
	)
}

export default withRouter(ErrorWrapper);
