'use strict';

/* Aide des classes (Niveau 0 & 7 classes) : popup par fiche (cas 1 :
   fiche de la classe + Table 1-1) et reference integrale (cas 2 :
   document + sommaire). Donnees generees depuis
   resume_classes_dcc_v4.html — la suite verifie la fidelite quand le
   HTML source est accessible, et l'integrite sinon. */

const fs = require('fs');
const path = require('path');
const { createReporter } = require('./helpers/assert');
const { ROOT, read, exists, createEnv } = require('./helpers/env');

const SRC_HTML = 'D:/tmp/dcc/resume_classes_dcc_v4.html';
const SECTIONS = ['intro', 'carac', 'niveau0', 'clerc', 'guerrier', 'mage',
  'voleur', 'elfe', 'halfelin', 'nain'];
const CLASSES = ['clerc', 'elfe', 'guerrier', 'halfelin', 'mage', 'nain', 'voleur', 'lvl0'];

function loadHelp(env) {
  env.load('aide-classes-data.js');
  env.load('aide-classes.js');
  return env.window.DCCClassHelp;
}

function norm(s) {
  return String(s).replace(/\s+/g, ' ').trim();
}

function testData(r) {
  const env = createEnv();
  env.load('aide-classes-data.js');
  const H = env.window.DCC_CLASS_HELP;
  if (!r.ok(!!H, 'window.DCC_CLASS_HELP expose')) return null;

  r.eq(JSON.stringify(H.order), JSON.stringify(SECTIONS), 'ordre des 10 sections');
  r.eq(H.toc.length, 9, 'sommaire : 9 entrees (got ' + H.toc.length + ')');
  r.ok(H.toc[0][0] === 'carac' && H.toc[1][0] === 'niveau0',
    'sommaire : Table 1-1 puis Niveau 0, puis les 7 classes');

  CLASSES.forEach(function (cls) {
    r.ok(!!(H.classOf && H.classOf[cls] && H.sections[H.classOf[cls]]),
      'classe ' + cls + ' -> section ' + (H.classOf && H.classOf[cls]));
  });

  SECTIONS.forEach(function (id) {
    const html = H.sections[id] || '';
    r.ok(html.length > 200, 'section ' + id + ' non vide (got ' + html.length + ')');
    r.ok(html.indexOf('<script') === -1 && html.indexOf('<img') === -1,
      'section ' + id + ' : aucun script ni image embarques');
    r.ok(html.indexOf('http://') === -1 && html.indexOf('https://') === -1,
      'section ' + id + ' : 100 % hors-ligne, aucun lien externe');
  });

  r.ok(H.sections.carac.indexOf('Table 1-1') !== -1, 'carac : Table 1-1 presente');
  r.ok(H.sections.carac.indexOf('18') !== -1 && H.sections.carac.indexOf('+3') !== -1,
    'carac : table complete (3 -> 18)');
  ['clerc', 'guerrier', 'mage', 'voleur', 'elfe', 'halfelin', 'nain'].forEach(function (cls) {
    r.ok(H.sections[cls].indexOf('progression') !== -1,
      'classe ' + cls + ' : table de progression presente');
  });
  r.ok(H.sections.niveau0.indexOf('10 PX') !== -1, 'niveau0 : passage a 10 PX');
  r.ok((H.foot || '').length > 50, 'note de source (pied) presente');

  return H;
}

/* Fidelite au HTML source (si accessible sur la machine) : le fichier de
   donnees doit en etre la copie conforme, sans edition manuelle. */
