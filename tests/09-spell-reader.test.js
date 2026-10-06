'use strict';

/* Consultation des définitions de sorts (dossier frère dcc-spells-reader)
   - détection du dossier frère par chargement de content/anchors.js ;
   - icône de recherche à gauche des noms de sorts renseignés (mage/elfe/clerc) ;
   - résolution du nom (numéro de page ignoré, singulier/pluriel, accents) ;
   - noms saisis en anglais → traduction via spell-translation.js (FR/EN) ;
   - calage de l'ancre : compensation exacte d'une insertion au-dessus,
     recalage apres swap de polices, aucun recalage force apres scroll ;
   - popup plein écran avec chargement de la page du sort + ancre ;
   - plusieurs patrons dans « Patron(s) » : popup de sélection du patron,
     entrée inconnue affichée grise, virgule jamais séparatrice ;
   - messages d'erreur si sort ou patron introuvable ;
   - sans dossier frère : aucune détection, aucune popup. */

const { createReporter } = require('./helpers/assert');
const { createEnv, delay } = require('./helpers/env');

function waitFor(cond, timeout) {
  const t = timeout || 3000;
  const start = Date.now();
  return (async function loop() {
    for (;;) {
      let okNow = false;
      try { okNow = cond(); } catch (e) { okNow = false; }
      if (okNow) return true;
      if (Date.now() - start > t) return false;
      await delay(20);
    }
  }());
}

function click(el) {
  el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
}

function input(el, window) {
  el.dispatchEvent(new window.Event('input', { bubbles: true }));
}

const ANCHORS = {
  'charmepersonne|132': { page: 132, id: 's132-charmepersonne', title: 'Charme-Personne' },
  'invoquerunpatron|141': { page: 141, id: 's141-invoquerunpatron', title: 'Invoquer un Patron' },
  'lierunpatron|143': { page: 143, id: 's143-lierunpatron', title: 'Lier un Patron' },
  'bouledefeu|203': { page: 203, id: 's203-bouledefeu', title: 'Boule de feu' },
  'benediction|255': { page: 255, id: 's255-benediction', title: 'Bénédiction' },
  'charmeserpents|270': { page: 270, id: 's270-charmeserpents', title: 'Charme-serpents' },
  'bobugbubilz|322': { page: 322, id: 's322-bobugbubilz', title: 'BOBUGBUBILZ' },
  'bobugbubilz|323': { page: 323, id: 's323-bobugbubilz', title: 'BOBUGBUBILZ' },
  'azidahaka|330': { page: 330, id: 's330-azidahaka', title: 'AZI DAHAKA' },
  'consacrerdeconsacrer|296': { page: 296, id: 's296-consacrerdeconsacrer', title: 'Consacrer/Deconsacrer' },
};

function page(id, title, tag) {
  const el = tag || 'h3';
  const cls = tag === 'h2' ? 'patron-title' : 'spell-title';
  return '<section class="page" data-page="' + id + '" id="page-' + id + '">' +
    '<div class="page-head"><span class="page-num">Page ' + id + '</span>' +
    '<button type="button" class="page-img-btn" data-img="' + id + '">◱</button></div>' +
    '<' + el + ' class="' + cls + '" id="s' + id + '-' + title.toLowerCase().replace(/[^a-z]+/g, '') + '">' +
    title + '</' + el + '>' +
    '<div class="stats"><span class="stat"><b>Niveau</b> 1</span></div>' +
    '<div class="table-wrap"><table class="data results-tbl"><tbody>' +
    '<tr><td class="range">12</td><td class="cell"><p>Résultat.</p></td></tr>' +
    '</tbody></table></div></section>';
}

const PAGES = {
  132: page(132, 'Charme-Personne'),
  141: page(141, 'Invoquer un Patron'),
  143: page(143, 'Lier un Patron'),
  202: page(202, 'Sort voisin 202'),
  203: page(203, 'Boule de feu'),
  204: page(204, 'Sort voisin 204'),
  205: page(205, 'Sort voisin 205'),
  255: page(255, 'Bénédiction'),
  270: page(270, 'Charme-serpents'),
  322: page(322, 'BOBUGBUBILZ', 'h2'),
  330: page(330, 'AZI DAHAKA', 'h2'),
};

/* jsdom ne telecharge pas les <script src> : on repond avec les fixtures */
function patchHead(env, opts) {
  const head = env.document.head;
  const orig = head.appendChild;
  head.appendChild = function (node) {
    const res = orig.call(head, node);
    if (node && node.tagName === 'SCRIPT' && node.getAttribute('src')) {
      setTimeout(function () {
        if (opts.reader === false) {
          if (typeof node.onerror === 'function') node.onerror();
          return;
        }
        const src = node.getAttribute('src');
        if (/\/content\/anchors\.js$/.test(src)) {
          if (env.window.DCC_ANCHORS === undefined) env.window.DCC_ANCHORS = ANCHORS;
        } else {
          const m = /\/content\/(\d+)\.js$/.exec(src);
          const n = m ? parseInt(m[1], 10) : null;
          if (n && PAGES[n]) {
            env.window.DCC_PAGES = env.window.DCC_PAGES || {};
            env.window.DCC_PAGES[n] = PAGES[n];
          } else {
            if (typeof node.onerror === 'function') { node.onerror(); return; }
          }
        }
        if (typeof node.onload === 'function') node.onload();
      }, 0);
    }
    return res;
  };
}

