/**
 * Générateur des données statiques de niveau 0.
 *
 *   node tools/build-lvl0-data.js
 *
 * Lit les listes sources (plan0/) et le catalogue de portraits
 * (icons/funnel-tokens/) et écrit deux fichiers chargés par index.html :
 *
 *   lvl0-data.js     window.DCCLvl0Data  = { noms, metiers, chance, equipement }
 *   funnel-icons.js  window.FunnelIcons  = { meta, lvl0, byMetier }
 *
 * À relancer quand plan0/ ou icons/funnel-tokens/ changent.
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

function readLines(rel) {
  const raw = fs.readFileSync(path.join(ROOT, rel), 'utf8').replace(/^\uFEFF/, '');
  return raw.split(/\r?\n/).map(function (l) { return l.trim(); })
    .filter(function (l) { return l !== ''; });
}

function js(value) {
  return JSON.stringify(value, null, 2);
}

/* ---------------------------------------------------------------- noms --- */
const noms = readLines('plan0/noms.txt');

/* ------------------------------------------------------------- métiers --- */
const metiers = [];
const badRows = [];
readLines('plan0/metiers.csv').forEach(function (line, i) {
  const cols = line.split(';').map(function (c) { return c.trim(); });
  if (cols.length < 3 || !cols[0]) {
    badRows.push((i + 1) + ': ' + line);
    return;
  }
  metiers.push({
    metier: cols[0],
    arme: cols[1],
    equipement: cols[2],
  });
});

/* ------------------------------------------------------ chance / équipement --- */
const chance = readLines('plan0/chance.txt');
const equipement = readLines('plan0/equipement.txt');

/* ------------------------------------------------------------ portraits --- */
const ICON_DIR = path.join(ROOT, 'icons', 'funnel-tokens');
const ICON_REL = 'icons/funnel-tokens';

const fichiers = fs.readdirSync(ICON_DIR)
  .filter(function (f) { return /\.png$/i.test(f); })
  .sort(function (a, b) { return a.localeCompare(b, 'en'); });

const mappingPath = path.join(ICON_DIR, 'funnel-tokens.json');
let mapping = { entries: [] };
if (fs.existsSync(mappingPath)) {
  mapping = JSON.parse(fs.readFileSync(mappingPath, 'utf8'));
} else {
  console.warn('ATTENTION : funnel-tokens.json absent -> byMetier vide, ' +
    'les portraits seront tires au hasard parmi les 75 tokens.');
}
const indexOfFile = {};
fichiers.forEach(function (f, i) { indexOfFile[f] = i; });

const byMetier = {};
let orphelins = 0;
(mapping.entries || []).forEach(function (entry) {
  if (!entry || !entry.metier) return;
  const idx = [];
  (entry.images || []).forEach(function (img) {
    if (Object.prototype.hasOwnProperty.call(indexOfFile, img)) idx.push(indexOfFile[img]);
    else orphelins += 1;
  });
  if (idx.length === 0) return;
  if (!byMetier[entry.metier]) byMetier[entry.metier] = [];
  idx.forEach(function (i) {
    if (byMetier[entry.metier].indexOf(i) === -1) byMetier[entry.metier].push(i);
  });
});

/* ---------------------------------------------------------------- écriture --- */
const banner = '/* Fichier GÉNÉRÉ par tools/build-lvl0-data.js — ne pas éditer à la main. */\n';

const dataJs = banner +
  '(function () {\n' +
  '  window.DCCLvl0Data = ' + js({ noms: noms, metiers: metiers, chance: chance, equipement: equipement }) + ';\n' +
  '})();\n';

const iconsJs = banner +
  '(function () {\n' +
  '  window.FunnelIcons = {\n' +
  '    meta: { key: \'funnel\', label: \'Funnel - niveau 0\' },\n' +
  '    lvl0: ' + js(fichiers.map(function (f) { return ICON_REL + '/' + f; })) + ',\n' +
  '    byMetier: ' + js(byMetier) + ',\n' +
  '  };\n' +
  '})();\n';

fs.writeFileSync(path.join(ROOT, 'lvl0-data.js'), dataJs, 'utf8');
fs.writeFileSync(path.join(ROOT, 'funnel-icons.js'), iconsJs, 'utf8');

console.log('lvl0-data.js     : ' + noms.length + ' noms, ' + metiers.length + ' metiers, ' +
  chance.length + ' jets chanceux, ' + equipement.length + ' equipements');
console.log('funnel-icons.js  : ' + fichiers.length + ' portraits, ' +
  Object.keys(byMetier).length + ' metiers cartographies');
if (badRows.length) console.log('Lignes metiers.csv ignorees : ' + badRows.join(' | '));
if (orphelins) console.log('Images du mapping introuvables : ' + orphelins);
