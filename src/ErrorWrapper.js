/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import $ from 'jquery';
import App from './App';
import ModalUnhandledError, { UNHANDLED_ERROR_MODAL_ID_SELECTOR } from './components/ModalUnhandledError';

import 'bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import 'font-awesome/css/font-awesome.min.css';
import './index.css';
import TokenBar from "./components/TokenBar";

function ErrorBoundary(props) {
	const { onError } = props;

	const handleErrorEvent = (event) => {
		// Events without an error object are browser notices such as
		// "ResizeObserver loop completed", not app failures. Passing null
		// would also be read as a reset by onError.
		if (event.error == null) {
			return;
		}
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
		<App />
	)
}

function ErrorWrapper() {
	const [error, setError] = useState(null);
	// ErrorBoundary keeps the first onError it was given, so read the latest
	// error through a ref rather than the stale `error` in that closure.
	const lastErrorRef = useRef(null);

	const onError = (newError) => {
		if (!newError) {
			lastErrorRef.current = null;
			setError(null);
			return;
		}
		// Don't propagate error messages listened more than once
		if (newError !== lastErrorRef.current) {
			lastErrorRef.current = newError;
			setError(newError);
			$(UNHANDLED_ERROR_MODAL_ID_SELECTOR).modal('show');
		}
	}

	return (
		<>
		<TokenBar />
		<div className="components-wrapper">
			<ErrorBoundary
				onError={onError}
			/>
			<ModalUnhandledError
				error={error}
				resetError={() => onError(null)}
			/>
		</div>
		</>
	)
}

export default ErrorWrapper;
