import { defineConfig } from "cypress";
const happoTask = require('happo-cypress/task');

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    setupNodeEvents(on, config) {
      // implement node event listeners here
      happoTask.register(on);
      return config;
    },
    video: false,
  },
});
