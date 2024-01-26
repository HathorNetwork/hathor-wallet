/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useState } from 'react';
import { useHistory } from 'react-router-dom';
import $ from 'jquery';
import App from './App';
import ModalUnhandledError, { UNHANDLED_ERROR_MODAL_ID_SELECTOR } from './components/ModalUnhandledError';

import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './index.css';

function ErrorBoundary(props) {
	const { onError } = props;
	const history = useHistory();

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
		<App history={history} />
	)
}

function ErrorWrapper(props) {
	const [error, setError] = useState(null);

	const onError = (newError) => {
		// Don't propagate error messages listened more than once
		if (newError !== error) {
			setError(error);
			$(UNHANDLED_ERROR_MODAL_ID_SELECTOR).modal('show');
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

export default ErrorWrapper;
