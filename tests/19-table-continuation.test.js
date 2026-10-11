'use strict';

/* Portage de FIX-TAB (dcc-spells-reader) : raccord des tableaux results-tbl
   coupés entre 2 pages, au rendu uniquement (content/*.js intacts).
   - le module table-continuation.js est copié tel quel (octet pour octet) ;
   - le corpus est le même (dossier frère ../dcc-spells-reader/content) :
     l'allowlist 30 cas A + 4 cas B est donc re-vérifiée ici, pas élargie ;
   - câblage dcc-sheet : fixTableContinuationsFor() via les voisins DOM
     (robuste au trou 304-321), AVANT la compensation de scroll et l'ancre ;
   - CSS additif : .spell-viewer table.data td.range.suite (sélecteur adapté).
   Sans le dossier frère (corpus absent) : les groupes corpus sont skippés,
   le synthétique + le câblage tournent toujours. */

const fs = require('fs');
const path = require('path');
const { JSDOM } = require('jsdom');
const { createReporter } = require('./helpers/assert');
const { ROOT, read, exists } = require('./helpers/env');

const SIBLING_MOD = path.join(ROOT, '..', 'dcc-spells-reader', 'table-continuation.js');
const SIBLING_DIR = path.join(ROOT, '..', 'dcc-spells-reader', 'content');

// Cas A certains (succession vérifiée) : page suivante -> libellé R1
const CASE_A = {
  133: '14-17', 135: '18-19', 141: '28-29', 161: '18-19', 166: '26-29',
  169: '30-31', 178: '26-29', 180: '26-29', 185: '26-29', 192: '16-19',
  194: '16-19', 195: '26-29', 201: '26-29', 204: '34-35', 205: '27-31',
  221: '22-23', 239: '29-33', 252: '29-33', 259: '30-31', 280: '32-33',
  281: '22-25', 286: '27-31', 297: '28-33', 298: '28-33', 299: '20-23',
  300: '28-33', 332: '4', 338: '5', 344: '3', 350: '3',
};
// Cas B (queue de rang final rattachée à la page prev) : page suivante -> R1
const CASE_B = { 154: '32+', 206: '36+', 262: '32+', 272: '34+' };

const NEGATIVES = [155, 163, 167, 193, 219, 224, 226, 235, 251];

function hasCorpus() {
  try {
    return fs.existsSync(path.join(SIBLING_DIR, '132.js')) &&
      fs.existsSync(path.join(SIBLING_DIR, '133.js'));
  } catch (e) { return false; }
}

function readHtml(n) {
  const raw = fs.readFileSync(path.join(SIBLING_DIR, n + '.js'), 'utf8');
  const m = raw.match(/DCC_PAGES\[\d+\]="((?:[^"\\]|\\.)*)";?\s*$/s);
  if (!m) throw new Error('fixture illisible : ' + n);
  return JSON.parse('"' + m[1] + '"');
}

function loadPair(n) {
  // Deux documents jsdom indépendants, comme deux insertions isolées.
  const domA = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const domB = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const wrapA = domA.window.document.createElement('div');
  wrapA.innerHTML = readHtml(n - 1);
  const wrapB = domB.window.document.createElement('div');
  wrapB.innerHTML = readHtml(n);
  return {
    prev: wrapA.firstElementChild,
    next: wrapB.firstElementChild,
    docB: domB.window.document,
  };
}

function loadCont() {
  delete require.cache[require.resolve('../table-continuation.js')];
  return require('../table-continuation.js');
}

function collectIds(section) {
  const ids = [];
  (function walk(el) {
    if (el.getAttribute && el.getAttribute('id')) ids.push(el.getAttribute('id'));
    const kids = el.children || [];
    for (let i = 0; i < kids.length; i++) walk(kids[i]);
  }(section));
  return ids.sort();
}

function lastCellOf(section) {
  let found = null;
  (function walk(el) {
    if (el.tagName === 'TD' && el.classList.contains('cell')) found = el;
    const kids = el.children || [];
    for (let i = 0; i < kids.length; i++) walk(kids[i]);
  }(section));
  return found;
}

function countParas(el) {
  return el ? el.querySelectorAll('p').length : 0;
}

function firstTableFirstRow(section) {
  const table = section.querySelector('table.results-tbl');
  if (!table) return null;
  const tr = table.querySelector('tr');
  if (!tr) return null;
  const tds = tr.querySelectorAll('td');
  return {
    range: tds[0] ? tds[0].textContent.trim() : null,
    rangeClass: tds[0] ? tds[0].getAttribute('class') : null,
    suiteOf: tr.getAttribute('data-suite-of'),
    cellStart: tds[1] ? tds[1].textContent.trim().slice(0, 40) : null,
  };
}

