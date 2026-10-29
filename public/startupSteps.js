/**
 * Copyright (c) Hathor Labs and its affiliates.
 *
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */

// Runs the preload's startup steps. Kept free of `electron` imports so it can
// be unit tested with `node --test`.

/**
 * Run each step on its own, so a failure in one still lets the others run.
 * Failures are logged at once but reported only after every step has run:
 * one of the steps applies the user's Sentry consent, and a failure in a step
 * before it would otherwise be dropped by the still-disabled client.
 *
 * @param {Function[]} steps Named functions, run in order
 * @param {{log: Function, report: Function}} handlers `log(message, error)`
 *   for each failure as it happens, `report(error)` for each one afterwards
 * @returns {Error[]} The failures, in step order
 */
function runStartupSteps(steps, { log, report }) {
  const failures = [];
  for (const step of steps) {
    try {
      step();
    } catch (error) {
      log(`preload: startup step ${step.name} failed`, error);
      failures.push(error);
    }
  }
  failures.forEach((error) => report(error));
  return failures;
}

module.exports = { runStartupSteps };