function testFidelity(r, H) {
  if (!fs.existsSync(SRC_HTML)) {
    r.skip('fidelite au HTML source (fichier absent de cette machine)');
    return;
  }
  const src = fs.readFileSync(SRC_HTML, 'utf8');
  SECTIONS.forEach(function (id) {
    const m = new RegExp('<section class="fiche" id="' + id + '">([\\s\\S]*?)</section>').exec(src);
    if (!r.ok(!!m, 'source : section ' + id + ' trouvaille')) return;
    let expected = m[1].replace(/class="tscroll"/g, 'class="table-wrap"')
      .replace(/class="full\b/g, 'class="ref');
    r.eq(norm(H.sections[id]), norm(expected), 'section ' + id + ' identique a la source');
  });
  const foot = /<div class="foot">([\s\S]*?)<\/div>/.exec(src);
  if (r.ok(!!foot, 'source : pied trouvaille')) {
    r.eq(norm(H.foot), norm(foot[1]), 'pied identique a la source');
  }
}

function testViewer(r) {
  const env = createEnv();
  const help = loadHelp(env);
  const doc = env.document;
  if (!r.ok(!!help, 'window.DCCClassHelp expose')) return;

  // classe inconnue : rien ne s'ouvre, pas de crash
  help.openClass('zzz');
  r.ok(!doc.querySelector('.help-overlay'), 'classe inconnue : rien ne s\u2019ouvre');

  // cas 1 : une classe + Table 1-1
  help.openClass('mage');
  let ov = doc.querySelector('.help-overlay');
  if (!r.ok(!!ov, 'cas 1 : overlay ouverte pour mage')) return;
  r.eq(ov.querySelector('.help-title').textContent, 'Résumé — Mage', 'cas 1 : titre');
  const secs = ov.querySelectorAll('.help-section');
  r.eq(secs.length, 2, 'cas 1 : fiche classe + Table 1-1 (got ' + secs.length + ')');
  if (secs.length === 2) {
    r.eq(secs[0].getAttribute('data-sec'), 'mage', 'cas 1 : la classe d\u2019abord');
    r.eq(secs[1].getAttribute('data-sec'), 'carac', 'cas 1 : Table 1-1 ensuite');
  }
  r.ok(!!ov.querySelector('.help-divider'), 'cas 1 : separateur table commune');
  r.ok(ov.querySelector('.help-toc').hidden, 'cas 1 : pas de sommaire');
  r.eq(doc.body.style.overflow, 'hidden', 'cas 1 : scroll de la fiche verrouille');

  // fermeture par la croix
  ov.querySelector('.help-close').click();
  r.ok(!doc.querySelector('.help-overlay'), 'fermeture via la croix');
  r.eq(doc.body.style.overflow, '', 'scroll de la fiche restaure');

  // chaque classe ouvre sa fiche
  CLASSES.forEach(function (cls) {
    help.openClass(cls);
    const o = doc.querySelector('.help-overlay');
    const first = o && o.querySelector('.help-section');
    const label = { lvl0: 'Niveau 0', clerc: 'Clerc', elfe: 'Elfe', guerrier: 'Guerrier',
      halfelin: 'Halfelin', mage: 'Mage', nain: 'Nain', voleur: 'Voleur' }[cls];
    r.ok(!!o && o.querySelector('.help-title').textContent === 'Résumé — ' + label,
      'cas 1 : ' + cls + ' -> « Résumé — ' + label + ' »');
    if (o) o.querySelector('.help-close').click();
  });

  // cas 2 : document integral + sommaire
  help.openFull();
  ov = doc.querySelector('.help-overlay');
  if (!r.ok(!!ov, 'cas 2 : overlay ouverte')) return;
  r.eq(ov.querySelector('.help-title').textContent, 'Référence des classes', 'cas 2 : titre');
  const all = Array.prototype.map.call(
    ov.querySelectorAll('.help-section'),
    function (s) { return s.getAttribute('data-sec'); });
  r.eq(JSON.stringify(all), JSON.stringify(SECTIONS), 'cas 2 : 10 sections dans l\u2019ordre source');
  const chips = ov.querySelectorAll('.help-toc button');
  r.eq(chips.length, 9, 'cas 2 : 9 pastilles de sommaire (got ' + chips.length + ')');
  r.ok(!!ov.querySelector('.help-foot'), 'cas 2 : note de source en fin');

  // fermeture par Echap
  doc.dispatchEvent(new env.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  r.ok(!doc.querySelector('.help-overlay'), 'fermeture via Echap');

  // sans donnees : aucun crash, rien ne s'ouvre
  const env2 = createEnv();
  env2.load('aide-classes.js');
  env2.window.DCCClassHelp.openClass('mage');
  env2.window.DCCClassHelp.openFull();
  r.ok(!env2.document.querySelector('.help-overlay'), 'sans donnees : rien ne s\u2019ouvre, pas de crash');
}

function testWiring(r) {
  const html = read('index.html');
  const iData = html.indexOf('aide-classes-data.js');
  const iView = html.indexOf('aide-classes.js');
  const iMain = html.indexOf('script.js');
  r.ok(iData !== -1 && iView !== -1, 'index.html charge donnees + visionneuse');
  r.ok(iData < iView && iView < iMain, 'ordre : donnees, visionneuse, puis script.js');
  r.ok(html.indexOf('id="btn-aide"') !== -1, 'index.html : bouton topbar #btn-aide');
  r.ok(html.indexOf('ref-toggle') !== -1, 'index.html : bouton #btn-aide en .ref-toggle');

  const js = read('script.js');
  r.ok(js.indexOf('window.DCCClassHelp) window.DCCClassHelp.openFull()') !== -1,
    'script.js : topbar -> openFull (garde module optionnel)');
  r.ok(js.indexOf('window.DCCClassHelp) window.DCCClassHelp.openClass(cls)') !== -1,
    'script.js : fiche -> openClass(cls) (garde module optionnel)');
  r.ok(js.indexOf('Résumé') !== -1, 'script.js : bouton « Résumé » dans l\u2019en-tete de fiche');
  r.ok(js.indexOf('📖') === -1 && html.indexOf('128214') === -1,
    'aucun emoji livre : icone livre SVG au langage du theme (topbar + fiche)');

  const css = read('style.css');
  ['.ref-toggle', '.help-overlay', '.help-viewer', '.help-header', '.help-body',
    '.help-column', '.help-toc', '.help-section', '.help-divider', '.help-foot',
    '.help-section table.ref', '@media (max-width: 380px)'].forEach(function (sel) {
    r.ok(css.indexOf(sel) !== -1, 'CSS selecteur present : ' + sel);
  });
  const tocBlock = css.match(/\.help-toc \{[^}]+\}/);
  r.ok(!!tocBlock, '.help-toc block found');
  if (tocBlock) {
    r.ok(tocBlock[0].indexOf('flex-wrap: wrap') !== -1, '.help-toc sans scroll horizontal (wrap)');
    r.ok(tocBlock[0].indexOf('overflow-x') === -1, '.help-toc : aucun overflow-x');
  }
}

async function run() {
  const r = createReporter('21-aide-classes');
  const H = testData(r);
  if (H) testFidelity(r, H);
  testViewer(r);
  testWiring(r);
  return r;
}

module.exports = run;