function testTarget(r, CONT) {
  const p = loadPair(133);
  const beforePrev = p.prev.outerHTML;
  const idsPrev = collectIds(p.prev);
  const idsNext = collectIds(p.next);
  const res = CONT.tryFixPair(p.prev, p.next, p.docB);
  r.eq(res, 'A', '132 -> 133 : tryFixPair retourne A (got ' + res + ')');
  const row = firstTableFirstRow(p.next);
  r.ok(!!row, '132 -> 133 : première ligne du tableau suivant lisible');
  if (row) {
    r.eq(row.range, '14-17 (suite)', "ligne '14-17 (suite)' en tête");
    r.ok(/suite/.test(row.rangeClass || ''), 'classe .suite (got ' + row.rangeClass + ')');
    r.eq(row.suiteOf, '14-17', 'traçabilité data-suite-of');
    r.ok(row.cellStart.indexOf('ou que m') !== -1 && row.cellStart.indexOf('ami d') !== -1,
      'contenu orphelin déplacé (got ' + JSON.stringify(row.cellStart) + ')');
  }
  const kids = p.next.children;
  let headIdx = -1;
  for (let i = 0; i < kids.length; i++) {
    if (kids[i].tagName === 'DIV' && kids[i].classList.contains('page-head')) headIdx = i;
  }
  r.ok(headIdx !== -1 && (!kids[headIdx + 1] || kids[headIdx + 1].tagName !== 'P'),
    'plus de <p> orphelin en tête de 133');
  r.eq(p.prev.outerHTML, beforePrev, 'page 132 inchangée (cas A)');
  r.eq(JSON.stringify(collectIds(p.prev)), JSON.stringify(idsPrev), 'ids 132 intacts');
  r.eq(JSON.stringify(collectIds(p.next)), JSON.stringify(idsNext), 'ids 133 intacts');
  r.eq(CONT.tryFixPair(p.prev, p.next, p.docB), 'deja', 'idempotent (2e appel)');
}

function testAllA(r, CONT) {
  Object.keys(CASE_A).forEach(function (key) {
    const n = parseInt(key, 10);
    const r1 = CASE_A[key];
    const p = loadPair(n);
    const res = CONT.tryFixPair(p.prev, p.next, p.docB);
    const row = firstTableFirstRow(p.next);
    r.ok(res === 'A' && !!row && row.range === r1 + ' (suite)',
      'p' + (n - 1) + ' -> p' + n + ' : "' + r1 + ' (suite)"' +
      ' (res=' + res + ' row=' + JSON.stringify(row && row.range) + ')');
  });
}

function testAllB(r, CONT) {
  Object.keys(CASE_B).forEach(function (key) {
    const n = parseInt(key, 10);
    const r1 = CASE_B[key];
    const p = loadPair(n);
    const parasBefore = countParas(lastCellOf(p.prev));
    const res = CONT.tryFixPair(p.prev, p.next, p.docB);
    const kids = p.next.children;
    let headIdx = -1;
    for (let i = 0; i < kids.length; i++) {
      if (kids[i].tagName === 'DIV' && kids[i].classList.contains('page-head')) headIdx = i;
    }
    r.eq(res, 'B', 'p' + (n - 1) + ' -> p' + n + ' : retour B (got ' + res + ')');
    r.ok(headIdx !== -1 && (!kids[headIdx + 1] || kids[headIdx + 1].tagName !== 'P'),
      'p' + n + ' : orphelin retiré');
    r.eq(p.next.dataset.tblContFixed, 'B:' + r1, 'p' + n + ' : marqueur B:' + r1);
    r.eq(countParas(lastCellOf(p.prev)), parasBefore,
      'p' + (n - 1) + ' : aucun paragraphe ajouté (fusion)');
  });
  // jointure exacte : "...Volonté" + "pour résister..." (Charme-serpents)
  const j = loadPair(272);
  CONT.tryFixPair(j.prev, j.next, j.docB);
  const txt = lastCellOf(j.prev).textContent.replace(/\s+/g, ' ');
  r.ok(txt.indexOf('Volonté pour résister.') !== -1, 'jointure par simple espace');
}

