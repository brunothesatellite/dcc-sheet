'use strict';

/* Harnais du module carte (map-draw.js) :
   - stubs jsdom (canvas 2d, mesures, dialogues, Image)
   - serveur factice api/maps.php + api/map-image.php (etat en memoire)
   - helpers de gestes pointeur (meme approche que draw-on-map/test.js) */

const { createEnv, delay } = require('./env');

function createMapEnv(options) {
  options = options || {};
  const env = createEnv();
  const errors = [];
  try {
    env.dom.virtualConsole.on('jsdomError', function (e) {
      errors.push(String((e && e.message) || e));
    });
  } catch (e) { /* virtualConsole indisponible */ }

  const win = env.window;
  const doc = env.document;

  /* --- canvas 2d factice : journalise composite / lineWidth --- */
  const ctxLog = [];
  const ctx = new Proxy({
    measureText: function (t) { return { width: String(t).length * 15 }; },
  }, {
    get(target, prop) {
      if (prop in target) return target[prop];
      if (typeof prop === 'string') {
        return function () {
          ctxLog.push(prop + '(' + Array.prototype.map.call(arguments, String).join(',') + ')');
        };
      }
      return undefined;
    },
    set(target, prop, value) {
      if (prop === 'globalCompositeOperation') ctxLog.push('composite=' + value);
      if (prop === 'lineWidth') ctxLog.push('lineWidth=' + value);
      target[prop] = value;
      return true;
    },
  });
  win.HTMLCanvasElement.prototype.getContext = function () { return ctx; };
  /* toBlob : jsdom ne l'implemente pas (sans le paquet canvas) — on se
     comporte comme un navigateur reel pour la conversion webp (D4). */
  win.HTMLCanvasElement.prototype.toBlob = function (cb, type) {
    cb(new win.Blob(['fake-webp'], { type: type || 'image/webp' }));
  };

  /* --- fenetre de vue reelle (jsdom renvoie 0) --- */
  win.Element.prototype.getBoundingClientRect = function () {
    return { width: 412, height: 700, top: 0, left: 0, right: 412, bottom: 700, x: 0, y: 0 };
  };
  win.Element.prototype.setPointerCapture = function () { };
  win.Element.prototype.releasePointerCapture = function () { };
  win.HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  win.HTMLDialogElement.prototype.close = function () { this.open = false; };
  win.HTMLElement.prototype.focus = function () { };

  /* --- Image : dimensions simulees, chargement synchrone --- */
  win.__imgSize = { w: 1600, h: 900 };
  win.Image = class {
    constructor() {
      this.naturalWidth = 0;
      this.naturalHeight = 0;
      this.onload = null;
      this.onerror = null;
    }
    set src(v) {
      this._src = v;
      const self = this;
      if (win.__imgFail) {
        if (self.onerror) self.onerror();
        return;
      }
      if (self.onload) {
        self.naturalWidth = win.__imgSize.w;
        self.naturalHeight = win.__imgSize.h;
        self.onload();
      }
    }
    get src() { return this._src || ''; }
  };
  win.URL.createObjectURL = function () { return 'blob:fake-' + Math.random().toString(36).slice(2); };
  win.URL.revokeObjectURL = function () { };

  /* --- toasts globaux (couche dcc-sheet) --- */
  const toasts = [];
  const saveToasts = [];
  win.showToast = function (message, type, actionLabel, action) {
    toasts.push({ message: String(message), type: type || 'save', actionLabel: actionLabel || null, action: action || null });
  };
  win.showToastSave = function () { saveToasts.push(Date.now()); };

  /* --- serveur factice --- */
  const server = {
    prefs: Object.assign({
      tool: 'pen', color: '#111827', size: 24, bold: false, drawMode: true, active_map: 0,
    }, options.prefs || {}),
    maps: [],
    images: {},
    nextId: 1,
    calls: [],
    maxMaps: 10,
  };

  function row(id) {
    const m = server.maps.find(function (x) { return x.id === id; });
    return m;
  }
  function model(m) {
    const out = { v: 3, kind: 'dcc-map', w: m.data.w, h: m.data.h, ops: m.data.ops };
    if (m.bg_uid) out.bg = { uid: m.bg_uid, name: m.bg_name };
    out.ui = m.ui;
    return out;
  }
  function listRow(m) {
    return {
      id: m.id, name: m.name, bg_uid: m.bg_uid, bg_name: m.bg_name,
      ops: (m.data.ops || []).length, ui: m.ui, updated_at: '2026-10-07 10:00:00',
    };
  }

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
    server.calls.push({ url: u, method: method, action: action, body: body, form: isForm });

    let status = 200;
    let data = { ok: true };

    if (u.indexOf('api/map-image.php') !== -1) {
      if (action === 'upload') {
        /* UID hexadecimale (comme le vrai : bin2hex(random_bytes(16))) */
        const uid = (String(server.nextId++) + 'a1b2c3d4e5f60718293a4b5c6d7e8f90').slice(0, 32);
        let name = 'fond.webp';
        try {
          const form = opts.body;
          const fieldName = form && form.get && form.get('name');
          if (fieldName) name = String(fieldName);
          else {
            const f = form && form.get && form.get('file');
            if (f && f.name) name = f.name;
          }
        } catch (e) { /* FormData indisponible : nom par defaut */ }
        server.images[uid] = { name: name };
        data = { ok: true, uid: uid, name: name, converted: true };
      } else if (action === 'delete') {
        delete server.images[body && body.uid];
        data = { ok: true, deleted: true };
      }
    } else if (u.indexOf('api/maps.php') !== -1) {
      if (action === 'prefs_get') {
        data = { ok: true, prefs: server.prefs };
      } else if (action === 'prefs_save') {
        Object.assign(server.prefs, body.prefs || {});
        data = { ok: true, prefs: server.prefs };
      } else if (action === 'list') {
        data = { ok: true, maps: server.maps.map(listRow), max: server.maxMaps };
      } else if (action === 'get') {
        const m = row(Number(params.get('id')));
        if (!m) { status = 404; data = { ok: false, error: 'Carte introuvable' }; }
        else data = { ok: true, map: { id: m.id, name: m.name, model: model(m), bg_uid: m.bg_uid, bg_name: m.bg_name } };
      } else if (action === 'create') {
        if (server.maps.length >= server.maxMaps) {
          status = 409;
          data = { ok: false, error: 'Limite de ' + server.maxMaps + ' cartes atteinte — supprimez-en une pour en créer une nouvelle.' };
        } else {
          const m = {
            id: server.nextId++,
            name: (body && body.name) || ('Carte ' + server.maps.length),
            data: { v: 3, w: 0, h: 0, ops: [] },
            ui: {},
            bg_uid: '',
            bg_name: '',
          };
          server.maps.push(m);
          data = { ok: true, map: { id: m.id, name: m.name, model: model(m), bg_uid: '', bg_name: '' } };
        }
      } else if (action === 'save') {
        const m = row(Number(body.id));
        if (!m) { status = 404; data = { ok: false, error: 'Carte introuvable' }; }
        else {
          if (body.data !== undefined) m.data = body.data;
          if (body.ui !== undefined) m.ui = body.ui;
          if (body.bg_uid !== undefined) m.bg_uid = body.bg_uid;
          if (body.bg_name !== undefined) m.bg_name = body.bg_name;
          data = { ok: true };
        }
      } else if (action === 'rename') {
        const m = row(Number(body.id));
        if (m) m.name = body.name;
        data = { ok: true };
      } else if (action === 'delete') {
        const m = row(Number(body.id));
        let imageDeleted = false;
        if (m) {
          if (m.bg_uid && server.images[m.bg_uid]) {
            delete server.images[m.bg_uid];
            imageDeleted = true;
          }
          server.maps = server.maps.filter(function (x) { return x.id !== m.id; });
        }
        data = { ok: true, image_deleted: imageDeleted };
      } else if (action === 'check_images') {
        const missing = (body.uids || []).filter(function (uid) { return !server.images[uid]; });
        data = { ok: true, missing: missing };
      } else if (action === 'export_zip') {
        data = { ok: true, zip: true };
      } else if (action === 'import_all' || action === 'import_map') {
        data = options.importResponse || {
          ok: true,
          json: { version: 2, characters: [] },
          map: { v: 3, w: 100, h: 100, ops: [] },
          images: 1,
          missing: [],
        };
      }
    }

    return {
      ok: status < 400,
      status: status,
      json: async function () { return data; },
      blob: async function () { return { size: 10 }; },
    };
  }

  win.fetch = route;

  /* --- gestes pointeur --- */
  function pointer(target, type, x, y, id) {
    const ev = new win.MouseEvent(type, { bubbles: true, clientX: x, clientY: y, cancelable: true });
    Object.defineProperty(ev, 'pointerId', { value: id === undefined ? 1 : id });
    target.dispatchEvent(ev);
    return ev;
  }
  function stroke(target, points, id) {
    pointer(target, 'pointerdown', points[0][0], points[0][1], id);
    for (let i = 1; i < points.length; i++) {
      pointer(target, 'pointermove', points[i][0], points[i][1], id);
    }
    pointer(target, 'pointerup', points[points.length - 1][0], points[points.length - 1][1], id);
  }

  function loadModule() {
    env.load('map-draw.js');
    return win.DCCMapDraw;
  }

  return {
    env: env, win: win, doc: doc, errors: errors,
    ctxLog: ctxLog, toasts: toasts, saveToasts: saveToasts,
    server: server, pointer: pointer, stroke: stroke,
    loadModule: loadModule,
  };
}

async function waitFor(cond, timeout) {
  const t = timeout || 6000;
  const start = Date.now();
  for (;;) {
    let okNow = false;
    try { okNow = cond(); } catch (e) { okNow = false; }
    if (okNow) return true;
    if (Date.now() - start > t) return false;
    await delay(20);
  }
}

module.exports = { createMapEnv, waitFor };
