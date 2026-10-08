/* ============================================================
   DCC Sheet - Module Carte : dessin de carte plein ecran
   ------------------------------------------------------------
   Moteur porte de D:\VS Code\draw-on-map (index.js / ARCHI.md) :
     - coordonnees en unites de scene, epaisseur = ecran / zoom
     - canvas transparent (fenetre de vue x dpr), re-rendu au scroll
     - ops vectorielles : trait (s) / gomme (e, destination-out) / texte (t)
   Adaptations dcc-sheet :
     - ids DOM prefixes md- (aucune collision avec script.js)
     - persistance SQLite via api/maps.php : dessin (R6), vue + outils (R13)
     - fond d'image stocke data/maps/[UID].webp via api/map-image.php (R5)
     - toasts de la couche globale : showToast / showToastSave (R7)
     - croix de fermeture + Echap (R3), 10 calques max (D12)
   ============================================================ */
(function () {
  'use strict';

  /* =========================================================
     1. Configuration
     ========================================================= */
  var ZMIN = 0.05, ZMAX = 8, ZSTEP = 1.25;
  var STROKE_W = 6, ERASE_W = 32;
  var COLORS = [
    ['#111827', 'Noir'], ['#e11d48', 'Rouge'], ['#2563eb', 'Bleu'],
    ['#16a34a', 'Vert'], ['#f59e0b', 'Orange'], ['#7c3aed', 'Violet']
  ];
  var MAX_MAPS = 10;
  var SAVE_DELAY = 400;      /* debounce de la sauvegarde du dessin (R6) */
  var UI_DELAY = 1500;       /* debounce de la sauvegarde zoom / position */
  var PREFS_DELAY = 400;

  /* =========================================================
     2. Etat
     ========================================================= */
  var state = {
    ops: [], scene: { w: 0, h: 0 }, tool: 'pen', drawMode: true,
    color: COLORS[0][0], size: 24, bold: false,
    bg: { loaded: false, uid: '', name: '' }
  };
  var view = { dpr: 1, zoom: 1 };
  var prefs = { tool: 'pen', color: COLORS[0][0], size: 24, bold: false, drawMode: true, active_map: 0 };

  /* Chaque calque = un document ; le fond est une reference (uid + nom),
     jamais un binaire. */
  var docs = [], cur = 0, docSeq = 0;
  var bgVoid = true;         /* la carte active n'a pas de fond affichable */
  var ready = false, visible = false, loading = false;
  var saveTimer = 0, uiTimer = 0, prefsTimer = 0;
  var moduleEl = null;
  var els = {};              /* app, stage, cv, ctx, viewport, sceneEl, bgEl */
  var pendingZip = null;     /* .zip selectionne dans la feuille d'import */

  /* =========================================================
     3. Acces DOM (ids prefixes md-) + couche reseau
     ========================================================= */
  function $(id) { return document.getElementById('md-' + id); }

  function api(endpoint, params) {
    var url = 'api/' + endpoint;
    var options = { credentials: 'same-origin' };
    params = params || {};
    if (params.method === 'GET' || params.data) {
      var qs = Object.keys(params.data || {})
        .map(function (k) { return encodeURIComponent(k) + '=' + encodeURIComponent(params.data[k]); })
        .join('&');
      if (qs) url += (url.indexOf('?') === -1 ? '?' : '&') + qs;
      options.method = 'GET';
    } else if (params.form) {
      options.method = 'POST';
      options.body = params.form;              /* FormData : pas de Content-Type */
    } else if (params.body) {
      options.method = 'POST';
      options.headers = { 'Content-Type': 'application/json' };
      options.body = JSON.stringify(params.body);
    }
    return fetch(url, options).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (json) {
        if (!res.ok || json.ok === false) throw new Error(json.error || 'Erreur serveur');
        return json;
      });
    });
  }

  /* Toasts : couche globale dcc-sheet (D7), repli sur la snackbar du module. */
  function toast(msg, actionLabel, action, type) {
    if (window.showToast) {
      window.showToast(msg, type || 'save', actionLabel, action);
      return;
    }
    var el = $('toast');
    if (!el) return;
    el.innerHTML = '<span></span>';
    el.querySelector('span').textContent = msg;
    if (actionLabel) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = actionLabel;
      b.addEventListener('click', function () { if (action) action(); el.classList.remove('is-visible'); });
      el.appendChild(b);
    }
    el.classList.add('is-visible');
    setTimeout(function () { el.classList.remove('is-visible'); }, actionLabel ? 5000 : 3000);
  }
  function toastError(msg) { toast(msg, null, null, 'error'); }
  function toastSave() {
    if (window.showToastSave) window.showToastSave();
    else toast('Enregistre', null, null, 'save');
  }

  /* =========================================================
     4. Rendu (identique draw-on-map : ne pas casser ARCHI.md § 10)
     ========================================================= */
  function applyView() {
    var z = view.zoom * view.dpr;
    els.ctx.setTransform(z, 0, 0, z, -els.viewport.scrollLeft * view.dpr, -els.viewport.scrollTop * view.dpr);
  }
  function render() {
    els.ctx.setTransform(1, 0, 0, 1, 0, 0);
    els.ctx.globalCompositeOperation = 'source-over';
    els.ctx.clearRect(0, 0, els.cv.width, els.cv.height);
    applyView();
    for (var i = 0; i < state.ops.length; i++) drawOp(state.ops[i]);
  }
  function strokeSetup(op) {
    var erasing = op.k === 'e';
    els.ctx.globalCompositeOperation = erasing ? 'destination-out' : 'source-over';
    els.ctx.strokeStyle = erasing ? '#000' : op.c;
    els.ctx.fillStyle = erasing ? '#000' : op.c;
    els.ctx.lineWidth = op.w;
    els.ctx.lineCap = 'round';
    els.ctx.lineJoin = 'round';
  }
  function drawOp(op) {
    var ctx = els.ctx, i;
    if (op.k === 's' || op.k === 'e') {
      strokeSetup(op);
      var p = op.p;
      if (p.length === 1) {
        ctx.beginPath();
        ctx.arc(p[0][0], p[0][1], op.w / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
        return;
      }
      ctx.beginPath();
      ctx.moveTo(p[0][0], p[0][1]);
      for (i = 1; i < p.length; i++) ctx.lineTo(p[i][0], p[i][1]);
      ctx.stroke();
      ctx.globalCompositeOperation = 'source-over';
    } else if (op.k === 't') {
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = op.c;
      ctx.font = (op.b ? '700 ' : '400 ') + op.s + 'px ui-sans-serif, system-ui, sans-serif';
      ctx.textBaseline = 'top';
      var lines = String(op.t).split('\n'), lh = op.s * 1.25;
      for (i = 0; i < lines.length; i++) ctx.fillText(lines[i], op.x, op.y + i * lh);
    }
  }

  /* =========================================================
     5. Dimensionnement / zoom
     ========================================================= */

  /* Scène « infinie » (D17) : sans image de fond, la scène grandit pour
     toujours couvrir la zone visible + une réserve (sinon impossible de
     défiler) + le dessin. L'origine reste fixe en haut-gauche et le
     défilement ne peut pas être négatif : on ne grandit qu'à droite / en bas,
     donc jamais de coordonnées négatives. */
  function ensureScene() {
    if (state.bg.uid) return false;          /* avec une image : la scène = l'image */
    var r = els.viewport.getBoundingClientRect();
    var vw = r.width / view.zoom;
    var vh = r.height / view.zoom;
    var sx = els.viewport.scrollLeft / view.zoom;
    var sy = els.viewport.scrollTop / view.zoom;
    var needW = sx + vw * 2;                 /* visible + 1 écran de réserve */
    var needH = sy + vh * 2;
    var bb = contentBBox();
    if (bb) {
      needW = Math.max(needW, bb.x + bb.w + vw * 0.5);
      needH = Math.max(needH, bb.y + bb.h + vh * 0.5);
    }
    var changed = false;
    if (needW > state.scene.w) { state.scene.w = Math.ceil(needW); changed = true; }
    if (needH > state.scene.h) { state.scene.h = Math.ceil(needH); changed = true; }
    return changed;
  }

  /* Boite englobante du dessin (unités de scène) — sert au cadrage et à la
     croissance de la scène. null si aucun dessin. */
  function contentBBox() {
    if (!state.ops.length) return null;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    state.ops.forEach(function (op) {
      var pad = 0;
      if (op.k === 's' || op.k === 'e') {
        pad = (op.w || 0) / 2;
        op.p.forEach(function (q) {
          if (q[0] - pad < minX) minX = q[0] - pad;
          if (q[1] - pad < minY) minY = q[1] - pad;
          if (q[0] + pad > maxX) maxX = q[0] + pad;
          if (q[1] + pad > maxY) maxY = q[1] + pad;
        });
      } else if (op.k === 't') {
        var lines = String(op.t).split('\n');
        var wT = Math.max.apply(null, lines.map(function (l) { return l.length; })) * op.s * 0.62;
        var hT = lines.length * op.s * 1.25;
        if (op.x < minX) minX = op.x;
        if (op.y < minY) minY = op.y;
        if (op.x + wT > maxX) maxX = op.x + wT;
        if (op.y + hT > maxY) maxY = op.y + hT;
      }
    });
    if (!(maxX >= minX && maxY >= minY)) return null;
    return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
  }

  function layout() {
    ensureScene();                 /* la grille couvre toujours la zone visible */
    var r = els.viewport.getBoundingClientRect();
    view.dpr = Math.min(window.devicePixelRatio || 1, 3);
    var wPx = Math.max(1, Math.round(r.width * view.dpr));
    var hPx = Math.max(1, Math.round(r.height * view.dpr));
    if (els.cv.width !== wPx) els.cv.width = wPx;
    if (els.cv.height !== hPx) els.cv.height = hPx;
    els.sceneEl.style.width = Math.round(state.scene.w * view.zoom) + 'px';
    els.sceneEl.style.height = Math.round(state.scene.h * view.zoom) + 'px';
  }
  function syncZoomUI() {
    $('zoomLabel').textContent = Math.round(view.zoom * 100) + '%';
    $('zoomPct').textContent = Math.round(view.zoom * 100) + ' %';
    var v = Math.round(100 * Math.log(view.zoom / ZMIN) / Math.log(ZMAX / ZMIN));
    if (+$('zoomRange').value !== v) $('zoomRange').value = v;
    var ruler = $('zoomRuler');
    if (ruler && +ruler.value !== v) ruler.value = v;   /* reglette PC (D18) */
  }
  /* Zoom ancre sur un point ecran (base du pincement) */
  function zoomAt(next, ax, ay) {
    next = Math.min(ZMAX, Math.max(ZMIN, next));
    if (Math.abs(next - view.zoom) < 1e-9) { syncZoomUI(); return; }
    var r = els.viewport.getBoundingClientRect();
    if (ax === undefined) { ax = r.width / 2; ay = r.height / 2; }
    var sx = (els.viewport.scrollLeft + ax) / view.zoom;
    var sy = (els.viewport.scrollTop + ay) / view.zoom;
    view.zoom = next;
    layout();
    els.viewport.scrollLeft = Math.max(0, sx * next - ax);
    els.viewport.scrollTop = Math.max(0, sy * next - ay);
    render();
    syncZoomUI();
    saveCur();
    scheduleUiSave();
  }
  /* « Ajuster à l'écran » : avec une image = cadre l'image ; sans image =
     cadre le dessin (jamais la scène « infinie », sinon zoom et croissance de
     la scène se nourriraient l'un l'autre) ; carte vide = 100 % au coin. */
  function fitToView() {
    var r = els.viewport.getBoundingClientRect();
    if (!state.scene.w) return;

    if (!state.bg.uid) {
      var bb = contentBBox();
      if (!bb) {
        view.zoom = 1;
        layout();
        els.viewport.scrollLeft = 0;
        els.viewport.scrollTop = 0;
        render();
        syncZoomUI();
        saveCur();
        scheduleUiSave();
        return;
      }
      var zw = r.width / (bb.w * 1.15), zh = r.height / (bb.h * 1.15);
      view.zoom = Math.min(ZMAX, Math.max(ZMIN, Math.min(zw, zh)));
      layout();
      els.viewport.scrollLeft = Math.max(0, (bb.x + bb.w / 2) * view.zoom - r.width / 2);
      els.viewport.scrollTop = Math.max(0, (bb.y + bb.h / 2) * view.zoom - r.height / 2);
      render();
      syncZoomUI();
      saveCur();
      scheduleUiSave();
      return;
    }

    var z = Math.min(r.width / state.scene.w, r.height / state.scene.h);
    view.zoom = Math.min(ZMAX, Math.max(ZMIN, z));
    layout();
    els.viewport.scrollLeft = 0;
    els.viewport.scrollTop = 0;
    render();
    syncZoomUI();
    saveCur();
    scheduleUiSave();
  }

  /* =========================================================
     6. Geometrie
     ========================================================= */
  function toScene(clientX, clientY) {
    var r = els.cv.getBoundingClientRect();
    var x = (clientX - r.left + els.viewport.scrollLeft) / view.zoom;
    var y = (clientY - r.top + els.viewport.scrollTop) / view.zoom;
    return [Math.round(x * 10) / 10, Math.round(y * 10) / 10];
  }
  function r1(v) { return Math.round(v * 10) / 10; }
  function r2(v) { return Math.round(v * 100) / 100; }

  /* Ramene-douce (RDP) : epsilon exprime en pixels ecran. */
  function simplify(pts, eps) {
    if (pts.length < 3) return pts;
    var keep = new Uint8Array(pts.length);
    keep[0] = keep[pts.length - 1] = 1;
    var stack = [[0, pts.length - 1]];
    while (stack.length) {
      var seg = stack.pop();
      var a = seg[0], b = seg[1];
      if (b - a < 2) continue;
      var x1 = pts[a][0], y1 = pts[a][1];
      var x2 = pts[b][0], y2 = pts[b][1];
      var dx = x2 - x1, dy = y2 - y1;
      var len = Math.hypot(dx, dy) || 1;
      var maxD = -1, idx = -1;
      for (var i = a + 1; i < b; i++) {
        var d = Math.abs(dy * pts[i][0] - dx * pts[i][1] + x2 * y1 - y2 * x1) / len;
        if (d > maxD) { maxD = d; idx = i; }
      }
      if (maxD > eps) { keep[idx] = 1; stack.push([a, idx], [idx, b]); }
    }
    return pts.filter(function (_, i) { return keep[i]; });
  }

  function formatSize(bytes) {
    return bytes < 1024 ? bytes + ' o' : (bytes / 1024).toFixed(1).replace('.', ',') + ' Ko';
  }

  /* =========================================================
     7. Fond d'image (R5/R10/R11/D11)
     ========================================================= */
  /* L'entree « Retirer l'image de fond » n'est active qu'avec une image (D16) */
  function syncBgUI() {
    var b = $('bgClear');
    if (b) b.disabled = !state.bg.uid;
  }

  /* Affiche le fond reference par UID ; en cas d'absence, l'evenement error
     du <img> retombe sur la grille ET affiche le toast d'erreur (R11).
     La reference (uid + nom) est conservee : seul l'affichage est coupe. */
  function setBackground(uid, name) {
    if (!uid) {
      bgVoid = true;
      state.bg = { loaded: false, uid: '', name: '' };
      els.bgEl.hidden = true;
      els.sceneEl.classList.add('is-empty');
      els.bgEl.removeAttribute('src');
      syncBgUI();
      return;
    }
    bgVoid = false;
    state.bg = { loaded: true, uid: uid, name: name || '' };
    els.bgEl.hidden = false;
    els.bgEl.src = 'api/map-image.php?uid=' + encodeURIComponent(uid);
    els.sceneEl.classList.remove('is-empty');
    syncBgUI();
  }

  /* La carte porte-t-elle encore son nom genere (« Carte N ») ? Si oui, le
     chargement d'un fond la rebaptise (D15) — un nom personnalise est conserve. */
  function isDefaultName(name) {
    return !name || /^\s*$/.test(name) || /^Carte\s*\d+$/i.test(name);
  }

  /* Nom de la carte = nom du fichier image, sans son extension (D15). */
  function maybeNameFromImage(fileName) {
    var d = docs[cur];
    if (!d || !d.id) return;
    if (!isDefaultName(d.name)) return;
    var base = String(fileName || '').replace(/\.[^.]+$/, '').trim().slice(0, 40);
    if (!base || base === d.name) return;
    api('maps.php', { body: { action: 'rename', id: d.id, name: base } })
      .then(function () {
        d.name = base;
        renderMapList();
      })
      .catch(function () { /* le nom de creation est conserve */ });
  }

  /* Charge une image locale : upload -> data/maps/[UID].webp (nouvel UID),
     remplacement = l'ancienne image est supprimee si plus referencee (D11).
     Conversion webp cote navigateur quand c'est possible (D4, repli GD) :
     un fichier deja webp part tel quel. */
  function toWebpFile(file) {
    return new Promise(function (resolve) {
      try {
        if (!file || file.type === 'image/webp' || /\.webp$/i.test(file.name || '')) {
          resolve(file);
          return;
        }
        var url = URL.createObjectURL(file);
        var img = new Image();
        img.onload = function () {
          try {
            var canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || 1;
            canvas.height = img.naturalHeight || 1;
            var c2d = canvas.getContext('2d');
            if (!c2d || typeof canvas.toBlob !== 'function') {
              URL.revokeObjectURL(url);
              resolve(file);              /* repli : le serveur convertira (GD) */
              return;
            }
            c2d.drawImage(img, 0, 0);
            var done = false;
            var finish = function (out) {
              if (done) return;
              done = true;
              resolve(out);
            };
            /* Garde-fou : certains environnements n'appellent jamais le callback */
            setTimeout(function () { finish(file); }, 3000);
            canvas.toBlob(function (blob) {
              URL.revokeObjectURL(url);
              if (!blob) { finish(file); return; }
              finish(new File([blob], 'image.webp', { type: 'image/webp' }));
            }, 'image/webp', 0.85);
          } catch (e) {
            URL.revokeObjectURL(url);
            resolve(file);
          }
        };
        img.onerror = function () {
          URL.revokeObjectURL(url);
          resolve(file);
        };
        img.src = url;
      } catch (e) {
        resolve(file);
      }
    });
  }

  function loadBackground(file) {
    if (!file) return;
    var previous = state.bg.uid;
    toWebpFile(file).then(function (payload) {
      var form = new FormData();
      form.append('file', payload);
      form.append('name', file.name || 'image');   /* nom utilisateur = nom d'origine (D3) */
      return api('map-image.php?action=upload', { form: form });
    })
      .then(function (res) {
        var uid = res.uid, name = res.name || file.name || '';
        return probeImage('api/map-image.php?uid=' + encodeURIComponent(uid)).then(function (size) {
          setBackground(uid, name);
          resizeScene(size.w, size.h);
          view.zoom = 1;
          layout();
          els.viewport.scrollLeft = 0;
          els.viewport.scrollTop = 0;
          render();
          syncZoomUI();
          sync();
          setDrawMode(false);
          maybeNameFromImage(file.name || '');        /* D15 : « Carte N » -> nom du fichier */
          toast('Fond charge (' + size.w + '\u00d7' + size.h + ') \u2014 mode deplacement', null, null, 'success');
          if (previous && previous !== uid) {
            api('map-image.php?action=delete', { body: { uid: previous } }).catch(function () { /* purge best effort */ });
          }
        });
      })
      .catch(function (err) { toastError('Image refusee : ' + err.message); });
  }

  /* Dimensions naturelles d'une image (sans jamais l'utiliser comme surface). */
  function probeImage(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () {
        resolve({ w: img.naturalWidth || 1, h: img.naturalHeight || 1 });
      };
      img.onerror = function () { reject(new Error('Image illisible')); };
      img.src = src;
    });
  }

  function resizeScene(w, h) {
    var from = state.scene;
    if (!from.w || (from.w === w && from.h === h)) { state.scene = { w: w, h: h }; return; }
    if (state.ops.length) {
      var k = Math.min(w / from.w, h / from.h);
      var dx = (w - from.w * k) / 2, dy = (h - from.h * k) / 2;
      state.ops.forEach(function (op) {
        if (op.k === 's' || op.k === 'e') {
          op.p = op.p.map(function (q) { return [r1(q[0] * k + dx), r1(q[1] * k + dy)]; });
          op.w = r2(op.w * k);
        } else {
          op.x = r1(op.x * k + dx);
          op.y = r1(op.y * k + dy);
          op.s = r2(op.s * k);
        }
      });
      toast('Dessin ajuste aux dimensions de l\u2019image');
    }
    state.scene = { w: w, h: h };
  }

  /* =========================================================
     8. Serialisation (format v:3 — bg.uid + bg.name + ui)
     ========================================================= */
  function serialize() {
    var out = {
      v: 3, kind: 'dcc-map',
      w: Math.round(state.scene.w), h: Math.round(state.scene.h)
    };
    if (state.bg.uid) out.bg = { uid: state.bg.uid, name: state.bg.name || '' };
    out.ops = state.ops;
    out.ui = {
      zoom: r2(view.zoom),
      left: Math.round(els.viewport.scrollLeft),
      top: Math.round(els.viewport.scrollTop)
    };
    return JSON.stringify(out);
  }

  /* Validation par operation : chaque op est acceptee ou ignoree silencieusement
     ; throw seulement si aucune op n'est exploitable. Accepte v:2 et v:3. */
  function parseModel(text) {
    var data = typeof text === 'string' ? JSON.parse(text) : text;
    if (!data || typeof data !== 'object' || !Array.isArray(data.ops)) {
      throw new Error('Structure attendue : {"v":3,"w":…,"h":…,"ops":[…]}');
    }
    var num = function (v) { return Number.isFinite(+v) ? Math.round(+v * 10) / 10 : null; };
    var pts_ = function (arr) {
      return arr.map(function (q) { return Array.isArray(q) ? [num(q[0]), num(q[1])] : null; })
        .filter(function (q) { return q && q[0] !== null && q[1] !== null; });
    };
    var ops = [];
    data.ops.forEach(function (o) {
      if (!o || typeof o !== 'object') return;
      if ((o.k === 's' || o.k === 'e') && Array.isArray(o.p) && o.p.length) {
        var p = pts_(o.p);
        if (!p.length) return;
        if (o.k === 'e') ops.push({ k: 'e', w: +o.w > 0 ? +o.w : ERASE_W, p: p });
        else if (typeof o.c === 'string') ops.push({ k: 's', c: o.c, w: +o.w > 0 ? +o.w : STROKE_W, p: p });
      } else if (o.k === 't' && typeof o.t === 'string') {
        var x = num(o.x), y = num(o.y);
        if (x === null || y === null) return;
        ops.push({
          k: 't', c: typeof o.c === 'string' ? o.c : '#111827', x: x, y: y,
          s: +o.s > 0 ? +o.s : 24, b: o.b ? 1 : 0, t: o.t
        });
      }
    });
    if (!ops.length && data.ops.length) throw new Error('Aucune operation exploitable');

    /* Fond : v:3 = {uid,name}, v:2 = simple nom de fichier (sans UID) */
    var bg = { uid: '', name: '' };
    if (data.bg && typeof data.bg === 'object') {
      if (typeof data.bg.uid === 'string') bg.uid = data.bg.uid;
      if (typeof data.bg.name === 'string') bg.name = data.bg.name;
    } else if (typeof data.bg === 'string') {
      bg.name = data.bg;
    }
    var ui = null;
    if (data.ui && typeof data.ui === 'object') {
      ui = {
        zoom: +data.ui.zoom > 0 ? +data.ui.zoom : 1,
        left: +data.ui.left > 0 ? +data.ui.left : 0,
        top: +data.ui.top > 0 ? +data.ui.top : 0
      };
    }
    return {
      ops: ops,
      scene: { w: +data.w > 0 ? +data.w : 0, h: +data.h > 0 ? +data.h : 0 },
      bg: bg,
      ui: ui
    };
  }

  /* Importe un modele (ops validees). Si un fond est deja charge, le dessin
     est ramene au repere de l'image ; sinon la scene du fichier fait foi. */
  function applyImport(model) {
    state.ops = model.ops;
    if (model.scene.w) {
      if (state.bg.loaded && (model.scene.w !== state.scene.w || model.scene.h !== state.scene.h)) {
        var from = model.scene, to = state.scene;
        var k = Math.min(to.w / from.w, to.h / from.h);
        var dx = (to.w - from.w * k) / 2, dy = (to.h - from.h * k) / 2;
        if (k !== 1 || dx || dy) {
          state.ops.forEach(function (op) {
            if (op.k === 's' || op.k === 'e') {
              op.p = op.p.map(function (q) { return [r1(q[0] * k + dx), r1(q[1] * k + dy)]; });
              op.w = r2(op.w * k);
            } else {
              op.x = r1(op.x * k + dx);
              op.y = r1(op.y * k + dy);
              op.s = r2(op.s * k);
            }
          });
        }
      } else {
        state.scene = { w: model.scene.w, h: model.scene.h };
      }
    }
    /* Fond : remplacement si le modele en reference un (R11 gere l'absence) */
    if (model.bg.uid) {
      if (model.bg.uid !== state.bg.uid) {
        var previous = state.bg.uid;
        setBackground(model.bg.uid, model.bg.name);
        if (previous) {
          api('map-image.php?action=delete', { body: { uid: previous } }).catch(function () { });
        }
      }
    }
    if (model.ui) {
      view.zoom = Math.min(ZMAX, Math.max(ZMIN, model.ui.zoom));
      els.viewport.scrollLeft = model.ui.left;
      els.viewport.scrollTop = model.ui.top;
    }
    layout();
    render();
    syncZoomUI();
    sync();
    toast('Importe : ' + model.ops.length + ' operation(s)', null, null, 'success');
  }

  /* =========================================================
     9. Persistance (R6/R7/R13)
     ========================================================= */
  function saveCur() {
    var d = docs[cur];
    if (!d) return;
    d.ops = state.ops;
    d.opsCount = state.ops.length;
    d.scene = { w: state.scene.w, h: state.scene.h };
    d.zoom = view.zoom;
    d.left = els.viewport.scrollLeft;
    d.top = els.viewport.scrollTop;
    d.bg = { loaded: state.bg.loaded, uid: state.bg.uid, name: state.bg.name };
  }

  function persistNow() {
    clearTimeout(saveTimer);
    saveCur();
    var d = docs[cur];
    if (!d || !d.id || loading) return;
    api('maps.php', {
      body: {
        action: 'save', id: d.id,
        data: { w: Math.round(d.scene.w), h: Math.round(d.scene.h), ops: d.ops },
        ui: { zoom: r2(d.zoom), left: Math.round(d.left), top: Math.round(d.top) },
        bg_uid: d.bg.uid || '',
        bg_name: d.bg.name || ''
      }
    }).then(function () {
      toastSave();                                   /* R7 */
    }).catch(function () {
      toastError('Erreur de sauvegarde');
    });
  }
  function scheduleSave() {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(persistNow, SAVE_DELAY);
  }
  function scheduleUiSave() {
    clearTimeout(uiTimer);
    uiTimer = setTimeout(function () { persistNow(); }, UI_DELAY);
  }
  function persistPrefsNow() {
    clearTimeout(prefsTimer);
    prefs.tool = state.tool;
    prefs.color = state.color;
    prefs.size = state.size;
    prefs.bold = state.bold;
    prefs.drawMode = state.drawMode;
    api('maps.php', { body: { action: 'prefs_save', prefs: prefs } }).catch(function () { });
  }
  function schedulePrefsSave() {
    clearTimeout(prefsTimer);
    prefsTimer = setTimeout(persistPrefsNow, PREFS_DELAY);
  }

  /* =========================================================
     10. Calques (docs) — une ligne de table maps = un calque
     ========================================================= */
  function makeDoc(name) {
    var r = els.viewport.getBoundingClientRect();
    return {
      id: 0,
      name: name || ('Carte ' + (++docSeq)),
      ops: [], scene: { w: Math.round(r.width) || 412, h: Math.round(r.height) || 915 },
      zoom: 1, left: 0, top: 0,
      bg: { loaded: false, uid: '', name: '' }
    };
  }
  function docFromRow(row) {
    var ui = row.ui || {};
    return {
      id: row.id,
      name: row.name,
      ops: null,
      opsCount: +row.ops > 0 ? +row.ops : 0,
      scene: { w: 0, h: 0 },
      zoom: +ui.zoom > 0 ? +ui.zoom : 1,
      left: +ui.left > 0 ? +ui.left : 0,
      top: +ui.top > 0 ? +ui.top : 0,
      bg: { loaded: !!row.bg_uid, uid: row.bg_uid || '', name: row.bg_name || '' }
    };
  }

  /* Charge le dessin du calque i depuis la base puis restaure la vue (R13). */
  function loadDoc(i) {
    var d = docs[i];
    if (!d) return Promise.resolve();
    loading = true;
    return api('maps.php', { method: 'GET', data: { action: 'get', id: d.id } })
      .then(function (res) {
        cur = i;
        var model = parseModel(JSON.stringify(res.map.model));
        state.ops = model.ops;
        state.scene = model.scene.w ? model.scene : {
          w: Math.round(els.viewport.getBoundingClientRect().width) || 412,
          h: Math.round(els.viewport.getBoundingClientRect().height) || 915
        };
        setBackground(d.bg.uid, d.bg.name);
        view.zoom = d.zoom || 1;
        layout();
        els.viewport.scrollLeft = d.left || 0;
        els.viewport.scrollTop = d.top || 0;
        render();
        syncZoomUI();
        loading = false;
        sync(true);
        renderMapList();
      })
      .catch(function (err) {
        loading = false;
        toastError('Carte illisible : ' + err.message);
      });
  }

  function switchTo(i) {
    if (i === cur || !docs[i]) return;
    clearTimeout(saveTimer);
    persistNow();                 /* le calque sortant est ecrit tel quel */
    loadDoc(i).then(function () {
      prefs.active_map = docs[cur].id;
      persistPrefsNow();
      toast('Carte « ' + docs[cur].name + ' »');
    });
  }

  function createMap() {
    if (docs.length >= MAX_MAPS) {                 /* D12 */
      toastError('Limite de ' + MAX_MAPS + ' cartes atteinte \u2014 supprimez-en une pour en cr\u00e9er une nouvelle.');
      return;
    }
    saveCur();
    api('maps.php', { body: { action: 'create' } })
      .then(function (res) {
        docs.push(docFromRow(res.map));
        return loadDoc(docs.length - 1);
      })
      .then(function () {
        prefs.active_map = docs[cur].id;
        persistPrefsNow();
        renderMapList();
        toast('Nouvelle carte \u2014 rien n\u2019est effac\u00e9 ailleurs');
      })
      .catch(function (err) { toastError(err.message); });
  }

  function deleteMap(i) {
    var d = docs[i];
    if (!d || docs.length <= 1) { toastError('La derni\u00e8re carte ne peut pas \u00eatre supprim\u00e9e'); return; }
    api('maps.php', { body: { action: 'delete', id: d.id } })
      .then(function (res) {
        var wasCur = i === cur;
        docs.splice(i, 1);
        var msg = '\u00ab ' + d.name + ' \u00bb supprim\u00e9e';
        if (res.image_deleted) msg += ' \u2014 image de fond supprim\u00e9e';   /* R12 */
        if (!wasCur) {
          if (i < cur) cur--;
          saveCur();
          renderMapList();
          toast(msg);
        } else {
          cur = Math.min(i, docs.length - 1);
          loadDoc(cur).then(function () {
            prefs.active_map = docs[cur].id;
            persistPrefsNow();
            toast(msg);
          });
        }
      })
      .catch(function (err) { toastError(err.message); });
  }

  function renameMap(name) {
    var d = docs[cur];
    if (!d) return;
    var v = String(name || '').trim().slice(0, 40);
    if (!v) return;
    api('maps.php', { body: { action: 'rename', id: d.id, name: v } })
      .then(function () {
        d.name = v;
        renderMapList();
        toast('Carte renomm\u00e9e');
      })
      .catch(function (err) { toastError(err.message); });
  }

  /* Retire l'image de fond : le fichier part aussi s'il n'est plus reference (R12) */
  function removeBackground() {
    var uid = state.bg.uid;
    if (!uid) return;
    api('map-image.php?action=delete', { body: { uid: uid } })
      .catch(function () { })
      .then(function () {
        setBackground('', '');
        saveCur();
        layout();
        render();
        sync();
        persistNow();        /* action explicite : ecriture immediate (pas de debounce) */
        toast('Image de fond supprim\u00e9e');
      });
  }

  /* =========================================================
     11. Interface : statut, outils, palette, cartes
     ========================================================= */
  function buildPalette() {
    var box = $('palette');
    box.textContent = '';
    COLORS.forEach(function (entry) {
      var hex = entry[0], name = entry[1];
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'swatch';
      b.style.setProperty('--c', hex);
      b.setAttribute('aria-label', 'Couleur ' + name);
      b.setAttribute('aria-pressed', String(hex === state.color));
      b.innerHTML = '<span></span>';
      b.addEventListener('click', function () { setColor(hex); });
      box.appendChild(b);
    });
  }
  function setColor(hex) {
    state.color = hex;
    var swatches = $('palette').children;
    for (var i = 0; i < swatches.length; i++) {
      swatches[i].setAttribute('aria-pressed', String(swatches[i].style.getPropertyValue('--c') === hex));
    }
    $('colorWell').querySelector('i').style.setProperty('--c', hex);
    updateStatus();
    schedulePrefsSave();
  }
  function updateStatus() {
    var tool = state.tool;
    var label = !state.drawMode || tool === 'move' ? 'D\u00e9placement'
      : tool === 'text' ? 'Dessin actif \u00b7 texte'
        : tool === 'eraser' ? 'Dessin actif \u00b7 gomme (' + Math.round(ERASE_W) + ' px)'
          : 'Dessin actif \u00b7 crayon';
    $('status').textContent = label;
    var use = $('modeBtn').querySelector('use');
    use.setAttribute('href', state.drawMode
      ? (tool === 'text' ? '#mdi-text' : tool === 'eraser' ? '#mdi-eraser' : '#mdi-pen')
      : '#mdi-move');
  }
  function setDrawMode(on) {
    state.drawMode = !!on;
    $('modeBtn').setAttribute('aria-pressed', String(state.drawMode));
    els.stage.classList.toggle('is-panning', !state.drawMode);
    updateStatus();
    schedulePrefsSave();
  }
  function setTool(tool) {
    state.tool = tool;
    $('toolPen').setAttribute('aria-pressed', String(tool === 'pen'));
    $('toolText').setAttribute('aria-pressed', String(tool === 'text'));
    $('toolErase').setAttribute('aria-pressed', String(tool === 'eraser'));
    $('toolMove').setAttribute('aria-pressed', String(tool === 'move'));
    $('composer').classList.toggle('is-visible', tool === 'text');
    $('palette').classList.toggle('is-muted', tool === 'eraser');
    $('colorWell').classList.toggle('is-muted', tool === 'eraser');
    $('colorWell').setAttribute('aria-disabled', String(tool === 'eraser'));
    if (tool !== 'text') closeTray();
    els.stage.setAttribute('data-tool', tool);
    /* Choisir un outil = vouloir dessiner (ARCHI draw-on-map §6) : sans cela,
       on reste en mode deplacement apres un chargement de fond. */
    setDrawMode(tool !== 'move');
    if (tool === 'text') $('textInput').focus({ preventScroll: true });
    if (navigator.vibrate) { try { navigator.vibrate(8); } catch (e) { /* ignore */ } }
    updateStatus();
    schedulePrefsSave();
  }

  function openMapDlg() {
    var d = docs[cur];
    if (!d) return;
    $('mapName').value = d.name;
    /* Nom de l'image : conserve en base et dans les exports (R6/R10) mais
       volontairement ni affiche ni modifiable ici ; les actions sur l'image
       (choisir / retirer) vivent dans la feuille du calque (D16). */
    $('mapDelete').disabled = docs.length <= 1;
    $('mapDelete').hidden = false;
    $('mapConfirm').hidden = true;
    $('mapMeta').textContent =
      state.ops.length + ' op\u00e9ration(s) \u00b7 rep\u00e8re ' + Math.round(state.scene.w) + '\u00d7' + Math.round(state.scene.h) +
      (state.bg.uid ? ' \u00b7 image de fond' : ' \u00b7 aucun fond') +
      ' \u00b7 ' + docs.length + ' carte(s)';
    openDlg('mapDlg');
  }
  function openMapsDlg() {
    renderMapList();
    openDlg('mapsDlg');
  }
  function renderMapList() {
    var ul = $('mapList');
    if (!ul || !docs.length) return;
    ul.textContent = '';
    docs.forEach(function (d, i) {
      var li = document.createElement('li');
      li.className = 'maprow';
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'maprow__main';
      b.setAttribute('aria-current', String(i === cur));
      var nm = document.createElement('span');
      nm.className = 'mname';
      nm.textContent = d.name;
      var mt = document.createElement('span');
      mt.className = 'mmeta';
      var opsCount = i === cur ? state.ops.length : (d.ops ? d.ops.length : d.opsCount || 0);
      mt.textContent = opsCount + (opsCount > 1 ? ' op\u00e9rations' : ' op\u00e9ration');
      b.appendChild(nm);
      b.appendChild(mt);
      /* UID visible (R10) : preuve que la reference est bien persistee */
      var uid = document.createElement('span');
      uid.className = 'mmeta';
      uid.style.marginLeft = '8px';
      uid.textContent = d.bg.uid ? d.bg.uid.slice(0, 8) + '\u2026' : 'aucun';
      b.appendChild(uid);
      if (i === cur) {
        b.insertAdjacentHTML('beforeend', '<svg class="mcheck" aria-hidden="true"><use href="#mdi-check"/></svg>');
      }
      b.addEventListener('click', function () {
        closeDlg('mapsDlg');
        if (i !== cur) switchTo(i);
      });
      li.appendChild(b);
      ul.appendChild(li);
    });
    var newBtn = $('mapNew');
    if (newBtn) {
      /* Pas de desactivation : le clic doit pouvoir afficher le message de
         limite (D12) — c'est createMap() qui refuse au-dela de 10. */
      newBtn.setAttribute('aria-disabled', String(docs.length >= MAX_MAPS));
    }
  }
  function updateMapBadge() {
    var btn = $('mapsBtn'), c = $('mapCount');
    if (!btn || !c) return;
    var n = String(docs.length);
    if (c.textContent !== n) c.textContent = n;
    var lab = 'Cartes ouvertes : ' + n + ' / ' + MAX_MAPS;
    if (btn.getAttribute('aria-label') !== lab) btn.setAttribute('aria-label', lab);
  }

  /* sync(true) = pas de sauvegarde (chargement) */
  function sync(skipSave) {
    if (ensureScene()) layout();   /* la scene englobe le dessin (D17) */
    saveCur();
    $('undoBtn').disabled = state.ops.length === 0;
    updateMapBadge();
    if (!skipSave && !loading) scheduleSave();          /* R6 */
  }

  /* =========================================================
     12. Dialogues
     ========================================================= */
  function openDlg(id) { var d = $(id); if (d && !d.open) d.showModal(); }
  function closeDlg(id) { var d = $(id); if (d && d.open) d.close(); }

  /* Export / import ne concernent que le calque ACTIF (l'import ecrase son
     dessin) : leurs titres portent son nom pour ne pas confondre. */
  function updateSheetTitles() {
    var name = docs[cur] ? docs[cur].name : 'Carte';
    var t;
    t = $('moreTitle'); if (t) t.textContent = name;
    t = $('exportTitle'); if (t) t.textContent = 'Export \u2014 ' + name;
    t = $('importTitle'); if (t) t.textContent = 'Import \u2014 ' + name;
    syncBgUI();
  }

  function openTray() {
    if (state.tool === 'eraser') return;
    $('palette').classList.add('is-open');
    $('colorWell').setAttribute('aria-expanded', 'true');
  }
  function closeTray() {
    $('palette').classList.remove('is-open');
    $('colorWell').setAttribute('aria-expanded', 'false');
  }

  function exportMap() {
    closeDlg('moreDlg');
    updateSheetTitles();
    var json = serialize();
    $('exportOut').value = json;
    $('exportMeta').textContent =
      state.ops.length + ' op\u00e9ration(s) \u00b7 rep\u00e8re ' + Math.round(state.scene.w) + '\u00d7' + Math.round(state.scene.h) +
      (state.bg.uid ? ' \u00b7 fond ' + (state.bg.name || state.bg.uid) : '') +
      ' \u00b7 ' + formatSize(new Blob([json]).size);
    $('zipBtn').hidden = !state.bg.uid;
    openDlg('exportDlg');
  }

  /* Telecharge un ZIP (json + images) construit par le serveur (A3) */
  function downloadZip(payload, filename) {
    return fetch('api/maps.php?action=export_zip', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (res) {
      if (!res.ok) throw new Error('Export ZIP impossible');
      return res.blob();
    }).then(function (blob) {
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast('Fichier t\u00e9l\u00e9charg\u00e9', null, null, 'success');
    }).catch(function (err) { toastError(err.message); });
  }

  function doImport() {
    try {
      if (pendingZip) {
        var form = new FormData();
        form.append('file', pendingZip);
        pendingZip = null;
        api('maps.php?action=import_map', { form: form })
          .then(function (res) {
            closeDlg('importDlg');
            applyImport(parseModel(res.map));
            (res.missing || []).forEach(function (uid) {
              toastError('Image de fond introuvable (UID ' + String(uid).slice(0, 8) + '\u2026)');
            });
          })
          .catch(function (err) { toastError('Import impossible : ' + err.message); });
        return;
      }
      var model = parseModel($('importIn').value.trim());
      applyImport(model);
      closeDlg('importDlg');
    } catch (err) {
      toastError('Import impossible : ' + err.message);
    }
  }

  /* =========================================================
     13. Interaction pointeur (machine a etats multi-pointeurs)
     ========================================================= */
  var pts = new Map();
  var active = null, pinch = null, lastTap = 0, lastTapPos = [0, 0];

  function chromeHide() {
    if (!document.querySelector('#map-module dialog[open]')) els.app.classList.add('chrome-off');
  }
  function chromeShow() {
    if (!els.app.classList.contains('focus')) els.app.classList.remove('chrome-off');
  }
  function panBy(dx, dy) {
    var maxX = Math.max(0, els.viewport.scrollWidth - els.viewport.clientWidth);
    var maxY = Math.max(0, els.viewport.scrollHeight - els.viewport.clientHeight);
    els.viewport.scrollLeft = Math.min(maxX, Math.max(0, els.viewport.scrollLeft - dx));
    els.viewport.scrollTop = Math.min(maxY, Math.max(0, els.viewport.scrollTop - dy));
  }

  function bindPointers() {
    els.stage.addEventListener('pointerdown', function (e) {
      if (els.cv.setPointerCapture) {
        try { els.cv.setPointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      }
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      chromeHide();

      if (pts.size === 2) {                      /* 2 doigts -> on abandonne le trace */
        active = null;
        var v = Array.from(pts.values());
        pinch = {
          d0: Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) || 1,
          z0: view.zoom,
          mid: [(v[0].x + v[1].x) / 2, (v[0].y + v[1].y) / 2]
        };
        return;
      }
      if (pts.size > 2) return;
      e.preventDefault();

      var p = toScene(e.clientX, e.clientY);

      if (!state.drawMode || state.tool === 'move') {
        active = { id: e.pointerId, mode: 'pan', sx: e.clientX, sy: e.clientY };
        return;
      }
      if (state.tool === 'text') {
        active = { id: e.pointerId, mode: 'tap', sx: e.clientX, sy: e.clientY, p: p };
        return;
      }
      var erasing = state.tool === 'eraser';
      active = {
        id: e.pointerId, mode: 'draw',
        op: erasing
          ? { k: 'e', w: r2(ERASE_W / view.zoom), p: [p] }
          : { k: 's', c: state.color, w: r2(STROKE_W / view.zoom), p: [p] }
      };
      render();
      drawOp(active.op);
    });

    els.stage.addEventListener('pointermove', function (e) {
      if (pts.has(e.pointerId)) pts.set(e.pointerId, { x: e.clientX, y: e.clientY });

      if (pinch && pts.size >= 2) {
        var v = Array.from(pts.values());
        var d = Math.hypot(v[0].x - v[1].x, v[0].y - v[1].y) || 1;
        var mid = [(v[0].x + v[1].x) / 2, (v[0].y + v[1].y) / 2];
        var r = els.viewport.getBoundingClientRect();
        zoomAt(pinch.z0 * (d / pinch.d0), mid[0] - r.left, mid[1] - r.top);
        panBy(mid[0] - pinch.mid[0], mid[1] - pinch.mid[1]);
        pinch.mid = mid;
        render();
        return;
      }
      if (!active || e.pointerId !== active.id) return;
      e.preventDefault();

      if (active.mode === 'pan') {
        panBy(e.clientX - active.sx, e.clientY - active.sy);
        active.sx = e.clientX;
        active.sy = e.clientY;
        render();
        return;
      }
      if (active.mode !== 'draw') return;

      var p = toScene(e.clientX, e.clientY);
      var op = active.op, last = op.p[op.p.length - 1];
      if (Math.hypot(p[0] - last[0], p[1] - last[1]) < 1.4 / view.zoom) return;
      op.p.push(p);
      applyView();
      strokeSetup(op);
      els.ctx.beginPath();
      els.ctx.moveTo(last[0], last[1]);
      els.ctx.lineTo(p[0], p[1]);
      els.ctx.stroke();
      els.ctx.globalCompositeOperation = 'source-over';
    });

    function endPointer(e) {
      pts.delete(e.pointerId);
      if (pinch && pts.size < 2) pinch = null;
      chromeShow();
      if (!active || e.pointerId !== active.id) return;
      var a = active;
      active = null;

      if (a.mode === 'tap') {
        if (Math.hypot(e.clientX - a.sx, e.clientY - a.sy) < 10) placeText(a.p);
        return;
      }
      if (a.mode === 'pan') return;

      a.op.p = simplify(a.op.p, 1 / view.zoom).map(function (q) { return [r1(q[0]), r1(q[1])]; });
      state.ops.push(a.op);
      render();
      sync();                                      /* -> sauvegarde auto + toast (R6/R7) */
    }
    els.cv.addEventListener('pointerup', endPointer);
    els.cv.addEventListener('pointercancel', endPointer);
    els.cv.addEventListener('contextmenu', function (e) { e.preventDefault(); });

    /* Double-tap en mode deplacement : Ajuster <-> 100 % */
    els.cv.addEventListener('pointerup', function (e) {
      if (state.tool !== 'move' || !state.drawMode) return;
      var now = Date.now(), p = [e.clientX, e.clientY];
      var dbl = now - lastTap < 300 && Math.hypot(p[0] - lastTapPos[0], p[1] - lastTapPos[1]) < 24;
      lastTap = now;
      lastTapPos = p;
      if (dbl) { lastTap = 0; fitToView(); toast('Ajust\u00e9 \u00e0 l\u2019\u00e9cran'); }
    });
  }

  function placeText(p) {
    var raw = $('textInput').value.trim();
    if (!raw) {
      toast('Saisissez un texte avant de toucher la carte', null, null, 'error');
      $('textInput').focus();
      return;
    }
    var s = r2(state.size / view.zoom);
    els.ctx.font = (state.bold ? '700 ' : '400 ') + s + 'px ui-sans-serif, system-ui, sans-serif';
    var lines = raw.split('\n');
    var wText = Math.max.apply(null, lines.map(function (l) { return els.ctx.measureText(l).width; }));
    var hText = lines.length * s * 1.25;
    var x = Math.max(2, Math.min(p[0], state.scene.w - wText - 2));
    var y = Math.max(2, Math.min(p[1], state.scene.h - hText - 2));
    state.ops.push({
      k: 't', c: state.color, x: r1(x), y: r1(y), s: s, b: state.bold ? 1 : 0, t: raw
    });
    render();
    sync();
    toast('Texte plac\u00e9');
  }

  /* =========================================================
     14. Markup du module (ids md-, sprite mdi-)
     ========================================================= */
  var SPRITE =
    '<svg width="0" height="0" style="position:absolute" aria-hidden="true" focusable="false"><defs>' +
    '<symbol id="mdi-move" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 11V6a2 2 0 0 0-4 0"/><path d="M14 10V4a2 2 0 0 0-4 0v2"/><path d="M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.9-6-2.3l-3.6-3.6a2 2 0 0 1 2.8-2.8L7 15"/></symbol>' +
    '<symbol id="mdi-pen" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21.2 6.8a1 1 0 0 0-4-4L3.8 16.2a2 2 0 0 0-.5.8l-1.3 4.4a.5.5 0 0 0 .6.6l4.4-1.3a2 2 0 0 0 .8-.5z"/><path d="m15 5 4 4"/></symbol>' +
    '<symbol id="mdi-eraser" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></symbol>' +
    '<symbol id="mdi-text" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7V4h16v3"/><path d="M9 20h6"/><path d="M12 4v16"/></symbol>' +
    '<symbol id="mdi-undo" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M9 14 4 9l5-5"/><path d="M4 9h10.5A5.5 5.5 0 0 1 20 14.5 5.5 5.5 0 0 1 14.5 20H11"/></symbol>' +
    '<symbol id="mdi-more" viewBox="0 0 24 24" fill="currentColor"><circle cx="5" cy="12" r="1.7"/><circle cx="12" cy="12" r="1.7"/><circle cx="19" cy="12" r="1.7"/></symbol>' +
    '<symbol id="mdi-fit" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 7V5a2 2 0 0 1 2-2h2"/><path d="M17 3h2a2 2 0 0 1 2 2v2"/><path d="M21 17v2a2 2 0 0 1-2 2h-2"/><path d="M7 21H5a2 2 0 0 1-2-2v-2"/></symbol>' +
    '<symbol id="mdi-close" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></symbol>' +
    '<symbol id="mdi-share" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="m8.6 13.5 6.8 4"/><path d="m15.4 6.5-6.8 4"/></symbol>' +
    '<symbol id="mdi-download" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></symbol>' +
    '<symbol id="mdi-upload" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 21V9"/><path d="m7 14 5-5 5 5"/><path d="M5 3h14"/></symbol>' +
    '<symbol id="mdi-copy" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></symbol>' +
    '<symbol id="mdi-image" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="m21 15-5-5L5 21"/></symbol>' +
    '<symbol id="mdi-trash" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M8 6V4a2 2 0 0 1 1-1h6a2 2 0 0 1 1 1v2"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></symbol>' +
    '<symbol id="mdi-plus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M12 5v14"/><path d="M5 12h14"/></symbol>' +
    '<symbol id="mdi-minus" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M5 12h14"/></symbol>' +
    '<symbol id="mdi-eyeoff" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3l18 18"/><path d="M10.6 5.1A9.7 9.7 0 0 1 12 5c5.5 0 9 6 9 6a15.6 15.6 0 0 1-2.6 3.4"/><path d="M6.6 6.6A15.7 15.7 0 0 0 3 11s3.5 6 9 6a9.4 9.4 0 0 0 4.4-1.1"/></symbol>' +
    '<symbol id="mdi-chevup" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 15 6-6 6 6"/></symbol>' +
    '<symbol id="mdi-map" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m9 4-6 3v13l6-3 6 3 6-3V4l-6 3z"/><path d="M9 4v13"/><path d="M15 7v13"/></symbol>' +
    '<symbol id="mdi-layers" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 10 5-10 5L2 7z"/><path d="m2 12 10 5 10-5"/><path d="m2 17 10 5 10-5"/></symbol>' +
    '<symbol id="mdi-check" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></symbol>' +
    '</defs></svg>';

  function use(id) { return '<svg aria-hidden="true"><use href="#mdi-' + id + '"/></svg>'; }

  var HTML =
    '<div class="app" id="md-app">' +

    '<header id="md-top">' +
    '<button class="chip" id="md-modeBtn" type="button" aria-pressed="true" aria-label="Basculer entre dessin et d\u00e9placement">' +
    use('pen') + '<span id="md-status" role="status">Dessin actif \u00b7 crayon</span></button>' +
    '<div class="topright">' +
    '<button class="chip chip--maps" id="md-mapsBtn" type="button" aria-haspopup="dialog" aria-label="Cartes ouvertes : 1">' +
    use('layers') + '<span class="mcount" id="md-mapCount">1</span></button>' +
    '<div class="zoomcol">' +
    '<button class="chip chip--zoom" id="md-zoomChip" type="button" aria-label="Zoom : toucher pour 100 %, appuyer longuement pour ajuster">' +
    '<span id="md-zoomLabel">100%</span></button>' +
    '<div class="zoomruler-wrap">' +
    '<input type="range" class="zoomruler" id="md-zoomRuler" min="0" max="100" value="59" ' +
    'aria-label="R\u00e9glette de zoom">' +
    '</div>' +
    '</div>' +
    '<button id="md-close" type="button" aria-label="Fermer le module carte" title="Fermer">' + use('close') + '</button>' +
    '</div></header>' +

    '<main class="stage" id="md-stage" data-tool="pen">' +
    '<div class="frame">' +
    '<div class="viewport" id="md-viewport">' +
    '<div class="scene is-empty" id="md-scene">' +
    '<img id="md-bg" alt="Carte de fond" hidden draggable="false">' +
    '</div></div>' +
    '<canvas id="md-cv" aria-label="Zone de dessin"></canvas>' +
    '</div></main>' +

    '<div id="md-toast" role="status" aria-live="polite"><span></span></div>' +

    '<div id="md-bottom">' +
    '<div class="tray" id="md-palette" role="group" aria-label="Couleurs"></div>' +

    '<div class="shelf" id="md-composer">' +
    '<textarea id="md-textInput" rows="1" placeholder="Votre texte\u2026" aria-label="Texte \u00e0 ins\u00e9rer"></textarea>' +
    '<div class="shelfrow">' +
    '<select id="md-fontSize" aria-label="Taille de police">' +
    '<option value="18">18 px</option><option value="24" selected>24 px</option>' +
    '<option value="32">32 px</option><option value="48">48 px</option></select>' +
    '<button class="tbtn" id="md-boldBtn" type="button" aria-pressed="false" aria-label="Gras">B</button>' +
    '<span class="hint" id="md-composerHint">Touchez la carte pour placer</span>' +
    '</div></div>' +

    '<nav class="dock" aria-label="Barre d\u2019outils">' +
    '<div class="seg" role="group" aria-label="Outils">' +
    '<button id="md-toolMove" type="button" aria-pressed="false" aria-label="D\u00e9placer la carte" title="D\u00e9placer">' + use('move') + '</button>' +
    '<button id="md-toolPen" type="button" aria-pressed="true" aria-label="Crayon" title="Crayon">' + use('pen') + '</button>' +
    '<button id="md-toolErase" type="button" aria-pressed="false" aria-label="Gomme" title="Gomme">' + use('eraser') + '</button>' +
    '<button id="md-toolText" type="button" aria-pressed="false" aria-label="Texte" title="Texte">' + use('text') + '</button>' +
    '</div>' +
    '<button class="rbtn" id="md-undoBtn" type="button" aria-label="Annuler la derni\u00e8re action" disabled>' + use('undo') + '</button>' +
    '<button class="rbtn colorwell" id="md-colorWell" type="button" aria-expanded="false" aria-label="Couleur du trait"><i></i></button>' +
    '<button class="rbtn" id="md-moreBtn" type="button" aria-label="Plus d\u2019actions" aria-haspopup="dialog">' + use('more') + '</button>' +
    '</nav></div>' +

    '<button id="md-peek" type="button" aria-label="R\u00e9afficher la barre d\u2019outils">' + use('chevup') + '</button>' +

    /* ---- Feuille « Plus » ---- */
    '<dialog id="md-moreDlg" aria-labelledby="md-moreTitle">' +
    '<span class="handle" aria-hidden="true"></span>' +
    '<div class="dhead"><h2 id="md-moreTitle">Plus</h2>' +
    '<button class="rbtn" data-close="moreDlg" type="button" aria-label="Fermer">' + use('close') + '</button></div>' +
    '<div class="dbody">' +
    '<div class="group"><h3>Vue</h3>' +
    '<div class="row" style="padding:0 8px">' +
    '<button class="rbtn" id="md-zoomOut" type="button" aria-label="D\u00e9zoomer">' + use('minus') + '</button>' +
    '<input type="range" id="md-zoomRange" min="0" max="100" value="59" aria-label="Niveau de zoom">' +
    '<button class="rbtn" id="md-zoomIn" type="button" aria-label="Zoomer">' + use('plus') + '</button></div>' +
    '<button class="item" id="md-fitBtn" type="button">' + use('fit') + 'Ajuster \u00e0 l\u2019\u00e9cran<span class="val" id="md-zoomPct">100 %</span></button>' +
    '</div>' +
    '<div class="group"><h3>Fichier</h3>' +
    '<button class="item" id="md-exportBtn" type="button">' + use('download') + 'Exporter le JSON / ZIP</button>' +
    '<button class="item" id="md-importBtn" type="button">' + use('upload') + 'Importer un JSON / ZIP</button>' +
    '<button class="item" id="md-bgBtn" type="button">' + use('image') + 'Choisir une image de fond</button>' +
    '<button class="item item--danger" id="md-bgClear" type="button">' + use('trash') + 'Retirer l\u2019image de fond</button>' +
    '<div class="confirm" id="md-bgConfirm" hidden>' +
    '<p class="confirm-msg">Retirer l\u2019image de fond de \u00ab <b id="md-bgMap"></b> \u00bb ?' +
    '<span>L\u2019image du serveur est supprim\u00e9e si plus aucune carte ne l\u2019utilise ; le dessin est conserv\u00e9 (sur la grille).</span></p>' +
    '<div class="row">' +
    '<button class="btn btn--danger-solid" id="md-bgRemoveDo" type="button">Oui, retirer</button>' +
    '<button class="btn" id="md-bgRemoveCancel" type="button">Annuler</button>' +
    '</div></div>' +
    '</div>' +
    '<div class="group"><h3>Affichage</h3>' +
    '<button class="item" id="md-hideBtn" type="button">' + use('eyeoff') + 'Masquer l\u2019interface<span class="val">mode focus</span></button>' +
    '</div>' +
    '<div class="group"><h3>Dessin</h3>' +
    '<button class="item item--danger" id="md-clearBtn" type="button">' + use('trash') + 'Effacer tout le dessin</button>' +
    '<div class="confirm" id="md-clearConfirm" hidden>' +
    '<p class="confirm-msg">Effacer les <b id="md-clearCount">0</b> op\u00e9ration(s) de \u00ab <b id="md-clearMap"></b> \u00bb ?' +
    '<span>Le fichier image n\u2019est pas touch\u00e9. Une snackbar \u00ab Annuler \u00bb reste offerte 5 s.</span></p>' +
    '<div class="row">' +
    '<button class="btn btn--danger-solid" id="md-clearDo" type="button">Oui, effacer</button>' +
    '<button class="btn" id="md-clearCancel" type="button">Annuler</button>' +
    '</div></div></div>' +
    '</div>' +
    '<input type="file" id="md-bgInput" accept="image/webp,image/*" hidden>' +
    '</dialog>' +

    /* ---- Export ---- */
    '<dialog id="md-exportDlg" aria-labelledby="md-exportTitle">' +
    '<span class="handle" aria-hidden="true"></span>' +
    '<div class="dhead"><h2 id="md-exportTitle">Export JSON</h2>' +
    '<button class="rbtn" id="md-closeExport" type="button" aria-label="Fermer">' + use('close') + '</button></div>' +
    '<div class="dbody">' +
    '<p class="meta" id="md-exportMeta"></p>' +
    '<textarea class="mono" id="md-exportOut" readonly aria-label="Contenu JSON"></textarea>' +
    '</div>' +
    '<div class="dfoot">' +
    '<button class="btn btn--primary" id="md-shareBtn" type="button">' + use('share') + 'Partager</button>' +
    '<button class="btn" id="md-copyBtn" type="button">' + use('copy') + 'Copier</button>' +
    '<button class="btn" id="md-downloadBtn" type="button">' + use('download') + '.json</button>' +
    '<button class="btn" id="md-zipBtn" type="button" hidden>.zip (avec image)</button>' +
    '</div></dialog>' +

    /* ---- Import ---- */
    '<dialog id="md-importDlg" aria-labelledby="md-importTitle">' +
    '<span class="handle" aria-hidden="true"></span>' +
    '<div class="dhead"><h2 id="md-importTitle">Importer un JSON / ZIP</h2>' +
    '<button class="rbtn" id="md-closeImport" type="button" aria-label="Fermer">' + use('close') + '</button></div>' +
    '<div class="dbody">' +
    '<p class="meta">Choisissez un fichier (.json ou .zip) ou collez le JSON.</p>' +
    '<div class="file"><label for="md-fileInput">Fichier :</label>' +
    '<input type="file" id="md-fileInput" accept=".json,.zip,application/json,application/zip"></div>' +
    '<div style="padding:8px 8px 0">' +
    '<textarea class="mono" id="md-importIn" style="height:18dvh" placeholder=\'{"v":3,"w":1600,"h":900,"bg":{"uid":"\u2026","name":"\u2026"},"ops":[\u2026]}\' aria-label="Contenu JSON \u00e0 importer"></textarea>' +
    '</div></div>' +
    '<div class="dfoot">' +
    '<button class="btn btn--primary" id="md-doImport" type="button">Importer</button>' +
    '<button class="btn" data-close="importDlg" type="button">Fermer</button>' +
    '</div></dialog>' +

    /* ---- Calques ---- */
    '<dialog id="md-mapsDlg" aria-labelledby="md-mapsTitle">' +
    '<span class="handle" aria-hidden="true"></span>' +
    '<div class="dhead"><h2 id="md-mapsTitle">Cartes</h2>' +
    '<button class="rbtn" data-close="mapsDlg" type="button" aria-label="Fermer">' + use('close') + '</button></div>' +
    '<div class="dbody">' +
    '<p class="meta">Touchez une carte pour l\u2019ouvrir. Maximum ' + MAX_MAPS + ' cartes par compte.</p>' +
    '<ul class="maplist" id="md-mapList" aria-label="Cartes disponibles"></ul>' +
    '<div class="group">' +
    '<button class="item" id="md-mapNew" type="button">' + use('plus') + 'Nouvelle carte</button>' +
    '<button class="item" id="md-mapOpts" type="button">' + use('map') + 'Options de la carte\u2026</button>' +
    '</div></div></dialog>' +

    /* ---- Options de la carte ---- */
    '<dialog id="md-mapDlg" aria-labelledby="md-mapTitle">' +
    '<span class="handle" aria-hidden="true"></span>' +
    '<div class="dhead"><h2 id="md-mapTitle">Options de la carte</h2>' +
    '<button class="rbtn" data-close="mapDlg" type="button" aria-label="Fermer">' + use('close') + '</button></div>' +
    '<div class="dbody">' +
    '<div class="group"><h3>Nom</h3>' +
    '<div class="namerow">' +
    '<input class="textin" id="md-mapName" type="text" maxlength="40" placeholder="Nom de la carte" aria-label="Nom de la carte">' +
    '<button class="btn" id="md-mapRename" type="button">Renommer</button></div></div>' +
    '<div class="group"><h3>Suppression</h3>' +
    '<button class="item item--danger" id="md-mapDelete" type="button">' + use('trash') + 'Supprimer cette carte</button>' +
    '<div class="confirm" id="md-mapConfirm" hidden>' +
    '<p class="confirm-msg">Supprimer \u00ab <b id="md-mapDelName"></b> \u00bb et ses dessins ?' +
    '<span>L\u2019image de fond est aussi supprim\u00e9e si plus aucune carte ne l\u2019utilise.</span></p>' +
    '<div class="row">' +
    '<button class="btn btn--danger-solid" id="md-mapDoDelete" type="button">Oui, supprimer</button>' +
    '<button class="btn" id="md-mapKeep" type="button">Annuler</button>' +
    '</div></div></div>' +
    '<p class="meta" id="md-mapMeta"></p>' +
    '</div></dialog>' +

    '</div>';

  /* =========================================================
     15. Construction du DOM + cablage
     ========================================================= */
  function buildDOM() {
    moduleEl = document.createElement('div');
    moduleEl.id = 'map-module';
    moduleEl.hidden = true;
    moduleEl.innerHTML = SPRITE + HTML;
    document.body.appendChild(moduleEl);

    els.app = $('app');
    els.stage = $('stage');
    els.cv = $('cv');
    els.ctx = els.cv.getContext('2d');
    els.viewport = $('viewport');
    els.sceneEl = $('scene');
    els.bgEl = $('bg');

    /* Fond absent / illisible -> grille de repli + toast d'erreur (R11).
     La reference (uid + nom) est CONSERVEE : seul l'affichage est coupe. */
    els.bgEl.addEventListener('load', function () {
      if (bgVoid) return;
      els.bgEl.hidden = false;
      els.sceneEl.classList.remove('is-empty');
    });
    els.bgEl.addEventListener('error', function () {
      if (bgVoid) return;
      bgVoid = true;
      els.sceneEl.classList.add('is-empty');
      els.bgEl.hidden = true;
      if (state.bg.loaded && state.bg.uid) {
        toastError('Image de fond introuvable (UID ' + state.bg.uid.slice(0, 8) + '\u2026)');
      }
      state.bg.loaded = false;
    });

    bindPointers();
    bindUI();

    buildPalette();
    setColor(state.color);
    setTool('pen');
    setDrawMode(true);
    sync(true);
  }

  function bindUI() {
    /* --- outils --- */
    $('toolPen').addEventListener('click', function () { setTool('pen'); });
    $('toolText').addEventListener('click', function () { setTool('text'); });
    $('toolErase').addEventListener('click', function () { setTool('eraser'); });
    $('toolMove').addEventListener('click', function () { setTool('move'); });
    $('modeBtn').addEventListener('click', function () {
      if (state.drawMode) setTool('move');
      else setTool('pen');
    });

    $('fontSize').addEventListener('change', function (e) {
      state.size = +e.target.value;
      schedulePrefsSave();
    });
    $('boldBtn').addEventListener('click', function (e) {
      state.bold = !state.bold;
      e.currentTarget.setAttribute('aria-pressed', String(state.bold));
      schedulePrefsSave();
    });

    /* --- couleur --- */
    $('colorWell').addEventListener('click', function () {
      if ($('palette').classList.contains('is-open')) closeTray();
      else openTray();
    });
    document.addEventListener('pointerdown', function (e) {
      if ($('palette').classList.contains('is-open') &&
        !e.target.closest('#md-palette') && !e.target.closest('#md-colorWell')) closeTray();
    }, true);

    /* --- annuler --- */
    $('undoBtn').addEventListener('click', function () {
      state.ops.pop();
      render();
      sync();
    });

    /* --- zoom --- */
    $('zoomIn').addEventListener('click', function () { zoomAt(view.zoom * ZSTEP); });
    $('zoomOut').addEventListener('click', function () { zoomAt(view.zoom / ZSTEP); });
    $('fitBtn').addEventListener('click', fitToView);
    $('zoomRange').addEventListener('input', function (e) {
      zoomAt(ZMIN * Math.pow(ZMAX / ZMIN, +e.target.value / 100));
    });
    $('zoomRuler').addEventListener('input', function (e) {
      zoomAt(ZMIN * Math.pow(ZMAX / ZMIN, +e.target.value / 100));
    });
    var holdTimer = 0, held = false;
    $('zoomChip').addEventListener('click', function () {
      if (held) return;
      zoomAt(1);
      toast('Zoom 100 %');
    });
    $('zoomChip').addEventListener('pointerdown', function () {
      held = false;
      holdTimer = setTimeout(function () {
        held = true;
        fitToView();
        toast('Ajust\u00e9 \u00e0 l\u2019\u00e9cran');
      }, 480);
    });
    ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (ev) {
      $('zoomChip').addEventListener(ev, function () { clearTimeout(holdTimer); });
    });

    /* --- feuilles --- */
    $('moreBtn').addEventListener('click', function () {
      updateSheetTitles();
      openDlg('moreDlg');
    });
    /* data-close = id LOGIQUE (SANS prefixe md-) : closeDlg() ajoute lui-meme
       le prefixe — un data-close="md-xxx" ferait getElementById('md-md-xxx')
       = null, donc un clic sans effet (bug reel sur la feuille « Plus »). */
    var closers = moduleEl.querySelectorAll('[data-close]');
    for (var c = 0; c < closers.length; c++) {
      (function (b) {
        b.addEventListener('click', function () { closeDlg(b.getAttribute('data-close')); });
      })(closers[c]);
    }
    $('exportBtn').addEventListener('click', exportMap);
    $('closeExport').addEventListener('click', function () { closeDlg('exportDlg'); });
    $('importBtn').addEventListener('click', function () {
      closeDlg('moreDlg');
      pendingZip = null;
      $('importIn').value = '';
      updateSheetTitles();
      openDlg('importDlg');
    });
    $('closeImport').addEventListener('click', function () { closeDlg('importDlg'); });

    $('copyBtn').addEventListener('click', function () {
      var value = $('exportOut').value;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(value).then(function () {
          toast('JSON copi\u00e9', null, null, 'success');
        }).catch(function () {
          $('exportOut').select();
          toast('JSON copi\u00e9', null, null, 'success');
        });
      } else {
        $('exportOut').select();
        toast('JSON copi\u00e9', null, null, 'success');
      }
    });
    $('shareBtn').addEventListener('click', function () {
      var txt = $('exportOut').value;
      if (navigator.share) {
        navigator.share({ title: 'Dessin carte', text: txt }).catch(function () { /* annule */ });
      } else {
        toast('Partage natif indisponible \u2014 Copier \u00e0 la place');
      }
    });
    $('downloadBtn').addEventListener('click', function () {
      var blob = new Blob([$('exportOut').value], { type: 'application/json' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = 'carte-' + new Date().toISOString().slice(0, 10) + '.json';
      a.click();
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
      toast('Fichier t\u00e9l\u00e9charg\u00e9', null, null, 'success');
    });
    $('zipBtn').addEventListener('click', function () {
      if (!state.bg.uid) return;
      var date = new Date().toISOString().slice(0, 10);
      downloadZip({
        file: 'carte-' + date + '.json',
        json: JSON.parse(serialize()),
        images: [state.bg.uid]
      }, 'carte-' + date + '.zip');
    });

    $('fileInput').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (!file) return;
      if (/\.zip$/i.test(file.name || '')) {
        pendingZip = file;
        $('importIn').value = '';
        toast('ZIP s\u00e9lectionn\u00e9 \u2014 cliquez sur Importer');
        return;
      }
      pendingZip = null;
      var fr = new FileReader();
      fr.onload = function () { $('importIn').value = String(fr.result); };
      fr.readAsText(file);
    });
    $('doImport').addEventListener('click', doImport);

    /* --- fond --- */
    $('bgBtn').addEventListener('click', function () { closeDlg('moreDlg'); $('bgInput').click(); });
    /* Entree unique de l'image de fond : choisir (charger OU remplacer) et
       retirer, dans la feuille du calque (D16 — plus aucune entree dans
       « Options de la carte »). Retirer demande une confirmation (2 temps,
       meme motif que « Effacer tout le dessin »). */
    $('bgClear').addEventListener('click', function () {
      $('bgMap').textContent = docs[cur] ? docs[cur].name : '';
      $('bgClear').hidden = true;
      $('bgConfirm').hidden = false;
      $('bgRemoveDo').focus();
    });
    $('bgRemoveCancel').addEventListener('click', function () {
      $('bgConfirm').hidden = true;
      $('bgClear').hidden = false;
      $('bgClear').focus();
    });
    $('bgRemoveDo').addEventListener('click', function () {
      $('bgConfirm').hidden = true;
      $('bgClear').hidden = false;
      closeDlg('moreDlg');
      removeBackground();
    });
    $('bgInput').addEventListener('change', function (e) {
      var file = e.target.files && e.target.files[0];
      if (file) loadBackground(file);
      e.target.value = '';
    });

    /* --- effacer : 2 temps, puis snackbar « Annuler » --- */
    $('clearBtn').addEventListener('click', function () {
      if (!state.ops.length) { closeDlg('moreDlg'); toast('Rien \u00e0 effacer'); return; }
      $('clearCount').textContent = state.ops.length;
      $('clearMap').textContent = docs[cur] ? docs[cur].name : '';
      $('clearBtn').hidden = true;
      $('clearConfirm').hidden = false;
      $('clearDo').focus();
    });
    $('clearCancel').addEventListener('click', function () {
      $('clearConfirm').hidden = true;
      $('clearBtn').hidden = false;
      $('clearBtn').focus();
    });
    $('clearDo').addEventListener('click', function () {
      var backup = state.ops;
      state.ops = [];
      $('clearConfirm').hidden = true;
      $('clearBtn').hidden = false;
      render();
      sync();
      closeDlg('moreDlg');
      toast('Dessin effac\u00e9', 'Annuler', function () {
        state.ops = backup;
        render();
        sync();
      });
    });
    $('moreDlg').addEventListener('close', function () {
      $('clearConfirm').hidden = true;
      $('clearBtn').hidden = false;
      $('bgConfirm').hidden = true;
      $('bgClear').hidden = false;
    });

    /* --- calques --- */
    $('mapsBtn').addEventListener('click', openMapsDlg);
    $('mapNew').addEventListener('click', function () {
      closeDlg('mapsDlg');
      createMap();
    });
    $('mapOpts').addEventListener('click', function () {
      closeDlg('mapsDlg');
      openMapDlg();
    });
    $('mapRename').addEventListener('click', function () {
      var v = $('mapName').value;
      if (!v.trim()) { toast('Donnez un nom \u00e0 cette carte', null, null, 'error'); $('mapName').focus(); return; }
      renameMap(v);
      closeDlg('mapDlg');
    });
    $('mapName').addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); $('mapRename').click(); }
    });
    $('mapDelete').addEventListener('click', function () {
      $('mapDelName').textContent = docs[cur] ? docs[cur].name : '';
      $('mapDelete').hidden = true;
      $('mapConfirm').hidden = false;
      $('mapDoDelete').focus();
    });
    $('mapKeep').addEventListener('click', function () {
      $('mapConfirm').hidden = true;
      $('mapDelete').hidden = false;
      $('mapDelete').focus();
    });
    $('mapDoDelete').addEventListener('click', function () {
      var i = cur;
      $('mapConfirm').hidden = true;
      $('mapDelete').hidden = false;
      closeDlg('mapDlg');
      deleteMap(i);
    });
    $('mapDlg').addEventListener('close', function () {
      $('mapConfirm').hidden = true;
      $('mapDelete').hidden = false;
    });

    /* --- mode focus --- */
    $('hideBtn').addEventListener('click', function () {
      closeDlg('moreDlg');
      els.app.classList.add('focus', 'chrome-off');
      toast('Interface masqu\u00e9e \u2014 touchez la fl\u00e8che pour la rendre visible');
    });
    $('peek').addEventListener('click', function () {
      els.app.classList.remove('focus', 'chrome-off');
      $('moreBtn').focus();
    });

    /* --- fermeture (R3) --- */
    $('close').addEventListener('click', closeModule);

    /* --- defilement : le calque suit, la vue est memorisee --- */
    var raf = 0;
    els.viewport.addEventListener('scroll', function () {
      if (raf) return;
      raf = window.requestAnimationFrame(function () {
        raf = 0;
        if (ensureScene()) layout();   /* scene infinie : la grille suit l'exploration */
        render();
        saveCur();
        scheduleUiSave();
      });
    }, { passive: true });

    document.addEventListener('gesturestart', function (e) { e.preventDefault(); });

    var resizeTimer = 0;
    var onResize = function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (!visible) return;
        layout();
        render();
      }, 120);
    };
    window.addEventListener('resize', onResize);
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
  }

  /* =========================================================
     16. Cycle de vie : ouverture / fermeture
     ========================================================= */
  function onKeydown(e) {
    if (e.key !== 'Escape') return;
    if (document.querySelector('#map-module dialog[open]')) return;  /* dialog d'abord */
    e.preventDefault();
    closeModule();
  }

  function applyPrefs(p) {
    p = p || {};
    if (typeof p.color === 'string') state.color = p.color;
    if (+p.size > 0) state.size = +p.size;
    state.bold = !!p.bold;
    state.drawMode = p.drawMode !== false;
    prefs.tool = p.tool || 'pen';
    prefs.color = state.color;
    prefs.size = state.size;
    prefs.bold = state.bold;
    prefs.drawMode = state.drawMode;
    if (p.active_map) prefs.active_map = p.active_map;
    $('fontSize').value = String([18, 24, 32, 48].indexOf(state.size) !== -1 ? state.size : 24);
    $('boldBtn').setAttribute('aria-pressed', String(state.bold));
    setColor(state.color);
    setTool(prefs.tool);
    setDrawMode(state.drawMode);
  }

  function openModule() {
    if (visible) return;
    if (!ready) {
      buildDOM();
      ready = true;
    }
    moduleEl.hidden = false;
    visible = true;
    document.addEventListener('keydown', onKeydown);
    loading = true;

    Promise.all([
      api('maps.php', { method: 'GET', data: { action: 'prefs_get' } }).catch(function () { return { prefs: {} }; }),
      api('maps.php', { method: 'GET', data: { action: 'list' } }).catch(function () { return { maps: [] }; })
    ]).then(function (res) {
      applyPrefs(res[0].prefs);
      var list = res[1].maps || [];
      if (!list.length) {
        return api('maps.php', { body: { action: 'create', name: 'Carte 1' } })
          .then(function (created) {
            docs = [docFromRow(created.map)];
            cur = 0;
          });
      }
      docs = list.map(docFromRow);
      cur = 0;
      for (var i = 0; i < docs.length; i++) {
        if (docs[i].id === prefs.active_map) { cur = i; break; }
      }
      return null;
    }).then(function () {
      loading = false;
      return loadDoc(cur);
    }).catch(function (err) {
      loading = false;
      toastError('Module carte : ' + err.message);
    });
  }

  function closeModule() {
    if (!visible) return;
    clearTimeout(saveTimer);
    clearTimeout(uiTimer);
    persistNow();                 /* tout est deja en base : fermeture sans confirmation */
    persistPrefsNow();
    visible = false;
    moduleEl.hidden = true;
    document.removeEventListener('keydown', onKeydown);
  }

  window.DCCMapDraw = {
    open: openModule,
    close: closeModule,
    isOpen: function () { return visible; }
  };
})();