function testSyntheticHyphen(r, CONT) {
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const doc = dom.window.document;
  const prev = doc.createElement('section');
  const head = doc.createElement('div');
  head.setAttribute('class', 'page-head');
  prev.appendChild(head);
  const wrap = doc.createElement('div');
  wrap.setAttribute('class', 'table-wrap');
  const tbl = doc.createElement('table');
  tbl.setAttribute('class', 'data results-tbl');
  const tbody = doc.createElement('tbody');
  const tr = doc.createElement('tr');
  const tdR = doc.createElement('td');
  tdR.setAttribute('class', 'range');
  tdR.textContent = '32+';
  const tdC = doc.createElement('td');
  tdC.setAttribute('class', 'cell');
  const pp = doc.createElement('p');
  pp.textContent = 'un sort de contre-';
  tdC.appendChild(pp);
  tr.appendChild(tdR);
  tr.appendChild(tdC);
  tbody.appendChild(tr);
  tbl.appendChild(tbody);
  wrap.appendChild(tbl);
  prev.appendChild(wrap);
  const next = doc.createElement('section');
  const head2 = doc.createElement('div');
  head2.setAttribute('class', 'page-head');
  next.appendChild(head2);
  const orph = doc.createElement('p');
  orph.textContent = 'attaque redoutable.';
  next.appendChild(orph);
  const title = doc.createElement('h3');
  title.textContent = 'Sort suivant';
  next.appendChild(title);
  r.eq(CONT.tryFixPair(prev, next, doc), 'B', 'cas B synthétique');
  r.eq(tdC.textContent, 'un sort de contreattaque redoutable.',
    'césure absorbée sans espace (got ' + JSON.stringify(tdC.textContent) + ')');
  r.eq(countParas(tdC), 1, 'toujours un seul <p>');
}

function contentPages() {
  return fs.readdirSync(SIBLING_DIR)
    .map(function (f) { const m = /^(\d+)\.js$/.exec(f); return m ? parseInt(m[1], 10) : null; })
    .filter(function (n) { return n !== null; })
    .sort(function (a, b) { return a - b; });
}

function testSweep(r, CONT) {
  const pages = contentPages();
  const have = {};
  pages.forEach(function (n) { have[n] = true; });
  const fixed = {};
  let errors = 0;
  pages.forEach(function (n) {
    if (!have[n - 1]) return;
    const p = loadPair(n);
    let res = null;
    try {
      res = CONT.tryFixPair(p.prev, p.next, p.docB);
    } catch (e) {
      errors++;
      r.fail('exception paire ' + (n - 1) + ' -> ' + n + ' : ' + (e && e.message));
      return;
    }
    if (res === 'A' || res === 'B') fixed[n] = res;
    else if (res !== null && res !== 'deja') {
      errors++;
      r.fail('retour inattendu ' + res + ' paire ' + (n - 1) + ' -> ' + n);
    }
  });
  r.eq(errors, 0, 'aucune exception sur tout le corpus');
  const expected = {};
  Object.keys(CASE_A).forEach(function (k) { expected[k] = 'A'; });
  Object.keys(CASE_B).forEach(function (k) { expected[k] = 'B'; });
  r.eq(JSON.stringify(fixed), JSON.stringify(expected),
    'exactement 30 A + 4 B, rien d\u2019autre (got ' + JSON.stringify(fixed) + ')');
}

function testNegatives(r, CONT) {
  NEGATIVES.forEach(function (n) {
    const p = loadPair(n);
    const before = p.next.outerHTML;
    const res = CONT.tryFixPair(p.prev, p.next, p.docB);
    r.ok(res === null && p.next.outerHTML === before,
      'p' + (n - 1) + ' -> p' + n + ' : intact (res=' + res + ')');
  });
}

