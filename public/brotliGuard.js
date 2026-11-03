/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// No Hathor backend serves Brotli, so the app neither advertises nor accepts
// it: br is stripped from Accept-Encoding, and a response that is br-encoded
// anyway is refused. Drop this if a backend ever needs br.

/**
 * Remove br from an Accept-Encoding value, keeping the other encodings.
 */
function stripBrotli(acceptEncoding) {
  return acceptEncoding
    .split(',')
    .map((encoding) => encoding.trim())
    .filter((encoding) => encoding && encoding.split(';')[0].trim().toLowerCase() !== 'br')
    .join(', ');
}

/**
 * Whether any Content-Encoding header in an Electron responseHeaders object
 * (header name -> array of values) names br.
 */
function isBrotliEncoded(responseHeaders) {
  return Object.entries(responseHeaders || {}).some(([name, values]) => (
    name.toLowerCase() === 'content-encoding'
    && [].concat(values).some((value) => (
      String(value).split(',').some((encoding) => encoding.trim().toLowerCase() === 'br')
    ))
  ));
}

/**
 * Install both guards on an Electron session. Chromium already rejects a br
 * response it did not advertise; the cancel also covers any response that
 * gets past that check.
 */
function installBrotliGuard(session) {
  session.webRequest.onBeforeSendHeaders((details, callback) => {
    const requestHeaders = { ...details.requestHeaders };
    for (const name of Object.keys(requestHeaders)) {
      if (name.toLowerCase() === 'accept-encoding') {
        requestHeaders[name] = stripBrotli(requestHeaders[name]);
      }
    }
    callback({ requestHeaders });
  });
  session.webRequest.onHeadersReceived((details, callback) => {
    callback(isBrotliEncoded(details.responseHeaders) ? { cancel: true } : {});
  });
}

module.exports = { stripBrotli, isBrotliEncoded, installBrotliGuard };
