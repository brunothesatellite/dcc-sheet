'use strict';

/* Consultation des définitions de sorts (dossier frère dcc-spells-reader)
   - détection du dossier frère par chargement de content/anchors.js ;
   - icône de recherche à gauche des noms de sorts renseignés (mage/elfe/clerc) ;
   - résolution du nom (numéro de page ignoré, singulier/pluriel, accents) ;
   - noms saisis en anglais → traduction via spell-translation.js (FR/EN) ;
   - popup plein écran avec chargement de la page du sort + ancre ;
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
  203: page(203, 'Boule de feu'),
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

  // --- Clerc : icône dans la cellule de la grille
  const h2 = createHarness();
  h2.env.load('spell-reader.js');
  await h2.env.window.DCCSpellReader.ensureReady();
  h2.env.loadClass('clerc');
  const c2 = h2.env.document.getElementById('root');
  h2.env.window.DCCModules.clerc.render(c2, '3', { sort_1: 'Bénédiction' });

  const cells = c2.querySelectorAll('.sort-cell');
  r.eq(cells.length, 2, 'clerc : 2 cellules (1 remplie + 1 vide, got ' + cells.length + ')');
  if (cells.length === 2) {
    r.ok(!cells[0].querySelector('.spell-lookup').hidden, 'clerc : icône visible sur cellule renseignée');
    r.ok(cells[1].querySelector('.spell-lookup').hidden, 'clerc : icône masquée sur cellule vide');
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

async function run() {
  const r = createReporter('09-spell-reader');
  await testResolution(r);
  await testIcons(r);
  await testPopup(r);
  await testUnknownSpell(r);
  await testPatron(r);
  await testWithoutReader(r);
  await testTranslations(r);
  await testPopupWithEnglishName(r);
  await testTranslationLoading(r);
  await testWithoutTranslations(r);
  return r;
}

module.exports = run;
