const dateFormatter = {
  parseTimestamp(timestamp) {
    const d = new Date(timestamp*1000); // new Date in js expect milliseconds
    return `${d.toLocaleDateString('en-US')} ${d.toLocaleTimeString('en-US')}`;
  },

  timestampToString(timestamp) {
    return new Date(timestamp * 1000).toString();
  },

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

  dateToTimestamp(date) {
    return Math.floor(date.getTime() / 1000);
  }
};


export default dateFormatter;
