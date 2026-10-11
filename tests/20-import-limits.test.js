'use strict';

/* Plafonds d'upload de l'export/import global (ZIP json + images).
   Régression du 11/10/2026 : un ZIP de ~15 Mo dépasse post_max_size
   (8 Mo par défaut) ; PHP émet un Warning HTML *avant* le JSON
   (« <br /><b>Warning</b>: ... POST Content-Length ... exceeds the
   limit ... ») et vide $_FILES — le res.json() du client échouait en
   « Unexpected token '<' ... is not valid JSON », et les images
   n'arrivaient jamais dans data/maps/.
   Couverture :
   - api/.user.ini présent avec post_max_size/upload_max_filesize >= 64M ;
   - export_zip : un fichier image de 0 octet est exclu du ZIP et
     signalé (cohérent avec check_images/missingImages, R11) ;
   - import client : refus explicite au-delà de 64 Mo, parse défensif
     (texte d'abord) avec message actionnable si le serveur renvoie
     du HTML, plus aucun res.json() nu sur le chemin import_all ;
   - builds déployés (NAS/web + Windows) : .user.ini non exclu ;
   - php -l sur maps.php et le harness d'intégration (si PHP dispo). */

const { spawnSync } = require('child_process');
const path = require('path');
const { createReporter } = require('./helpers/assert');
const { ROOT, read, exists } = require('./helpers/env');

function parseIniSize(s) {
  const m = /^\s*(\d+(?:\.\d+)?)\s*([kKmMgG])?\s*$/.exec(String(s == null ? '' : s));
  if (!m) return null;
  let n = parseFloat(m[1]);
  const u = (m[2] || '').toUpperCase();
  if (u === 'K') n *= 1024;
  else if (u === 'M') n *= 1024 * 1024;
  else if (u === 'G') n *= 1024 * 1024 * 1024;
  return Math.round(n);
}

function parseUserIni(text) {
  const out = {};
  String(text).split(/\r?\n/).forEach(function (line) {
    const clean = line.split(';')[0];
    const m = /^\s*([A-Za-z0-9_.-]+)\s*=\s*(.+?)\s*$/.exec(clean);
    if (m) out[m[1].toLowerCase()] = m[2];
  });
  return out;
}

/* Mini-matcher pour les motifs style PowerShell -like ('*' et '?'). */
function likeMatch(pattern, name) {
  const re = new RegExp('^' + String(pattern).split('').map(function (c) {
    if (c === '*') return '.*';
    if (c === '?') return '.';
    return c.replace(/[.+^${}()|[\]\\]/g, '\\$&');
  }).join('') + '$', 'i');
  return re.test(name);
}

