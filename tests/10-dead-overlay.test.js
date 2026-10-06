'use strict';

/* Overlay "tete de mort rouge" (PV courants <= 0) :
   - dead-overlay.js : isDead(), pose/retrait idempotent, enveloppe .portrait-holder ;
   - onglet Equipe   : ordre de marche + colonne Classe, les deux portraits synchroises
                       a la saisie des PV et a la resynchronisation ;
   - fiche perso     : overlay pose a l'ouverture, retire/repose a la saisie des PV. */

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

function fire(el, type) {
  el.dispatchEvent(new el.ownerDocument.defaultView.Event(type, { bubbles: true, cancelable: true }));
}

function click(el) {
  el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
}

function cardByName(doc, name) {
  const cards = Array.prototype.slice.call(doc.querySelectorAll('.char-card'));
  for (let i = 0; i < cards.length; i++) {
    const n = cards[i].querySelector('.char-card-name');
    if (n && n.textContent.indexOf(name) === 0) return cards[i];
  }
  return null;
}

/* ------------------------------------------------------------------ *
 * 1. Helper : regles de mort + pose/retrait
 * ------------------------------------------------------------------ */
function testHelper(r) {
  const env = createEnv();
  env.load('dead-overlay.js');
  const D = env.window.DCCDeadOverlay;

  r.ok(!!D, 'window.DCCDeadOverlay expose');
  if (!D) return;

  r.eq(D.isDead('0'), true, 'PV "0" -> mort');
  r.eq(D.isDead('0.0'), true, 'PV "0.0" -> mort');
  r.eq(D.isDead('-3'), true, 'PV "-3" -> mort');
  r.eq(D.isDead(0), true, 'PV numerique 0 -> mort');
  r.eq(D.isDead(' 0 '), true, 'PV " 0 " (espaces) -> mort');
  r.eq(D.isDead('7'), false, 'PV "7" -> vivant');
  r.eq(D.isDead(''), false, 'PV vide -> vivant');
  r.eq(D.isDead(null), false, 'PV null -> vivant');
  r.eq(D.isDead(undefined), false, 'PV undefined -> vivant');
  r.eq(D.isDead('abc'), false, 'PV non numerique -> vivant');

  const root = env.document.getElementById('root');
  const img = env.document.createElement('img');
  img.className = 'portrait-img';
  root.appendChild(img);

  D.apply(img, true);
  const holder = root.querySelector('.portrait-holder');
  r.ok(!!holder, 'portrait enveloppe dans .portrait-holder');
  r.ok(img.parentNode === holder, 'portrait deplace dans le holder');
  r.eq(root.querySelectorAll('.dead-overlay').length, 1, '1 overlay pose');
  r.ok(!!root.querySelector('.dead-overlay svg'), 'overlay porte le crane SVG');
  r.eq(root.querySelector('.dead-overlay').getAttribute('aria-hidden'), 'true',
    'overlay ignore par les lecteurs d\'ecran');

  D.apply(img, true);
  r.eq(root.querySelectorAll('.dead-overlay').length, 1, '2e pose : toujours 1 overlay (idempotent)');

  D.apply(img, false);
  r.eq(root.querySelectorAll('.dead-overlay').length, 0, 'retrait : overlay supprime');
  r.ok(img.parentNode === holder, 'holder conserve apres retrait');

  D.apply(img, false);
  r.eq(root.querySelectorAll('.dead-overlay').length, 0, 'retrait sans overlay : ne plante pas');
}

/* ------------------------------------------------------------------ *
 * 2. Onglet Equipe : ordre de marche + colonne Classe
 * ------------------------------------------------------------------ */
function charRow(container, id) {
  return container.querySelector('tr[data-char-id="' + id + '"]');
}

function marchSlot(container, id) {
  return container.querySelector('.marching-slot[data-id="' + id + '"]');
}

function overlayCount(el) {
  return el ? el.querySelectorAll('.dead-overlay').length : -1;
}

