'use strict';

/* Audit verrouillé des ancres du sommaire « Référence complète »
   (PLAN-ANCHORS 2.2) : rejoue la résolution CLIENT RÉELLE (anchorIdFor +
   textTarget, exposés par ref-reader.js) contre le contenu contentref
   DÉPLOYÉ (toc.js + anchors-ref.js + HTML des pages, hors de ce dépôt).
   Verrou : chaque entrée du sommaire doit résoudre en ancre directe (id
   présent dans la page). Toute retouche de contenu qui ferait retomber une
   entrée en repli texte ou en haut de page échoue ici — la correction se
   fait côté contenu via dcc-spells-reader/tools/anchor-aliases.json.
   Contenu absent (CI, machine sans dossier frère) : skip proprement. */

const fs = require('fs');
const path = require('path');
const { createReporter } = require('./helpers/assert');
const { createEnv, ROOT } = require('./helpers/env');

const CONTENT = path.resolve(ROOT, '..', 'dcc-spells-reader', 'contentref');

/* Exécute un fichier de contenu comme le ferait le navigateur
   (createEnv tourne en runScripts: 'dangerously'). */
function injectScript(doc, filePath) {
  const s = doc.createElement('script');
  s.textContent = fs.readFileSync(filePath, 'utf8');
  doc.body.appendChild(s);
}

module.exports = async function suite() {
  const r = createReporter('26-anchors-audit');

  if (!fs.existsSync(path.join(CONTENT, 'toc.js')) ||
      !fs.existsSync(path.join(CONTENT, 'anchors-ref.js'))) {
    r.skip('contenu contentref absent (' + CONTENT + ') : audit des ancres non rejoué');
    return r;
  }

  const env = createEnv();
  const win = env.window;
  const doc = env.document;
  const errors = [];
  win.console.error = function (m) { errors.push(String(m)); };
  win.showToast = function () {};
  env.load('aide-classes-data.js');
  env.load('aide-classes.js');
  env.load('ref-reader.js');

  /* Contenu réel, chargé comme en navigateur. */
  injectScript(doc, path.join(CONTENT, 'toc.js'));
  injectScript(doc, path.join(CONTENT, 'anchors-ref.js'));

  const toc = win.DCC_REF_TOC;
  if (!r.ok(Array.isArray(toc) && toc.length > 0,
    'toc.js réel chargé (' + (Array.isArray(toc) ? toc.length : 0) + ' items)')) return r;
  if (!r.ok(!!win.DCCRefReader && typeof win.DCCRefReader._anchorIdFor === 'function' &&
    typeof win.DCCRefReader._textTarget === 'function',
    'ref-reader expose la résolution réelle (anchorIdFor/textTarget)')) return r;

  const FIRST = win.DCCRefReader.FIRST;
  const LAST = win.DCCRefReader.LAST;

  /* Pages réelles, chargées paresseusement (une seule lecture par page). */
  const pageNodes = {};
  function pageNode(n) {
    if (pageNodes[n]) return pageNodes[n];
    const f = path.join(CONTENT, n + '.js');
    if (!fs.existsSync(f)) return null;
    injectScript(doc, f);
    const html = win.DCC_REF_PAGES && win.DCC_REF_PAGES[n];
    if (!html) return null;
    const wrap = doc.createElement('div');
    wrap.innerHTML = html;
    pageNodes[n] = wrap;
    return wrap;
  }

  const noPage = [];   // page absente du contenu déployé
  const missing = [];  // aucune cible : atterrissage en haut de page
  const fallback = []; // repli texte : l'ancre directe est perdue
  let direct = 0;
  let entries = 0;

  toc.forEach(function (item) {
    if (!item || typeof item.t !== 'string' || !item.t) return;
    if (!(item.p >= FIRST && item.p <= LAST)) return; // hors plage affichée
    entries += 1;
    const p = item.p;
    const node = pageNode(p);
    if (!node) { noPage.push(item.t + ' (p.' + p + ')'); return; }
    const id = win.DCCRefReader._anchorIdFor(item.t, p);
    let el = null;
    if (id) {
      try { el = node.querySelector('#' + id); } catch (_) { el = null; }
    }
    if (el) { direct += 1; return; }
    const t = win.DCCRefReader._textTarget(node, item.t);
    if (t) fallback.push(item.t + ' (p.' + p + ') -> ' + (id || 'sans id'));
    else missing.push(item.t + ' (p.' + p + ')');
  });

  r.ok(entries > 0, 'entrées du sommaire parcourues (' + entries + ')');
  r.eq(noPage.length, 0,
    'toutes les pages des entrées existent dans contentref (' + (noPage.join(', ') || 'OK') + ')');
  r.eq(missing.length, 0,
    'aucune entrée en haut de page, cible introuvable (' + (missing.join(', ') || 'OK') + ')');
  r.eq(fallback.length, 0,
    'résolution 100 % directe, aucun repli texte — corriger via dcc-spells-reader/tools/anchor-aliases.json (' +
    (fallback.join(', ') || 'OK') + ')');
  r.eq(direct, entries,
    'toutes les entrées résolvent en ancre directe (' + direct + '/' + entries + ')');
  r.ok(errors.length === 0, 'audit : aucune erreur console');

  return r;
};