function extractExcludeFiles(ps1) {
  const m = ps1.match(/\$excludeFiles\s*=\s*@\(([\s\S]*?)\)/);
  if (!m) return null;
  return m[1].split(',').map(function (s) {
    return s.trim().replace(/^['"]|['"]$/g, '');
  }).filter(Boolean);
}

module.exports = function suite() {
  const r = createReporter('20-import-limits');

  /* --- 1. api/.user.ini : plafond documenté 64 Mo --- */
  r.ok(exists('api/.user.ini'), 'api/.user.ini présent');
  if (exists('api/.user.ini')) {
    const ini = parseUserIni(read('api/.user.ini'));
    const post = parseIniSize(ini['post_max_size']);
    const up = parseIniSize(ini['upload_max_filesize']);
    r.ok(post !== null && post >= 64 * 1024 * 1024,
      'post_max_size >= 64M (got ' + ini['post_max_size'] + ')');
    r.ok(up !== null && up >= 64 * 1024 * 1024,
      'upload_max_filesize >= 64M (got ' + ini['upload_max_filesize'] + ')');
    r.ok(post !== null && up !== null && post >= up,
      'post_max_size >= upload_max_filesize (marge multipart)');
  }

  /* --- 2. export_zip : 0 octet exclu et signalé --- */
  const maps = read('api/maps.php');
  const exportBlock = maps.split("if ($action === 'export_zip')")[1] || '';
  const exportScope = exportBlock.split("if ($action ===")[0];
  r.ok(exportScope.indexOf('filesize($src) === 0') !== -1,
    'export_zip exclut les images de 0 octet (R11)');
  r.ok(exportScope.indexOf('$missing[] = $uid') !== -1,
    'export_zip signale les images exclues (rapport.txt)');

  /* --- 3. client : garde 64 Mo + parse défensif + message actionnable --- */
  const js = read('script.js');
  const importIdx = js.indexOf('maps.php?action=import_all');
  r.ok(importIdx !== -1, 'branche import_all présente dans script.js');
  if (importIdx !== -1) {
    const vicinity = js.slice(Math.max(0, importIdx - 1500), importIdx + 1500);
    r.ok(vicinity.indexOf('file.size > 64 * 1024 * 1024') !== -1,
      'import client : refus explicite au-delà de 64 Mo');
    r.ok(vicinity.indexOf('await res.text()') !== -1 &&
      vicinity.indexOf('JSON.parse(rawText)') !== -1,
      'import client : parse défensif (texte puis JSON, plus de res.json() nu)');
    r.ok(vicinity.indexOf('payload = await res.json()') === -1,
      'import client : aucun res.json() nu sur le chemin import_all');
    r.ok(vicinity.indexOf('api/.user.ini') !== -1,
      'import client : message d\u2019erreur actionnable (renvoie vers api/.user.ini)');
    r.ok(vicinity.indexOf("rawText.charAt(0) === '<'") !== -1,
      'import client : détection d\u2019une page d\u2019erreur HTML');
  }

  /* --- 3b. import global : deleteAllMaps préserve les images extraites
     (régression 11/10/2026 : chaque delete rendait l'UID orphelin et
     effaçait le fond que import_all venait d'écrire -> toutes les cartes
     importées sans fond, sur PC comme sur l'APK) --- */
  r.ok(js.indexOf('keep_images: true') !== -1,
    'import client : deleteAllMaps envoie keep_images: true');
  const delIdx = js.indexOf('async function deleteAllMaps');
  r.ok(delIdx !== -1, 'deleteAllMaps présente dans script.js');
  if (delIdx !== -1) {
    const delBody = js.slice(delIdx, delIdx + 800);
    r.ok(delBody.indexOf('keep_images') !== -1,
      'deleteAllMaps : drapeau keep_images dans le corps du delete');
  }
  r.ok(maps.indexOf('keep_images') !== -1,
    'api/maps.php : drapeau keep_images honoré par action=delete');
  r.ok(maps.indexOf('deleteImageIfOrphan') !== -1,
    'api/maps.php : suppression manuelle sans drapeau toujours orpheline (R12)');

  /* --- 3c. import global : modale de progression (11/10/2026 : ~30 s sans
     retour sur NAS lent — l'utilisateur croit a un plantage) --- */
  r.ok(js.indexOf('showImportProgress()') !== -1,
    'import client : modale de progression affichee au choix du fichier');
  r.ok(js.indexOf('hideImportProgress()') !== -1,
    'import client : modale de progression refermee (succes et echec)');
  const hideCount = js.split('hideImportProgress()').length - 1;
  r.ok(hideCount >= 5, 'import client : fermeture sur tous les chemins (got ' + hideCount + ')');
  r.ok(js.indexOf('setImportProgress(') !== -1,
    'import client : progression mise a jour par phases');
  r.ok(js.indexOf('Envoi du fichier') !== -1 &&
    js.indexOf('Import des personnages') !== -1 &&
    js.indexOf('Import des cartes') !== -1,
    'import client : libelles de phases (envoi, personnages, cartes)');

  /* --- 4. builds déployés : .user.ini non exclu --- */
  ['deploy/_build.ps1', 'installeur/windows/build.ps1'].forEach(function (rel) {
    if (!exists(rel)) { r.fail('fichier de build manquant : ' + rel); return; }
    const pats = extractExcludeFiles(read(rel));
    if (!pats) { r.fail('liste excludeFiles illisible : ' + rel); return; }
    const hit = pats.filter(function (p) { return likeMatch(p, '.user.ini'); });
    r.ok(hit.length === 0, rel + ' : .user.ini déployé (non exclu)');
  });

  /* --- 4b. lanceurs php -S : -d explicites (.user.ini ignoré par cli-server) --- */
  ['deploy/start.bat', 'deploy/startup.bat'].forEach(function (rel) {
    if (!exists(rel)) { r.fail('lanceur manquant : ' + rel); return; }
    const bat = read(rel);
    r.ok(/-d\s+post_max_size=70M/i.test(bat), rel + ' : -d post_max_size=70M');
    r.ok(/-d\s+upload_max_filesize=64M/i.test(bat), rel + ' : -d upload_max_filesize=64M');
  });

  /* --- 4c. app Windows : php.ini embarqué avec les mêmes plafonds --- */
  if (!exists('installeur/windows/build.ps1')) {
    r.fail('build Windows manquant : installeur/windows/build.ps1');
  } else {
    const ps1 = read('installeur/windows/build.ps1');
    r.ok(ps1.indexOf("'post_max_size', '70M'") !== -1,
      'build Windows : post_max_size = 70M dans le php.ini embarqué');
    r.ok(ps1.indexOf("'upload_max_filesize', '64M'") !== -1,
      'build Windows : upload_max_filesize = 64M dans le php.ini embarqué');
    // OPcache coupe (11/10/2026) : ses handlers provoquaient un Fatal ASLR
    // aléatoire au démarrage du php -S embarqué (serveur mort-né).
    r.ok(ps1.indexOf("'opcache.enable', '0'") !== -1,
      'build Windows : opcache.enable = 0 dans le php.ini embarqué');
    r.ok(ps1.indexOf("'opcache.enable_cli', '0'") !== -1,
      'build Windows : opcache.enable_cli = 0 dans le php.ini embarqué');
    r.ok(ps1.indexOf('-Encoding utf8') !== -1,
      'build Windows : php.ini relu en UTF-8 (accents des commentaires préservés)');
  }

  /* --- 5. harness d'intégration : rejoue l'api livrée (avec .user.ini) --- */
  const harness = read('tests/php/import-zip.php');
  r.ok(harness.indexOf('.user.ini') !== -1,
    'harness import-zip : copie .user.ini dans la webroot isolée (fidélité)');

  /* --- 6. syntaxe PHP (si PHP disponible) --- */
  const phpBin = process.env.PHP_BIN || 'php';
  const probe = spawnSync(phpBin, ['-v'], { encoding: 'utf8', windowsHide: true });
  if (probe.error || probe.status !== 0) {
    r.skip('php -l api/maps.php (php non disponible)');
    r.skip('php -l tests/php/import-zip.php (php non disponible)');
  } else {
    ['api/maps.php', 'tests/php/import-zip.php'].forEach(function (f) {
      const res = spawnSync(phpBin, ['-l', path.join(ROOT, f)], {
        cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true,
      });
      r.ok(res.status === 0, 'php -l ' + f);
    });
  }

  return r;
};
