'use strict';

/* Référence complète (contenu optionnel contentref) — evolution 15/10/2026,
   plan2/PLAN-REFERENCE.md § D5.
   - Câblage : bouton topbar #btn-ref-full (PC uniquement) avant #btn-aide,
     entrée full-ref avant class-ref, script ref-reader.js après spell-reader.js.
   - Détection indépendante des sorts : contentref absent (ou ancien contenu
     avec seulement content/) => bouton + entrée invisibles, sans erreur
     console ni toast ; les sorts continuent seuls.
   - Visionneuse : chrome aide-classes (openViewer exposé) + sommaire
     cliquable en premier + parchemin infini des pages 4..61.
   loadScript/jsdom : sans réseau, les <script> ajoutés restent en suspens —
   les stubs window.DCC_REF_* rendent les chemins synchrones (comme
   setAnchors/setTranslations des sorts). */

const { JSDOM } = require('jsdom');
const { createReporter } = require('./helpers/assert');
const { read, createEnv } = require('./helpers/env');

function dumpLS(win) {
  const out = {};
  for (let i = 0; i < win.localStorage.length; i += 1) {
    const k = win.localStorage.key(i);
    out[k] = win.localStorage.getItem(k);
  }
  return JSON.stringify(out);
}

function tick(n) {
  let p = Promise.resolve();
  for (let i = 0; i < (n || 3); i += 1) p = p.then(function () { return null; });
  return p;
}