function testEquipe(r) {
  const env = createEnv();
  env.load('dead-overlay.js');
  env.load('marching-order.js');
  env.loadEquipe();

  const mod = env.window.DCCModules.equipe;
  if (!mod || typeof mod.render !== 'function') {
    r.fail('module equipe non charge');
    return;
  }

  const chars = [
    {
      id: 1,
      name: 'Travok',
      class: 'clerc',
      data: JSON.stringify({ points_de_vie: '0', classe_armure: '14', initiative: '+2' }),
    },
    {
      id: 2,
      name: 'Sergiu',
      class: 'mage',
      data: JSON.stringify({ points_de_vie: '4', classe_armure: '10', initiative: '+1' }),
    },
  ];

  const container = env.document.getElementById('root');
  let saves = 0;
  mod.render(container, chars, function () { saves += 1; }, '', function () {},
    { 1: 0, 2: 1 }, function () {});

  // --- Rendu initial ---
  r.eq(overlayCount(marchSlot(container, 1)), 1, 'ordre de marche : overlay sur le perso a 0 PV');
  r.eq(overlayCount(marchSlot(container, 2)), 0, 'ordre de marche : pas d\'overlay au dessus de 0 PV');
  r.eq(overlayCount(charRow(container, 1)), 1, 'expedition : overlay sur le perso a 0 PV');
  r.eq(overlayCount(charRow(container, 2)), 0, 'expedition : pas d\'overlay au dessus de 0 PV');

  const marchHolder = marchSlot(container, 1).querySelector('.portrait-holder');
  r.ok(!!marchHolder, 'portrait de la grille enveloppe dans un holder');
  r.eq(marchHolder.querySelectorAll('img.marching-portrait').length, 1,
    'le portrait img reste dans le holder (selecteurs existants OK)');
  r.eq(overlayCount(charRow(container, 1).querySelector('.char-class-content')), 1,
    'overlay rattache au contenu de la colonne Classe');

  // --- Saisie PV dans le tableau : les 2 portraits suivent ---
  const pvInput1 = charRow(container, 1).children[4].querySelector('input');
  r.eq(pvInput1.value, '0', 'champ PV initialise a 0');

  pvInput1.value = '5';
  fire(pvInput1, 'input');
  r.eq(overlayCount(charRow(container, 1)), 0, 'PV 5 -> overlay retire (tableau)');
  r.eq(overlayCount(marchSlot(container, 1)), 0, 'PV 5 -> overlay retire (ordre de marche)');
  r.eq(saves, 0, 'aucune sauvegarde sur simple input');

  pvInput1.value = '-2';
  fire(pvInput1, 'input');
  r.eq(overlayCount(charRow(container, 1)), 1, 'PV -2 -> overlay repose (tableau)');
  r.eq(overlayCount(marchSlot(container, 1)), 1, 'PV -2 -> overlay repose (ordre de marche)');

  pvInput1.value = '3';
  fire(pvInput1, 'change');
  r.eq(saves, 1, 'change declenche la sauvegarde des PV');
  r.eq(overlayCount(charRow(container, 1)), 0, 'sauvegarde -> overlay retire');
  r.eq(overlayCount(marchSlot(container, 1)), 0, 'sauvegarde -> grille synchronisee');

  // --- PV vides : pas de mort ---
  pvInput1.value = '';
  fire(pvInput1, 'input');
  r.eq(overlayCount(charRow(container, 1)), 0, 'PV vide -> pas d\'overlay');

  // --- Le modele suit la saisie : un re-render ne perd pas l'etat ---
  pvInput1.value = '0';
  fire(pvInput1, 'input');
  mod.render(container, chars, function () { saves += 1; }, '', function () {},
    { 1: 0, 2: 1 }, function () {});
  r.eq(overlayCount(marchSlot(container, 1)), 1, 're-render : overlay reconstruit depuis le modele');
  r.eq(overlayCount(charRow(container, 1)), 1, 're-render : overlay aussi dans le tableau');

  // --- Resynchronisation (retour sur l'onglet Equipe) ---
  const fresh = JSON.parse(JSON.stringify(chars));
  const f1 = JSON.parse(fresh[0].data);
  f1.points_de_vie = '6';
  fresh[0].data = JSON.stringify(f1);
  const f2 = JSON.parse(fresh[1].data);
  f2.points_de_vie = '0';
  fresh[1].data = JSON.stringify(f2);

  const resyncOk = mod.resync(fresh);
  r.eq(resyncOk, true, 'resync sans changement de composition');
  r.eq(overlayCount(charRow(container, 1)), 0, 'resync PV 6 -> overlay retire');
  r.eq(overlayCount(charRow(container, 2)), 1, 'resync PV 0 -> overlay pose');
  r.eq(overlayCount(marchSlot(container, 1)), 0, 'resync : grille ordre de marche a jour');
  r.eq(overlayCount(marchSlot(container, 2)), 1, 'resync : grille ordre de marche posee');

  // --- Sans dead-overlay.js : aucun plantage, aucun wrap ---
  const env2 = createEnv();
  env2.load('marching-order.js');
  env2.loadEquipe();
  const mod2 = env2.window.DCCModules.equipe;
  const container2 = env2.document.getElementById('root');
  let okRender = true;
  try {
    mod2.render(container2, JSON.parse(JSON.stringify(chars)), function () {}, '', function () {},
      { 1: 0, 2: 1 }, function () {});
  } catch (e) {
    okRender = false;
  }
  r.ok(okRender, 'rendu sans dead-overlay.js ne plante pas');
  r.eq(container2.querySelectorAll('.dead-overlay').length, 0, 'sans helper : aucun overlay');
  r.eq(container2.querySelectorAll('img.marching-portrait').length, 2,
    'sans helper : portraits de la grille intacts');
  r.eq(container2.querySelectorAll('img.team-portrait').length, 2,
    'sans helper : portraits du tableau intacts');
}

