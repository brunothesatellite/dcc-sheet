/* ============================================================
   DCC Sheet - Tableaux responsives (Référence + sorts, mobile)
   ------------------------------------------------------------
   En mobile (≤ 599 px), les `table.stackable` sont éclatés en tuiles
   (1 ligne = 1 carte « label : valeur »). Pour les tableaux de valeurs
   qui tiennent en largeur, c'est trop lourd : ce module classe chaque
   tableau à l'insertion dans la visionneuse et pose :
     keep-table (+ fit-narrow) : reste en tableau (fonte 12 / 11 px) ;
     scroll-table              : reste en tableau + scroll horizontal
                                 (le .table-wrap a déjà overflow-x:auto) ;
     rien                      : éclaté en tuiles (défaut, paragraphes).
   Règles (mesurées sur les 70 tableaux contentref, plan2/OPTIM-VIEWER-REF) :
     - largeur estimée ≤ 344 px à 12 px → keep (en-têtes sur 2 lignes) ;
     - idem à 11 px → keep + fit-narrow ;
     - plus grosse cellule ≥ 150 car. → tuiles (texte long) ;
     - ≥ 5 colonnes → scroll (matrices) ;
     - plus grosse cellule ≥ 60 car. → scroll (ex. note 124 car.) ;
     - sinon → tuiles (ex. Métiers : 4 col. verbeuses) ;
     - colspan/rowspan → scroll (structure fusionnée jamais éclatée).
   Mesure sur le texte (sans layout) : déterministe et testable.
   Utilisé par spell-reader.js (sorts) ET ref-reader.js (référence) ;
   les deux l'appellent sous garde (défaut = tuiles, inchangé sans lui).
   ============================================================ */
(function () {
  'use strict';

  var FIT_W = 344;      // largeur utile mobile (écran 360 px - marges)
  var PROSE_MIN = 150;  // au-delà : paragraphes → tuiles
  var MATRIX_COLS = 5;  // à partir de : matrice → scroll
  var NOTE_MIN = 60;    // note longue isolée → scroll plutôt que tuiles

  function cellLen(el) {
    var t = el.textContent || '';
    return t.replace(/\s+/g, ' ').trim().length;
  }

  /* Largeur estimée : en-têtes autorisés sur 2 lignes, corps sur 1 ligne
     (majore les tableaux à retour auto — un « tenu » tient vraiment). */
  function estWidth(bodyMax, headLen, fontPx) {
    var cw = 0.48 * fontPx, pad = 14, w = 0;
    for (var i = 0; i < bodyMax.length; i++) {
      var eff = Math.max(bodyMax[i], Math.ceil((headLen[i] || 0) / 2));
      w += eff * cw + pad;
    }
    return w;
  }

  function classify(table) {
    if (!table || table.tagName !== 'TABLE') return null;
    if (table.querySelector('[colspan],[rowspan]')) return 'scroll';
    var headLen = [];
    if (table.tHead && table.tHead.rows.length) {
      var hc = table.tHead.rows[0].cells;
      for (var h = 0; h < hc.length; h++) headLen.push(cellLen(hc[h]));
    }
    var tb = table.tBodies.length ? table.tBodies[0] : table;
    var rows = [];
    var ncols = headLen.length;
    for (var r = 0; r < tb.rows.length; r++) {
      var cells = tb.rows[r].cells;
      var vals = [];
      for (var c = 0; c < cells.length; c++) vals.push(cellLen(cells[c]));
      rows.push(vals);
      if (vals.length > ncols) ncols = vals.length;
    }
    /* bodyMax initialisé à 0 sur TOUTES les colonnes : une colonne au corps
       vide (ex. « Niveau de sort max » clairsemé) compte quand même
       (en-tête + padding), sinon la largeur est sous-estimée. */
    var bodyMax = [];
    for (var k = 0; k < ncols; k++) bodyMax.push(0);
    var maxBody = 0;
    rows.forEach(function (vals) {
      for (var c = 0; c < vals.length; c++) {
        if (vals[c] > bodyMax[c]) bodyMax[c] = vals[c];
        if (vals[c] > maxBody) maxBody = vals[c];
      }
    });
    if (!ncols) return null;
    if (estWidth(bodyMax, headLen, 12) <= FIT_W) return 'keep';
    if (estWidth(bodyMax, headLen, 11) <= FIT_W) return 'narrow';
    /* Tolérance pour les matrices à petites cellules (ex. Table 9-10) :
       le wrap réel absorbe ~16 px que le modèle (corps sur 1 ligne)
       ne compte pas — uniquement si aucune cellule ne dépasse 12 car. */
    if (maxBody <= 12 && estWidth(bodyMax, headLen, 11) <= FIT_W + 16) return 'narrow';
    if (maxBody >= PROSE_MIN) return null;
    if (ncols >= MATRIX_COLS) return 'scroll';
    if (maxBody >= NOTE_MIN) return 'scroll';
    return null;
  }

  function fitAll(root) {
    if (!root || !root.querySelectorAll) return 0;
    var n = 0;
    var tables = root.querySelectorAll('table.stackable');
    for (var i = 0; i < tables.length; i++) {
      var kind = classify(tables[i]);
      if (kind === 'keep') { tables[i].classList.add('keep-table'); n++; }
      else if (kind === 'narrow') { tables[i].classList.add('keep-table', 'fit-narrow'); n++; }
      else if (kind === 'scroll') { tables[i].classList.add('scroll-table'); n++; }
    }
    return n;
  }

  window.DCCTableFit = {
    classify: classify,
    fitAll: fitAll,
    FIT_W: FIT_W,
  };
})();