module.exports = async function suite() {
  const r = createReporter('24-ref-reader');
  const html = read('index.html');
  const page = new JSDOM(html).window.document;

  /* --- 1. Bouton topbar « Référence complète » (V2, D3) -------------- */
  const btnFull = page.querySelector('#btn-ref-full');
  if (r.ok(!!btnFull, '#btn-ref-full present dans index.html')) {
    r.eq(btnFull.className, 'ref-full-toggle', '#btn-ref-full : classe .ref-full-toggle');
    r.ok(!!btnFull.querySelector('svg'), '#btn-ref-full : icone SVG inline (livre + lignes, R1-A)');
    r.eq(btnFull.getAttribute('title'), 'Référence complète', '#btn-ref-full : title');
    r.eq(btnFull.getAttribute('aria-label'), 'Ouvrir la référence complète', '#btn-ref-full : aria-label');
    const btnAide = page.querySelector('#btn-aide');
    r.ok(!!btnAide && !!(btnFull.compareDocumentPosition(btnAide) & 4),
      '#btn-ref-full place avant #btn-aide dans la topbar (V2)');
  }

  /* --- 2. Entrée « Référence » du menu (V3, R2) ---------------------- */
  const menu = page.querySelector('#user-menu');
  if (r.ok(!!menu, '#user-menu present')) {
    const actions = Array.prototype.map.call(
      menu.querySelectorAll('button[data-action]'),
      function (b) { return b.getAttribute('data-action'); });
    const iFull = actions.indexOf('full-ref');
    const iClass = actions.indexOf('class-ref');
    r.ok(iFull !== -1, 'menu : entree full-ref presente');
    r.ok(iFull !== -1 && iClass !== -1 && iFull < iClass,
      'menu : « Référence » au-dessus de « Classes » (R2)');
    const fullBtn = menu.querySelector('button[data-action="full-ref"]');
    r.ok(!!fullBtn && fullBtn.textContent === 'Référence',
      'menu : libelle « Référence » (R3)');
  }

  /* --- 3. Chargements de scripts (D3) -------------------------------- */
  const scripts = Array.prototype.map.call(
    page.querySelectorAll('script[src]'),
    function (s) { return s.getAttribute('src'); });
  r.ok(scripts.indexOf('spell-reader.js') !== -1 && scripts.indexOf('ref-reader.js') !== -1 &&
    scripts.indexOf('ref-reader.js') > scripts.indexOf('spell-reader.js'),
    'ref-reader.js charge apres spell-reader.js');

  /* --- 4. CSS : bouton, visibilité conditionnelle, icône, sections -- */
  const styleCss = read('style.css');
  r.ok(/\.ref-full-toggle\s*\{/.test(styleCss), 'style.css : regle .ref-full-toggle (pastille topbar)');
  r.ok(styleCss.indexOf('html:not(.has-ref-reader) .ref-full-toggle') !== -1,
    'style.css : bouton masque sans has-ref-reader');
  r.ok(styleCss.indexOf('html:not(.has-ref-reader) #user-menu button[data-action="full-ref"]') !== -1,
    'style.css : entree menu masquee sans has-ref-reader');
  r.ok(styleCss.indexOf('#user-menu button[data-action="full-ref"]::before') !== -1 &&
    styleCss.indexOf('M7 8.5h3') !== -1,
    'style.css : icone livre + lignes en ::before sur « Référence » (R1-A)');
  r.ok(/\.help-toc\s+\.help-toc-sec\s*\{/.test(styleCss),
    'style.css : regle .help-toc .help-toc-sec (en-tetes de section, R6)');
  r.ok(/\.theme-toggle,\s*\.ref-toggle,\s*\.ref-full-toggle\s*\{\s*display:\s*none;/.test(styleCss),
    'style.css : .ref-full-toggle masque en <=600px (PC uniquement, V2)');

  /* --- 5. openViewer exposé par aide-classes.js (R5) ------------------ */
  const env = createEnv();
  const win = env.window;
  const doc = env.document;
  const errors = [];
  const toasts = [];
  win.console.error = function (m) { errors.push(String(m)); };
  win.showToast = function (msg, type) { toasts.push(String(msg) + '|' + (type || '')); };
  env.load('aide-classes-data.js');
  env.load('aide-classes.js');
  env.load('ref-reader.js');
  r.ok(!!win.DCCRefReader && typeof win.DCCRefReader.openReference === 'function' &&
    typeof win.DCCRefReader.ensureReady === 'function' &&
    typeof win.DCCRefReader.isAvailable === 'function',
    'window.DCCRefReader expose (ensureReady/isAvailable/openReference)');
  r.ok(!!win.DCCClassHelp && typeof win.DCCClassHelp.openViewer === 'function',
    'window.DCCClassHelp.openViewer expose (R5, chrome reutilise)');

  /* --- 6. Compatibilité : contentref absent => invisible, silencieux - */
  r.ok(win.DCCRefReader.isAvailable() === false,
    'sans contentref : indisponible (loadScript en suspens sous jsdom)');
  r.ok(!doc.documentElement.classList.contains('has-ref-reader'),
    'sans contentref : classe has-ref-reader absente');
  win.DCCRefReader.openReference();
  r.ok(!doc.querySelector('.help-overlay'), 'sans contentref : openReference() ne fait rien');
  r.ok(errors.length === 0, 'sans contentref : aucune erreur console (0 appel)');
  r.ok(toasts.length === 0, 'sans contentref : aucun toast');

  /* Ancien contenu : ancres vides (content/ seul, pas de contentref).
     Pas d'await : sans ancres, ensureReady part en loadScript, qui reste en
     suspens sous jsdom (aucun reseau) — l'etat indisponible est synchrone. */
  win.DCCRefReader.setAnchors({});
  r.ok(win.DCCRefReader.isAvailable() === false, 'ancres vides : indisponible');
  r.ok(!doc.documentElement.classList.contains('has-ref-reader'),
    'ancres vides : classe has-ref-reader absente');
  r.ok(!doc.documentElement.classList.contains('has-spell-reader'),
    'detection independante : ref-reader ne touche pas aux sorts');
  r.ok(errors.length === 0, 'ancres vides : aucune erreur console');
  r.ok(toasts.length === 0, 'ancres vides : aucun toast');
  const lsBefore = dumpLS(win);
  r.ok(dumpLS(win) === lsBefore, 'detection : zero ecriture localStorage');

  /* --- 7. Détection positive (stubs, chemin synchrone) ---------------- */
  win.DCC_REF_TOC = [
    { s: 'Personnages' },
    { t: 'Table 1-1 : Modificateurs', d: '4', p: 5 },
    { t: 'Table 1-2 : Augure', d: '5', p: 6 },
    { s: 'Fin' },
  ];
  win.DCC_REF_PAGES = {
    /* Page 4 = sommaire imprime du livre : presente dans le contenu mais
       jamais affichee (plage 5..61). */
    4: '<section class="page" data-page="4"><h2>TABLE DES MATIERES</h2></section>',
    5: '<section class="page" data-page="5"><h3>Table 1-1</h3></section>',
    6: '<section class="page" data-page="6"><h3>Table 1-2</h3></section>',
    7: '<section class="page" data-page="7"><h3>Hors sommaire</h3></section>',
  };
  await win.DCCRefReader.setAnchors({ 'x|5': { page: 5, id: 'a', title: 'X' } });
  r.ok(win.DCCRefReader.isAvailable() === true, 'ancres presentes : disponible');
  r.ok(doc.documentElement.classList.contains('has-ref-reader'),
    'ancres presentes : classe has-ref-reader posee');
  r.eq(win.DCCRefReader.FIRST, 5,
    'plage affichee 5..61 : page 4 (sommaire imprime) exclue');

  /* --- 8. Visionneuse : chrome + sommaire en premier (R4, R6) --------- */
  win.DCCRefReader.openReference();
  const overlay = doc.querySelector('.help-overlay');
  if (!r.ok(!!overlay, 'openReference() : overlay .help-overlay cree')) return r;
  r.eq(overlay.querySelector('.help-title').textContent, 'Référence complète',
    'viewer : titre « Référence complète » (R4)');
  r.eq(overlay.querySelector('.help-sub').textContent, 'Document intégral — sommaire cliquable',
    'viewer : sous-titre (R4)');
  const tocEl = overlay.querySelector('.help-toc');
  r.ok(!!tocEl && tocEl.hidden === false, 'viewer : sommaire visible en premier');
  const secs = tocEl.querySelectorAll('.help-toc-sec');
  r.eq(secs.length, 2, 'viewer : 2 en-tetes de section');
  r.ok(secs[0].tagName === 'BUTTON' && secs[0].getAttribute('data-goto') === '5',
    'viewer : section « Personnages » cliquable vers sa 1re entree (R6)');
  r.ok(secs[1].disabled === true, 'viewer : section sans entree suivante desactivee');
  const gotos = tocEl.querySelectorAll('button[data-goto]:not(.help-toc-sec)');
  r.eq(gotos.length, 2, 'viewer : 2 entrees data-goto');
  /* Libelle = page SCAN (p), pas la page imprimee (d) : chaque page
     affiche « Page N » avec N = p ; libeller avec d (« p. 4 » vs
     « Page 5 ») faisait croire a un saut sur la mauvaise page. */
  r.ok(gotos[0].textContent.indexOf('(p. 5)') !== -1 &&
    gotos[0].textContent.indexOf('(p. 4)') === -1,
    'viewer : entree libellee avec le numero de page scan « titre (p. p) »');

  /* --- 9. Parchemin infini (pages stubées, async) --------------------- */
  /* jsdom n'implemente pas scrollIntoView : on enregistre les appels. */
  const scrolls = [];
  win.Element.prototype.scrollIntoView = function () {
    scrolls.push(this.getAttribute('data-loaded-page'));
  };
  await tick(5);
  const p5 = overlay.querySelector('[data-loaded-page="5"]');
  r.ok(!!p5 && !!p5.querySelector('h3'), 'viewer : page 5 inseree au demarrage');
  r.ok(!overlay.querySelector('[data-loaded-page="4"]'),
    'viewer : page 4 (sommaire imprime) jamais inseree');
  r.ok(!!overlay.querySelector('[data-loaded-page="6"]'),
    'viewer : pages voisines prechargees (p+1)');

  /* Clic sur une page DEJA inseree (preload) : doit quand meme defiler
     (insert() retourne null sur doublon — recherche du noeud existant). */
  scrolls.length = 0;
  gotos[1].click(); // page 6 : deja prechargee
  await tick(5);
  r.eq(scrolls.join(','), '6',
    'viewer : clic sur page deja chargee => scroll vers le noeud existant');

  /* Course entre clics : seul le DERNIER clic fait defiler. */
  scrolls.length = 0;
  gotos[0].click(); // page 5
  gotos[1].click(); // page 6 juste apres
  await tick(5);
  r.eq(scrolls.join(','), '6',
    'viewer : deux clics rapproches => seul le dernier fait defiler (pas de page parasite)');

  r.ok(!!overlay.querySelector('.sv-pages'), 'viewer : conteneur .sv-pages (parchemin)');
  r.ok(doc.body.style.overflow === 'hidden', 'viewer : scroll du body verrouille');

  /* --- 10. Fermetures héritées du chrome ------------------------------ */
  overlay.querySelector('.help-close').click();
  r.ok(!doc.querySelector('.help-overlay'), 'viewer : croix ferme');
  r.eq(doc.body.style.overflow, '', 'viewer : scroll du body restaure');
  win.DCCRefReader.openReference();
  await tick(5);
  r.ok(!!doc.querySelector('.help-overlay'), 'viewer : reouverture possible');
  doc.querySelector('.help-overlay .help-close').click();
  r.ok(!doc.querySelector('.help-overlay'), 'viewer : seconde fermeture');
  r.ok(errors.length === 0, 'cycle complet : aucune erreur console');
  r.ok(toasts.length === 0, 'cycle complet : aucun toast');

  return r;
};
