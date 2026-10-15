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
const { read, createEnv, delay } = require('./helpers/env');

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

/* ---------------------------------------------------------
   Mise en page factice (jsdom ne calcule pas le layout) :
   le sommaire occupe tocHeight px AU-DESSUS des pages (pageHeight px
   chacune), chaque intertitre est a 40 + i*60 px dans sa page. Le
   conteneur scrollable est .help-body. Meme esprit que fakeLayout de
   09-spell-reader.test.js. */
function fakeLayout(env, opts) {
  const options = opts || {};
  const model = {
    pageHeight: options.pageHeight || 1000,
    tocHeight: options.tocHeight || 3000,
    headingStep: 60,
  };
  const proto = env.window.Element.prototype;
  const doc = env.document;

  function viewerBody() { return doc.querySelector('.help-body'); }
  function pagesBox() { return doc.querySelector('.sv-pages'); }
  function scrollTop() { const b = viewerBody(); return b ? b.scrollTop : 0; }

  function contentTop(el) {
    if (el.classList && el.classList.contains('help-toc')) return 0;
    const page = el.closest ? el.closest('[data-loaded-page]') : null;
    if (page) {
      const p = pagesBox();
      const idx = p ? Array.prototype.indexOf.call(p.children, page) : 0;
      let off = 0;
      if (el !== page) {
        const heads = Array.prototype.slice.call(page.querySelectorAll('h1,h2,h3,h4'));
        const i = heads.indexOf(el);
        off = 40 + (i === -1 ? 0 : i) * model.headingStep;
      }
      return model.tocHeight + idx * model.pageHeight + off;
    }
    return 0;
  }

  Object.defineProperty(proto, 'clientHeight', {
    configurable: true, get: function () { return 900; },
  });
  Object.defineProperty(proto, 'scrollTop', {
    configurable: true,
    get: function () { return this.__scrollTop || 0; },
    set: function (v) { this.__scrollTop = v; },
  });
  Object.defineProperty(proto, 'scrollHeight', {
    configurable: true,
    get: function () {
      if (!this.classList || !this.classList.contains('help-body')) return 0;
      const p = pagesBox();
      return model.tocHeight + (p ? p.children.length : 0) * model.pageHeight;
    },
  });
  Object.defineProperty(proto, 'getBoundingClientRect', {
    configurable: true,
    value: function () {
      const isBody = this.classList && this.classList.contains('help-body');
      if (isBody) {
        return { top: 0, bottom: 900, left: 0, right: 320, width: 320, height: 900 };
      }
      const top = contentTop(this) - scrollTop();
      const h = /^H[1-4]$/.test(this.tagName) ? 24 : 1;
      return { top: top, bottom: top + h, left: 0, right: 320, width: 320, height: h };
    },
  });

  /* Position d'un element dans le port de scroll (0 = en haut). */
  model.top = function (el) { return Math.round(el.getBoundingClientRect().top); };
  return model;
}

/* Polices factices : promesse 'ready' jamais resolue (force le chemin
   'loadingdone') + bus d'evenements minimal pour document.fonts. */