function createHarness(opts) {
  const options = opts || {};
  const env = createEnv();
  const state = { modals: [], heads: [], fetchCalls: [] };
  const errors = [];
  try {
    env.dom.virtualConsole.on('jsdomError', function (e) {
      errors.push(String((e && e.message) || e));
    });
  } catch (e) { /* virtualConsole indisponible */ }

  env.window.showModal = function (o) {
    state.modals.push(o);
    return Promise.resolve(true);
  };
  env.window.bindAutoSave = function () {};
  env.window.scheduleSave = function () {};

  if (options.reader !== false) env.window.DCC_ANCHORS = options.anchors || ANCHORS;
  if (options.translations !== undefined) env.window.DCC_SPELL_TRANSLATIONS = options.translations;
  // jsdom n'expose pas fetch : par defaut on simule un lecteur sans traduction
  env.window.fetch = options.fetch
    ? function (url) { state.fetchCalls.push(String(url)); return options.fetch(url); }
    : undefined;
  patchHead(env, options);

  const origAppend = env.document.head.appendChild.bind(env.document.head);
  env.document.head.appendChild = function (node) {
    if (node && node.tagName === 'SCRIPT' && node.getAttribute('src')) {
      state.heads.push(node.getAttribute('src'));
    }
    return origAppend(node);
  };

  return { env, state, errors };
}

async function testResolution(r) {
  const h = createHarness();
  h.env.load('spell-reader.js');
  const R = h.env.window.DCCSpellReader;
  if (!r.ok(!!R, 'window.DCCSpellReader expose')) return;

  r.ok(h.env.document.documentElement.classList.contains('has-spell-reader'),
    'dossier frère détecté → classe has-spell-reader');
  r.ok(R.isAvailable(), 'index des ancres construit');

  r.eq(R.cleanName('Boule de feu 203'), 'Boule de feu', 'numéro de page retiré');
  r.eq(R.cleanName('Boule de feu (p. 203)'), 'Boule de feu', 'référence de page entre parenthèses retirée');
  r.eq(R.cleanName('Boule de feu page 203'), 'Boule de feu', '"page 203" retiré');
  r.eq(R.cleanName('  Charme-personne  '), 'Charme-personne', 'espaces normalisés');
  r.eq(R.cleanName(''), '', 'champ vide');
  r.eq(R.slugify('Charme-Personne'), 'charmepersonne', 'slugify accents/casse');
  r.eq(R.slugify('Oubli'), 'oubli', 'slugify simple');

  const hit = R.resolve('Boule de feu 203');
  r.ok(hit && hit.id === 's203-bouledefeu' && hit.page === 203,
    'résolution exacte avec numéro de page (got ' + JSON.stringify(hit) + ')');

  const hit2 = R.resolve('charme-serpent');
  r.ok(hit2 && hit2.id === 's270-charmeserpents',
    'singulier → pluriel (got ' + JSON.stringify(hit2) + ')');

  const hit3 = R.resolve('bénédiction 255');
  r.ok(hit3 && hit3.id === 's255-benediction', 'accents ignorés (got ' + JSON.stringify(hit3) + ')');

  const hit4 = R.resolve('Boule de feu');
  r.ok(hit4 && hit4.id === 's203-bouledefeu', 'résolution sans numéro de page');

  r.eq(R.resolve('Zorglub sort'), null, 'nom inconnu → null');
  r.eq(R.resolve(''), null, 'nom vide → null');

  const typo = R.resolve('Consacrer/Désaconsacrer');
  r.ok(typo && typo.id === 's296-consacrerdeconsacrer',
    'faute de frappe tolérée en dernier recours (got ' + JSON.stringify(typo) + ')');
  r.eq(R.resolve('Consacrer Zorglub'), null, 'nom très éloigné → toujours null (pas de fausse correspondance)');
}

async function testIcons(r) {
  // --- Mage : icône visible si nom rempli, masquée sinon, bascule a la saisie
  const h = createHarness();
  h.env.load('spell-reader.js');
  await h.env.window.DCCSpellReader.ensureReady();
  h.env.loadClass('mage');
  const container = h.env.document.getElementById('root');
  h.env.window.DCCModules.mage.render(container, '7', {
    sort_nom_1: 'Boule de feu 203',
    sort_nom_2: '',
  });

  // le module pousse toujours une ligne vierge en fin de tableau
  let btns = Array.prototype.slice.call(container.querySelectorAll('.sort-name .spell-lookup'));
  r.eq(btns.length, 3, 'mage : 1 icône par ligne de sort (got ' + btns.length + ')');
  if (btns.length === 3) {
    r.ok(!btns[0].hidden, 'mage : icône visible sur ligne renseignée');
    r.ok(btns[1].hidden, 'mage : icône masquée sur ligne vide');
  }

  const inputs = container.querySelectorAll('.sort-name input[data-key]');
  r.eq(inputs.length, 3, 'mage : 3 champs de nom (dont 1 vierge)');
  if (inputs.length === 3) {
    inputs[1].value = 'Charme-personne';
    input(inputs[1], h.env.window);
    r.ok(!btns[1].hidden, 'mage : icône apparait à la saisie');
    inputs[1].value = '';
    input(inputs[1], h.env.window);
    r.ok(btns[1].hidden, 'mage : icône disparait quand on vide le champ');
  }

  // --- Clerc : meme structure que mage/elfe (une ligne par sort, pas de note)
  const h2 = createHarness();
  h2.env.load('spell-reader.js');
  await h2.env.window.DCCSpellReader.ensureReady();
  h2.env.loadClass('clerc');
  const c2 = h2.env.document.getElementById('root');
  h2.env.window.DCCModules.clerc.render(c2, '3', { sort_1: 'Bénédiction' });

  const cells = c2.querySelectorAll('#clerc-spells-3 td.sort-name');
  r.eq(cells.length, 2, 'clerc : 2 lignes (1 remplie + 1 vide, got ' + cells.length + ')');
  if (cells.length === 2) {
    r.ok(!cells[0].querySelector('.spell-lookup').hidden, 'clerc : icône visible sur ligne renseignée');
    r.ok(cells[1].querySelector('.spell-lookup').hidden, 'clerc : icône masquée sur ligne vide');
  }

  // --- Elfe : lignes fixes + double recherche sur "Invoquer un Patron"
  const h3 = createHarness();
  h3.env.load('spell-reader.js');
  await h3.env.window.DCCSpellReader.ensureReady();
  h3.env.loadClass('elfe');
  const c3 = h3.env.document.getElementById('root');
  h3.env.window.DCCModules.elfe.render(c3, '9', { patron: 'Bobugbubilz' });

  const fixed = c3.querySelectorAll('td.sort-fixed .spell-lookup');
  r.eq(fixed.length, 3, 'elfe : 3 icônes sur les lignes fixes (got ' + fixed.length + ')');
  const lienBtn = c3.querySelector('td.sort-fixed .spell-lookup[data-name="Lier un patron"]');
  r.ok(!!lienBtn, 'elfe : icône sur "Lier un patron"');
  const invBtn = c3.querySelector('td.sort-fixed .spell-lookup[data-name="Invoquer un Patron"]');
  r.ok(!!invBtn, 'elfe : icône sort sur "Invoquer un Patron"');
  const patBtn = c3.querySelector('td.sort-fixed .spell-lookup-patron');
  r.ok(!!patBtn, 'elfe : icône patron sur "Invoquer un Patron"');
}

