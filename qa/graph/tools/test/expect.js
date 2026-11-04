/**
 * The few Jest matchers the tests use, over node:assert, so the kit needs no test framework.
 */
const assert = require('node:assert/strict');

function matchers(actual, negate) {
  const check = (pass, message) => {
    if (pass === negate) assert.fail(negate ? `not ${message}` : message);
  };
  const deepEq = (a, b) => {
    try { assert.deepStrictEqual(a, b); return true; } catch (e) { return false; }
  };
  const thrown = () => {
    try { actual(); } catch (e) { return e; }
    return null;
  };
  const show = (v) => { try { return JSON.stringify(v); } catch (e) { return String(v); } };
  return {
    toBe: (expected) => check(Object.is(actual, expected), `expected ${show(actual)} to be ${show(expected)}`),
    toEqual: (expected) => {
      if (expected instanceof ArrayContaining) {
        const missing = expected.items.filter((item) => !actual.some((x) => deepEq(x, item)));
        check(missing.length === 0, `expected ${show(actual)} to contain ${show(missing)}`);
        return;
      }
      if (negate) check(deepEq(actual, expected), 'expected values to differ');
      else assert.deepStrictEqual(actual, expected);
    },
    toContain: (item) => check(actual.includes(item), `expected ${show(actual)} to contain ${show(item)}`),
    toContainEqual: (item) => check(actual.some((x) => deepEq(x, item)), `expected ${show(actual)} to contain ${show(item)}`),
    toHaveLength: (n) => check(actual.length === n, `expected length ${n}, got ${actual.length}`),
    toBeGreaterThan: (n) => check(actual > n, `expected ${actual} > ${n}`),
    toBeLessThan: (n) => check(actual < n, `expected ${actual} < ${n}`),
    toBeLessThanOrEqual: (n) => check(actual <= n, `expected ${actual} <= ${n}`),
    toBeUndefined: () => check(actual === undefined, `expected ${show(actual)} to be undefined`),
    toMatch: (re) => check(new RegExp(re).test(actual), `expected ${show(actual)} to match ${re}`),
    toThrow: (expected) => {
      const e = thrown();
      if (negate) { check(e !== null, `expected no throw, got ${e && e.message}`); return; }
      check(e !== null, 'expected a throw');
      if (expected !== undefined) check(String(e.message).includes(expected), `expected "${e.message}" to include "${expected}"`);
    },
  };
}

class ArrayContaining {
  constructor(items) { this.items = items; }
}

function expect(actual) {
  return { ...matchers(actual, false), not: matchers(actual, true) };
}

expect.arrayContaining = (items) => new ArrayContaining(items);

module.exports = { expect };
