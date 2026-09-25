'use strict';

/* Popup portraits : filtrage des sources dont le dossier est absent du serveur.
   - api/icons.php liste les sous-dossiers reels de icons/ (1 requête / session) ;
   - une source dont le dossier manque n'apparait pas dans la grille ;
   - echec de l'endpoint → aucune source masquee (affichage complet) ;
   - les index de clic restent ceux du catalogue complet (portrait_index) ;
   - le cache evite un 2e appel a la 2e ouverture. */

const { createReporter } = require('./helpers/assert');
const { createEnv, read, delay } = require('./helpers/env');

async function waitFor(cond, timeout) {
  const t = timeout || 6000;
  const start = Date.now();
  for (;;) {
    let okNow = false;
    try { okNow = cond(); } catch (e) { okNow = false; }
    if (okNow) return true;
    if (Date.now() - start > t) return false;
    await delay(25);
  }
}

function bodyWithoutScripts() {
  const html = read('index.html');
  return html
    .replace(/^[\s\S]*?<body[^>]*>/i, '')
    .replace(/<\/body>[\s\S]*$/i, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');
}

const CATALOGS = [
  'dcc-icons.js',
  'dd-red-box-icons.js',
  'shadow-icons.js',
  'shadowdark-icons.js',
  'comics-icons.js',
  'gonzo-icons.js',
  'osr-icons.js',
  'portrait-icons.js',
];

const ALL_DIRS = ['dd-red-box', 'dcc-pc-tokens', 'gonzo', 'jeff-stevens', 'osr', 'shadow', 'shadowdark'];

function click(el) {
  el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
}

/* jsdom ne telecharge pas les <script src> dynamiques : on intercepte
   head.appendChild et on execute le fichier via env.load puis onload. */
function patchHead(env) {
  const head = env.document.head;
  const orig = head.appendChild;
  head.appendChild = function (node) {
    const res = orig.call(head, node);
    if (node && node.tagName === 'SCRIPT') {
      const src = node.getAttribute('src');
      if (src) {
        setTimeout(function () {
          try { env.load(src); } catch (e) { /* fichier absent */ }
          if (typeof node.onload === 'function') node.onload();
        }, 0);
      }
    }
    return res;
  };
}

function createHarness(opts) {
  const env = createEnv();
  const errors = [];
  try {
    env.dom.virtualConsole.on('jsdomError', function (e) {
      errors.push(String((e && e.message) || e));
    });
  } catch (e) { /* virtualConsole indisponible */ }

  env.document.body.innerHTML = bodyWithoutScripts();
  env.window.localStorage.setItem('dcc-active-tab', 'clerc');

  const state = {
    dirs: (opts && opts.dirs !== undefined) ? opts.dirs : ALL_DIRS,
    iconsFetches: 0,
    chars: [
      { id: 46, name: 'Travok', class: 'clerc', is_active: 1, data: '{}' },
    ],
  };

  env.window.fetch = async function (url, opts2) {
    const u = String(url);
    const method = (opts2 && opts2.method) || 'GET';
    let body = null;
    if (opts2 && opts2.body) {
      try { body = JSON.parse(opts2.body); } catch (e) { body = null; }
    }
    const qs = u.indexOf('?') !== -1 ? u.slice(u.indexOf('?') + 1) : '';
    const params = new URLSearchParams(qs);
    const action = (body && body.action) || params.get('action');
    let data = { ok: true };

    if (u.indexOf('api/icons.php') !== -1) {
      state.iconsFetches += 1;
      if (state.dirs === null) {
        return { ok: false, json: async function () { return { error: 'boom' }; } };
      }
      data = { ok: true, dirs: state.dirs };
    } else if (u.indexOf('api/auth.php') !== -1) {
      if (action === 'check') {
        data = { ok: true, logged_in: true, pseudo: 'Toto', id: 1 };
      }
    } else if (u.indexOf('api/characters.php') !== -1) {
      if (action === 'list') {
        data = { ok: true, characters: state.chars };
      } else if (action === 'get') {
        data = { ok: true, character: state.chars[0] };
      }
    }

    return { ok: true, json: async function () { return data; } };
  };

  patchHead(env);

  function loadAll() {
    CATALOGS.forEach(function (f) { env.load(f); });
    env.load('marching-order.js');
    env.load('script.js');
  }

  function sectionLabels() {
    return Array.prototype.slice
      .call(env.document.querySelectorAll('.portrait-picker-section-title'))
      .map(function (el) { return el.textContent; })
      .filter(function (t) { return t; });
  }

  function pickerImgs() {
    return Array.prototype.slice.call(env.document.querySelectorAll('.portrait-picker-img'));
  }

  function errorsSuffix() {
    return errors.length ? ' (erreurs jsdom: ' + errors.slice(0, 3).join(' // ') + ')' : '';
  }

  return { env, state, errors, loadAll, sectionLabels, pickerImgs, errorsSuffix };
}

async function waitForSheet(h) {
  const shown = await waitFor(function () {
    const img = h.env.document.querySelector('.portrait-area [data-portrait-img]');
    return img && img.getAttribute('src');
  }, 6000);
  return shown;
}

async function testFilteredSource(r) {
  const h = createHarness({ dirs: ALL_DIRS.filter(function (d) { return d !== 'dcc-pc-tokens'; }) });
  h.loadAll();

  const sheetReady = await waitForSheet(h);
  r.ok(sheetReady, 'fiche clerc rendue avec portrait' + h.errorsSuffix());

  const img = h.env.document.querySelector('.portrait-area [data-portrait-img]');
  if (!img) return;

  // index initial : source dcc conservee dans les champs caches
  const srcInput = h.env.document.querySelector('.portrait-area input[data-key$="-portrait_source"]');
  const idxInput = h.env.document.querySelector('.portrait-area input[data-key$="-portrait_index"]');
  r.eq(srcInput.value, 'dcc', 'source initiale dcc');
  r.eq(img.getAttribute('src').indexOf('icons/dcc-pc-tokens/'), 0, 'portrait dcc applique (comportement persos inchange)');

  // ouverture de la popup
  click(img);
  const opened = await waitFor(function () {
    return !!h.env.document.querySelector('.portrait-picker-overlay');
  }, 6000);
  r.ok(opened, 'popup portraits ouverte' + h.errorsSuffix());
  if (!opened) return;

  r.eq(h.state.iconsFetches, 1, '1 appel api/icons.php a l\'ouverture');

  // dcc-pc-tokens absent → section DCC masquee, les autres presentes
  const labels = h.sectionLabels();
  r.eq(labels.indexOf('Dungeon Crawl Classics'), -1, 'section DCC masquee (dossier absent)');
  r.ok(labels.indexOf('Gonzo') !== -1, 'section Gonzo presente');
  r.ok(labels.indexOf('Shadowdark') !== -1, 'section Shadowdark presente');
  r.eq(labels.length, 6, '6 sections visibles sur 7 (got ' + labels.length + ')');

  const imgs = h.pickerImgs();
  r.ok(imgs.length > 0, 'grille non vide');
  const dccImgs = imgs.filter(function (i) {
    return (i.getAttribute('src') || '').indexOf('icons/dcc-pc-tokens/') === 0;
  });
  r.eq(dccImgs.length, 0, 'aucune image dcc-pc-tokens dans la grille');

  // 7 sources - dcc : le reste du catalogue est intact
  let expected = 0;
  h.env.window.PortraitSources.forEach(function (ps) {
    if (ps.meta.key === 'dcc') return;
    const e = ps.clerc;
    if (Array.isArray(e)) expected += e.length;
    else if (typeof e === 'string') expected += 1;
  });
  r.eq(imgs.length, expected, 'toutes les images des sources presentes affichees (got ' + imgs.length + ', expected ' + expected + ')');

  // clic sur gonzo index 2 : l'index reste celui du catalogue complet
  const target = imgs.filter(function (i) {
    return i.getAttribute('src') === 'icons/gonzo/11_clerc_homme.png';
  })[0];
  r.ok(!!target, 'image gonzo [2] presente');
  if (target) {
    click(target);
    const closed = await waitFor(function () {
      return !h.env.document.querySelector('.portrait-picker-overlay');
    }, 6000);
    r.ok(closed, 'popup fermee apres selection');
    // la mise a jour passe par une chaine de promesses : attendre la valeur
    const updated = await waitFor(function () { return srcInput.value === 'gonzo'; }, 6000);
    r.ok(updated, 'selection appliquee au perso');
    r.eq(srcInput.value, 'gonzo', 'source mise a jour');
    r.eq(idxInput.value, '2', 'index preserve malgre le filtrage');
    r.eq(img.getAttribute('src'), 'icons/gonzo/11_clerc_homme.png', 'portrait applique');

    // 2e ouverture : cache (pas de 2e requete)
    click(img);
    const reopened = await waitFor(function () {
      return !!h.env.document.querySelector('.portrait-picker-overlay');
    }, 6000);
    r.ok(reopened, 'popup rouverte');
    r.eq(h.state.iconsFetches, 1, 'cache : toujours 1 seul appel api/icons.php');
    const labels2 = h.sectionLabels();
    r.eq(labels2.indexOf('Dungeon Crawl Classics'), -1, 'toujours filtre a la 2e ouverture');
    r.eq(labels2.length, 6, '6 sections a la 2e ouverture');

    // fermeture via le bouton du footer
    const footerBtn = h.env.document.querySelector('.portrait-picker-footer-btn');
    r.ok(!!footerBtn, 'bouton Fermer present');
    if (footerBtn) {
      click(footerBtn);
      await delay(30);
      r.ok(!h.env.document.querySelector('.portrait-picker-overlay'), 'popup fermee via Fermer');
    }
  }
}

async function testEndpointFailure(r) {
  const h = createHarness({ dirs: null }); // echec api/icons.php
  h.loadAll();

  const sheetReady = await waitForSheet(h);
  r.ok(sheetReady, 'fiche clerc rendue (endpoint en echec)' + h.errorsSuffix());

  const img = h.env.document.querySelector('.portrait-area [data-portrait-img]');
  if (!img) return;

  click(img);
  const opened = await waitFor(function () {
    return !!h.env.document.querySelector('.portrait-picker-overlay');
  }, 6000);
  r.ok(opened, 'popup ouverte malgre l\'echec de l\'endpoint' + h.errorsSuffix());
  if (!opened) return;

  r.eq(h.state.iconsFetches, 1, '1 tentative d\'appel');

  const labels = h.sectionLabels();
  r.eq(labels.length, 7, 'echec → aucune source masquee : 7 sections (got ' + labels.length + ')');
  r.ok(labels.indexOf('Dungeon Crawl Classics') !== -1, 'section DCC presente en cas d\'echec');

  const dccImgs = h.pickerImgs().filter(function (i) {
    return (i.getAttribute('src') || '').indexOf('icons/dcc-pc-tokens/') === 0;
  });
  r.ok(dccImgs.length > 0, 'images DCC affichees en cas d\'echec (affichage complet)');
}

async function run() {
  const r = createReporter('08-portrait-picker');
  await testFilteredSource(r);
  await testEndpointFailure(r);
  return r;
}

module.exports = run;
