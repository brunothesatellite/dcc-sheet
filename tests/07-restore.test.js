'use strict';

/* Intégration : restauration de l'ordre de marche.
   - Rechargement de page : le serveur renvoie l'ordre sauvegardé, la grille
     doit l'afficher (et surtout ne pas le ré-écrire silencieusement).
   - Import JSON : l'ordre du fichier (index) doit être remappé sur les
     nouveaux ids puis réaffiché. */

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

function createHarness() {
  const env = createEnv();
  const errors = [];
  try {
    env.dom.virtualConsole.on('jsdomError', function (e) {
      errors.push(String((e && e.message) || e));
    });
  } catch (e) { /* virtualConsole indisponible : on ignore */ }

  env.document.body.innerHTML = bodyWithoutScripts();
  env.window.localStorage.setItem('dcc-active-tab', 'equipe');

  const state = {
    gets: 0,
    saves: [],
    savesNotes: [],
    creates: [],
    deletes: [],
    nextId: 60,
    /* Donnees reelles du joueur : 6 persos actifs, Nailo (48) depose en
       case 7 avec case 4 vide — ordre troué que la restauration doit
       conserver tel quel (regression du bug « pas restauré au reload ») */
    order: '{"44":1,"45":2,"46":0,"47":5,"48":7,"49":3}',
    chars: [
      { id: 44, name: 'Alovnek', class: 'guerrier', is_active: 1, data: '{}' },
      { id: 45, name: 'Dom', class: 'halfelin', is_active: 1, data: '{}' },
      { id: 46, name: 'Travok', class: 'clerc', is_active: 1, data: '{}' },
      { id: 47, name: 'Ramas', class: 'voleur', is_active: 1, data: '{}' },
      { id: 48, name: 'Nailo', class: 'nain', is_active: 1, data: '{}' },
      { id: 49, name: 'Sergiu', class: 'mage', is_active: 1, data: '{}' },
    ],
  };

  env.window.fetch = async function (url, opts) {
    const u = String(url);
    const method = (opts && opts.method) || 'GET';
    let body = null;
    if (opts && opts.body) {
      try { body = JSON.parse(opts.body); } catch (e) { body = null; }
    }
    const qs = u.indexOf('?') !== -1 ? u.slice(u.indexOf('?') + 1) : '';
    const params = new URLSearchParams(qs);
    const action = (body && body.action) || params.get('action');
    let data = { ok: true };

    if (u.indexOf('api/auth.php') !== -1) {
      if (action === 'check') {
        data = { ok: true, logged_in: true, pseudo: 'Toto', id: 1 };
      } else if (action === 'get_marching_order') {
        state.gets += 1;
        data = { ok: true, order: state.order };
      } else if (action === 'save_marching_order') {
        state.saves.push(body.order);
        state.order = JSON.stringify(body.order || {});
        data = { ok: true };
      } else if (action === 'get_team_notes') {
        data = { ok: true, notes: '' };
      } else if (action === 'save_team_notes') {
        state.savesNotes.push(body.notes);
        data = { ok: true };
      }
    } else if (u.indexOf('api/characters.php') !== -1) {
      if (method === 'GET' && action === 'list') {
        let list = state.chars.slice();
        const cls = params.get('class');
        const act = params.get('is_active');
        if (cls) list = list.filter(function (c) { return c.class === cls; });
        if (act) list = list.filter(function (c) { return String(c.is_active) === act; });
        data = { ok: true, characters: list };
      } else if (method === 'GET' && action === 'get') {
        const id = Number(params.get('id'));
        const c = state.chars.find(function (x) { return x.id === id; });
        data = c
          ? { ok: true, character: Object.assign({}, c) }
          : { ok: false, error: 'Personnage introuvable' };
      } else if (method === 'POST' && action === 'create') {
        const active = (body.is_active === 0 || body.is_active === false) ? 0 : 1;
        const c = { id: state.nextId++, name: body.name || 'Importe', class: body.class, is_active: active, data: '{}' };
        state.creates.push(c);
        state.chars.push(c);
        data = { ok: true, character: c };
      } else if (method === 'POST' && action === 'delete') {
        state.deletes.push(body.id);
        state.chars = state.chars.filter(function (c) { return c.id !== body.id; });
        data = { ok: true };
      } else if (method === 'POST' && action === 'save') {
        const c = state.chars.find(function (x) { return x.id === body.id; });
        if (c) {
          if (body.data !== undefined) c.data = typeof body.data === 'string' ? body.data : JSON.stringify(body.data);
          if (body.name !== undefined) c.name = body.name;
        }
        data = { ok: true };
      }
    }

    return { ok: true, json: async function () { return data; } };
  };

  function loadAll() {
    env.load('marching-order.js');
    env.load('script.js');
    env.load('classes/equipe.js');
  }

  function slots() {
    return Array.from(env.document.querySelectorAll('.marching-slot'));
  }

  function modalText() {
    const overlay = env.document.querySelector('#modal-overlay');
    if (!overlay || overlay.classList.contains('hidden')) return '';
    const t = env.document.querySelector('#modal-title');
    const m = env.document.querySelector('#modal-message');
    return ' | modale: ' + (t ? t.textContent : '') + ' - ' + (m ? m.textContent : '');
  }

  function errorsSuffix() {
    return errors.length ? ' (erreurs jsdom: ' + errors.slice(0, 3).join(' // ') + ')' : '';
  }

  return { env, state, errors, loadAll, slots, modalText, errorsSuffix };
}

