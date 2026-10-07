'use strict';

/* Export / import « tout » : le JSON embarque les calques (v:2) et, si des
   images de fond existent, l'export devient un ZIP (json + images) — R8/R9/R10.
   L'import accepte un .json ou un .zip et signale les UIDs introuvables (R11)
   ainsi que les calques au-dela de la limite de 10 (D13). */

const { createReporter } = require('./helpers/assert');
const { createEnv, read, delay } = require('./helpers/env');
const { waitFor } = require('./helpers/mapenv');

function bodyWithoutScripts() {
  const html = read('index.html');
  return html
    .replace(/^[\s\S]*?<body[^>]*>/i, '')
    .replace(/<\/body>[\s\S]*$/i, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '');
}

function createHarness() {
  const env = createEnv();
  env.document.body.innerHTML = bodyWithoutScripts();
  const win = env.window;

  const state = {
    maps: [],
    images: {},
    nextId: 1,
    maxMaps: 10,
    chars: [
      { id: 1, name: 'Travok', class: 'clerc', is_active: 1, data: '{}' },
      { id: 2, name: 'Alovnek', class: 'guerrier', is_active: 1, data: '{}' },
    ],
    prefs: { tool: 'pen', color: '#2563eb', size: 24, bold: false },
    calls: [],
    toasts: [],
    downloads: [],
    blobs: [],
  };

  /* captures : telechargements et contenus de Blob */
  win.HTMLAnchorElement.prototype.click = function () {
    state.downloads.push({ download: this.download, href: this.href });
  };
  const OrigBlob = win.Blob;
  win.Blob = function (parts, opts) {
    state.blobs.push(String(parts[0]));
    return new OrigBlob(parts, opts);
  };
  win.URL.createObjectURL = function () { return 'blob:fake'; };
  win.URL.revokeObjectURL = function () { };
  win.showToast = function (message, type) {
    state.toasts.push({ message: String(message), type: type || 'save' });
  };
  win.showToastSave = function () { };

  /* script.js utilise son showToast interne (ecrase window.showToast) :
     on observe donc les toasts poses dans le DOM. */
  const observer = new win.MutationObserver(function (muts) {
    muts.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes, function (n) {
        if (n.nodeType === 1 && n.classList && n.classList.contains('toast')) {
          const m2 = /toast-([a-z]+)/.exec(n.className || '');
          state.toasts.push({ message: n.textContent || '', type: m2 ? m2[1] : 'save' });
        }
      });
    });
  });
  observer.observe(env.document.body, { childList: true, subtree: true });

  /* selecteur de fichier : on capture l'input cree par l'application */
  let capturedInput = null;
  const origClick = win.HTMLInputElement.prototype.click;
  win.HTMLInputElement.prototype.click = function () {
    if (this.type === 'file') { capturedInput = this; return; }
    return origClick.apply(this, arguments);
  };

  async function route(url, opts) {
    const u = String(url);
    const method = (opts && opts.method) || 'GET';
    let body = null;
    if (opts && opts.body && typeof opts.body === 'string') {
      try { body = JSON.parse(opts.body); } catch (e) { body = null; }
    }
    const isForm = !!(opts && opts.body && typeof opts.body !== 'string');
    const qs = u.indexOf('?') !== -1 ? u.slice(u.indexOf('?') + 1) : '';
    const params = new URLSearchParams(qs);
    const action = (body && body.action) || params.get('action');
    state.calls.push({ url: u, method: method, action: action, body: body, form: isForm });

    let data = { ok: true };

    if (u.indexOf('api/auth.php') !== -1) {
      if (action === 'check') data = { ok: true, logged_in: true, pseudo: 'Toto', id: 1 };
      else if (action === 'get_team_notes') data = { ok: true, notes: '' };
      else if (action === 'get_marching_order') data = { ok: true, order: {} };
      else if (action === 'get_team_state') data = { ok: true, state: {} };
    } else if (u.indexOf('api/characters.php') !== -1) {
      if (action === 'list') data = { ok: true, characters: state.chars };
      else if (action === 'get') {
        const c = state.chars.find(function (x) { return x.id === Number(params.get('id')); });
        data = { ok: true, character: c || null };
      } else if (action === 'create') {
        const c = { id: state.nextId++, name: body.name, class: body.class, is_active: 1, data: '{}' };
        state.chars.push(c);
        data = { ok: true, character: c };
      } else if (action === 'delete') {
        state.chars = state.chars.filter(function (x) { return x.id !== body.id; });
        data = { ok: true };
      }
    } else if (u.indexOf('api/maps.php') !== -1) {
      if (action === 'prefs_get') {
        data = { ok: true, prefs: state.prefs };
      } else if (action === 'prefs_save') {
        Object.assign(state.prefs, body.prefs || {});
        data = { ok: true, prefs: state.prefs };
      } else if (action === 'list') {
        data = {
          ok: true,
          max: state.maxMaps,
          maps: state.maps.map(function (m) {
            return { id: m.id, name: m.name, bg_uid: m.bg_uid, bg_name: m.bg_name, ops: (m.data.ops || []).length, ui: m.ui };
          }),
        };
      } else if (action === 'get') {
        const m = state.maps.find(function (x) { return x.id === Number(params.get('id')); });
        data = m ? {
          ok: true,
          map: {
            id: m.id, name: m.name, bg_uid: m.bg_uid, bg_name: m.bg_name,
            model: Object.assign({ v: 3, kind: 'dcc-map' }, m.data, m.bg_uid ? { bg: { uid: m.bg_uid, name: m.bg_name } } : {}, { ui: m.ui }),
          },
        } : { ok: false, error: 'Carte introuvable' };
      } else if (action === 'create') {
        if (state.maps.length >= state.maxMaps) {
          data = { ok: false, error: 'Limite de ' + state.maxMaps + ' cartes atteinte — supprimez-en une pour en créer une nouvelle.' };
        } else {
          const m = {
            id: state.nextId++, name: body.name || ('Carte ' + (state.maps.length + 1)),
            data: { v: 3, w: 0, h: 0, ops: [] }, ui: {}, bg_uid: '', bg_name: '',
          };
          state.maps.push(m);
          data = { ok: true, map: { id: m.id, name: m.name, bg_uid: '', bg_name: '', model: m.data } };
        }
      } else if (action === 'save') {
        const m = state.maps.find(function (x) { return x.id === Number(body.id); });
        if (m) {
          if (body.data !== undefined) m.data = body.data;
          if (body.ui !== undefined) m.ui = body.ui;
          if (body.bg_uid !== undefined) m.bg_uid = body.bg_uid;
          if (body.bg_name !== undefined) m.bg_name = body.bg_name;
        }
        data = { ok: true };
      } else if (action === 'delete') {
        const m = state.maps.find(function (x) { return x.id === Number(body.id); });
        if (m && m.bg_uid) delete state.images[m.bg_uid];
        state.maps = state.maps.filter(function (x) { return x.id !== Number(body.id); });
        data = { ok: true, image_deleted: true };
      } else if (action === 'check_images') {
        data = {
          ok: true,
          missing: (body.uids || []).filter(function (uid) { return !state.images[uid]; }),
        };
      } else if (action === 'export_zip') {
        data = { ok: true };
      } else if (action === 'import_all') {
        data = state.importResponse || {
          ok: true,
          json: { version: 2, characters: [] },
          images: 0,
          missing: [],
        };
      }
    }

    return {
      ok: true,
      status: 200,
      json: async function () { return data; },
      blob: async function () { return { size: 42 }; },
    };
  }
  win.fetch = route;

  env.load('script.js');

  return { env: env, win: win, doc: env.document, state: state, input: function () { return capturedInput; } };
}