async function testPopup(r) {
  const h = createHarness();
  h.env.load('spell-reader.js');
  await h.env.window.DCCSpellReader.ensureReady();
  h.env.loadClass('mage');
  const container = h.env.document.getElementById('root');
  h.env.window.DCCModules.mage.render(container, '7', { sort_nom_1: 'Boule de feu 203' });

  const before = h.env.document.body.style.overflow;
  const btn = container.querySelector('.sort-name .spell-lookup');
  if (!r.ok(!!btn, 'icône présente pour l\'ouverture')) return;
  click(btn);

  const opened = await waitFor(function () {
    return !!h.env.document.querySelector('.spell-viewer-overlay .sv-pages [data-loaded-page="203"]');
  });
  r.ok(opened, 'popup ouverte avec la page 203 rendue');
  if (!opened) return;

  const overlay = h.env.document.querySelector('.spell-viewer-overlay');
  r.eq(overlay.querySelector('.spell-viewer-title').textContent, 'Boule de feu',
    'titre = nom de sort nettoyé');
  r.ok(!!overlay.querySelector('#s203-bouledefeu'), 'ancre du sort présente dans le DOM');
  r.ok(!!overlay.querySelector('.stats') && !!overlay.querySelector('table.data'),
    'stats et tableau de résultats rendus');
  r.ok(h.state.heads.indexOf('../dcc-spells-reader/content/203.js') !== -1,
    'chargement lazy de content/203.js (got ' + JSON.stringify(h.state.heads) + ')');
  r.eq(h.env.document.body.style.overflow, 'hidden', 'défilement de la fiche verrouillé');

  // fermeture via la croix
  click(overlay.querySelector('.spell-viewer-close'));
  await delay(20);
  r.ok(!h.env.document.querySelector('.spell-viewer-overlay'), 'popup fermée via la croix');
  r.eq(h.env.document.body.style.overflow, before, 'défilement de la fiche restauré');

  // réouverture : la page est déjà en cache (1 seul chargement)
  click(container.querySelector('.sort-name .spell-lookup'));
  const reopened = await waitFor(function () {
    return !!h.env.document.querySelector('.spell-viewer-overlay');
  });
  r.ok(reopened, 'popup rouverte');
  const loads = h.state.heads.filter(function (s) { return /content\/203\.js$/.test(s); });
  r.eq(loads.length, 1, 'page 203 chargée une seule fois (cache) (got ' + loads.length + ')');

  // fermeture par Échap
  h.env.document.dispatchEvent(new h.env.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
  await delay(20);
  r.ok(!h.env.document.querySelector('.spell-viewer-overlay'), 'popup fermée via Échap');
}

async function testUnknownSpell(r) {
  const h = createHarness();
  h.env.load('spell-reader.js');
  await h.env.window.DCCSpellReader.ensureReady();
  h.env.loadClass('mage');
  const container = h.env.document.getElementById('root');
  h.env.window.DCCModules.mage.render(container, '7', { sort_nom_1: 'Zorglub-Mégacode 99' });

  click(container.querySelector('.sort-name .spell-lookup'));
  const modalShown = await waitFor(function () { return h.state.modals.length > 0; });
  r.ok(modalShown, 'modale affichée pour un sort inconnu');
  if (modalShown) {
    r.eq(h.state.modals[0].title, 'Sort introuvable', 'titre de la modale');
    r.ok(h.state.modals[0].message.indexOf('Vérifiez le nom du sort') !== -1,
      'message demande de vérifier le nom (got ' + JSON.stringify(h.state.modals[0].message) + ')');
  }
  const popup = await waitFor(function () { return !!h.env.document.querySelector('.spell-viewer-overlay'); }, 200);
  r.ok(!popup, 'aucune popup pour un sort inconnu');
}

async function testPatron(r) {
  // patron renseigné
  const h = createHarness();
  h.env.load('spell-reader.js');
  await h.env.window.DCCSpellReader.ensureReady();
  h.env.loadClass('elfe');
  const container = h.env.document.getElementById('root');
  h.env.window.DCCModules.elfe.render(container, '9', { patron: 'Bobugbubilz' });

  const btn = container.querySelector('.spell-lookup-patron');
  if (r.ok(!!btn, 'icône patron présente')) {
    click(btn);
    const opened = await waitFor(function () {
      return !!h.env.document.querySelector('.spell-viewer-overlay .sv-pages [data-loaded-page="322"]');
    });
    r.ok(opened, 'popup des sorts du patron ouverte (page 322)');
    const overlay = h.env.document.querySelector('.spell-viewer-overlay');
    if (overlay) {
      r.eq(overlay.querySelector('.spell-viewer-title').textContent, 'Bobugbubilz', 'titre = nom du patron');
      r.ok(!!overlay.querySelector('#s322-bobugbubilz'), 'ancre du patron présente');
      click(overlay.querySelector('.spell-viewer-close'));
      await delay(20);
    }
  }

  // champ patron vide
  const h2 = createHarness();
  h2.env.load('spell-reader.js');
  await h2.env.window.DCCSpellReader.ensureReady();
  h2.env.loadClass('elfe');
  const c2 = h2.env.document.getElementById('root');
  h2.env.window.DCCModules.elfe.render(c2, '11', {});
  const btn2 = c2.querySelector('.spell-lookup-patron');
  if (r.ok(!!btn2, 'icône patron présente (champ vide)')) {
    click(btn2);
    const modalShown = await waitFor(function () { return h2.state.modals.length > 0; });
    r.ok(modalShown, 'modale si champ Patron(s) vide');
    if (modalShown) {
      r.ok(h2.state.modals[0].message.indexOf('Patron(s)') !== -1,
        'message invite à renseigner Patron(s) (got ' + JSON.stringify(h2.state.modals[0].message) + ')');
    }
  }

  // patron inconnu
  const h3 = createHarness();
  h3.env.load('spell-reader.js');
  await h3.env.window.DCCSpellReader.ensureReady();
  h3.env.loadClass('elfe');
  const c3 = h3.env.document.getElementById('root');
  h3.env.window.DCCModules.elfe.render(c3, '12', { patron: 'Krâsh-Typoxx' });
  const btn3 = c3.querySelector('.spell-lookup-patron');
  if (r.ok(!!btn3, 'icône patron présente (patron inconnu)')) {
    click(btn3);
    const modalShown = await waitFor(function () { return h3.state.modals.length > 0; });
    r.ok(modalShown, 'modale si patron inconnu');
    if (modalShown) {
      r.ok(h3.state.modals[0].title === 'Patron introuvable',
        'titre "Patron introuvable" (got ' + JSON.stringify(h3.state.modals[0].title) + ')');
    }
  }
}

/* ---------------------------------------------------------
   Plusieurs patrons dans « Patron(s) » : popup de sélection
   --------------------------------------------------------- */
async function testPatronPicker(r) {
  // --- découpage unitaire du champ
  const h0 = createHarness();
  h0.env.load('spell-reader.js');
  await h0.env.window.DCCSpellReader.ensureReady();
  const R = h0.env.window.DCCSpellReader;

  if (r.ok(typeof R.parsePatrons === 'function', 'DCCSpellReader.parsePatrons exposé')) {
    r.eq(R.parsePatrons('Bobugbubilz ; Azi Dahaka').length, 2, 'séparateur point-virgule');
    r.eq(R.parsePatrons('Bobugbubilz / Azi Dahaka').length, 2, 'séparateur slash');
    r.eq(R.parsePatrons('Bobugbubilz + Azi Dahaka').length, 2, 'séparateur +');
    r.eq(R.parsePatrons('Bobugbubilz et Azi Dahaka').length, 2, 'séparateur « et »');
    r.eq(R.parsePatrons('Bobugbubilz et Azi Dahaka et Sezrekan').length, 3, 'plusieurs « et »');
    r.eq(R.parsePatrons('Bobugbubilz, Azi Dahaka').length, 1,
      'la virgule ne sépare jamais (décision)');
    r.eq(R.parsePatrons('Ithha, prince élémentaire du vent').length, 1,
      'nom de patron contenant une virgule intact');
    r.eq(R.parsePatrons('Bobugbubilz ; bobugbubilz').length, 1, 'doublons retirés');
    r.eq(R.parsePatrons('  Bobugbubilz ;; Azi Dahaka ; ').length, 2, 'espaces et vides ignorés');
    r.eq(R.parsePatrons('').length, 0, 'champ vide → aucune entrée');
  }

  // --- deux patrons : étoile → popup de choix, puis description du choisi
  const h = createHarness();
  h.env.load('spell-reader.js');
  await h.env.window.DCCSpellReader.ensureReady();
  h.env.loadClass('elfe');
  const container = h.env.document.getElementById('root');
  h.env.window.DCCModules.elfe.render(container, '9', { patron: 'Bobugbubilz ; Azi Dahaka' });

  const btn = container.querySelector('.spell-lookup-patron');
  if (r.ok(!!btn, 'icône patron présente')) {
    click(btn);
    const pickShown = await waitFor(function () {
      return !!h.env.document.querySelector('.patron-pick-overlay');
    });
    r.ok(pickShown, 'popup de sélection ouverte (2 patrons)');
    if (pickShown) {
      r.ok(!h.env.document.querySelector('.spell-viewer-overlay'),
        'description pas encore ouverte avant le choix');
      const items = h.env.document.querySelectorAll('.patron-pick-item');
      r.eq(items.length, 2, 'deux patrons proposés (got ' + items.length + ')');
      r.eq(items[0].textContent, 'Bobugbubilz', 'libellé 1 = texte saisi');
      r.eq(items[1].textContent, 'Azi Dahaka', 'libellé 2 = texte saisi');
      r.ok(!items[1].classList.contains('is-unresolved'), 'patron connu non grisé');

      click(items[1]);
      const opened = await waitFor(function () {
        return !!h.env.document.querySelector('.spell-viewer-overlay .sv-pages [data-loaded-page="330"]');
      });
      r.ok(opened, 'description du patron choisi ouverte (page 330)');
      r.ok(!h.env.document.querySelector('.patron-pick-overlay'),
        'popup de sélection refermée après le choix');
      const overlay = h.env.document.querySelector('.spell-viewer-overlay');
      if (overlay) {
        r.eq(overlay.querySelector('.spell-viewer-title').textContent, 'Azi Dahaka',
          'titre = patron choisi');
        r.ok(!!overlay.querySelector('#s330-azidahaka'), 'ancre du patron présente');
        click(overlay.querySelector('.spell-viewer-close'));
        await delay(20);
      }
    }
  }

  // --- patron inconnu : proposé, grisé, modale au clic
  const h2 = createHarness();
  h2.env.load('spell-reader.js');
  await h2.env.window.DCCSpellReader.ensureReady();
  h2.env.loadClass('elfe');
  const c2 = h2.env.document.getElementById('root');
  h2.env.window.DCCModules.elfe.render(c2, '11', { patron: 'Bobugbubilz ; Krâsh-Typoxx' });
  const btn2 = c2.querySelector('.spell-lookup-patron');
  if (r.ok(!!btn2, 'icône patron présente (patron inconnu)')) {
    click(btn2);
    const pickShown = await waitFor(function () {
      return !!h2.env.document.querySelector('.patron-pick-overlay');
    });
    r.ok(pickShown, 'popup de sélection ouverte (mélange valable/invalide)');
    if (pickShown) {
      const items = h2.env.document.querySelectorAll('.patron-pick-item');
      r.eq(items.length, 2, 'les deux entrées sont proposées (got ' + items.length + ')');
      r.ok(!items[0].classList.contains('is-unresolved'), 'patron résolu non grisé');
      r.ok(items[1].classList.contains('is-unresolved'), 'patron inconnu grisé');

      click(items[1]);
      const modalShown = await waitFor(function () { return h2.state.modals.length > 0; });
      r.ok(modalShown, 'modale après clic sur l\'entrée grise');
      if (modalShown) {
        r.ok(h2.state.modals[0].title === 'Patron introuvable',
          'titre "Patron introuvable" (got ' + JSON.stringify(h2.state.modals[0].title) + ')');
        r.ok(h2.state.modals[0].message.indexOf('Krâsh-Typoxx') !== -1,
          'le nom saisi figure dans le message');
      }
      r.ok(!h2.env.document.querySelector('.patron-pick-overlay'),
        'popup de sélection refermée');
      r.ok(!h2.env.document.querySelector('.spell-viewer-overlay'),
        'aucune description ouverte pour une entrée inconnue');
    }
  }

  // --- fermeture sans choix : Echap puis croix
  const h3 = createHarness();
  h3.env.load('spell-reader.js');
  await h3.env.window.DCCSpellReader.ensureReady();
  h3.env.loadClass('elfe');
  const c3 = h3.env.document.getElementById('root');
  h3.env.window.DCCModules.elfe.render(c3, '12', { patron: 'Bobugbubilz ; Azi Dahaka' });
  const btn3 = c3.querySelector('.spell-lookup-patron');
  if (r.ok(!!btn3, 'icône patron présente (fermeture)')) {
    click(btn3);
    const opened1 = await waitFor(function () {
      return !!h3.env.document.querySelector('.patron-pick-overlay');
    });
    if (opened1) {
      h3.env.document.dispatchEvent(
        new h3.env.window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
      r.ok(!h3.env.document.querySelector('.patron-pick-overlay'), 'Echap ferme la sélection');

      click(btn3);
      const opened2 = await waitFor(function () {
        return !!h3.env.document.querySelector('.patron-pick-overlay');
      });
      if (opened2) {
        click(h3.env.document.querySelector('.patron-pick-close'));
        r.ok(!h3.env.document.querySelector('.patron-pick-overlay'), 'croix ferme la sélection');
      }
    }
    r.ok(!h3.env.document.querySelector('.spell-viewer-overlay'),
      'aucune description ouverte si on ferme sans choisir');
    r.eq(h3.state.modals.length, 0, 'aucune modale si on ferme sans choisir (got '
      + h3.state.modals.length + ')');
  }

  // --- une seule entrée après nettoyage : ouverture directe, sans sélection
  const h4 = createHarness();
  h4.env.load('spell-reader.js');
  await h4.env.window.DCCSpellReader.ensureReady();
  h4.env.loadClass('elfe');
  const c4 = h4.env.document.getElementById('root');
  h4.env.window.DCCModules.elfe.render(c4, '13', { patron: 'Bobugbubilz ;' });
  const btn4 = c4.querySelector('.spell-lookup-patron');
  if (r.ok(!!btn4, 'icône patron présente (un seul patron)')) {
    click(btn4);
    const opened = await waitFor(function () {
      return !!h4.env.document.querySelector('.spell-viewer-overlay .sv-pages [data-loaded-page="322"]');
    });
    r.ok(opened, 'un seul patron : ouverture directe (page 322)');
    r.ok(!h4.env.document.querySelector('.patron-pick-overlay'),
      'aucune popup de sélection pour un seul patron');
    const overlay = h4.env.document.querySelector('.spell-viewer-overlay');
    if (overlay) {
      click(overlay.querySelector('.spell-viewer-close'));
      await delay(20);
    }
  }
}

async function testWithoutReader(r) {
  const h = createHarness({ reader: false });
  h.env.load('spell-reader.js');
  await delay(60);

  const R = h.env.window.DCCSpellReader;
  r.ok(!!R, 'module chargé même sans lecteur');
  r.ok(!h.env.document.documentElement.classList.contains('has-spell-reader'),
    'dossier frère absent → classe has-spell-reader absente');
  r.ok(!R.isAvailable(), 'index non construit');
  r.eq(R.resolve('Boule de feu'), null, 'résolution impossible sans lecteur');

  h.env.loadClass('mage');
  const container = h.env.document.getElementById('root');
  h.env.window.DCCModules.mage.render(container, '7', { sort_nom_1: 'Boule de feu' });
  const btn = container.querySelector('.sort-name .spell-lookup');
  if (r.ok(!!btn, 'bouton présent dans le DOM (masqué par le CSS)')) {
    r.ok(!btn.hidden, 'bouton non marqué hidden (la gâchette est CSS : has-spell-reader)');
    click(btn);
    const popup = await waitFor(function () {
      return !!h.env.document.querySelector('.spell-viewer-overlay');
    }, 250);
    r.ok(!popup, 'aucune popup sans lecteur');
  }
}

/* ---------------------------------------------------------
   Traductions FR <-> EN (spell-translation.js du dossier frère)
   --------------------------------------------------------- */
const TRADUCTIONS = {
  'Boule de feu': 'Fireball',
  'Bénédiction': 'Blessing',
  'Projectile magique': 'Magic Missile',
  'Invoquer un Patron': 'Invoke Patron',
};

async function testTranslations(r) {
  const h = createHarness({ translations: TRADUCTIONS });
  h.env.load('spell-reader.js');
  const R = h.env.window.DCCSpellReader;
  await R.ensureReady();

  r.eq(R.translate('Fireball'), 'Boule de feu', 'nom anglais → nom français');
  r.eq(R.translate('magic missile'), 'Projectile magique', 'casse ignorée dans la traduction');
  r.eq(R.translate('Boule de feu'), null, 'nom français : aucune traduction anglaise attendue');

  const hit = R.resolve('Fireball');
  r.ok(hit && hit.id === 's203-bouledefeu' && hit.page === 203,
    'Fireball → Boule de feu (got ' + JSON.stringify(hit) + ')');

  const hit2 = R.resolve('Fireball 203');
  r.ok(hit2 && hit2.id === 's203-bouledefeu',
    'numéro de page retiré avant la traduction (got ' + JSON.stringify(hit2) + ')');

  const hit3 = R.resolve('Blessing');
  r.ok(hit3 && hit3.id === 's255-benediction',
    'Blessing → Bénédiction (got ' + JSON.stringify(hit3) + ')');

  r.ok(R.resolve('Boule de feu'), 'nom français inchangé par la traduction');
  r.ok(R.resolve('charme-serpent'), 'singulier/pluriel toujours fonctionnel');

  const typo = R.resolve('Firebal');
  r.ok(typo && typo.id === 's203-bouledefeu',
    'faute de frappe sur un nom anglais tolérée (got ' + JSON.stringify(typo) + ')');

  r.eq(R.resolve('Teleport'), null, 'nom anglais inconnu → null');
}

async function testPopupWithEnglishName(r) {
  const h = createHarness({ translations: TRADUCTIONS });
  h.env.load('spell-reader.js');
  await h.env.window.DCCSpellReader.ensureReady();
  h.env.loadClass('mage');
  const container = h.env.document.getElementById('root');
  h.env.window.DCCModules.mage.render(container, '7', { sort_nom_1: 'Fireball' });

  const btn = container.querySelector('.sort-name .spell-lookup');
  if (!r.ok(!!btn, 'icône présente pour un nom anglais')) return;
  click(btn);
  const opened = await waitFor(function () {
    return !!h.env.document.querySelector('.spell-viewer-overlay .sv-pages [data-loaded-page="203"]');
  });
  r.ok(opened, 'popup ouverte depuis un nom anglais');
  if (!opened) return;

  const overlay = h.env.document.querySelector('.spell-viewer-overlay');
  r.eq(overlay.querySelector('.spell-viewer-title').textContent, 'Boule de feu',
    'titre = nom français du livre');
  const sub = overlay.querySelector('.spell-viewer-sub');
  r.ok(!sub.hidden && sub.textContent === 'Fireball',
    'sous-titre = nom anglais saisi (got ' + JSON.stringify(sub.textContent) + ')');
  click(overlay.querySelector('.spell-viewer-close'));
  await delay(20);

  // nom français : aucun sous-titre
  const h2 = createHarness({ translations: TRADUCTIONS });
  h2.env.load('spell-reader.js');
  await h2.env.window.DCCSpellReader.ensureReady();
  h2.env.loadClass('mage');
  const c2 = h2.env.document.getElementById('root');
  h2.env.window.DCCModules.mage.render(c2, '8', { sort_nom_1: 'Boule de feu' });
  const btn2 = c2.querySelector('.sort-name .spell-lookup');
  if (!r.ok(!!btn2, 'icône présente (nom français)')) return;
  click(btn2);
  const opened2 = await waitFor(function () {
    return !!h2.env.document.querySelector('.spell-viewer-overlay .sv-pages [data-loaded-page="203"]');
  });
  if (opened2) {
    const ov2 = h2.env.document.querySelector('.spell-viewer-overlay');
    r.eq(ov2.querySelector('.spell-viewer-title').textContent, 'Boule de feu', 'titre français');
    r.ok(ov2.querySelector('.spell-viewer-sub').hidden,
      'pas de sous-titre quand la saisie est déjà en français');
    click(ov2.querySelector('.spell-viewer-close'));
    await delay(20);
  }
}

async function testTranslationLoading(r) {
  const SRC = 'export const spellTranslations = {\n' +
    '  // Mage\n' +
    '  "Projectile magique": "Magic Missile",\n' +
    '  "Bénédiction": "Blessing"\n' +
    '};';
  const h = createHarness({
    fetch: function () {
      return Promise.resolve({ ok: true, text: function () { return Promise.resolve(SRC); } });
    },
  });
  h.env.load('spell-reader.js');
  const R = h.env.window.DCCSpellReader;
  await R.ensureReady();

  r.eq(h.state.fetchCalls.length, 1, 'une seule requête pour les traductions (got ' + h.state.fetchCalls.length + ')');
  r.ok(/spell-translation\.js$/.test(h.state.fetchCalls[0] || ''),
    'URL du fichier de traduction (got ' + JSON.stringify(h.state.fetchCalls[0]) + ')');
  r.eq(R.translate('Magic Missile'), 'Projectile magique', 'module ES parsé depuis le texte');
  r.ok(R.resolve('Blessing') && R.resolve('Blessing').id === 's255-benediction',
    'résolution via le fichier chargé');

  // échec du chargement : le lecteur reste utilisable, sans traduction
  const h2 = createHarness({ fetch: function () { return Promise.reject(new Error('404')); } });
  h2.env.load('spell-reader.js');
  await h2.env.window.DCCSpellReader.ensureReady();
  r.ok(h2.env.window.DCCSpellReader.isAvailable(), 'lecteur disponible malgré l\'échec des traductions');
  r.eq(h2.env.window.DCCSpellReader.translate('Fireball'), null, 'aucune traduction après échec');
}

async function testWithoutTranslations(r) {
  const h = createHarness();
  h.env.load('spell-reader.js');
  const R = h.env.window.DCCSpellReader;
  await R.ensureReady();

  r.ok(R.isAvailable(), 'lecteur disponible sans fichier de traduction');
  r.eq(h.state.fetchCalls.length, 0, 'aucune requête sans fetch (got ' + h.state.fetchCalls.length + ')');
  r.eq(R.resolve('Fireball'), null, 'nom anglais non résolu sans traduction');

  h.env.loadClass('mage');
  const container = h.env.document.getElementById('root');
  h.env.window.DCCModules.mage.render(container, '7', { sort_nom_1: 'Fireball' });
  const btn = container.querySelector('.sort-name .spell-lookup');
  if (!r.ok(!!btn, 'icône présente')) return;
  click(btn);
  const modalShown = await waitFor(function () { return h.state.modals.length > 0; });
  r.ok(modalShown, 'modale affichée pour un nom anglais sans traduction');
  if (modalShown) {
    r.eq(h.state.modals[0].title, 'Sort introuvable', 'titre de la modale');
    r.ok(h.state.modals[0].message.indexOf('Vérifiez le nom du sort') !== -1,
      'message demande de vérifier le nom (got ' + JSON.stringify(h.state.modals[0].message) + ')');
    r.ok(h.state.modals[0].message.indexOf('anglais') === -1,
      'pas de mention de l\'anglais sans fichier de traduction');
  }
}

/* ---------------------------------------------------------
   Calage de l'ancre (scroll) : jsdom ne calcule pas la mise en
   page - on la simule : chaque page = pageHeight px, le titre du
   sort est situe a anchorOffset px dans sa page, le conteneur
   scrollable est .spell-viewer-body.
   --------------------------------------------------------- */
function fakeLayout(env, opts) {
  const options = opts || {};
  const model = {
    pageHeight: options.pageHeight || 1000,
    anchorOffset: options.anchorOffset || 40,
  };
  const proto = env.window.Element.prototype;
  const doc = env.document;

  function viewerBody() { return doc.querySelector('.spell-viewer-body'); }
  function pagesBox() { return doc.querySelector('.sv-pages'); }
  function scrollTop() { const b = viewerBody(); return b ? b.scrollTop : 0; }

  function contentTop(el) {
    if (el.classList.contains('sv-sentinel-top')) return 0;
    if (el.classList.contains('sv-sentinel-bottom')) {
      const p = pagesBox();
      return p ? p.children.length * model.pageHeight : 0;
    }
    const page = el.closest('[data-loaded-page]');
    if (page) {
      const p = pagesBox();
      const idx = p ? Array.prototype.indexOf.call(p.children, page) : 0;
      return idx * model.pageHeight + (el.classList.contains('spell-title') ? model.anchorOffset : 0);
    }
    return 0;
  }

  Object.defineProperty(proto, 'clientHeight', { configurable: true, get: function () { return 900; } });
  Object.defineProperty(proto, 'scrollTop', {
    configurable: true,
    get: function () { return this.__scrollTop || 0; },
    set: function (v) { this.__scrollTop = v; },
  });
  Object.defineProperty(proto, 'scrollHeight', {
    configurable: true,
    get: function () {
      if (!this.classList || !this.classList.contains('spell-viewer-body')) return 0;
      const p = pagesBox();
      const st = this.querySelector('.sv-status');
      // hauteur reelle du bloc "Chargement..." (padding 10+10, 12px x 1.5)
      const status = st && !st.hidden ? 38 : 0;
      return (p ? p.children.length : 0) * model.pageHeight + status;
    },
  });
  Object.defineProperty(proto, 'getBoundingClientRect', {
    configurable: true,
    value: function () {
      const isBody = this.classList && this.classList.contains('spell-viewer-body');
      const top = isBody ? 0 : contentTop(this) - scrollTop();
      const h = (this.classList && this.classList.contains('spell-title')) ? 24 : 1;
      return { top: top, bottom: top + h, left: 0, right: 320, width: 320, height: h };
    },
  });

  // Google Fonts : promesse que l'on resout a la demande (display=swap)
  let resolveFonts;
  doc.fonts = { ready: new Promise(function (res) { resolveFonts = res; }) };
  model.resolveFonts = function () { resolveFonts(); };
  return model;
}

function loadedPages(doc) {
  const nodes = doc.querySelectorAll('.spell-viewer-overlay .sv-pages > [data-loaded-page]');
  return Array.prototype.map.call(nodes, function (n) { return n.getAttribute('data-loaded-page'); });
}

async function openMageSpell(h, name) {
  h.env.loadClass('mage');
  const container = h.env.document.getElementById('root');
  h.env.window.DCCModules.mage.render(container, '7', { sort_nom_1: name });
  const btn = container.querySelector('.sort-name .spell-lookup');
  if (!btn) return null;
  click(btn);
  const opened = await waitFor(function () {
    return h.env.document.querySelectorAll('.spell-viewer-overlay .sv-pages > [data-loaded-page]').length > 0;
  });
  return opened ? h.env.document.querySelector('.spell-viewer-body') : null;
}

async function testAnchorAlignment(r) {
  // Le sort est en haut de page : la page precedente est inseree au-dessus.
  // Le scrollTop final doit correspondre exactement a la position du titre,
  // sans le decalage ajoute par le bloc "Chargement...".
  const h = createHarness();
  h.env.load('spell-reader.js');
  await h.env.window.DCCSpellReader.ensureReady();
  const layout = fakeLayout(h.env);

  const body = await openMageSpell(h, 'Boule de feu 203');
  if (!r.ok(!!body, 'popup ouverte')) return;
  const pages = await waitFor(function () { return loadedPages(h.env.document).length >= 2; }, 1500);
  r.ok(pages, 'page precedente inseree au-dessus (got ' + loadedPages(h.env.document).join(',') + ')');
  if (!pages) return;

  r.eq(loadedPages(h.env.document).slice(0, 2).join(','), '202,203', 'ordre des pages');
  const expected = layout.pageHeight + layout.anchorOffset; // 1 page au-dessus + offset du titre
  r.eq(body.scrollTop, expected,
    'scrollTop calé exactement sur le titre, sans derive (got ' + body.scrollTop + ', attendu ' + expected + ')');
}

async function testAnchorAfterFonts(r) {
  // Substitution de police (Google Fonts display=swap) apres le scroll :
  // le titre bouge, l'ancre doit etre recalcée si l'utilisateur n'a pas defile.
  const h = createHarness();
  h.env.load('spell-reader.js');
  await h.env.window.DCCSpellReader.ensureReady();
  const layout = fakeLayout(h.env);

  const body = await openMageSpell(h, 'Boule de feu 203');
  if (!r.ok(!!body, 'popup ouverte')) return;
  // On attend la fin du chargement initial (page precedente + page du sort) :
  // mesurer avant ferait entrer la compensation de loadUp() dans l'ecart attendu.
  const aligned = await waitFor(function () { return loadedPages(h.env.document).length >= 2; }, 1500);
  if (!aligned) { r.ok(false, 'page rendue'); return; }
  await delay(30);

  const before = body.scrollTop;
  const oldOffset = layout.anchorOffset;
  layout.anchorOffset = 300;   // le changement de police a deplace le titre
  layout.resolveFonts();
  await delay(30);
  const expected = before + (300 - oldOffset);
  r.eq(body.scrollTop, expected,
    'ancre recalée apres chargement des polices (got ' + body.scrollTop + ', attendu ' + expected + ')');
}

async function testNoReanchorAfterUserScroll(r) {
  // Si l'utilisateur a deja fait defiler, un nouveau recalage (polices,
  // insertion au-dessus) ne doit surtout pas le ramener au sort.
  const h = createHarness();
  h.env.load('spell-reader.js');
  await h.env.window.DCCSpellReader.ensureReady();
  const layout = fakeLayout(h.env);

  const body = await openMageSpell(h, 'Boule de feu 203');
  if (!r.ok(!!body, 'popup ouverte')) return;
  // Meme stabilisation que ci-dessus : la page precedente ne doit plus bouger
  // une fois l'utilisateur defile.
  const aligned = await waitFor(function () { return loadedPages(h.env.document).length >= 2; }, 1500);
  if (!aligned) { r.ok(false, 'page rendue'); return; }
  await delay(30);

  const before = body.scrollTop;
  body.scrollTop = before + 500;   // l'utilisateur a fait glisser la lecture
  layout.anchorOffset = 300;
  layout.resolveFonts();
  await delay(30);
  r.eq(body.scrollTop, before + 500,
    'aucun recalage force apres un scroll utilisateur (got ' + body.scrollTop + ')');
}

async function run() {
  const r = createReporter('09-spell-reader');
  await testResolution(r);
  await testIcons(r);
  await testPopup(r);
  await testUnknownSpell(r);
  await testPatron(r);
  await testPatronPicker(r);
  await testWithoutReader(r);
  await testTranslations(r);
  await testPopupWithEnglishName(r);
  await testTranslationLoading(r);
  await testWithoutTranslations(r);
  await testAnchorAlignment(r);
  await testAnchorAfterFonts(r);
  await testNoReanchorAfterUserScroll(r);
  return r;
}

module.exports = run;
