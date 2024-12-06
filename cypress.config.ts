import { defineConfig } from "cypress";
const getCompareSnapshotsPlugin = require('cypress-image-diff-js/plugin');

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      return getCompareSnapshotsPlugin(on, config);
    },
    video: false,
  },
});
