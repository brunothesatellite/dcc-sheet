/* ==========================================================================
   Etat combat de l'equipe — logique pure (normalisation, export, import)
   --------------------------------------------------------------------------
   Contenu : Init. combat + Tours des persos en expedition, ennemis declares
   (nom, AC, ATT, PV, Init., Tour). Tout est optionnel : une valeur vide ou
   un tour a 0 n'est jamais ecrite (0 = valeur par defaut).

   Stabilite des ids : les ids DB ne survivent pas a un import entre comptes.
   Comme pour marching_order, l'export ecrit init_combat/tours sous forme
   d'INDEX dans characters[] ; remapImport() les convertit en nouveaux ids.

   Choix produit : seules les lignes d'ennemis RENSEIGNEES sont persistees
   (les lignes entierement vides sont filtrees a l'ecriture).
   ========================================================================== */
(function () {
  'use strict';

  var MAX_INIT = 20;
  var MAX_FIELD = 120;
  var MAX_TOUR = 9999;
  var MAX_ENEMIES = 50;

  function isInt(v) {
    return typeof v === 'number' && isFinite(v) && Math.floor(v) === v;
  }

  function cleanStr(v, max) {
    if (v === null || v === undefined) return '';
    if (typeof v !== 'string' && typeof v !== 'number') return '';
    var s = String(v).trim();
    return s.length > max ? s.slice(0, max) : s;
  }

  function cleanTour(v) {
    if (typeof v === 'string' && v.trim() === '') return 0;
    if (!isInt(v)) return 0;
    if (v < 0) return 0;
    return v > MAX_TOUR ? MAX_TOUR : v;
  }

  /* Ligne d'ennemi : null si entierement vide */
  function cleanEnemyRow(row) {
    if (!row || typeof row !== 'object') return null;
    var out = {
      nom: cleanStr(row.nom, MAX_FIELD),
      ac: cleanStr(row.ac, MAX_FIELD),
      att: cleanStr(row.att, MAX_FIELD),
      pv: cleanStr(row.pv, MAX_FIELD),
      init: cleanStr(row.init, MAX_FIELD),
      tour: cleanTour(row.tour)
    };
    if (out.nom === '' && out.ac === '' && out.att === '' &&
        out.pv === '' && out.init === '' && out.tour === 0) return null;
    return out;
  }

  function emptyState() {
    return { init_combat: {}, tours: {}, ennemis: [] };
  }

  function isEmpty(state) {
    if (!state) return true;
    var k;
    for (k in state.init_combat || {}) {
      if (Object.prototype.hasOwnProperty.call(state.init_combat, k)) return false;
    }
    for (k in state.tours || {}) {
      if (Object.prototype.hasOwnProperty.call(state.tours, k)) return false;
    }
    return !state.ennemis || state.ennemis.length === 0;
  }

  /* Valeurs exploitables uniquement : cles entieres, chaines tronquees,
     tours entiers > 0, lignes d'ennemis non vides. Idempotent. */
  function sanitize(raw) {
    var out = emptyState();
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return out;

    var init = raw.init_combat;
    if (init && typeof init === 'object' && !Array.isArray(init)) {
      for (var a in init) {
        if (!Object.prototype.hasOwnProperty.call(init, a)) continue;
        if (!/^\d+$/.test(a)) continue;
        var v = cleanStr(init[a], MAX_INIT);
        if (v !== '') out.init_combat[a] = v;
      }
    }

    var tours = raw.tours;
    if (tours && typeof tours === 'object' && !Array.isArray(tours)) {
      for (var b in tours) {
        if (!Object.prototype.hasOwnProperty.call(tours, b)) continue;
        if (!/^\d+$/.test(b)) continue;
        var t = cleanTour(tours[b]);
        if (t > 0) out.tours[b] = t;
      }
    }

    var enemies = raw.ennemis;
    if (Array.isArray(enemies)) {
      for (var i = 0; i < enemies.length && out.ennemis.length < MAX_ENEMIES; i++) {
        var row = cleanEnemyRow(enemies[i]);
        if (row) out.ennemis.push(row);
      }
    }

    return out;
  }

  /* Purge les ids absents de l'expedition (perso supprime / a l'auberge) :
     seuls les ids connus sont conserves, les ennemis ne dependent d'aucun id. */
  function normalize(state, chars) {
    var clean = sanitize(state);
    var known = {};
    (chars || []).forEach(function (c) {
      if (c && c.id !== undefined && c.id !== null) known[String(c.id)] = true;
    });
    var out = emptyState();
    out.ennemis = clean.ennemis;
    var k;
    for (k in clean.init_combat) {
      if (known[k]) out.init_combat[k] = clean.init_combat[k];
    }
    for (k in clean.tours) {
      if (known[k]) out.tours[k] = clean.tours[k];
    }
    return out;
  }

  /* Map d'export : {"<index dans characters[]>": valeur} — les ids DB ne sont
     pas stables d'un compte a l'autre. Retourne null si rien a exporter. */
  function buildExport(state, entries) {
    var clean = sanitize(state);
    var indexOf = {};
    (entries || []).forEach(function (entry, index) {
      if (entry && entry.id !== undefined && entry.id !== null) {
        indexOf[String(entry.id)] = index;
      }
    });

    var out = emptyState();
    out.ennemis = clean.ennemis;
    var k;
    for (k in clean.init_combat) {
      if (indexOf[k] !== undefined) out.init_combat[String(indexOf[k])] = clean.init_combat[k];
    }
    for (k in clean.tours) {
      if (indexOf[k] !== undefined) out.tours[String(indexOf[k])] = clean.tours[k];
    }

    return isEmpty(out) ? null : out;
  }

  /* Remappe les indexes du fichier vers les nouveaux ids.
     Retourne null si une cle/une valeur est invalide -> remise a zero. */
  function remapImport(exportState, idByIndex) {
    if (!exportState || typeof exportState !== 'object' || Array.isArray(exportState)) return null;
    var ids = idByIndex || [];
    var clean = sanitize(exportState);
    var out = emptyState();
    out.ennemis = clean.ennemis;
    var k;
    for (k in clean.init_combat) {
      var idx1 = Number(k);
      if (!isInt(idx1) || idx1 < 0 || String(idx1) !== k) return null;
      var id1 = ids[idx1];
      if (id1 === undefined || id1 === null) return null;
      out.init_combat[String(id1)] = clean.init_combat[k];
    }
    for (k in clean.tours) {
      var idx2 = Number(k);
      if (!isInt(idx2) || idx2 < 0 || String(idx2) !== k) return null;
      var id2 = ids[idx2];
      if (id2 === undefined || id2 === null) return null;
      out.tours[String(id2)] = clean.tours[k];
    }
    return out;
  }

  window.DCCTeamState = {
    sanitize: sanitize,
    normalize: normalize,
    isEmpty: isEmpty,
    buildExport: buildExport,
    remapImport: remapImport
  };
})();
