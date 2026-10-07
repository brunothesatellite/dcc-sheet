'use strict';

/* Module carte : moteur de dessin (port de draw-on-map).
   Les JSON sont relus via la vraie feuille d'export (UI -> modele -> JSON),
   comme dans draw-on-map/test.js. */

const { createReporter } = require('./helpers/assert');
const { createMapEnv, waitFor } = require('./helpers/mapenv');
const { read, delay } = require('./helpers/env');

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
  const ready = await waitFor(function () {
    return h.doc.getElementById('md-app') &&
      h.server.calls.some(function (c) { return c.action === 'get'; });
  }, 6000);
  await delay(30);
  return ready;
}

function exportJSON(h) {
  h.doc.getElementById('md-exportBtn').click();
  return JSON.parse(h.doc.getElementById('md-exportOut').value);
}

module.exports = async function suite() {
  const r = createReporter('15-map-draw');

  /* ---------------------------------------------------------- 1. ouverture */
  {
    const h = createMapEnv();
    seedMap(h.server);
    r.ok(!!h.loadModule(), 'map-draw.js expose window.DCCMapDraw');
    r.ok(typeof h.win.DCCMapDraw.open === 'function', 'DCCMapDraw.open existe');

    const okOpen = await openModule(h);
    r.ok(okOpen, 'module ouvert : DOM injecte + calque charge' + (h.errors.length ? ' | ' + h.errors.join(' / ') : ''));
    r.ok(!!h.doc.getElementById('map-module'), 'conteneur #map-module present');
    r.ok(!!h.doc.getElementById('md-cv'), 'canvas md-cv present');
    r.ok(!!h.doc.getElementById('md-close'), 'croix de fermeture presente (R3)');
    const ids = ['md-app', 'md-stage', 'md-viewport', 'md-scene', 'md-bg', 'md-top', 'md-bottom',
      'md-moreDlg', 'md-exportDlg', 'md-importDlg', 'md-mapsDlg', 'md-mapDlg'];
    r.ok(ids.every(function (id) { return !!h.doc.getElementById(id); }), 'ids du module prefixes md- (D10)');
    r.ok(!h.doc.getElementById('toast'), 'aucun id #toast du module (pas de collision avec script.js)');
  }

  /* ------------------------------------------- 2. trace : regle d'epaisseur */
  {
    const h = createMapEnv();
    seedMap(h.server);
    await openModule(h);

    const stage = h.doc.getElementById('md-cv');
    h.stroke(stage, [[10, 10], [60, 60], [120, 80]]);

    const model = exportJSON(h);
    r.eq(model.ops.length, 1, 'un trace = une operation');
    r.eq(model.ops[0].k, 's', 'operation de type trait (s)');
    r.eq(model.ops[0].w, 6, 'epaisseur = 6 px ecran a 100 % de zoom');
    r.ok(model.ops[0].p.length >= 2, 'le trace porte ses points');
    r.eq(model.ops[0].p[0][0], 10, 'coordonnee arrondie a 0,1 (x)');

    /* Zoom 80 % -> l'epaisseur stockee grandit (ARCHI.md §2 : w = 6/zoom) */
    h.doc.getElementById('md-zoomOut').click();
    h.stroke(stage, [[10, 200], [60, 220]]);
    const model2 = exportJSON(h);
    r.eq(model2.ops.length, 2, 'deux traces apres le second geste');
    r.eq(model2.ops[1].w, 7.5, 'epaisseur convertie au zoom 80 % (6/0.8)');

    /* Annulation */
    const undo = h.doc.getElementById('md-undoBtn');
    r.ok(!undo.disabled, 'bouton annuler actif avec des operations');
    undo.click();
    r.eq(exportJSON(h).ops.length, 1, 'annuler retire la derniere operation');
  }

  /* ------------------------------------------------- 3. gomme et composite */
  {
    const h = createMapEnv();
    seedMap(h.server);
    await openModule(h);

    h.doc.getElementById('md-toolErase').click();
    const stage = h.doc.getElementById('md-cv');
    h.stroke(stage, [[20, 20], [80, 90]]);
    const model = exportJSON(h);
    r.eq(model.ops[0].k, 'e', 'la gomme produit une operation (e)');
    r.ok(!model.ops[0].c, 'la gomme n a pas de couleur');
    r.ok(h.ctxLog.indexOf('composite=destination-out') !== -1, 'gomme en destination-out');
    r.eq(h.ctxLog[h.ctxLog.length - 1], 'composite=source-over', 'retour a source-over apres la gomme (invariant)');
  }

  /* ----------------------------------------------- 4. serialisation v:3 */
  {
    const h = createMapEnv();
    const m = seedMap(h.server);
    h.server.images['3f2b7c1e9a044d5b8c6f2a1d7e5b4c3a'] = { name: 'plan.webp' };
    m.bg_uid = '3f2b7c1e9a044d5b8c6f2a1d7e5b4c3a';
    m.bg_name = 'plan.webp';
    await openModule(h);
    await waitFor(function () {
      return (h.doc.getElementById('md-bg').getAttribute('src') || '').indexOf('uid=') !== -1;
    }, 3000);

    const model = exportJSON(h);
    r.eq(model.v, 3, 'format v:3');
    r.ok(model.bg && model.bg.uid === '3f2b7c1e9a044d5b8c6f2a1d7e5b4c3a', 'UID du fond exporte (R10)');
    r.eq(model.bg && model.bg.name, 'plan.webp', 'nom utilisateur du fond exporte');
    r.ok(model.ui && typeof model.ui.zoom === 'number', 'etat de vue exporte (ui.zoom)');
    r.eq(model.w, 1600, 'largeur de scene exportee');
    r.eq(model.h, 900, 'hauteur de scene exportee');

    /* Sans fond : pas de cle bg dans l'export */
    const h2 = createMapEnv();
    seedMap(h2.server);
    await openModule(h2);
    exportJSON(h2);
    r.ok(h2.doc.getElementById('md-exportOut').value.indexOf('"bg"') === -1,
      'pas de cle bg sans image de fond');
  }

  /* ------------------------------------------------ 5. import v:2 et v:3 */
  {
    const h = createMapEnv();
    seedMap(h.server);
    await openModule(h);

    /* v:2 (draw-on-map) : bg = simple nom de fichier, sans UID */
    h.doc.getElementById('md-importIn').value =
      JSON.stringify({ v: 2, w: 100, h: 80, bg: 'photo.webp', ops: [{ k: 's', c: '#2563eb', w: 6, p: [[1, 2], [3, 4]] }] });
    h.doc.getElementById('md-doImport').click();
    await delay(30);
    const model = exportJSON(h);
    r.eq(model.ops.length, 1, 'import v:2 : operation recuperee');
    r.ok(model.w >= 824 && model.h >= 1400,
      'import v:2 : la scene couvre l ecran meme si le fichier dit 100x80 (' + model.w + 'x' + model.h + ')');
    r.eq(model.ops[0].p[0][0], 1, 'coordonnees d import preservees (x)');
    r.eq(model.ops[0].p[0][1], 2, 'coordonnees d import preservees (y)');
    r.ok(h.toasts.some(function (t) { return /Importe : 1/.test(t.message); }), 'toast d import affiche');

    /* Operations corrompues : ignorees silencieusement */
    h.doc.getElementById('md-importIn').value =
      JSON.stringify({ v: 3, w: 50, h: 50, ops: [{ k: 'zzz' }, { k: 't', c: '#111', x: 5, y: 6, s: 24, b: 0, t: 'Hello' }] });
    h.doc.getElementById('md-doImport').click();
    await delay(30);
    const model2 = exportJSON(h);
    r.eq(model2.ops.length, 1, 'operation corrompue ignoree, operation valide gardee');
    r.eq(model2.ops[0].k, 't', 'operation texte importee');

    /* Rien d exploitable -> erreur, pas de crash */
    h.doc.getElementById('md-importIn').value = JSON.stringify({ v: 3, w: 50, h: 50, ops: [{ k: 'zzz' }] });
    h.doc.getElementById('md-doImport').click();
    await delay(30);
    r.ok(h.toasts.some(function (t) { return /Import impossible/.test(t.message) && t.type === 'error'; }),
      'import sans operation exploitable = toast d erreur');
  }

  /* ------------------------- 6. image introuvable : toast + grille (R11) */
  {
    const h = createMapEnv();
    const m = seedMap(h.server, {
      bg_uid: '9c1a44e20b3d4f5a8e7c6b5a4d3c2b1a',
      bg_name: 'disparue.webp',
    });
    await openModule(h);

    /* Le navigateur n arrive pas a charger l image referencee */
    h.doc.getElementById('md-bg').dispatchEvent(new h.win.Event('error'));
    await delay(20);

    r.ok(h.toasts.some(function (t) {
      return t.type === 'error' && /Image de fond introuvable/.test(t.message);
    }), 'toast d erreur image introuvable (R11)');
    r.ok(h.doc.getElementById('md-scene').classList.contains('is-empty'),
      'grille de repli conservee quand l image manque (R11)');
    const model = exportJSON(h);
    r.ok(model.bg && model.bg.uid === m.bg_uid, 'la reference (UID) est conservee malgre l image manquante');
  }

  /* ------------------------------------------------ 7. limite de 10 (D12) */
  {
    const h = createMapEnv();
    for (let i = 0; i < 10; i++) seedMap(h.server, { name: 'Carte ' + (i + 1) });
    await openModule(h);

    h.doc.getElementById('md-mapsBtn').click();
    const newBtn = h.doc.getElementById('md-mapNew');
    r.eq(newBtn.getAttribute('aria-disabled'), 'true', 'bouton « Nouvelle carte » annonce la limite (aria-disabled)');
    newBtn.click();
    await delay(30);
    r.ok(h.toasts.some(function (t) {
      return t.type === 'error' && /Limite de 10 cartes/.test(t.message);
    }), 'message d erreur « limite de 10 cartes »');
    r.ok(!h.server.calls.some(function (c) { return c.action === 'create'; }),
      'aucune creation envoyee au serveur');
    r.eq(h.server.maps.length, 10, 'toujours 10 calques cote serveur');
  }

  /* ------------------------- 8. suppression de carte + image (R12) */
  {
    const h = createMapEnv();
    const m1 = seedMap(h.server, { name: 'Donjon' });
    const m2 = seedMap(h.server, {
      name: 'Village',
      bg_uid: 'aaaa44e20b3d4f5a8e7c6b5a4d3c2b1a',
      bg_name: 'village.webp',
    });
    h.server.images[m2.bg_uid] = { name: 'village.webp' };
    /* La carte courante est celle avec image : c'est elle qu'on supprime */
    h.server.prefs.active_map = m2.id;
    await openModule(h);

    /* Options de la carte courante -> suppression confirmee */
    h.doc.getElementById('md-mapsBtn').click();
    h.doc.getElementById('md-mapOpts').click();
    h.doc.getElementById('md-mapDelete').click();
    r.ok(!h.doc.getElementById('md-mapConfirm').hidden, 'confirmation de suppression affichee');
    h.doc.getElementById('md-mapDoDelete').click();
    await delay(60);

    const deleted = h.server.calls.filter(function (c) { return c.action === 'delete'; });
    r.eq(deleted.length, 1, 'une suppression envoyee au serveur');
    r.eq(h.server.maps.length, 1, 'il ne reste qu un calque');
    r.ok(!h.server.images[m2.bg_uid], 'image de fond supprimee de data/maps/ (R12)');
    r.ok(h.toasts.some(function (t) { return /image de fond supprim/i.test(t.message); }),
      'toast mentionnant la suppression de l image');
    r.ok(h.server.maps[0].id === m1.id, 'le calque restant est le bon');
  }

  /* --------------------------------- 9. fermeture : sauvegarde + masquage */
  {
    const h = createMapEnv();
    seedMap(h.server);
    await openModule(h);

    const stage = h.doc.getElementById('md-cv');
    h.stroke(stage, [[10, 10], [50, 50]]);
    h.doc.getElementById('md-close').click();
    await delay(60);

    r.ok(h.doc.getElementById('map-module').hidden, 'module masque apres la croix (R3)');
    r.ok(h.server.calls.some(function (c) {
      return c.action === 'save' && c.body && c.body.data && c.body.data.ops.length === 1;
    }), 'le dessin est ecrit en base a la fermeture (R6)');
    r.ok(h.saveToasts.length >= 1, 'toast de sauvegarde affiche pendant le dessin (R7)');
    r.ok(h.win.DCCMapDraw.isOpen() === false, 'DCCMapDraw.isOpen() a false');

    /* Reouverture : le dessin est toujours la */
    h.win.DCCMapDraw.open();
    await waitFor(function () {
      const m = h.server.maps[0];
      return m && m.data.ops.length === 1;
    }, 3000);
    r.ok(true, 'le dessin survit a la fermeture / reouverture');
  }

  /* ------------------------- 10. contrat CSS : la croix recoit les clics */
  {
    /* #md-top est en pointer-events:none (le dessin passe sous le chrome) :
       chaque commande du chrome doit reactiver les clics, sinon elle les
       laisse filer vers le canvas — bug reel : la croix dessinait au lieu
       de fermer. */
    const css = read('style.css');
    const closeBlock = css.match(/#map-module #md-close\s*\{[^}]*\}/);
    r.ok(!!closeBlock, 'regle CSS #map-module #md-close presente');
    r.ok(!!closeBlock && /pointer-events:\s*auto/.test(closeBlock[0]),
      'croix : pointer-events auto (sinon le clic passe au canvas)');
    const topBlock = css.match(/#map-module #md-top\s*\{[^}]*\}/);
    r.ok(!!topBlock && /pointer-events:\s*none/.test(topBlock[0]), 'chrome haut transparent aux clics (comportement draw-on-map)');
    r.ok(!!topBlock && /z-index:\s*30/.test(topBlock[0]), 'chrome haut au-dessus du canvas (z-index:30)');
    r.ok(/#map-module #md-cv\s*\{[^}]*z-index:5/.test(css), 'canvas sous le chrome (z-index:5)');
  }

  /* ------------- 11. chaque croix de feuille ferme bien sa feuille */
  {
    /* data-close doit porter l'id LOGIQUE (sans prefixe) : closeDlg() prefise
       lui-meme — bug reel : les croix des feuilles ne fermaient rien. */
    const h = createMapEnv();
    seedMap(h.server);
    await openModule(h);

    const cases = [
      { dialog: 'md-moreDlg', trigger: 'md-moreBtn', label: 'feuille Plus' },
      { dialog: 'md-importDlg', trigger: 'md-importBtn', label: 'feuille Importer' },
      { dialog: 'md-mapsDlg', trigger: 'md-mapsBtn', label: 'tiroir Cartes' },
      { dialog: 'md-mapDlg', trigger: 'md-mapOpts', label: 'options de la carte' },
    ];
    for (const c of cases) {
      h.doc.getElementById(c.trigger).click();
      const dlg = h.doc.getElementById(c.dialog);
      r.ok(dlg.open, c.label + ' ouverte via ' + c.trigger);
      const closeBtn = dlg.querySelector('[data-close]');
      r.ok(!!closeBtn, c.label + ' : croix presente');
      if (closeBtn) {
        closeBtn.click();
        r.ok(!dlg.open, c.label + ' fermee par sa croix');
      }
      if (dlg.open) dlg.close();   /* purge pour le cas suivant */
    }

    /* Le data-close ne doit jamais contenir le prefixe (contrat) */
    const html = h.doc.getElementById('map-module').innerHTML;
    r.ok(!/data-close="md-/.test(html), 'aucun data-close doublement prefise');
  }

  /* --------- 12. options : ni affichage ni edition du nom de l'image */
  {
    const h = createMapEnv();
    const m = seedMap(h.server, { bg_uid: '3f2b7c1e9a044d5b8c6f2a1d7e5b4c3a', bg_name: 'plan.webp' });
    h.server.images[m.bg_uid] = { name: 'plan.webp' };
    await openModule(h);

    h.doc.getElementById('md-mapsBtn').click();
    h.doc.getElementById('md-mapOpts').click();
    const dlg = h.doc.getElementById('md-mapDlg');
    r.ok(dlg.open, 'options de la carte ouvertes');
    r.ok(!h.doc.getElementById('md-mapBgName'), 'aucun champ de nom d image dans les options');
    r.ok(!h.doc.getElementById('md-mapBgRename'), 'aucun bouton « Renommer » pour l image');
    r.ok(!h.doc.getElementById('md-mapBgReplace') && !h.doc.getElementById('md-mapBgRemove'),
      'aucune action image dans « Options » (entree unique, D16)');
    r.ok(dlg.textContent.indexOf('plan.webp') === -1, 'nom de l image n affiche nulle part dans les options');

    /* Le nom est aussi absent de la liste des calques */
    h.doc.getElementById('md-mapsBtn').click();
    r.ok(h.doc.getElementById('md-mapList').textContent.indexOf('plan.webp') === -1,
      'nom d image absent de la liste des calques');

    /* Le nom utilisateur reste persiste en base (R6), meme sans UI */
    h.stroke(h.doc.getElementById('md-cv'), [[10, 10], [50, 50]]);
    await delay(600);
    const saves = h.server.calls.filter(function (c) { return c.action === 'save'; });
    r.eq(saves[saves.length - 1].body.bg_name, 'plan.webp', 'nom utilisateur toujours sauvegarde en base (R6)');
  }

  /* ------- 13. choisir un outil reactive le dessin (apres mode deplacement) */
  {
    const h = createMapEnv();
    seedMap(h.server);
    await openModule(h);

    /* Mode deplacement : un geste ne dessine pas */
    h.doc.getElementById('md-modeBtn').click();
    r.ok(/D.placement/.test(h.doc.getElementById('md-status').textContent), 'mode deplacement actif');
    h.stroke(h.doc.getElementById('md-cv'), [[10, 10], [50, 50]]);
    r.eq(exportJSON(h).ops.length, 0, 'en mode deplacement, le geste ne dessine pas');

    /* Crayon : le dessin doit repartir */
    h.doc.getElementById('md-toolPen').click();
    r.ok(/crayon/.test(h.doc.getElementById('md-status').textContent), 'statut crayon');
    h.stroke(h.doc.getElementById('md-cv'), [[10, 10], [60, 60]]);
    r.eq(exportJSON(h).ops.length, 1, 'crayon : trace cree apres un mode deplacement');

    /* Gomme */
    h.doc.getElementById('md-modeBtn').click();
    h.doc.getElementById('md-toolErase').click();
    h.stroke(h.doc.getElementById('md-cv'), [[20, 20], [80, 90]]);
    let model = exportJSON(h);
    r.eq(model.ops.length, 2, 'gomme : trace cree');
    r.eq(model.ops[1].k, 'e', 'operation de type gomme');

    /* Texte : un tap pose le texte */
    h.doc.getElementById('md-toolText').click();
    h.doc.getElementById('md-textInput').value = 'Hello';
    h.stroke(h.doc.getElementById('md-cv'), [[25, 25], [25, 25]]);
    model = exportJSON(h);
    r.eq(model.ops.length, 3, 'texte : operation posee');
    r.eq(model.ops[2].k, 't', 'operation de type texte');
    r.ok(/texte/.test(h.doc.getElementById('md-status').textContent), 'statut texte');
  }

  /* ------- 14. « Carte N » prend le nom du fichier image importe (D15) */
  {
    const h = createMapEnv();
    seedMap(h.server, { name: 'Carte 2' });
    await openModule(h);

    const input = h.doc.getElementById('md-bgInput');
    Object.defineProperty(input, 'files', {
      value: [new h.win.File(['x'], 'plan-du-donjon.png', { type: 'image/png' })],
      configurable: true,
    });
    input.dispatchEvent(new h.win.Event('change'));
    await delay(700);

    const renames = h.server.calls.filter(function (c) { return c.action === 'rename'; });
    r.eq(renames.length, 1, 'la carte est rebaptisee a l import du fond (D15)');
    r.eq(renames[0].body.name, 'plan-du-donjon', 'nom = fichier sans extension');
    r.eq(h.server.maps[0].name, 'plan-du-donjon', 'nom en base');

    /* Un nom deja defini n'est pas ecrase par un second fond */
    Object.defineProperty(input, 'files', {
      value: [new h.win.File(['y'], 'autre-chose.webp', { type: 'image/webp' })],
      configurable: true,
    });
    input.dispatchEvent(new h.win.Event('change'));
    await delay(700);
    r.eq(h.server.maps[0].name, 'plan-du-donjon', 'un nom deja defini n est pas remplace');
    r.eq(h.server.calls.filter(function (c) { return c.action === 'rename'; }).length, 1,
      'aucun second renommage');
  }

  /* ------- 15. export / import = calque ACTIF, titres au nom du calque */
  {
    const h = createMapEnv();
    seedMap(h.server, { name: 'Donjon de la Reine' });
    await openModule(h);

    h.doc.getElementById('md-moreBtn').click();
    r.eq(h.doc.getElementById('md-moreTitle').textContent, 'Donjon de la Reine',
      'feuille « Plus » : titre = nom du calque actif');
    r.ok(/JSON \/ ZIP/.test(h.doc.getElementById('md-exportBtn').textContent),
      'bouton « Exporter le JSON / ZIP »');
    h.doc.querySelector('#md-moreDlg [data-close]').click();

    h.doc.getElementById('md-exportBtn').click();
    r.eq(h.doc.getElementById('md-exportTitle').textContent, 'Export \u2014 Donjon de la Reine',
      'export : titre = calque actif');
    h.doc.getElementById('md-closeExport').click();

    h.doc.getElementById('md-importBtn').click();
    r.eq(h.doc.getElementById('md-importTitle').textContent, 'Import \u2014 Donjon de la Reine',
      'import : titre = calque actif');
    h.doc.getElementById('md-closeImport').click();

    /* L'import ecrase le dessin du calque actif, sans creer de calque */
    const before = h.server.calls.filter(function (c) { return c.action === 'create'; }).length;
    h.doc.getElementById('md-importIn').value =
      JSON.stringify({ v: 3, w: 10, h: 10, ops: [{ k: 's', c: '#111827', w: 6, p: [[1, 2], [3, 4]] }] });
    h.doc.getElementById('md-doImport').click();
    await delay(30);
    r.eq(exportJSON(h).ops.length, 1, 'import : le calque actif est remplace');
    r.eq(h.server.calls.filter(function (c) { return c.action === 'create'; }).length, before,
      'aucun calque cree par l import du module');
    r.eq(h.server.maps.length, 1, 'toujours un seul calque');
  }

  /* ------- 16. image de fond : entree UNIQUE dans la feuille du calque */
  {
    const h = createMapEnv();
    seedMap(h.server, { name: 'Carte 1' });
    await openModule(h);

    h.doc.getElementById('md-moreBtn').click();
    const choose = h.doc.getElementById('md-bgBtn');
    const clear = h.doc.getElementById('md-bgClear');
    r.ok(!!choose && /Choisir une image de fond/.test(choose.textContent), 'entree « Choisir une image de fond »');
    r.ok(!!clear && /Retirer l.image de fond/.test(clear.textContent), 'entree « Retirer l image de fond »');
    r.ok(clear.disabled, 'retirer est inactive sans image');
    h.doc.querySelector('#md-moreDlg [data-close]').click();

    /* Charger une image -> retirer devient active */
    const input = h.doc.getElementById('md-bgInput');
    Object.defineProperty(input, 'files', {
      value: [new h.win.File(['x'], 'plan.webp', { type: 'image/webp' })],
      configurable: true,
    });
    input.dispatchEvent(new h.win.Event('change'));
    await delay(700);

    h.doc.getElementById('md-moreBtn').click();
    r.ok(!h.doc.getElementById('md-bgClear').disabled, 'retirer est active avec une image');

    /* Retirer -> le fichier part de data/maps/ et la reference aussi */
    h.doc.getElementById('md-bgClear').click();
    await delay(80);
    const deletes = h.server.calls.filter(function (c) {
      return c.url.indexOf('api/map-image.php') !== -1 && c.action === 'delete';
    });
    r.eq(deletes.length, 1, 'l image est supprimee de data/maps/');
    r.ok(!h.server.maps[0].bg_uid, 'la reference est retiree de la carte');
    r.ok(h.doc.getElementById('md-scene').classList.contains('is-empty'), 'grille de repli revenue');
  }

  /* ------- 17. scene « infinie » : la grille couvre l'ecran (D17) */
  {
    const h = createMapEnv();
    /* Carte sans image, scene vide (w/h = 0) -> repli sur la zone de dessin */
    seedMap(h.server, { data: { v: 3, w: 0, h: 0, ops: [] } });
    await openModule(h);

    let model = exportJSON(h);
    /* zone de dessin factice 412x700 -> visible + 1 ecran de reserve */
    r.ok(model.w >= 824, 'scene initiale = visible + reserve (' + model.w + ')');
    r.ok(model.h >= 1400, 'hauteur initiale = visible + reserve (' + model.h + ')');

    /* Dezoomer doit etendre la grille : elle couvre l'ecran a tout zoom */
    h.doc.getElementById('md-zoomOut').click();
    h.doc.getElementById('md-zoomOut').click();
    model = exportJSON(h);
    r.ok(model.w >= 1287, 'la scene grandit quand on dezoome (' + model.w + ')');

    /* « Ajuster a l'ecran » cadre le dessin, pas la scene : pas de boucle */
    h.stroke(h.doc.getElementById('md-cv'), [[10, 10], [60, 60]]);
    h.doc.getElementById('md-fitBtn').click();
    const z1 = h.doc.getElementById('md-zoomLabel').textContent;
    h.doc.getElementById('md-fitBtn').click();
    r.eq(h.doc.getElementById('md-zoomLabel').textContent, z1,
      '« Ajuster » est stable (pas de boucle zoom / scene)');

    /* Avec une image : la scene reste celle de l'image (jamais de croissance) */
    const h2 = createMapEnv();
    const m2 = seedMap(h2.server, {
      bg_uid: '3f2b7c1e9a044d5b8c6f2a1d7e5b4c3a', bg_name: 'plan.webp',
    });
    h2.server.images[m2.bg_uid] = { name: 'plan.webp' };
    await openModule(h2);
    h2.doc.getElementById('md-zoomOut').click();
    h2.doc.getElementById('md-zoomOut').click();
    const model2 = exportJSON(h2);
    r.eq(model2.w, 1600, 'avec une image : scene = largeur de l image');
    r.eq(model2.h, 900, 'avec une image : hauteur de l image');
  }

  /* ------- 18. reglette de zoom verticale permanente (PC, D18) */
  {
    const h = createMapEnv();
    seedMap(h.server);
    await openModule(h);

    const ruler = h.doc.getElementById('md-zoomRuler');
    r.ok(!!ruler, 'reglette de zoom presente');
    r.eq(ruler.type, 'range', 'c est bien un curseur');

    /* Les deux reglettes (chip/menu) restent synchronisees */
    h.doc.getElementById('md-zoomOut').click();
    r.eq(ruler.value, h.doc.getElementById('md-zoomRange').value,
      'reglette et curseur du menu « Plus » synchronises');

    /* La reglette pilote le zoom */
    ruler.value = '80';
    ruler.dispatchEvent(new h.win.Event('input', { bubbles: true }));
    r.ok(parseFloat(h.doc.getElementById('md-zoomLabel').textContent) > 125,
      'la reglette change le zoom (' + h.doc.getElementById('md-zoomLabel').textContent + ')');

    /* Et elle suit les autres commandes de zoom */
    const before = +ruler.value;
    h.doc.getElementById('md-zoomIn').click();
    r.ok(+ruler.value > before, 'la reglette suit le bouton +');

    /* Contrat CSS : curseur horizontal pivote (centrage du curseur garanti),
       ni slider vertical natif ni valeur depreciee, et masquage tactile */
    const css = read('style.css');
    r.ok(/#map-module #md-zoomRuler\s*\{[^}]*transform:\s*rotate\(-90deg\)/.test(css),
      'reglette verticale = curseur horizontal pivote a -90°');
    r.ok(css.indexOf('slider-vertical') === -1, 'aucune valeur depreciee « slider-vertical »');
    r.ok(css.indexOf('writing-mode: vertical') === -1,
      'aucun slider vertical natif (centrage non fiable d un navigateur a l autre)');
    r.ok(/@media \(pointer: coarse\)[\s\S]{0,200}?zoomruler-wrap/.test(css),
      'reglette masquee sur les ecrans tactiles');
  }

  return r;
};
