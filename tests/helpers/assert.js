'use strict';

function createReporter(name) {
  const failures = [];
  let passed = 0;
  let skipped = 0;

  function ok(cond, msg) {
    if (cond) {
      passed += 1;
      return true;
    }
    failures.push(msg);
    return false;
  }

  function eq(actual, expected, msg) {
    if (actual === expected) {
      passed += 1;
      return true;
    }
    failures.push(msg + ' (expected ' + JSON.stringify(expected) + ', got ' + JSON.stringify(actual) + ')');
    return false;
  }

  function skip(msg) {
    skipped += 1;
    failures.push('SKIP: ' + msg);
  }

  function fail(msg) {
    failures.push(msg);
  }

  return {
    name,
    ok,
    eq,
    skip,
    fail,
    get passed() { return passed; },
    get failed() { return failures.filter(f => !f.startsWith('SKIP: ')).length; },
    get skipped() { return skipped; },
    failures,
  };
}

module.exports = { createReporter };
