'use strict';

const { createReporter } = require('./helpers/assert');
const { createEnv, CLASSES, collectSheetData } = require('./helpers/env');

const COMMON_FIELDS = ['nom', 'classe_armure', 'points_de_vie', 'attaque_cac', 'portrait_source'];

module.exports = function suite() {
  const r = createReporter('03-modules');

  CLASSES.forEach(function (cls) {
    let env;
    try {
      env = createEnv();
      env.loadClass(cls);
    } catch (e) {
      r.fail(cls + ': load failed: ' + e.message);
      return;
    }

    const mod = env.window.DCCModules && env.window.DCCModules[cls];
    if (!mod) {
      r.fail(cls + ': DCCModules.' + cls + ' missing after load');
      return;
    }
    r.ok(typeof mod.render === 'function', cls + ': render is function');
    r.ok(typeof mod.collectData === 'function', cls + ': collectData is function');

    const container = env.document.getElementById('root');
    try {
      mod.render(container, '1', {});
    } catch (e) {
      r.fail(cls + ': render threw: ' + e.message);
      return;
    }

    const keys = Array.prototype.slice.call(container.querySelectorAll('[data-key]'));
    r.ok(keys.length > 0, cls + ': has data-key fields (got ' + keys.length + ')');

    const keySet = new Set(keys.map(function (el) { return el.getAttribute('data-key'); }));
    COMMON_FIELDS.forEach(function (field) {
      r.ok(keySet.has(cls + '-1-' + field), cls + ': has key ' + cls + '-1-' + field);
    });

    const wrongPrefix = keys.filter(function (el) {
      const k = el.getAttribute('data-key') || '';
      return k.indexOf(cls + '-1-') !== 0;
    });
    r.eq(wrongPrefix.length, 0, cls + ': all data-keys use prefix ' + cls + '-1-');

    // Roundtrip via collectSheetData (used by auto-save in script.js)
    const nomInput = container.querySelector('[data-key="' + cls + '-1-nom"]');
    if (nomInput) {
      nomInput.value = 'TestRoundtrip';
      const collected = collectSheetData(cls, '1', container);
      r.eq(collected.nom, 'TestRoundtrip', cls + ': collectSheetData roundtrip nom');
      r.eq(collected.classe_armure || '', '', cls + ': empty default classe_armure');
    } else {
      r.fail(cls + ': nom input not found for roundtrip');
    }

    // module.collectData returns object and includes the edited value somewhere
    if (typeof mod.collectData === 'function') {
      try {
        const data = mod.collectData(container);
        r.ok(data && typeof data === 'object', cls + ': collectData returns object');
        const values = Object.values ? Object.values(data) : Object.keys(data).map(function (k) { return data[k]; });
        r.ok(values.indexOf('TestRoundtrip') !== -1 || data['nom'] === 'TestRoundtrip' || data[cls + '-1-nom'] === 'TestRoundtrip',
          cls + ': collectData sees edited nom');
      } catch (e) {
        r.fail(cls + ': collectData threw: ' + e.message);
      }
    }
  });

  return r;
};
