'use strict';

/* Module carte : persistance (R6/R7/R13).
   - le dessin est ecrit en base pendant le geste, signale par showToastSave
   - outils / couleur / zoom / position sont retrouves a la reouverture
   - les images de fond passent par api/map-image.php (UID, remplacement) */

const { createReporter } = require('./helpers/assert');
const { createMapEnv, waitFor } = require('./helpers/mapenv');
const { delay } = require('./helpers/env');

function seedMap(server, over) {
  const m = Object.assign({
    id: server.nextId++,
    name: 'Carte 1',
    data: { v: 3, w: 1600, h: 900, ops: [] },
    ui: { zoom: 1, left: 0, top: 0 },
    bg_uid: '',
    bg_name: '',
  }, over || {});
  server.maps.push(m);
  return m;
}

async function openModule(h) {
  const mod = h.loadModule();
  mod.open();
  const ok = await waitFor(function () {
    return h.doc.getElementById('md-app') &&
      h.server.calls.some(function (c) { return c.action === 'get'; });
  }, 6000);
  await delay(30);
  return ok;
}

module.exports = async function suite() {
  const r = createReporter('16-map-persist');

  /* ------------------------ 1. sauvegarde auto + toast (R6/R7) */
  {
    const h = createMapEnv();
    const m = seedMap(h.server);
    await openModule(h);

    h.stroke(h.doc.getElementById('md-cv'), [[10, 10], [60, 60]]);
    await delay(600);        /* debounce 400 ms + requete */

    const saves = h.server.calls.filter(function (c) { return c.action === 'save'; });
    r.ok(saves.length >= 1, 'sauvegarde envoyee apres un trace (R6)');
    const last = saves[saves.length - 1].body;
    r.eq(last.id, m.id, 'sauvegarde du bon calque');
    r.eq(last.data.ops.length, 1, 'le trace est inclus dans la sauvegarde');
    r.ok(typeof last.ui.zoom === 'number', 'le zoom est sauvegarde (R13)');
    r.eq(last.bg_uid, '', 'bg_uid transmis (vide sans image)');
    r.ok(h.saveToasts.length >= 1, 'toast de sauvegarde affiche (R7)');

    /* Le toast est anti-rebond : deux traces rapides = un seul toast coalesse,
       mais chaque trace doit bien etre enregistree. */
    h.stroke(h.doc.getElementById('md-cv'), [[20, 20], [80, 90]]);
    h.stroke(h.doc.getElementById('md-cv'), [[30, 30], [90, 100]]);
    await delay(600);
    const saves2 = h.server.calls.filter(function (c) { return c.action === 'save'; });
    const lastOps = saves2[saves2.length - 1].body.data.ops.length;
    r.eq(lastOps, 3, 'tous les traces sont enregistres malgre le debounce');
    r.eq(m.data.ops.length, 3, 'le serveur possede bien 3 operations');
  }

  /* ------------------------ 2. outils / couleur en preferences (A2) */
  {
    const h = createMapEnv();
    seedMap(h.server);
    await openModule(h);

    h.doc.getElementById('md-toolText').click();
    await delay(600);
    const prefsCalls = h.server.calls.filter(function (c) { return c.action === 'prefs_save'; });
    r.ok(prefsCalls.length >= 1, 'changement d outil -> prefs_save');
    r.eq(prefsCalls[prefsCalls.length - 1].body.prefs.tool, 'text', 'outil « texte » persiste');

    /* Aucun toast pour les preferences : le dessin seul est signale */
    const saves = h.server.calls.filter(function (c) { return c.action === 'save'; });
    r.eq(saves.length, 0, 'pas d ecriture du dessin pour un simple changement d outil');
  }

  /* ------------------------ 3. reprise : zoom + position (R13) */
  {
    const h = createMapEnv();
    seedMap(h.server, { ui: { zoom: 2, left: 120, top: 60 } });
    await openModule(h);

    const viewport = h.doc.getElementById('md-viewport');
    r.eq(h.doc.getElementById('md-zoomLabel').textContent, '200%', 'zoom restaure a la reouverture');
    r.eq(viewport.scrollLeft, 120, 'position horizontale restauree');
    r.eq(viewport.scrollTop, 60, 'position verticale restauree');
  }

  /* ------------------------ 4. reprise : outil + couleur (R13) */
  {
    const h = createMapEnv({
      prefs: { tool: 'text', color: '#e11d48', size: 32, bold: true, drawMode: true, active_map: 0 },
    });
    seedMap(h.server);
    await openModule(h);

    r.ok(/texte/.test(h.doc.getElementById('md-status').textContent), 'outil texte restaure');
    r.ok(/32/.test(h.doc.getElementById('md-fontSize').value), 'taille de police restauree');
    r.eq(h.doc.getElementById('md-boldBtn').getAttribute('aria-pressed'), 'true', 'gras restaure');
    const well = h.doc.getElementById('md-colorWell').querySelector('i');
    r.eq(well.style.getPropertyValue('--c'), '#e11d48', 'couleur restauree');
    r.eq(h.doc.getElementById('md-toolText').getAttribute('aria-pressed'), 'true', 'bouton texte actif');
  }

  /* ------------------------ 5. image de fond : upload puis remplacement */
  {
    const h = createMapEnv();
    seedMap(h.server);
    await openModule(h);

    const input = h.doc.getElementById('md-bgInput');
    const file1 = new h.win.File(['x'], 'mon-plan.png', { type: 'image/png' });
    Object.defineProperty(input, 'files', {
      value: [file1],
      configurable: true,
    });
    input.dispatchEvent(new h.win.Event('change'));
    await delay(600);

    const uploads = h.server.calls.filter(function (c) {
      return c.url.indexOf('api/map-image.php') !== -1 && c.action === 'upload';
    });
    r.eq(uploads.length, 1, 'image envoyee a api/map-image.php (upload)');
    let saves = h.server.calls.filter(function (c) { return c.action === 'save'; });
    r.ok(saves.length >= 1, 'le fond declenche une sauvegarde');
    let last = saves[saves.length - 1].body;
    r.ok(/^[0-9a-f]{8,64}$/.test(last.bg_uid), 'UID stocke en base (R5/R10)');
    r.eq(last.bg_name, 'mon-plan.png', 'nom utilisateur du fond = nom d origine (D3)');

    /* Remplacement : nouvel UID + suppression de l'ancien fichier (D11) */
    const firstUid = last.bg_uid;
    Object.defineProperty(input, 'files', {
      value: [new h.win.File(['y'], 'autre-plan.webp', { type: 'image/webp' })],
      configurable: true,
    });
    input.dispatchEvent(new h.win.Event('change'));
    await delay(600);

    saves = h.server.calls.filter(function (c) { return c.action === 'save'; });
    last = saves[saves.length - 1].body;
    r.ok(last.bg_uid !== firstUid, 'le remplacement genere un NOUVEL uid (D11)');
    const deletes = h.server.calls.filter(function (c) {
      return c.url.indexOf('api/map-image.php') !== -1 && c.action === 'delete';
    });
    r.eq(deletes.length, 1, 'l ancienne image est supprimee de data/maps/');
    r.eq(deletes[0].body.uid, firstUid, 'c est bien l ancien uid qui est purge');
    r.ok(!h.server.images[firstUid], 'fichier ancien absent du stockage');
  }

  /* ------------------------ 6. vue sauvegardee pendant le geste */
  {
    const h = createMapEnv();
    const m = seedMap(h.server);
    await openModule(h);

    h.doc.getElementById('md-zoomIn').click();
    await delay(1700);        /* debounce UI 1,5 s */
    const saves = h.server.calls.filter(function (c) { return c.action === 'save'; });
    r.ok(saves.length >= 1, 'le zoom est ecrit en base (ui)');
    r.ok(Math.abs(saves[saves.length - 1].body.ui.zoom - 1.25) < 0.001, 'zoom 125 % enregistre');
    r.eq(m.data.ops.length, 0, 'aucun dessin cree par un simple zoom');
  }

  /* ------------------------ 7. erreur de sauvegarde : toast d erreur */
  {
    const h = createMapEnv();
    seedMap(h.server);
    await openModule(h);

    /* Le serveur refuse la prochaine ecriture */
    const originalFetch = h.win.fetch;
    h.win.fetch = function (url, opts) {
      if (String(url).indexOf('api/maps.php') !== -1 && opts && opts.body &&
          String(opts.body).indexOf('"save"') !== -1) {
        return Promise.resolve({
          ok: false,
          status: 500,
          json: async function () { return { ok: false, error: 'base indisponible' }; },
        });
      }
      return originalFetch(url, opts);
    };

    h.stroke(h.doc.getElementById('md-cv'), [[10, 10], [50, 50]]);
    await delay(600);
    r.ok(h.toasts.some(function (t) {
      return t.type === 'error' && /Erreur de sauvegarde/.test(t.message);
    }), 'echec de sauvegarde signale par un toast d erreur');
  }

  /* ------------------------ 8. erreur image au chargement (R11) */
  {
    const h = createMapEnv();
    seedMap(h.server, {
      bg_uid: 'bbbb44e20b3d4f5a8e7c6b5a4d3c2b1a',
      bg_name: 'perdue.webp',
    });
    await openModule(h);

    h.doc.getElementById('md-bg').dispatchEvent(new h.win.Event('error'));
    await delay(30);
    r.ok(h.toasts.some(function (t) {
      return t.type === 'error' && /Image de fond introuvable/.test(t.message);
    }), 'image introuvable au chargement -> toast d erreur');

    /* La reference est conservee : une sauvegarde ulterieure ne la perd pas */
    h.stroke(h.doc.getElementById('md-cv'), [[10, 10], [50, 50]]);
    await delay(600);
    const saves = h.server.calls.filter(function (c) { return c.action === 'save'; });
    r.eq(saves[saves.length - 1].body.bg_uid, 'bbbb44e20b3d4f5a8e7c6b5a4d3c2b1a',
      'l UID reste reference en base malgre l image manquante');
    r.ok(h.doc.getElementById('md-scene').classList.contains('is-empty'), 'grille de repli conservee');
  }

  return r;
};
