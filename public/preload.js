// This file is executed right before electron start loading the index
const Sentry = require('@sentry/electron')
const constants = require('./constants');

Sentry.init({
  dsn: constants.SENTRY_DSN,
  release: process.env.npm_package_version
})

process.once('loaded', () => {
  // Set closed in localStorage, so user does not open in the wallet page
  localStorage.setItem('wallet:closed', true);
})
