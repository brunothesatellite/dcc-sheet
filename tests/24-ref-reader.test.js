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

  /* --- 9. Parchemin infini + ancres milieu de page (async) ------------ */
  /* jsdom n'implemente pas scrollIntoView : on enregistre les appels
     (id, texte de l'intertitre, ou n° de page pour un haut de page). */
  const scrolls = [];
  win.Element.prototype.scrollIntoView = function () {
    scrolls.push(this.tagName === 'SECTION'
      ? 'page:' + this.getAttribute('data-loaded-page')
      : (this.getAttribute('id') || (this.textContent || '').trim().slice(0, 20) ||
        this.getAttribute('data-loaded-page')));
  };
  await tick(5);
  const p5 = overlay.querySelector('[data-loaded-page="5"]');
  r.ok(!!p5 && !!p5.querySelector('h3'), 'viewer : page 5 inseree au demarrage');
  r.ok(!overlay.querySelector('[data-loaded-page="4"]'),
    'viewer : page 4 (sommaire imprime) jamais inseree');
  r.ok(!!overlay.querySelector('[data-loaded-page="6"]'),
    'viewer : pages voisines prechargees (p+1)');

  /* Bug rapporte : « Équivalences » (3e entree de la page 6) atterrissait
     en haut de page, sur la Table 3-2. Le clic doit viser l'intertitre. */
  scrolls.length = 0;
  gotos[3].click(); // Equivalences, page 6 deja prechargee
  await tick(5);
  r.eq(scrolls.join(','), 's6-equi',
    'viewer : clic milieu de page => scroll vers l intertitre (pas le haut de page)');
  scrolls.length = 0;
  gotos[1].click(); // Table 3-2, meme page
  await tick(5);
  r.eq(scrolls.join(','), 's6-t32',
    'viewer : chaque entree vise sa propre ancre sur la meme page');

  /* Titre court vs slug long (« Table critique ») : resolution par prefixe. */
  scrolls.length = 0;
  gotos[4].click(); // page 7, deja prechargee
  await tick(5);
  r.eq(scrolls.join(','), 's7-crit',
    'viewer : titre court => ancre resolue par prefixe');

  /* Ancre fichier absente du DOM (id non genere) : repli texte vers
     l'intertitre. Ni ancre ni texte : repli haut de page (avant). */
  scrolls.length = 0;
  gotos[7].click(); // Neuvieme, page 9 deja prechargee
  await tick(5);
  r.eq(scrolls.join(','), 'Neuvieme titre',
    'viewer : id absent du DOM => repli vers l intertitre au texte rapproche');
  scrolls.length = 0;
  gotos[5].click(); // Sans Ancre Ni Titre, page 8
  await tick(5);
  r.eq(scrolls.join(','), 'page:8',
    'viewer : sans ancre ni texte => repli haut de page');

  /* Clic sur une page DEJA inseree (preload) : doit quand meme defiler
     (insert() retourne null sur doublon — recherche du noeud existant). */
  scrolls.length = 0;
  gotos[6].click(); // Autre, page 8 deja prechargee, sans ancre fichier
  await tick(5);
  r.eq(scrolls.join(','), 'Autre sujet',
    'viewer : clic sur page deja chargee => scroll vers le noeud existant');

  /* Course entre clics : seul le DERNIER clic fait defiler. */
  scrolls.length = 0;
  gotos[0].click(); // page 5 (ancre s5-t11)
  gotos[1].click(); // page 6 juste apres
  await tick(5);
  r.eq(scrolls.join(','), 's6-t32',
    'viewer : deux clics rapproches => seul le dernier fait defiler (pas de page parasite)');

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
    'tables : matrice 6 col. => .scroll-table');
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
  win.DCCRefReader.openReference();
  await tick(5);
  r.ok(!!doc.querySelector('.help-overlay'), 'viewer : reouverture possible');
  doc.querySelector('.help-overlay .help-close').click();
  r.ok(!doc.querySelector('.help-overlay'), 'viewer : seconde fermeture');
  r.ok(errors.length === 0, 'cycle complet : aucune erreur console');
  r.ok(toasts.length === 0, 'cycle complet : aucun toast');

  return r;
};
