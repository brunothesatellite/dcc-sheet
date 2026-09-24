'use strict';

const fs = require('fs');
const path = require('path');
const { createReporter } = require('./helpers/assert');
const { ROOT, CLASSES } = require('./helpers/env');

module.exports = function suite() {
  const r = createReporter('05-export');
  const exemplesDir = path.join(ROOT, 'exemples');
  let files = [];
  try {
    files = fs.readdirSync(exemplesDir).filter(function (f) { return f.endsWith('.json'); });
  } catch (e) {
    r.fail('cannot list exemples/: ' + e.message);
    return r;
  }

  r.ok(files.length >= 1, 'at least one export JSON in exemples/ (got ' + files.length + ')');

  const classSet = new Set(CLASSES);

  files.forEach(function (file) {
    const rel = 'exemples/' + file;
    let raw;
    try {
      raw = fs.readFileSync(path.join(exemplesDir, file), 'utf8');
    } catch (e) {
      r.fail(rel + ': read failed: ' + e.message);
      return;
    }

    let obj;
    try {
      obj = JSON.parse(raw);
    } catch (e) {
      r.fail(rel + ': invalid JSON: ' + e.message);
      return;
    }
    r.ok(true, rel + ': valid JSON');

    r.eq(obj.version, 1, rel + ': version === 1');
    r.ok(Array.isArray(obj.characters), rel + ': characters is array');
    r.ok(obj.characters.length > 0, rel + ': characters not empty (got ' + (obj.characters && obj.characters.length) + ')');

    const classesFound = new Set();
    let shapeOk = true;
    (obj.characters || []).forEach(function (ch, i) {
      if (!ch || typeof ch.name !== 'string' || !ch.name) {
        r.fail(rel + ': characters[' + i + '] missing name');
        shapeOk = false;
        return;
      }
      if (!classSet.has(ch.class)) {
        r.fail(rel + ': characters[' + i + '] invalid class ' + ch.class);
        shapeOk = false;
        return;
      }
      if (!ch.data || typeof ch.data !== 'object' || Array.isArray(ch.data)) {
        r.fail(rel + ': characters[' + i + '] data not object');
        shapeOk = false;
        return;
      }
      classesFound.add(ch.class);
    });
    r.ok(shapeOk, rel + ': all character items have name/class/data');
    r.ok(classesFound.size >= 3, rel + ': at least 3 distinct classes (got ' + classesFound.size + ')');
  });

  return r;
};