/* ------------------------------------------------------------------ *
 * 3. Fiche de personnage : pose a l'ouverture, synchro a la saisie
 * ------------------------------------------------------------------ */
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

/* jsdom n'execute pas les <script src> : on intercepte head.appendChild */
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

function createSheetHarness() {
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
    chars: [
      { id: 46, name: 'Travok', class: 'clerc', is_active: 1,
        data: JSON.stringify({ points_de_vie: '0', portrait_source: 'dcc', portrait_index: '0' }) },
      { id: 47, name: 'Bobby', class: 'clerc', is_active: 0,
        data: JSON.stringify({ points_de_vie: '7', portrait_source: 'dcc', portrait_index: '1' }) },
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
      data = { ok: true, dirs: ['dcc-pc-tokens'] };
    } else if (u.indexOf('api/auth.php') !== -1) {
      if (action === 'check') data = { ok: true, logged_in: true, pseudo: 'Toto', id: 1 };
    } else if (u.indexOf('api/characters.php') !== -1) {
      if (action === 'list') data = { ok: true, characters: state.chars };
      else if (action === 'get') data = { ok: true, character: state.chars[0] };
    }

    return { ok: true, json: async function () { return data; } };
  };

  patchHead(env);

  CATALOGS.forEach(function (f) { env.load(f); });
  env.load('marching-order.js');
  env.load('dead-overlay.js');
  env.load('script.js');

  return { env, state, errors };
}

