/* ==========================================================================
   Ordre de marche — logique pure (normalisation, export, import)
   --------------------------------------------------------------------------
   Invariant : k = min(n, 9) entrees, ids ⊆ expédition, positions ENTIERES
   uniques dans {0..8} — trous autorisés (cases vides de la grille : depot
   explicite du drag & drop). normalize() purge les entrees invalides et
   reconstruit au besoin (gauche→droite, haut→bas) ; idempotente.
   ========================================================================== */
(function () {
  'use strict';

  function isInt(v) {
    return typeof v === 'number' && isFinite(v) && Math.floor(v) === v;
  }

  function rebuild(expeditionChars) {
    var order = {};
    (expeditionChars || []).forEach(function (c, i) {
      if (i < 9 && c && c.id !== undefined && c.id !== null) order[c.id] = i;
    });
    return order;
  }

  function isValid(order, expeditionChars) {
    if (!order || typeof order !== 'object' || Array.isArray(order)) return false;
    var chars = expeditionChars || [];
    var k = Math.min(chars.length, 9);
    var known = {};
    chars.forEach(function (c) {
      if (c && c.id !== undefined && c.id !== null) known[String(c.id)] = true;
    });
    var seen = {};
    var count = 0;
    for (var key in order) {
      if (!Object.prototype.hasOwnProperty.call(order, key)) continue;
      var pos = order[key];
      if (!isInt(pos) || pos < 0 || pos > 8) return false;
      if (!known[key]) return false;
      if (seen[pos]) return false;
      seen[pos] = true;
      count++;
    }
    if (count !== k) return false;
    return true;
  }

  function normalize(order, expeditionChars) {
    var chars = expeditionChars || [];
    if (isValid(order, chars)) {
      var kept = {};
      for (var key in order) {
        if (Object.prototype.hasOwnProperty.call(order, key)) kept[key] = order[key];
      }
      return { order: kept, changed: false };
    }
    return { order: rebuild(chars), changed: true };
  }

  function validateImported(order, expeditionIds) {
    var chars = (expeditionIds || [])
      .filter(function (id) { return id !== null && id !== undefined; })
      .map(function (id) { return { id: id }; });
    return isValid(order, chars);
  }

  /* Map d'export : {"<index dans characters[]>": position} — persos actifs
     uniquement (les ids DB ne sont pas stables apres import). */
  function buildExportMap(entries, orderMap) {
    var map = {};
    var used = {};
    (entries || []).forEach(function (entry, index) {
      if (!entry || entry.is_active !== 1) return;
      var pos = orderMap ? orderMap[entry.id] : undefined;
      if (!isInt(pos) || pos < 0 || pos > 8) return;
      if (used[pos]) return;
      used[pos] = true;
      map[String(index)] = pos;
    });
    return map;
  }

  /* Remappe la map d'export (indexes du fichier) vers les nouveaux ids.
     Retourne null si un index/position/id est invalide → reconstruction. */
  function remapImport(exportMap, idByIndex) {
    if (!exportMap || typeof exportMap !== 'object' || Array.isArray(exportMap)) return null;
    var ids = idByIndex || [];
    var out = {};
    for (var key in exportMap) {
      if (!Object.prototype.hasOwnProperty.call(exportMap, key)) continue;
      var index = Number(key);
      if (!isInt(index) || index < 0 || String(index) !== key) return null;
      var id = ids[index];
      if (id === undefined || id === null) return null;
      var pos = exportMap[key];
      if (!isInt(pos) || pos < 0 || pos > 8) return null;
      if (Object.prototype.hasOwnProperty.call(out, String(id))) return null;
      out[String(id)] = pos;
    }
    return out;
  }

  window.DCCMarching = {
    normalize: normalize,
    isValid: isValid,
    rebuild: rebuild,
    validateImported: validateImported,
    buildExportMap: buildExportMap,
    remapImport: remapImport
  };
})();