async function testReload(r) {
  const h = createHarness();
  h.loadAll();

  const shown = await waitFor(function () { return h.env.document.querySelectorAll('.marching-slot').length === 9; }, 6000);
  r.ok(shown, 'rechargement: grille de 9 cases rendue' + h.modalText() + h.errorsSuffix());
  if (!shown) return;

  const slots = h.slots();
  const idAt = function (i) { return slots[i] ? slots[i].getAttribute('data-id') : null; };

  r.eq(idAt(0), '46', 'rechargement: case 0 = Travok');
  r.eq(idAt(1), '44', 'rechargement: case 1 = Alovnek');
  r.eq(idAt(2), '45', 'rechargement: case 2 = Dom');
  r.eq(idAt(3), '49', 'rechargement: case 3 = Sergiu');
  r.eq(idAt(4), null, 'rechargement: case 4 vide (trou preserve)');
  r.eq(idAt(5), '47', 'rechargement: case 5 = Ramas');
  r.eq(idAt(6), null, 'rechargement: case 6 vide');
  r.eq(idAt(7), '48', 'rechargement: case 7 = Nailo (depot sur case vide conserve)');
  r.eq(idAt(8), null, 'rechargement: case 8 vide');

  const name0 = slots[0].querySelector('.marching-name');
  const name7 = slots[7].querySelector('.marching-name');
  r.eq(name0 ? name0.textContent : null, 'Travok', 'rechargement: nom en case 0');
  r.eq(name7 ? name7.textContent : null, 'Nailo', 'rechargement: nom en case 7');

  r.ok(h.state.gets >= 1, 'rechargement: ordre lu sur le serveur');
  r.eq(h.state.saves.length, 0,
    'rechargement: aucun ecrasement silencieux de l ordre (normalize inchangée)');

  const metaEl = h.env.document.querySelector('.marching-meta');
  r.ok(metaEl && metaEl.textContent.indexOf('6 persos') !== -1, 'rechargement: meta annonce 6 persos');

  const toggle = h.env.document.querySelector('#marching-toggle');
  r.ok(toggle, 'rechargement: bouton de repli present');
  r.eq(toggle ? toggle.getAttribute('aria-expanded') : null, 'true', 'rechargement: panneau ouvert par defaut');
}