module.exports = async function suite() {
  const r = createReporter('17-map-export');

  /* ---------------- 1. export sans image : JSON (v:2) avec calques */
  {
    const h = createHarness();
    h.state.maps.push({
      id: 7, name: 'Donjon',
      data: { v: 3, w: 1600, h: 900, ops: [{ k: 's', c: '#2563eb', w: 6, p: [[1, 2]] }] },
      ui: { zoom: 1.5, left: 10, top: 20 }, bg_uid: '', bg_name: '',
    });

    await waitFor(function () {
      const btn = h.doc.querySelector('#user-menu button[data-action="export-all"]');
      return !!btn;
    }, 3000);
    h.doc.querySelector('#user-menu button[data-action="export-all"]').click();
    await waitFor(function () { return h.state.downloads.length > 0; }, 6000);

    const dl = h.state.downloads[0];
    r.ok(/\.json$/.test(dl.download), 'sans image : telechargement .json');
    const exported = JSON.parse(h.state.blobs[h.state.blobs.length - 1]);
    r.eq(exported.version, 2, 'export en version 2');
    r.eq(exported.characters.length, 2, 'personnages exportes');
    r.ok(Array.isArray(exported.maps) && exported.maps.length === 1, 'calques exportes (R8)');
    r.eq(exported.maps[0].name, 'Donjon', 'nom du calque exporte');
    r.eq(exported.maps[0].ops.length, 1, 'operations du calque exportees');
    r.ok(exported.maps[0].ui && exported.maps[0].ui.zoom === 1.5, 'etat de vue du calque exporte (R13)');
    r.ok(exported.map_prefs && exported.map_prefs.tool === 'pen', 'preferences d outil exportees (A2)');
    r.ok(h.state.calls.every(function (c) { return c.action !== 'export_zip'; }), 'pas de ZIP sans image');
  }

  /* ---------------- 2. export avec image : ZIP (json + images) */
  {
    const h = createHarness();
    h.state.images['3f2b7c1e9a044d5b8c6f2a1d7e5b4c3a'] = { name: 'plan.webp' };
    h.state.maps.push({
      id: 8, name: 'Donjon',
      data: { v: 3, w: 100, h: 100, ops: [] },
      ui: {}, bg_uid: '3f2b7c1e9a044d5b8c6f2a1d7e5b4c3a', bg_name: 'plan.webp',
    });

    await waitFor(function () {
      return !!h.doc.querySelector('#user-menu button[data-action="export-all"]');
    }, 3000);
    h.doc.querySelector('#user-menu button[data-action="export-all"]').click();
    await waitFor(function () { return h.state.downloads.length > 0; }, 6000);

    const dl = h.state.downloads[0];
    r.ok(/\.zip$/.test(dl.download), 'avec image : telechargement .zip (R9)');
    const zipCall = h.state.calls.filter(function (c) { return c.action === 'export_zip'; })[0];
    r.ok(!!zipCall, 'construction du ZIP par le serveur (A3)');
    r.eq(zipCall.body.images.length, 1, 'une image demandee dans le ZIP');
    r.eq(zipCall.body.images[0], '3f2b7c1e9a044d5b8c6f2a1d7e5b4c3a', 'UID de l image embarquee (R10)');
    r.ok(zipCall.body.json.maps[0].bg.uid === '3f2b7c1e9a044d5b8c6f2a1d7e5b4c3a', 'UID present dans le JSON du ZIP');
    r.eq(zipCall.body.json.maps[0].bg.name, 'plan.webp', 'nom utilisateur present dans le JSON');
  }

  /* ---------------- 3. import .json : calques + UID manquant (R11) */
  {
    const h = createHarness();
    h.state.maps.push({
      id: 3, name: 'Ancienne',
      data: { v: 3, w: 1, h: 1, ops: [] }, ui: {}, bg_uid: '', bg_name: '',
    });

    const payload = {
      version: 2,
      characters: [{ name: 'Alpha', class: 'clerc', is_active: 1, data: {} }],
      maps: [
        {
          name: 'Donjon', w: 1600, h: 900,
          bg: { uid: '9c1a44e20b3d4f5a8e7c6b5a4d3c2b1a', name: 'disparue.webp' },
          ops: [{ k: 's', c: '#111827', w: 6, p: [[1, 2], [3, 4]] }],
          ui: { zoom: 2, left: 5, top: 6 },
        },
        { name: 'Village', w: 800, h: 600, ops: [], ui: {} },
      ],
      map_prefs: { tool: 'pen', color: '#111827' },
    };

    await waitFor(function () {
      return !!h.doc.querySelector('#user-menu button[data-action="import-all"]');
    }, 3000);
    h.doc.querySelector('#user-menu button[data-action="import-all"]').click();
    await waitFor(function () { return !!h.input(); }, 3000);

    Object.defineProperty(h.input(), 'files', {
      value: [{ name: 'sauvegarde.json', text: async function () { return JSON.stringify(payload); } }],
      configurable: true,
    });
    h.input().dispatchEvent(new h.win.Event('change'));

    const confirmed = await waitFor(function () {
      return !!h.doc.querySelector('#modal-actions .modal-btn-danger');
    }, 4000);
    r.ok(confirmed, 'confirmation demandee avant remplacement');
    h.doc.querySelector('#modal-actions .modal-btn-danger').click();

    const done = await waitFor(function () {
      return h.state.toasts.some(function (t) { return /Import reussi/.test(t.message); });
    }, 8000);
    r.ok(done, 'import termine');

    r.eq(h.state.maps.length, 2, 'les 2 calques du fichier sont crees');
    r.ok(h.state.calls.some(function (c) {
      return c.action === 'delete' && c.body && c.body.id === 3;
    }), 'les calques existants sont remplaces (D8)');
    const donjon = h.state.maps.find(function (m) { return m.name === 'Donjon'; });
    r.ok(donjon && donjon.bg_uid === '9c1a44e20b3d4f5a8e7c6b5a4d3c2b1a',
      'UID du fond stocke en base a l import (R10)');
    r.eq(donjon.bg_name, 'disparue.webp', 'nom utilisateur du fond stocke');
    r.ok(donjon.data.ops.length === 1, 'operations du calque importees');
    r.ok(h.state.toasts.some(function (t) {
      return t.type === 'error' && /Image de fond introuvable/.test(t.message);
    }), 'toast d erreur pour l image introuvable (R11)');
    r.ok(h.state.toasts.some(function (t) { return /2 cartes/.test(t.message); }), 'recapitulatif mentionne les cartes');
  }

  /* ---------------- 4. import .zip : images extraites par le serveur */
  {
    const h = createHarness();
    h.state.importResponse = {
      ok: true,
      json: {
        version: 2,
        characters: [{ name: 'Beta', class: 'mage', is_active: 1, data: {} }],
        maps: [{ name: 'Carte ZIP', w: 100, h: 100, ops: [], ui: {} }],
      },
      images: 1,
      missing: ['ffff44e20b3d4f5a8e7c6b5a4d3c2b1a'],
    };

    await waitFor(function () {
      return !!h.doc.querySelector('#user-menu button[data-action="import-all"]');
    }, 3000);
    h.doc.querySelector('#user-menu button[data-action="import-all"]').click();
    await waitFor(function () { return !!h.input(); }, 3000);

    Object.defineProperty(h.input(), 'files', {
      value: [{ name: 'sauvegarde.zip', type: 'application/zip' }],
      configurable: true,
    });
    h.input().dispatchEvent(new h.win.Event('change'));

    const confirmed = await waitFor(function () {
      return !!h.doc.querySelector('#modal-actions .modal-btn-danger');
    }, 4000);
    if (confirmed) h.doc.querySelector('#modal-actions .modal-btn-danger').click();

    const done = await waitFor(function () {
      return h.state.toasts.some(function (t) { return /Import reussi/.test(t.message); });
    }, 8000);
    r.ok(done, 'import du ZIP termine');

    const zipCall = h.state.calls.filter(function (c) {
      return c.action === 'import_all' && c.form;
    })[0];
    r.ok(!!zipCall, 'le ZIP est envoye au serveur pour extraction (A3)');
    r.ok(/import_all/.test(zipCall.url), 'action import_all utilisee');
    r.eq(h.state.maps.length, 1, 'calque du ZIP cree');
    r.ok(h.state.toasts.some(function (t) {
      return t.type === 'error' && /Image de fond introuvable/.test(t.message);
    }), 'UID manquant signale meme depuis un ZIP (R11)');
  }

  /* ---------------- 5. import au-dela de 10 calques (D13) */
  {
    const h = createHarness();
    const maps = [];
    for (let i = 0; i < 12; i++) {
      maps.push({ name: 'Carte ' + (i + 1), w: 10, h: 10, ops: [], ui: {} });
    }
    const payload = {
      version: 2,
      characters: [{ name: 'Gamma', class: 'nain', is_active: 1, data: {} }],
      maps: maps,
    };

    await waitFor(function () {
      return !!h.doc.querySelector('#user-menu button[data-action="import-all"]');
    }, 3000);
    h.doc.querySelector('#user-menu button[data-action="import-all"]').click();
    await waitFor(function () { return !!h.input(); }, 3000);

    Object.defineProperty(h.input(), 'files', {
      value: [{ name: 'gros.json', text: async function () { return JSON.stringify(payload); } }],
      configurable: true,
    });
    h.input().dispatchEvent(new h.win.Event('change'));

    const confirmed = await waitFor(function () {
      return !!h.doc.querySelector('#modal-actions .modal-btn-danger');
    }, 4000);
    if (confirmed) h.doc.querySelector('#modal-actions .modal-btn-danger').click();

    const done = await waitFor(function () {
      return h.state.toasts.some(function (t) { return /Import reussi/.test(t.message); });
    }, 8000);
    r.ok(done, 'import termine malgre la limite');

    r.eq(h.state.maps.length, 10, 'limite de 10 calques respectee cote serveur');
    r.ok(h.state.toasts.some(function (t) {
      return t.type === 'error' && /Calques non importes/.test(t.message);
    }), 'calques ecartes signales (D13)');
  }

  return r;
};
