'use strict';

const { createReporter } = require('./helpers/assert');
const { createEnv } = require('./helpers/env');

function mk(n) {
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push({ id: i + 1, name: 'P' + (i + 1), class: 'mage', is_active: 1 });
  }
  return out;
}

function expectedRebuild(n) {
  const o = {};
  for (let i = 0; i < Math.min(n, 9); i++) o[i + 1] = i;
  return JSON.stringify(o);
}

module.exports = function suite() {
  const r = createReporter('06-marching-order');
  const env = createEnv();
  env.load('marching-order.js');
  const M = env.window.DCCMarching;
  if (!M) {
    r.fail('DCCMarching module not loaded');
    return r;
  }

  const c3 = mk(3);
  let res;

  // --- rebuild : gauche→droite, haut→bas ---
  r.eq(JSON.stringify(M.rebuild(c3)), expectedRebuild(3), 'rebuild 3 persos');
  r.eq(JSON.stringify(M.rebuild(mk(12))), expectedRebuild(12), 'rebuild n>9 tronque a 9');
  r.eq(JSON.stringify(M.rebuild([])), '{}', 'rebuild expedition vide');

  // --- normalize : ordre valide conserve ---
  res = M.normalize({ 1: 0, 2: 1, 3: 2 }, c3);
  r.eq(res.changed, false, 'ordre valide : changed=false');
  r.eq(JSON.stringify(res.order), '{"1":0,"2":1,"3":2}', 'ordre valide conserve');

  res = M.normalize({ 3: 2, 1: 0, 2: 1 }, c3);
  r.eq(res.changed, false, 'declinaison differente mais equivalente : changed=false');
  r.eq(JSON.stringify(res.order), '{"1":0,"2":1,"3":2}', 'cles reordonnees : contenu canonique');

  // --- normalize : anomalies → reconstruction ---
  res = M.normalize({ 1: 0, 2: 0, 3: 1 }, c3);
  r.eq(res.changed, true, 'doublon de position → rebuild');
  r.eq(JSON.stringify(res.order), '{"1":0,"2":1,"3":2}', 'doublon → reconstruction');

  res = M.normalize({ 1: 0, 3: 2 }, c3);
  r.eq(res.changed, true, 'position manquante → rebuild');
  r.eq(JSON.stringify(res.order), '{"1":0,"2":1,"3":2}', 'trou → reconstruction');

  res = M.normalize({ 1: 0, 2: 1, 99: 2 }, c3);
  r.eq(res.changed, true, 'id hors expedition → rebuild');
  r.eq(JSON.stringify(res.order), '{"1":0,"2":1,"3":2}', 'id stale → reconstruction');

  res = M.normalize({ 1: 0, 2: 9 }, mk(2));
  r.eq(res.changed, true, 'position 9 (hors 0..8) → rebuild');

  res = M.normalize({ 1: -1, 2: 0 }, mk(2));
  r.eq(res.changed, true, 'position negative → rebuild');

  res = M.normalize({ 1: '0', 2: 1 }, mk(2));
  r.eq(res.changed, true, 'position non entiere → rebuild');

  res = M.normalize(null, c3);
  r.eq(res.changed, true, 'ordre absent → rebuild');
  r.eq(JSON.stringify(res.order), '{"1":0,"2":1,"3":2}', 'ordre absent → reconstruction complete');

  res = M.normalize([1, 2, 3], c3);
  r.eq(res.changed, true, 'tableau (pas un objet) → rebuild');

  res = M.normalize({}, []);
  r.eq(res.changed, false, 'expedition vide + {} → inchange');
  r.eq(JSON.stringify(res.order), '{}', 'expedition vide → {}');

  // --- normalize : k = min(n, 9) ---
  const c12 = mk(12);
  res = M.normalize({}, c12);
  r.eq(res.changed, true, '{} sur 12 persos → rebuild');
  r.eq(Object.keys(res.order).length, 9, 'n=12 → 9 entrees (k=min(n,9))');
  const positions = Object.keys(res.order).map(function (k) { return res.order[k]; })
    .sort(function (a, b) { return a - b; });
  r.eq(positions.join(','), '0,1,2,3,4,5,6,7,8', 'positions bijectives sur 0..8');

  // --- normalize : idempotence ---
  const again = M.normalize(res.order, c12);
  r.eq(again.changed, false, 'normalize idempotent : 2e appel inchange');
  r.eq(JSON.stringify(again.order), JSON.stringify(res.order), 'idempotence : meme contenu');

  // --- trous de position autorisés (cases vides : dépôt du drag & drop) ---
  res = M.normalize({ 1: 7, 2: 0, 3: 5 }, c3);
  r.eq(res.changed, false, 'ordre troué → conserve (pas de rebuild)');
  r.eq(JSON.stringify(res.order), '{"1":7,"2":0,"3":5}', 'trous preserves tels quels');

  res = M.normalize({ 44: 1, 45: 2, 46: 0, 47: 5, 48: 7, 49: 3 }, [
    { id: 44 }, { id: 45 }, { id: 46 }, { id: 47 }, { id: 48 }, { id: 49 },
  ]);
  r.eq(res.changed, false, 'cas reel (48 en case 7, case 4 vide) → conserve');
  r.eq(JSON.stringify(res.order), '{"44":1,"45":2,"46":0,"47":5,"48":7,"49":3}',
    'cas reel → ordre intact, aucun ecrasement');

  // --- validateImported (apres import global) ---
  r.eq(M.validateImported({ 1: 0, 2: 1 }, [1, 2]), true, 'validate: bijection ok');
  r.eq(M.validateImported({ 1: 0, 2: 0 }, [1, 2]), false, 'validate: doublon → false');
  r.eq(M.validateImported({ 1: 0 }, [1, 2]), false, 'validate: trou → false');
  r.eq(M.validateImported({ 1: 0, 2: 2 }, [1, 2]), true, 'validate: trou de position autorise (case vide)');
  r.eq(M.validateImported({ 1: 0, 2: 1, 3: 2 }, [1, 2]), false, 'validate: id hors expedition → false');
  r.eq(M.validateImported({}, []), true, 'validate: expedition vide → true');
  r.eq(M.validateImported({ 1: 0, 2: 1 }, [1, null]), false, 'validate: create echouee (id null) → false');

  // --- buildExportMap : index dans characters[], persos actifs ---
  const entries = [
    { id: 1, is_active: 1 },
    { id: 2, is_active: 0 },
    { id: 3, is_active: 1 },
    { id: 4, is_active: 1 },
  ];
  const exportMap = M.buildExportMap(entries, { 1: 0, 2: 5, 3: 8, 4: 7 });
  r.eq(JSON.stringify(exportMap), '{"0":0,"2":8,"3":7}', 'export: actifs seulement, cles = index');

  const exportMap2 = M.buildExportMap(
    [{ id: 1, is_active: 1 }, { id: 2, is_active: 1 }],
    { 1: 3, 2: 42 }
  );
  r.eq(JSON.stringify(exportMap2), '{"0":3}', 'export: position hors 0..8 ecartee');

  r.eq(JSON.stringify(M.buildExportMap(entries, null)), '{}', 'export: sans ordre → {}');
  r.eq(JSON.stringify(M.buildExportMap([], { 1: 0 })), '{}', 'export: sans persos → {}');

  // --- remapImport : index du fichier → nouveaux ids ---
  r.eq(JSON.stringify(M.remapImport({ '0': 4, '1': 5 }, [10, 11])), '{"10":4,"11":5}',
    'remap: index → nouveaux ids');
  r.eq(JSON.stringify(M.remapImport({ '0': 4, '2': 8 }, [10, 11, 12])), '{"10":4,"12":8}',
    'remap: index sautes (inactifs)');

  r.eq(M.remapImport({ '5': 0 }, [10, 11]), null, 'remap: index hors bornes → null');
  r.eq(M.remapImport({ '0': 9 }, [10, 11]), null, 'remap: position hors plage → null');
  r.eq(M.remapImport({ 'x': 0 }, [10, 11]), null, 'remap: cle non entiere → null');
  r.eq(M.remapImport([4, 5], [10, 11]), null, 'remap: tableau → null');
  r.eq(M.remapImport(null, [10, 11]), null, 'remap: absent → null');
  r.eq(M.remapImport({ '0': 0 }, [null]), null, 'remap: create echouee (id null) → null');
  r.eq(JSON.stringify(M.remapImport({}, [10, 11])), '{}', 'remap: {} → {}');

  const dup = M.remapImport({ '0': 0, '1': 0 }, [10, 11]);
  r.eq(M.validateImported(dup, [10, 11]), false, 'remap avec doublons → validate false');

  // --- round-trip export → import ---
  const srcOrder = { 7: 1, 9: 0 };
  const roundExport = M.buildExportMap(
    [{ id: 7, is_active: 1 }, { id: 9, is_active: 1 }], srcOrder
  );
  r.eq(JSON.stringify(roundExport), '{"0":1,"1":0}', 'round-trip: export des actifs');
  const roundBack = M.remapImport(roundExport, [7, 9]);
  r.eq(M.validateImported(roundBack, [7, 9]), true, 'round-trip: reimport valide');
  r.eq(JSON.stringify(roundBack), '{"7":1,"9":0}', 'round-trip: ordre preserve');

  return r;
};