async function testSheet(r) {
  const h = createSheetHarness();
  const doc = h.env.document;

  const ready = await waitFor(function () {
    const img = doc.querySelector('.portrait-area [data-portrait-img]');
    return img && img.getAttribute('src');
  }, 6000);
  r.ok(ready, 'fiche clerc ouverte avec portrait' +
    (h.errors.length ? ' (erreurs: ' + h.errors.slice(0, 2).join(' // ') + ')' : ''));
  if (!ready) return;

  const area = doc.querySelector('.portrait-area');
  const overlayHere = function () {
    return overlayCount(area.querySelector('.portrait-holder'));
  };

  const posed = await waitFor(function () { return overlayHere() === 1; }, 3000);
  r.ok(posed, 'fiche ouverte avec PV 0 -> overlay "tete de mort" pose');

  const holder = area.querySelector('.portrait-holder');
  r.ok(!!holder, 'portrait de la fiche enveloppe dans un holder');
  r.ok(!!area.querySelector('.portrait-holder .dead-overlay svg'),
    'overlay contient le crane dans la fiche');

  const pvInput = doc.querySelector('.view-sheet input[data-key$="-points_de_vie"]');
  r.ok(!!pvInput, 'champ PV present dans la fiche');
  if (!pvInput) return;

  pvInput.value = '8';
  fire(pvInput, 'input');
  r.eq(overlayHere(), 0, 'saisie PV 8 -> overlay retire');

  pvInput.value = '-1';
  fire(pvInput, 'input');
  r.eq(overlayHere(), 1, 'saisie PV -1 -> overlay repose');

  pvInput.value = '0';
  fire(pvInput, 'change');
  r.eq(overlayHere(), 1, 'saisie PV 0 (change) -> overlay maintenu');

  // Le portrait reste cliquable (le picker n'est pas bloque par l'overlay)
  const img = area.querySelector('[data-portrait-img]');
  r.eq(img.parentNode, holder, 'portrait toujours dans son holder apres saisie');
  r.eq(overlayCount(holder), 1, 'un seul overlay apres plusieurs bascules');

  /* --- Liste des personnages de la classe : expedition ET auberge --- */
  const backBtn = doc.querySelector('.view-sheet .btn-back');
  r.ok(!!backBtn, 'bouton retour vers la liste present');
  if (!backBtn) return;

  click(backBtn);
  const listed = await waitFor(function () { return doc.querySelectorAll('.char-card').length >= 2; }, 6000);
  r.ok(listed, 'liste des persos rendue apres retour' +
    (h.errors.length ? ' (erreurs: ' + h.errors.slice(0, 2).join(' // ') + ')' : ''));
  if (!listed) return;

  const travokCard = cardByName(doc, 'Travok');
  const bobbyCard = cardByName(doc, 'Bobby');
  r.ok(!!travokCard, 'carte Travok presente (en expedition)');
  r.ok(!!bobbyCard, 'carte Bobby presente (a l\'auberge)');
  if (!travokCard || !bobbyCard) return;

  r.ok(travokCard.className.indexOf('inactive') === -1, 'Travok est bien en expedition');
  r.ok(bobbyCard.className.indexOf('inactive') !== -1, 'Bobby est bien a l\'auberge');
  r.eq(overlayCount(travokCard), 1, 'liste : overlay sur la carte (expedition) a 0 PV');
  r.eq(overlayCount(bobbyCard), 0, 'liste : pas d\'overlay sur la carte a 7 PV');
  r.ok(!!travokCard.querySelector('.portrait-holder .char-card-portrait'),
    'carte : portrait enveloppe dans un holder');

  // Meme logique pour un perso a l'auberge, retrait des que PV > 0
  h.state.chars[0].data = JSON.stringify({ points_de_vie: '5', portrait_source: 'dcc', portrait_index: '0' });
  h.state.chars[1].data = JSON.stringify({ points_de_vie: '0', portrait_source: 'dcc', portrait_index: '1' });
  h.env.window.showList('clerc');

  const toggled = await waitFor(function () {
    const a = cardByName(doc, 'Travok');
    const b = cardByName(doc, 'Bobby');
    return !!a && !!b && overlayCount(a) === 0 && overlayCount(b) === 1;
  }, 6000);
  r.ok(toggled, 'liste : overlay suit les PV (5 -> retire, 0 -> pose a l\'auberge)');
}

async function run() {
  const r = createReporter('10-dead-overlay');
  testHelper(r);
  testEquipe(r);
  await testSheet(r);
  await delay(50);
  return r;
}

module.exports = run;
