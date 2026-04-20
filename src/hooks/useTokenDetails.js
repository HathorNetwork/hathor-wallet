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
 * Hook to fetch token details (including version) on-demand for multiple tokens.
 * Automatically dispatches tokenRegisterRequested for each token whose version is undefined.
 *
 * @param {string[]} uids - Array of token uids to fetch details for
 * @returns {{ tokens: Array<{uid: string, name: string, symbol: string, version: number|undefined}>, isLoading: boolean, errors: Object<string, string|null> }}
 */
export function useTokensDetails(uids) {
  const dispatch = useDispatch();
  const tokens = useSelector((state) =>
    uids.map(uid => state.tokens.find((t) => t.uid === uid)).filter(Boolean)
  );
  const tokenRegistration = useSelector((state) => state.tokenRegistration ?? {});

  const errors = {};
  for (const uid of uids) {
    const reg = tokenRegistration[uid];
    if (reg?.status === TOKEN_DOWNLOAD_STATUS.FAILED) {
      errors[uid] = reg.error;
    }
  }

  const isLoading = tokens.some(t => t.version === undefined && !errors[t.uid]);

  useEffect(() => {
    tokens
      .filter(t => t.version === undefined)
      .forEach(t => dispatch(tokenRegisterRequested(t.uid)));
  }, [tokens]);

  return { tokens, isLoading, errors };
}