async function testImport(r) {
  const h = createHarness();

  let capturedInput = null;
  const origClick = h.env.window.HTMLInputElement.prototype.click;
  h.env.window.HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') { capturedInput = this; return; }
    return origClick.apply(this, arguments);
  };

  h.loadAll();

  const shown = await waitFor(function () { return h.env.document.querySelectorAll('.marching-slot').length === 9; }, 6000);
  r.ok(shown, 'import: grille initiale rendue' + h.modalText() + h.errorsSuffix());
  if (!shown) return;

  const importBtn = h.env.document.querySelector('#user-menu button[data-action="import-all"]');
  r.ok(importBtn, 'import: bouton « Importer tout » present');
  if (!importBtn) return;
  importBtn.click();

  const gotInput = await waitFor(function () { return capturedInput !== null; }, 2000);
  r.ok(gotInput, 'import: selecteur de fichier cree');
  if (!gotInput) return;

  /* Fichier tel que l'export le produit : Bobby (index 1) est à l'auberge
     (is_active: 0) → absent de marching_order (actifs seuls : index 0 et 2) */
  const payload = {
    version: 1,
    team_notes: 'notes d equipe',
    characters: [
      { name: 'Alpha', class: 'clerc', is_active: 1, data: {} },
      { name: 'Bobby', class: 'elfe', is_active: 0, data: {} },
      { name: 'Beta', class: 'mage', is_active: 1, data: {} },
    ],
    marching_order: { '0': 1, '2': 0 },
  };

  Object.defineProperty(capturedInput, 'files', {
    value: [{ text: async function () { return JSON.stringify(payload); } }],
    configurable: true,
  });
  capturedInput.dispatchEvent(new h.env.window.Event('change'));

  const gotConfirm = await waitFor(function () {
    return h.env.document.querySelector('#modal-actions .modal-btn-danger');
  }, 3000);
  r.ok(gotConfirm, 'import: modale de confirmation affichee' + h.modalText());
  if (!gotConfirm) return;
  h.env.document.querySelector('#modal-actions .modal-btn-danger').click();

  const restored = await waitFor(function () {
    const s0 = h.env.document.querySelector('.marching-slot[data-pos="0"]');
    return s0 && s0.getAttribute('data-id') === '62';
  }, 6000);
  r.ok(restored, 'import: grille re-rendue avec les nouveaux ids' + h.modalText() + h.errorsSuffix());

  r.eq(h.state.deletes.length, 6, 'import: 6 anciens persos supprimes');
  r.eq(h.state.creates.length, 3, 'import: 3 persos recrees');
  r.eq(h.state.creates[0] ? h.state.creates[0].is_active : null, 1, 'import: Alpha recree actif');
  r.eq(h.state.creates[1] ? h.state.creates[1].is_active : null, 0,
    'import: Bobby (auberge) recree INACTIF — statut conserve');
  r.eq(h.state.creates[2] ? h.state.creates[2].is_active : null, 1, 'import: Beta recree actif');
  r.eq(h.state.saves.length, 1, 'import: exactement une ecriture d ordre');
  r.eq(JSON.stringify(h.state.saves[0] || {}), '{"60":1,"62":0}',
    'import: ordre remappe sur les ids actifs (index fichier 0 et 2)');
  r.eq(h.state.savesNotes.length, 1, 'import: notes d equipe restaurees');

  if (restored) {
    const slots = h.slots();
    const idAt = function (i) { return slots[i] ? slots[i].getAttribute('data-id') : null; };
    r.eq(idAt(0), '62', 'import: case 0 = Beta');
    r.eq(idAt(1), '60', 'import: case 1 = Alpha');
    r.eq(idAt(2), null, 'import: case 2 vide');
    const ids = slots.map(function (s) { return s.getAttribute('data-id'); });
    r.ok(ids.indexOf('61') === -1, 'import: Bobby (inactif) absent de la grille');
    const metaEl = h.env.document.querySelector('.marching-meta');
    r.ok(metaEl && metaEl.textContent.indexOf('2 persos') !== -1,
      'import: meta compte 2 persos en expedition (inactif exclu)');
  }
}

module.exports = async function suite() {
  const r = createReporter('07-restore');
  await testReload(r);
  await testImport(r);
  return r;
};
