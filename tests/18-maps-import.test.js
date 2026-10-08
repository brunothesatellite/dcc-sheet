'use strict';

/* Import ZIP de cartes : test d'integration PHP reel (php -S + HTTP).
   Regression couverte : getFromName($i) au lieu de getFromIndex($i) dans
   api/maps.php ecrivait les images d'import en 0 octet -> « Image de fond
   introuvable (UID …) » a l'affichage (voir JOURNAL 08/10). */

const { spawnSync } = require('child_process');
const path = require('path');
const { createReporter } = require('./helpers/assert');
const { ROOT } = require('./helpers/env');

module.exports = function suite() {
  const r = createReporter('18-maps-import');
  const phpBin = process.env.PHP_BIN || 'php';
  const probe = spawnSync(phpBin, ['-v'], { encoding: 'utf8', windowsHide: true });
  if (probe.error || probe.status !== 0) {
    r.skip('import ZIP cartes (php non disponible)');
    return r;
  }

  const res = spawnSync(phpBin, [path.join(ROOT, 'tests', 'php', 'import-zip.php')], {
    cwd: ROOT,
    encoding: 'utf8',
    shell: false,
    windowsHide: true,
    timeout: 60000,
  });

  const lines = String(res.stdout || '').split(/\r?\n/).filter(Boolean);
  const checks = lines.filter((l) => /^\[(OK|FAIL|SKIP)\]/.test(l));
  if (!checks.length) {
    r.fail('harness sans sortie (code ' + res.status + ') : ' +
      String(res.stderr || '').trim().split('\n')[0]);
    return r;
  }
  checks.forEach((line) => {
    const label = line.replace(/^\[(OK|FAIL|SKIP)\]\s*/, '');
    if (line.startsWith('[SKIP]')) { r.skip(label); return; }
    r.ok(!line.startsWith('[FAIL]'), label);
  });
  return r;
};