function testOrderAndGuards(r, CONT) {
  // 300 d'abord, puis 299 : les 2 raccords coexistent
  const s299 = loadPair(300);
  r.eq(CONT.tryFixPair(s299.prev, s299.next, s299.docB), 'A', '299 -> 300 en 1er');
  const s298 = loadPair(299);
  r.eq(CONT.tryFixPair(s298.prev, s298.next, s298.docB), 'A', '298 -> 299 en 2nd');
  const row = firstTableFirstRow(s298.next);
  r.ok(!!row && row.range === '20-23 (suite)', 'tête de 299 : 20-23 (suite)');
  // voisins non-sections (images) : sans effet, sans crash
  const dom = new JSDOM('<!DOCTYPE html><html><body></body></html>');
  const img = dom.window.document.createElement('img');
  r.eq(CONT.tryFixPair(img, s298.next, dom.window.document), null, 'prev image -> null');
  r.eq(CONT.tryFixPair(s298.prev, img, dom.window.document), null, 'next image -> null');
  r.eq(CONT.tryFixPair(null, s298.next, dom.window.document), null, 'prev absent -> null');
  // trou 304-321 : aucun appariement à cheval, sans crash (vraie paire 303 -> 322)
  try {
    const domH = new JSDOM('<!DOCTYPE html><html><body></body></html>');
    const docH = domH.window.document;
    const wH1 = docH.createElement('div');
    wH1.innerHTML = readHtml(303);
    const wH2 = docH.createElement('div');
    wH2.innerHTML = readHtml(322);
    const res = CONT.tryFixPair(wH1.firstElementChild, wH2.firstElementChild, docH);
    r.ok(res === null || res === 'A' || res === 'B',
      'trou 303 -> 322 : sans crash (res=' + res + ')');
  } catch (e) {
    r.fail('trou 303 -> 322 : exception ' + (e && e.message));
  }
  // tableaux d'index des sorts (stackable) : jamais de crash
  [127, 128].forEach(function (n) {
    const p = loadPair(n + 1);
    let res = null;
    try {
      res = CONT.tryFixPair(p.prev, p.next, p.docB);
    } catch (e) { res = 'EX:' + (e && e.message); }
    r.ok(res === null || res === 'A' || res === 'B' || res === 'deja',
      'paire ' + n + ' -> ' + (n + 1) + ' sans crash (res=' + res + ')');
  });
}

function testUtils(r, CONT) {
  r.ok(CONT.isSuccessor('14-17', '18-19') === true, 'successeur 14-17 -> 18-19');
  r.ok(CONT.isSuccessor('32+', '1') === false, "32+ n'a pas de successeur");
  r.ok(CONT.isSuccessor('4', '5') === true, 'successeur 4 -> 5');
  r.ok(CONT.parseRange('32+').end === null, 'rang final 32+');
  r.ok(CONT.endsIncomplete('...suicidaire') === true, 'cellule tronquée détectée');
  r.ok(CONT.endsIncomplete('...gobelins.') === false, 'point final = complète');
  r.ok(CONT.endsIncomplete('...terrain :') === true, 'deux-points = suite');
  r.ok(CONT.startsLower('ou que meme') === true, 'minuscule');
  r.ok(CONT.startsLower('9 m de rayon') === true, '1re lettre en minuscule (m)');
}

/* Câblage dcc-sheet : module copié tel quel, inclusion, CSS, branchement
   du viewer (voisins DOM, avant compensation de scroll). */
function testWiring(r) {
  r.ok(exists('table-continuation.js'), 'table-continuation.js présent à la racine');
  if (exists('table-continuation.js') && fs.existsSync(SIBLING_MOD)) {
    const local = fs.readFileSync(path.join(ROOT, 'table-continuation.js'), 'utf8');
    const ref = fs.readFileSync(SIBLING_MOD, 'utf8');
    r.eq(local, ref, 'module copié tel quel depuis dcc-spells-reader (octet pour octet)');
  } else if (!fs.existsSync(SIBLING_MOD)) {
    r.skip('comparaison octet pour octet (dossier frère absent)');
  }

  const html = read('index.html');
  const idxCont = html.indexOf('table-continuation.js');
  const idxReader = html.indexOf('spell-reader.js');
  r.ok(idxCont !== -1, 'index.html charge table-continuation.js');
  r.ok(idxCont !== -1 && idxReader !== -1 && idxCont < idxReader,
    'table-continuation.js chargé AVANT spell-reader.js');

  const css = read('style.css');
  const suiteBlock = css.match(/\.spell-viewer table\.data td\.range\.suite \{[^}]+\}/);
  r.ok(!!suiteBlock, 'CSS : règle .spell-viewer table.data td.range.suite présente');
  if (suiteBlock) {
    r.ok(suiteBlock[0].indexOf('white-space: normal') !== -1, 'CSS suite : white-space normal');
    r.ok(suiteBlock[0].indexOf('font-size: 12.5px') !== -1, 'CSS suite : 12.5px');
    r.ok(suiteBlock[0].indexOf('line-height: 1.3') !== -1, 'CSS suite : line-height 1.3');
  }
  r.ok(/\.spell-viewer table\.data\.results-tbl td\.range \{[^}]*width: 76px/.test(css),
    'CSS : règle results-tbl 76px inchangée (additif uniquement)');

  const reader = read('spell-reader.js');
  r.ok(reader.indexOf('fixTableContinuationsFor') !== -1,
    'spell-reader.js : helper fixTableContinuationsFor présent');
  r.ok(reader.indexOf('window.DCC_TABLE_CONT') !== -1,
    'spell-reader.js : branchement sur window.DCC_TABLE_CONT');
  r.ok(reader.indexOf('tryFixPair') !== -1, 'spell-reader.js : appel tryFixPair');
  r.ok(reader.indexOf('previousElementSibling') !== -1 && reader.indexOf('nextElementSibling') !== -1,
    'spell-reader.js : voisins DOM (indépendant du sens de chargement, trou 304-321)');
  const helperPos = reader.indexOf('fixTableContinuationsFor(node);');
  const deltaPos = reader.indexOf('body.scrollHeight - before');
  r.ok(helperPos !== -1 && deltaPos !== -1 && helperPos < deltaPos,
    'spell-reader.js : raccord AVANT la mesure du delta de scroll');
  r.ok(/catch \(\_\)/.test(reader) || /catch \(e\)/.test(reader),
    'spell-reader.js : jamais de crash de rendu (try/catch)');
}

