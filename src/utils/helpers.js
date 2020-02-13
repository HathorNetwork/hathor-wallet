/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

let shell = null;
if (window.require) {
  shell = window.require('electron').shell;
}

const helpers = {
  /**
   * Open external URL. It executes electron shell, if it's running on electron
   * and open new tab otherwise.
   *
   * @param {String} url URL to be opened
   *
   * @memberof helpers
   * @inner
   */
  openExternalURL(url) {
    // We use electron shell to open the user external default browser
    // otherwise it would open another electron window and the user wouldn't be able to copy the URL
    if (shell !== null) {
      shell.openExternal(url);
    } else {
      // In case it's running on the browser it won't have electron shell
      // This should be used only when testing
      window.open(url, '_blank');
    }
  },
}

export default helpers;