function fakeFonts(env) {
  const listeners = {};
  const fonts = {
    ready: new Promise(function () {}),
    addEventListener: function (type, fn) {
      (listeners[type] = listeners[type] || []).push(fn);
    },
    removeEventListener: function (type, fn) {
      const l = listeners[type] || [];
      const i = l.indexOf(fn);
      if (i !== -1) l.splice(i, 1);
    },
    dispatch: function (type) {
      (listeners[type] || []).slice().forEach(function (fn) { fn(); });
    },
    count: function (type) { return (listeners[type] || []).length; },
  };
  env.document.fonts = fonts;
  return fonts;
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
  env.load('table-fit.js');
  env.load('ref-reader.js');
  r.ok(!!win.DCCTableFit && typeof win.DCCTableFit.classify === 'function' &&
    typeof win.DCCTableFit.fitAll === 'function',
    'window.DCCTableFit expose (classify/fitAll, tableaux responsives)');
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
  /* Page 6 stubee facon vraie p.16 : 3 intertitres a ids, 3 entrees TOC
     sur la meme page (cas du bug « Équivalences monétaires »). */
  win.DCC_REF_TOC = [
    { s: 'Personnages' },
    { t: 'Table 1-1 : Modificateurs', d: '4', p: 5 },
    { t: 'Table 3-2 : Munitions', d: '15', p: 6 },
    { t: 'Table 3-3 : Armures', d: '15', p: 6 },
    { t: 'Equivalences monetaires', d: '15', p: 6 },
    { t: 'Table critique', d: '20', p: 7 },
    { t: 'Sans Ancre Ni Titre', d: '21', p: 8 },
    { t: 'Autre', d: '21', p: 8 },
    { t: 'Neuvieme', d: '22', p: 9 },
  ];
  win.DCC_REF_ANCHORS = {
    'table11modificateurs|5': { page: 5, id: 's5-t11', title: 'Table 1-1' },
    'table32munitions|6': { page: 6, id: 's6-t32', title: 'Table 3-2' },
    'table33armures|6': { page: 6, id: 's6-t33', title: 'Table 3-3' },
    'equivalencesmonetaires|6': { page: 6, id: 's6-equi', title: 'Equivalences' },
    /* Slug long vs titre court : resolution par prefixe. */
    'tablecritiqueipersonnages|7': { page: 7, id: 's7-crit', title: 'Table critique I longue' },
    /* Ancre fichier dont l'id N'EXISTE PAS dans la page : repli texte. */
    'neuviemetitrecomplet|9': { page: 9, id: 's9-noid', title: 'Neuvieme complet' },
  };
  win.DCC_REF_PAGES = {
    /* Page 4 = sommaire imprime du livre : presente dans le contenu mais
       jamais affichee (plage 5..61). */
    4: '<section class="page" data-page="4"><h2>TABLE DES MATIERES</h2></section>',
    5: '<section class="page" data-page="5"><h3 id="s5-t11">Table 1-1</h3></section>',
    6: '<section class="page" data-page="6"><h3 id="s6-t32">Table 3-2</h3>' +
      '<h3 id="s6-t33">Table 3-3</h3><h3 id="s6-equi">Equivalences</h3>' +
      '<div class="table-wrap"><table class="data stackable" id="t6-keep"><thead><tr><th>Niveau</th><th>PX</th></tr></thead>' +
      '<tbody><tr><td class="range">1</td><td>0</td></tr></tbody></table></div>' +
      '<div class="table-wrap"><table class="data stackable" id="t6-scroll"><thead><tr><th>Niveau</th><th>Bonus jet attaque</th><th>De/Table critique</th><th>De action</th><th>Ref</th><th>Vig</th><th>Vol</th><th>Sorts 1</th><th>Sorts 2</th><th>Sorts 3</th><th>Sorts 4</th><th>Sorts 5</th></tr></thead>' +
      '<tbody><tr><td class="range">1</td><td>+1</td><td>1d10/I</td><td>1d20</td><td>+0</td><td>+1</td><td>+0</td><td>1</td><td>—</td><td>—</td><td>—</td><td>—</td></tr></tbody></table></div>' +
      '<div class="table-wrap"><table class="data stackable" id="t6-prose"><thead><tr><th>Jet</th><th>Effet</th></tr></thead>' +
      '<tbody><tr><td class="range">1</td><td>' + 'Paragraphe long. '.repeat(20) + '</td></tr></tbody></table></div>' +
      '</section>',
    /* Page 7 : ancre fichier au slug long + id present (resolution par
       prefixe). Page 8 : ni ancre ni intertitre proche sauf « Autre ». */
    7: '<section class="page" data-page="7"><h3 id="s7-crit">Table critique I : longue</h3></section>',
    8: '<section class="page" data-page="8"><h3>Autre sujet</h3></section>',
    9: '<section class="page" data-page="9"><h3>Neuvieme titre</h3></section>',
    /* Page 10 : section vide (fichier tronque) — jamais inseree. */
    10: '<section class="page" data-page="10"></section>',
  };
  /* setAnchors remplace window.DCC_REF_ANCHORS : on lui passe le jeu
     complet (il redeclenche ensureReady, chemin synchrone via les stubs). */
  await win.DCCRefReader.setAnchors(win.DCC_REF_ANCHORS);
  r.ok(win.DCCRefReader.isAvailable() === true, 'ancres presentes : disponible');
  r.ok(doc.documentElement.classList.contains('has-ref-reader'),
    'ancres presentes : classe has-ref-reader posee');
  r.eq(win.DCCRefReader.FIRST, 5,
    'plage affichee 5..61 : page 4 (sommaire imprime) exclue');

  /* --- 8. Visionneuse : chrome + sommaire en premier (R4, R6) --------- */
  /* Mise en page + polices factices AVANT l'ouverture : la geometrie sert
     aux assertions de scroll (fakeLayout) et le bus fonts au recalage
     polices (PLAN-ANCHORS 1.2). */
  const layout = fakeLayout(env);
  const fonts = fakeFonts(env);
  win.DCCRefReader.openReference();
  const overlay = doc.querySelector('.help-overlay');
  if (!r.ok(!!overlay, 'openReference() : overlay .help-overlay cree')) return r;
  r.eq(overlay.querySelector('.help-title').textContent, 'Référence complète',
    'viewer : titre « Référence complète » (R4)');
  r.eq(overlay.querySelector('.help-sub').textContent, 'Document intégral — sommaire cliquable',
    'viewer : sous-titre (R4)');
  const tocEl = overlay.querySelector('.help-toc');
  const body = overlay.querySelector('.help-body');
  r.ok(!!tocEl && tocEl.hidden === false, 'viewer : sommaire visible en premier');
  const secs = tocEl.querySelectorAll('.help-toc-sec');
  r.eq(secs.length, 1, 'viewer : 1 en-tete de section');
  r.ok(secs[0].tagName === 'BUTTON' && secs[0].getAttribute('data-goto') === '5',
    'viewer : section « Personnages » cliquable vers sa 1re entree (R6)');
  const gotos = tocEl.querySelectorAll('button[data-goto]:not(.help-toc-sec)');
  r.eq(gotos.length, 8, 'viewer : 8 entrees data-goto');
  /* Libelle = page SCAN (p), pas la page imprimee (d) : chaque page
     affiche « Page N » avec N = p ; libeller avec d (« p. 4 » vs
     « Page 5 ») faisait croire a un saut sur la mauvaise page. */
  r.ok(gotos[0].textContent.indexOf('(p. 5)') !== -1 &&
    gotos[0].textContent.indexOf('(p. 4)') === -1,
    'viewer : entree libellee avec le numero de page scan « titre (p. p) »');

  /* --- 8b. Bouton « Sommaire » a gauche de la croix (retour au debut) -- */
  const closeBtn8 = overlay.querySelector('.help-close');
  const homeBtn = closeBtn8.previousElementSibling;
  if (r.ok(!!homeBtn && homeBtn.classList.contains('help-home'),
    'viewer : bouton .help-home immediatement a gauche de la croix')) {
    r.eq(homeBtn.getAttribute('type'), 'button', 'help-home : type=button');
    r.eq(homeBtn.getAttribute('aria-label'), 'Revenir au sommaire',
      'help-home : aria-label « Revenir au sommaire »');
    body.scrollTop = 1234; // l'utilisateur a defile loin du sommaire
    homeBtn.click();
    r.eq(body.scrollTop, 0,
      'help-home : clic => retour au sommaire (haut du lecteur)');
    r.ok(!!doc.querySelector('.help-overlay'),
      'help-home : le lecteur reste ouvert (pas une fermeture)');
  }

  /* --- 9. Parchemin infini + ancres milieu de page (async) ------------ */
  /* (le stub scrollIntoView et la capture `scrolls` sont poses en 8b). */
  await tick(5);
  const p5 = overlay.querySelector('[data-loaded-page="5"]');
  r.ok(!!p5 && !!p5.querySelector('h3'), 'viewer : page 5 inseree au demarrage');
  r.ok(!overlay.querySelector('[data-loaded-page="4"]'),
    'viewer : page 4 (sommaire imprime) jamais inseree');
  r.ok(!!overlay.querySelector('[data-loaded-page="6"]'),
    'viewer : pages voisines prechargees (p+1)');

  /* Bug rapporte : « Équivalences » (3e entree de la page 6) atterrissait
     en haut de page, sur la Table 3-2. Le clic doit viser l'intertitre :
     l'element vise est cale exactement en haut du port de scroll. */
  gotos[3].click(); // Equivalences, page 6 deja prechargee
  await tick(5);
  r.eq(layout.top(overlay.querySelector('#s6-equi')), 0,
    'viewer : clic milieu de page => l intertitre en haut du port (pas le haut de page)');
  r.ok(layout.top(overlay.querySelector('[data-loaded-page="6"]')) !== 0,
    'viewer : la page elle-meme n est pas en haut (cible = l intertitre)');
  gotos[1].click(); // Table 3-2, meme page
  await tick(5);
  r.eq(layout.top(overlay.querySelector('#s6-t32')), 0,
    'viewer : chaque entree vise sa propre ancre sur la meme page');

  /* Titre court vs slug long (« Table critique ») : resolution par prefixe. */
  gotos[4].click(); // page 7, deja prechargee
  await tick(5);
  r.eq(layout.top(overlay.querySelector('#s7-crit')), 0,
    'viewer : titre court => ancre resolue par prefixe');

  /* Ancre fichier absente du DOM (id non genere) : repli texte vers
     l'intertitre. Ni ancre ni texte : repli haut de page. */
  gotos[7].click(); // Neuvieme, page 9
  await tick(5);
  r.eq(layout.top(overlay.querySelector('[data-loaded-page="9"] h3')), 0,
    'viewer : id absent du DOM => repli vers l intertitre au texte rapproche');
  gotos[5].click(); // Sans Ancre Ni Titre, page 8
  await tick(5);
  r.eq(layout.top(overlay.querySelector('[data-loaded-page="8"]')), 0,
    'viewer : sans ancre ni texte => repli haut de page');

  /* Clic sur une page DEJA inseree (preload) : doit quand meme defiler
     (insert() retourne null sur doublon — recherche du noeud existant). */
  gotos[6].click(); // Autre, page 8 deja prechargee, sans ancre fichier
  await tick(5);
  r.eq(layout.top(overlay.querySelector('[data-loaded-page="8"] h3')), 0,
    'viewer : clic sur page deja chargee => scroll vers le noeud existant');

  /* Course entre clics : seul le DERNIER clic fait defiler. */
  gotos[0].click(); // page 5 (ancre s5-t11)
  gotos[1].click(); // page 6 juste apres
  await tick(5);
  r.eq(layout.top(overlay.querySelector('#s6-t32')), 0,
    'viewer : deux clics rapproches => seul le dernier fait defiler');

  /* Recalage vers l'ELEMENT (miroir des sorts) : apres un clic vers la
     page 9, l'arrivee tardive de la page 6 (inseree au-dessus) rescrolle
     vers l'intertitre vise, pas vers un nombre perime. */
  gotos[7].click(); // Neuvieme, page 9
  await tick(5);
  r.eq(layout.top(overlay.querySelector('[data-loaded-page="9"] h3')), 0,
    'viewer : clic page 9 => intertitre vise');
  overlay.querySelector('[data-loaded-page="6"]').remove(); // la page 6 arrive en retard
  gotos[1].click(); // Table 3-2, page 6
  await tick(5);
  const p6bis = overlay.querySelector('[data-loaded-page="6"]');
  r.ok(!!p6bis && !!p6bis.querySelector('#s6-t32') &&
    layout.top(p6bis.querySelector('#s6-t32')) === 0,
    'viewer : insertion au-dessus => recalage vers l element vise (intertitre en haut)');

  /* --- 9c. RC2 : recalage apres substitution de polices (1.2) ---------- */
  gotos[3].click(); // Equivalences
  await tick(5);
  r.eq(layout.top(overlay.querySelector('#s6-equi')), 0,
    'fonts : intertitre vise avant le swap de polices');
  r.ok(fonts.count('loadingdone') >= 1,
    'fonts : handler loadingdone enregistre (fonts.ready one-shot ne suffit pas)');
  const scrollTopFonts = body.scrollTop;
  layout.tocHeight = 1500; // le sommaire se re-enroule au swap de polices
  r.ok(layout.top(overlay.querySelector('#s6-equi')) !== 0,
    'fonts : le swap de polices decale l ancre (sommaire de hauteur differente)');
  fonts.dispatch('loadingdone');
  r.eq(layout.top(overlay.querySelector('#s6-equi')), 0,
    'fonts : loadingdone => recalage vers l element vise');
  r.ok(body.scrollTop !== scrollTopFonts,
    'fonts : le scroll a bien ete corrige');

  r.ok(!!overlay.querySelector('.sv-pages'), 'viewer : conteneur .sv-pages (parchemin)');
  r.ok(doc.body.style.overflow === 'hidden', 'viewer : scroll du body verrouille');

  /* --- 9b. Tableaux responsives (OPTIM-VIEWER-REF, poses a l'insertion) */
  const tKeep = overlay.querySelector('#t6-keep');
  const tScroll = overlay.querySelector('#t6-scroll');
  const tProse = overlay.querySelector('#t6-prose');
  r.ok(!!tKeep && tKeep.classList.contains('keep-table') &&
    !tKeep.classList.contains('fit-narrow') && !tKeep.classList.contains('scroll-table'),
    'tables : petit tableau => .keep-table (12 px)');
  r.ok(!!tScroll && tScroll.classList.contains('scroll-table') &&
    !tScroll.classList.contains('keep-table'),
    'tables : matrice 12 col. => .scroll-table');
  r.ok(!!tProse && !tProse.classList.contains('keep-table') &&
    !tProse.classList.contains('scroll-table'),
    'tables : paragraphe long => eclate (aucune classe)');
  /* classify direct sur snippets representatifs des vraies pages. */
  const F = win.DCCTableFit;
  function mkTbl(heads, rows, span) {
    let h = '<table class="data stackable"><thead><tr>';
    heads.forEach(function (x) { h += '<th>' + x + '</th>'; });
    h += '</tr></thead><tbody>';
    rows.forEach(function (rr) {
      h += '<tr>';
      rr.forEach(function (c, i) {
        h += (span && i === 0 && rr === rows[0] ? '<td colspan="2">' : '<td>') + c + '</td>';
      });
      h += '</tr>';
    });
    const wrap = doc.createElement('div');
    wrap.innerHTML = h + '</tbody></table>';
    return wrap.firstElementChild;
  }
  r.eq(F.classify(mkTbl(['Arme', 'Degats', 'Portee (m)', 'Cout (po)'],
    [['Epee longue', '1d8', '—', '15']])), 'keep',
    'fit : Table 3-1 Armes => keep');
  r.eq(F.classify(mkTbl(['Caracteristique', 'Modificateur', 'Sorts de mage connus', 'Niveau de sort max'],
    [['3', '-3', 'Impossible de lancer des sorts', '']])), 'narrow',
    'fit : Table 1-1 => narrow');
  /* Longueurs = bodyMax reels de la vraie Table 9-10 (10/7/7/6/5/6/5). */
  r.eq(F.classify(mkTbl(['DV du monstre', 'Humanoides armes*', 'Dragons', 'Demons', 'Geants', 'Morts-vivants', 'Autres'],
    [['Jusqu a 1', 'II-III?', 'II-III?', 'I-II-1', 'I-II-', 'I-II-1', 'I-II-']])), 'narrow',
    'fit : Table 9-10 => narrow');
  const h18 = [''];
  for (let d = 12; d <= 28; d++) h18.push(String(d));
  h18.push('28+');
  const row18 = ['3'];
  for (let d = 13; d <= 28; d++) row18.push(d % 2 ? '12' : 'Echec');
  row18.push('Crit');
  r.eq(F.classify(mkTbl(h18, [row18])), 'scroll',
    'fit : matrice 18 col. => scroll');
  r.eq(F.classify(mkTbl(['Agilite', 'De main principale', 'De main secondaire', 'Coups critiques*'],
    [['13', '1d16', '1d14', 'Coups critiques main principale si jet de de max (16 sur 1d16) passant aussi la CA de la cible (pas de reussite automatique)']])), 'scroll',
    'fit : Deux armes (note 124) => scroll');
  r.eq(F.classify(mkTbl(['d100', 'Metier', 'Arme maitrisee', 'Possession'],
    [['23', 'Fabricant de chandelles', 'Masse (1d4)', 'Huile de lampe, silex']])), null,
    'fit : Metiers (4 col. verbeuses) => tuiles');
  r.eq(F.classify(mkTbl(['Resultat', 'Effet'],
    [['1', 'Paragraphe de maladresse. '.repeat(30)]])), null,
    'fit : texte long => tuiles');
  r.eq(F.classify(mkTbl(['A', 'B'], [['x', 'y']], true)), 'scroll',
    'fit : colspan => scroll (structure preservee)');

  /* --- 10. Fermetures héritées du chrome ------------------------------ */
  overlay.querySelector('.help-close').click();
  r.ok(!doc.querySelector('.help-overlay'), 'viewer : croix ferme');
  r.eq(doc.body.style.overflow, '', 'viewer : scroll du body restaure');
  r.eq(fonts.count('loadingdone'), 0,
    'viewer : handler polices detache a la fermeture');
  win.DCCRefReader.openReference();
  await tick(5);
  r.ok(!!doc.querySelector('.help-overlay'), 'viewer : reouverture possible');
  doc.querySelector('.help-overlay .help-close').click();
  r.ok(!doc.querySelector('.help-overlay'), 'viewer : seconde fermeture');

  /* --- 10b. Page vide/tronquee : jamais inseree, batch continue --------- */
  r.ok(!overlay.querySelector('[data-loaded-page="10"]'),
    'viewer : page 10 vide (stub tronque) jamais inseree par le preload');
  win.DCCRefReader.openReference(10);
  await tick(5);
  const overlay2 = doc.querySelector('.help-overlay');
  if (!r.ok(!!overlay2, 'viewer : ouverture sur page tronquee possible')) return r;
  r.ok(!overlay2.querySelector('[data-loaded-page="10"]'),
    'viewer : page tronquee non inseree a l ouverture');
  const status2 = overlay2.querySelector('.sv-status');
  r.ok(!!status2 && status2.hidden === false &&
    status2.textContent === 'Page indisponible.',
    'viewer : statut « Page indisponible. » sur page tronquee');
  r.ok(!!overlay2.querySelector('[data-loaded-page="8"]'),
    'viewer : pages voisines valides chargees malgre le trou');
  overlay2.querySelector('.help-close').click();
  r.ok(!doc.querySelector('.help-overlay'), 'viewer : fermeture apres page tronquee');


  /* --- 10c. RC1 : compensation conditionnelle (PLAN-ANCHORS 1.1) ------ */
  /* Environnements dedies : les pages sont chargees par <script> avec un
     ordre de resolution CONTROLE (jsdom ne fait pas de reseau — on
     intercepte les <script src> pour simuler le reseau et son alea). */
  function patchScripts(env, route) {
    const head = env.document.head;
    const orig = head.appendChild;
    head.appendChild = function (node) {
      const res = orig.call(head, node);
      if (node && node.tagName === 'SCRIPT' && node.getAttribute('src')) {
        route(node.getAttribute('src'), node, function (ok) {
          if (ok) { if (typeof node.onload === 'function') node.onload(); }
          else if (typeof node.onerror === 'function') node.onerror();
        });
      }
      return res;
    };
  }

  function refEnv(cfg) {
    const env = createEnv();
    const w = env.window;
    const errs = [];
    w.console.error = function (m) { errs.push(String(m)); };
    w.showToast = function () {};
    env.load('aide-classes-data.js');
    env.load('aide-classes.js');
    env.load('ref-reader.js');
    const lay = fakeLayout(env);
    fakeFonts(env);
    if (cfg.toc && cfg.tocDelay === undefined) w.DCC_REF_TOC = cfg.toc;
    w.DCC_REF_ANCHORS = cfg.anchors;
    const failOnce = cfg.failOnce || {};
    patchScripts(env, function (src, node, done) {
      if (/\/contentref\/toc\.js$/.test(src)) {
        setTimeout(function () {
          if (cfg.toc) w.DCC_REF_TOC = cfg.toc;
          done(!!cfg.toc);
        }, cfg.tocDelay || 0);
        return;
      }
      const m = /\/contentref\/(\d+)\.js$/.exec(src);
      if (!m) { done(false); return; }
      const n = parseInt(m[1], 10);
      setTimeout(function () {
        if (failOnce[n]) { failOnce[n] = false; done(false); return; }
        w.DCC_REF_PAGES = w.DCC_REF_PAGES || {};
        w.DCC_REF_PAGES[n] = '<section class="page" data-page="' + n + '">' +
          '<h3 id="s' + n + '-t">Titre ' + n + '</h3></section>';
        done(true);
      }, (cfg.delays && cfg.delays[n]) || 0);
    });
    return { env, w, doc: env.document, layout: lay, errs };
  }

  function loadedOf(doc2) {
    return Array.prototype.map.call(
      doc2.querySelectorAll('.sv-pages > [data-loaded-page]'),
      function (n) { return n.getAttribute('data-loaded-page'); }).join(',');
  }

  /* A : ouverture en haut du sommaire — pages de reference qui arrivent EN
     RETARD (ordre reseau aleatoire) et s'insèrent SOUS le viewport : le
     scroll ne doit absolument pas sauter. */
  const A = refEnv(
    { toc: [{ s: 'S' }, { t: 'Cible', d: '1', p: 12 }],
      anchors: { 'cible|12': { page: 12, id: 's12-t', title: 'Cible' } },
      delays: { 8: 60, 9: 40 } });
  await A.w.DCCRefReader.setAnchors(A.w.DCC_REF_ANCHORS);
  A.w.DCCRefReader.openReference(10);
  await delay(250);
  r.eq(A.doc.querySelector('.help-body').scrollTop, 0,
    'RC1 : retardataires sous le viewport => scrollTop inchange (pas de saut)');
  r.eq(loadedOf(A.doc), '8,9,10,11,12,13,14,15',
    'RC1 : pages inserees dans l ordre croissant malgre l arrivee aleatoire');
  r.ok(A.errs.length === 0, 'RC1 (A) : aucune erreur console');

  /* B : clic sur une ancre — pages AU-DESSUS qui arrivent en retard : la
     compensation s'applique (l'insertion decalle le contenu visible) et
     l'ancre reste calee en haut. */
  const B = refEnv(
    { toc: [{ s: 'S' }, { t: 'Cible', d: '1', p: 12 }],
      anchors: { 'cible|12': { page: 12, id: 's12-t', title: 'Cible' } },
      delays: { 10: 80, 11: 60 } });
  await B.w.DCCRefReader.setAnchors(B.w.DCC_REF_ANCHORS);
  B.w.DCCRefReader.openReference(12);
  await delay(20);
  B.doc.querySelector('.help-toc button[data-goto="12"]:not(.help-toc-sec)').click();
  await delay(20);
  r.eq(B.layout.top(B.doc.querySelector('#s12-t')), 0,
    'RC1 (B) : l ancre visee est en haut du port');
  await delay(250); // arrivent 11 puis 10 (au-dessus de l ancre)
  r.eq(B.layout.top(B.doc.querySelector('#s12-t')), 0,
    'RC1 (B) : insertion AU-DESSUS compensee => l ancre reste calee');
  r.eq(B.doc.querySelector('.help-body').scrollTop,
    B.layout.tocHeight + 2 * B.layout.pageHeight + 40,
    'RC1 (B) : scrollTop compense (2 pages chargees au-dessus : 10, 11)');
  r.ok(B.errs.length === 0, 'RC1 (B) : aucune erreur console');

  /* --- 10d. RC3 : sommaire de repli remplace par le vrai (1.4) -------- */
  /* Ouverture dans la fenentre avant l'arrivee de toc.js : le sommaire de
     repli « Page 5 … Page 61 » doit etre remplace sans reouverture. */
  const D = refEnv(
    { toc: [{ s: 'S' }, { t: 'Cible', d: '1', p: 12 }, { t: 'Autre', d: '2', p: 13 }],
      tocDelay: 60,
      anchors: { 'cible|12': { page: 12, id: 's12-t', title: 'Cible' } } });
  /* setAnchors RESOUT avec toc.js : on n'attend PAS, comme l'utilisateur
     qui clique dans la fenetre silencieuse du premier chargement. */
  const readyD = D.w.DCCRefReader.setAnchors(D.w.DCC_REF_ANCHORS);
  D.w.DCCRefReader.openReference();
  await delay(20);
  const tocD = D.doc.querySelector('.help-toc');
  r.eq(tocD.querySelectorAll('button').length, 57,
    'RC3 : avant toc.js => sommaire de repli (57 boutons « Page N »)');
  await readyD;
  await delay(30); // toc.js arrive (60 ms) => sommaire reconstruit
  r.eq(tocD.querySelectorAll('button').length, 3,
    'RC3 : toc.js arrive => les vrais boutons remplacent le repli');
  r.ok(tocD.textContent.indexOf('(p. 12)') !== -1,
    'RC3 : les entrees du vrai sommaire sont libellees (titre + page)');
  r.ok(D.doc.querySelector('.help-toc button.help-toc-sec') !== null,
    'RC3 : les en-tetes de section du vrai sommaire sont la');
  r.ok(D.errs.length === 0, 'RC3 : aucune erreur console');

  /* --- 10e. RC4 : un echec de page n'est pas memorise (1.5) ----------- */
  const E = refEnv(
    { toc: [{ s: 'S' }, { t: 'Ving', d: '1', p: 20 }],
      anchors: { 'ving|20': { page: 20, id: 's20-t', title: 'Ving' } },
      failOnce: { 20: true } });
  await E.w.DCCRefReader.setAnchors(E.w.DCC_REF_ANCHORS);
  E.w.DCCRefReader.openReference(20);
  await delay(60);
  const statusE = E.doc.querySelector('.sv-status');
  r.ok(!!statusE && statusE.hidden === false && statusE.textContent === 'Page indisponible.',
    'RC4 : 1er chargement en echec => « Page indisponible. »');
  E.doc.querySelector('.help-close').click();
  r.ok(!E.doc.querySelector('.help-overlay'), 'RC4 : fermeture apres echec');
  E.w.DCCRefReader.openReference(20);
  await delay(60);
  r.ok(!!E.doc.querySelector('[data-loaded-page="20"]'),
    'RC4 : l echec n est pas memorise => la 2e tentative sert la page');
  r.ok(E.errs.length === 0, 'RC4 : aucune erreur console');
  r.ok(errors.length === 0, 'cycle complet : aucune erreur console');
  r.ok(toasts.length === 0, 'cycle complet : aucun toast');

  return r;
};
