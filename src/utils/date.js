/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

/**
 * Util methods to help handle date
 *
 * @namespace Date
 */
const dateFormatter = {
  /**
   * Get locale date from timestamp
   *
   * @param {number} timestamp Timestamp to be parsed
   *
   * @return {string} Locale date and time
   *
   * @memberof Date
   * @inner
   */
  parseTimestamp(timestamp) {
    const d = new Date(timestamp*1000); // new Date in js expect milliseconds
    return `${d.toLocaleDateString('en-US')} ${d.toLocaleTimeString('en-US')}`;
  },

  /**
   * Get date from timestamp
   *
   * @param {number} timestamp Timestamp to be parsed
   *
   * @return {string} Date string
   *
   * @memberof Date
   * @inner
   */
  timestampToString(timestamp) {
    return new Date(timestamp * 1000).toString();
  },

  /**
   * Get formatted seconds
   * From seconds transform into days, hours, minutes and seconds
   *
   * @param {number} uptime Seconds of uptime
   *
   * @return {string} Formatted uptime seconds
   *
   * @memberof Date
   * @inner
   */
  uptimeFormat(uptime) {
    uptime = Math.floor(uptime);
    const days = Math.floor(uptime / 3600 / 24);
    uptime = uptime % (3600 * 24);
    const hours = Math.floor(uptime / 3600);
    uptime = uptime % 3600;
    const minutes = Math.floor(uptime / 60);
    uptime = uptime % 60;
    const seconds = uptime;
    const pad = (n) => (Math.abs(n) >= 10 ? n : '0' + n);
    const uptime_str = days + ' days, ' + pad(hours) + ':' + pad(minutes) + ':' + pad(seconds);
    return uptime_str;
  },

  /**
   * Get timestamp from date
   *
   * @param {Object} date Date object to get timestamp from
   *
   * @return {number} Timestamp of the date
   *
   * @memberof Date
   * @inner
   */
  dateToTimestamp(date) {
    return Math.floor(date.getTime() / 1000);
  }
};


export default dateFormatter;
