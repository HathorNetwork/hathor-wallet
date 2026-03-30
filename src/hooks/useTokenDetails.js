/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { tokenRegisterRequested } from '../actions';
import { TOKEN_DOWNLOAD_STATUS } from '../sagas/tokens';

/**
 * Hook to fetch token details (including version) on-demand.
 * Automatically dispatches tokenRegisterRequested if version is undefined.
 *
 * @param {string|undefined} uid - Token uid to fetch details for
 * @returns {{ token: object|undefined, isLoading: boolean, error: string|null }}
 */
export function useTokenDetails(uid) {
  const dispatch = useDispatch();
  const token = useSelector((state) => state.tokens.find((t) => t.uid === uid));
  const registration = useSelector((state) => uid && state.tokenRegistration?.[uid]);

  const registrationFailed = registration?.status === TOKEN_DOWNLOAD_STATUS.FAILED;
  const needsVersionFetch = Boolean(uid && token && token.version === undefined);
  const isLoading = registration?.status === TOKEN_DOWNLOAD_STATUS.LOADING;
  const error = registrationFailed ? registration.error : null;

  useEffect(() => {
    if (needsVersionFetch) {
      dispatch(tokenRegisterRequested(uid));
    }
  }, [needsVersionFetch, uid, dispatch]);

  return { token, isLoading, error };
}