/* Intégration : les 2 sens d'insertion (au-dessus / en dessous) aboutissent
   au même raccord, comme le chargement parallèle preloadAround (p-2..p+5). */
function testInsertionBothWays(r, CONT) {
  if (!hasCorpus()) {
    r.skip('insertion dans les 2 sens (corpus absent)');
    return;
  }
  const dom = new JSDOM('<!DOCTYPE html><html><body><div id="pages"></div></body></html>');
  const doc = dom.window.document;
  const pages = doc.getElementById('pages');

  function sectionOf(n) {
    const w = doc.createElement('div');
    w.innerHTML = readHtml(n);
    const s = w.firstElementChild;
    s.setAttribute('data-loaded-page', String(n));
    return s;
  }
  function fixFor(node) {
    const prev = node.previousElementSibling;
    const next = node.nextElementSibling;
    if (prev && prev.tagName === 'SECTION') {
      try { CONT.tryFixPair(prev, node, doc); } catch (e) { /* ignore */ }
    }
    if (next && next.tagName === 'SECTION') {
      try { CONT.tryFixPair(node, next, doc); } catch (e) { /* ignore */ }
    }
  }
  // sens 1 : 132 puis 133 (en dessous)
  const a132 = sectionOf(132);
  pages.appendChild(a132);
  fixFor(a132);
  const a133 = sectionOf(133);
  pages.appendChild(a133);
  fixFor(a133);
  const rowA = firstTableFirstRow(a133);
  r.ok(!!rowA && rowA.range === '14-17 (suite)', 'insertion 132 puis 133 : raccord A');

  // sens 2 : 133 d'abord, puis 132 au-dessus (loadUp)
  while (pages.firstChild) pages.removeChild(pages.firstChild);
  const b133 = sectionOf(133);
  pages.appendChild(b133);
  fixFor(b133);
  const b132 = sectionOf(132);
  pages.insertBefore(b132, b133);
  fixFor(b132);
  const rowB = firstTableFirstRow(b133);
  r.ok(!!rowB && rowB.range === '14-17 (suite)', 'insertion 133 puis 132 : même raccord A');
  r.eq(CONT.tryFixPair(b132, b133, doc), 'deja', 'idempotent après les 2 sens');
}

async function run() {
  const r = createReporter('19-table-continuation');
  const CONT = loadCont();
  r.ok(!!CONT && typeof CONT.tryFixPair === 'function', 'module table-continuation chargeable (Node)');

  testWiring(r);
  testUtils(r, CONT);
  testSyntheticHyphen(r, CONT);

  if (!hasCorpus()) {
    r.skip('cas cible 132 -> 133 (corpus frère absent)');
    r.skip('30 cas A (corpus frère absent)');
    r.skip('4 cas B (corpus frère absent)');
    r.skip('balayage anti-régression (corpus frère absent)');
    r.skip('négatifs explicites (corpus frère absent)');
    r.skip('ordre et gardes (corpus frère absent)');
  } else {
    testTarget(r, CONT);
    testAllA(r, CONT);
    testAllB(r, CONT);
    testSweep(r, CONT);
    testNegatives(r, CONT);
    testOrderAndGuards(r, CONT);
  }
  testInsertionBothWays(r, CONT);
  return r;
}

module.exports = run;
