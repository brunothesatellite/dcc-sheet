// ============================================================
// DCC Spell Reader - Raccord des tableaux coupes entre 2 pages
// Rendu uniquement : les fichiers content/*.js ne sont pas modifies.
// Expose window.DCC_TABLE_CONT (navigateur) / module.exports (Node).
// ============================================================
(function (root, factory) {
  "use strict";
  var api = factory();
  if (typeof module !== "undefined" && module.exports) {
    module.exports = api;
  } else {
    root.DCC_TABLE_CONT = api;
  }
}(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  // --- Petits utilitaires DOM (standard, sans dependance) ---

  function childElements(el) {
    var out = [];
    var kids = el.children || [];
    for (var i = 0; i < kids.length; i++) out.push(kids[i]);
    return out;
  }

  function hasClass(el, cls) {
    return !!(el.classList && el.classList.contains(cls));
  }

  function isResultsTable(el) {
    return !!el && el.tagName === "TABLE" &&
      hasClass(el, "data") && hasClass(el, "results-tbl");
  }

  function isTableWrap(el) {
    return !!el && el.tagName === "DIV" && hasClass(el, "table-wrap");
  }

  function isPageHead(el) {
    return !!el && el.tagName === "DIV" && hasClass(el, "page-head");
  }

  function findDescendants(el, pred) {
    var out = [];
    (function walk(node) {
      var kids = childElements(node);
      for (var i = 0; i < kids.length; i++) {
        if (pred(kids[i])) out.push(kids[i]);
        walk(kids[i]);
      }
    })(el);
    return out;
  }

  function textOf(el) {
    return String((el && el.textContent) || "");
  }

  // --- Lecture des fourchettes ("14-17", "32+", "4") ---

  function parseRange(s) {
    var m = /^\s*(\d+)\s*(?:-\s*(\d+))?\s*(\+)?\s*$/.exec(String(s == null ? "" : s));
    if (!m) return null;
    var start = parseInt(m[1], 10);
    var end = m[2] ? parseInt(m[2], 10) : (m[3] ? null : start);
    return { start: start, end: end };
  }

  // R2 succede directement a R1 ? ("14-17" -> "18-19")
  function isSuccessor(r1text, r2text) {
    var a = parseRange(r1text);
    var b = parseRange(r2text);
    return !!a && !!b && a.end !== null && b.start === a.end + 1;
  }

  // Derniere cellule : terminee par . ! ? ... ? (":" et ";" = suite attendue)
  function endsIncomplete(text) {
    var t = String(text).replace(/\s+/g, " ").trim();
    if (!t) return false;
    return ".!?\u2026".indexOf(t[t.length - 1]) === -1;
  }

  // Commence par une minuscule (1re lettre trouvee) ?
  var LETTER_RE = /[A-Za-z\u00C0-\u024F\u1E00-\u1EFF\u0152\u0153\u00C6\u00E6]/;
  function startsLower(text) {
    var m = LETTER_RE.exec(String(text));
    if (!m) return false;
    var ch = m[0];
    return ch === ch.toLowerCase() && ch !== ch.toUpperCase();
  }

  // --- Structure des sections ---

  // Derniere table.results-tbl de la section, seulement si la section
  // se termine par elle (sinon : pas de coupe de tableau).
  function lastResultsTableAtEnd(section) {
    var kids = childElements(section);
    if (!kids.length) return null;
    var last = kids[kids.length - 1];
    if (!isTableWrap(last)) return null;
    var tables = findDescendants(last, isResultsTable);
    if (!tables.length) return null;
    return tables[tables.length - 1];
  }

  function rangeCells(table) {
    return findDescendants(table, function (el) {
      return el.tagName === "TD" && hasClass(el, "range");
    });
  }

  function cellCells(table) {
    return findDescendants(table, function (el) {
      return el.tagName === "TD" && hasClass(el, "cell");
    });
  }

  // <p> orphelins en tete de section (apres .page-head), sans classe.
  // Retourne { orphans, next } ou next = 1er element qui suit.
  function leadingOrphans(section) {
    var kids = childElements(section);
    var i = 0;
    if (kids.length && isPageHead(kids[0])) i = 1;
    var orphans = [];
    while (i < kids.length && kids[i].tagName === "P" && !kids[i].getAttribute("class")) {
      orphans.push(kids[i]);
      i++;
    }
    return { orphans: orphans, next: i < kids.length ? kids[i] : null };
  }

  function firstResultsTableIn(wrap) {
    if (!isTableWrap(wrap)) return null;
    var tables = findDescendants(wrap, isResultsTable);
    return tables.length ? tables[0] : null;
  }

  function firstTbody(table) {
    var found = findDescendants(table, function (el) { return el.tagName === "TBODY"; });
    return found.length ? found[0] : null;
  }

  // Dernier noeud texte (le plus profond a droite), pour la cesure.
  function deepestLastText(el) {
    var kids = el.childNodes || [];
    for (var i = kids.length - 1; i >= 0; i--) {
      if (kids[i].nodeType === 3) return kids[i];
      if (kids[i].nodeType === 1) {
        var found = deepestLastText(kids[i]);
        if (found) return found;
      }
    }
    return null;
  }

  function paragraphs(el) {
    return findDescendants(el, function (n) { return n.tagName === "P"; });
  }

  // --- Correctifs ---

  // Cas A : la ligne R1 est coupee, la suite ouvre la page suivante et le
  // tableau reprend a R2 = successeur. Insere "R1 (suite)" en 1re ligne.
  function applyCaseA(doc, nextTable, r1label, orphans) {
    var tbody = firstTbody(nextTable) || nextTable;
    var tr = doc.createElement("tr");
    tr.setAttribute("data-suite-of", r1label);
    var tdR = doc.createElement("td");
    tdR.setAttribute("class", "range suite");
    tdR.textContent = r1label + " (suite)";
    var tdC = doc.createElement("td");
    tdC.setAttribute("class", "cell");
    for (var i = 0; i < orphans.length; i++) tdC.appendChild(orphans[i]); // deplace
    tr.appendChild(tdR);
    tr.appendChild(tdC);
    tbody.insertBefore(tr, tbody.firstChild || null);
    return tr;
  }

  // Cas B : fin de tableau (R1 final type "32+"), la queue est tombee sur
  // la page suivante. La fusionne dans le dernier <p> de la derniere
  // cellule (simple espace, sans saut de paragraphe ; cesure geree).
  function applyCaseB(doc, prevTable, orphans) {
    var cells = cellCells(prevTable);
    if (!cells.length) return null;
    var last = cells[cells.length - 1];
    var paras = paragraphs(last);
    var target = paras.length ? paras[paras.length - 1] : null;
    for (var i = 0; i < orphans.length; i++) {
      var orphan = orphans[i];
      if (!target) {
        last.appendChild(orphan); // repli : aucune fusion possible
        continue;
      }
      var tail = textOf(target).replace(/\s+$/g, "");
      var head = textOf(orphan).replace(/^\s+/g, "");
      if (tail.charAt(tail.length - 1) === "-" && startsLower(head)) {
        var tn = deepestLastText(target); // mot coupe : "contre-" + "attaque"
        if (tn) tn.textContent = String(tn.textContent).replace(/-\s*$/, "");
      } else {
        target.appendChild(doc.createTextNode(" "));
      }
      while (orphan.firstChild) target.appendChild(orphan.firstChild); // deplace
      if (orphan.parentNode) orphan.parentNode.removeChild(orphan);
    }
    return last;
  }

  // Tente le raccord prev -> next. Retourne "A", "B", "deja" ou null.
  // Ne touche a rien hors tableau results-tbl ; idempotent.
  function tryFixPair(prevSection, nextSection, doc) {
    if (!prevSection || !nextSection || !doc) return null;
    if (prevSection.tagName !== "SECTION" || nextSection.tagName !== "SECTION") return null;
    if (nextSection.dataset && nextSection.dataset.tblContFixed) return "deja";

    var prevTable = lastResultsTableAtEnd(prevSection);
    if (!prevTable) return null;

    var lead = leadingOrphans(nextSection);
    if (!lead.orphans.length) return null;

    var prevRanges = rangeCells(prevTable);
    if (!prevRanges.length) return null;
    var r1 = textOf(prevRanges[prevRanges.length - 1]).trim();
    if (!parseRange(r1)) return null;

    var nextTable = firstResultsTableIn(lead.next);
    if (nextTable) {
      // --- Cas A : le tableau reprend juste apres les orphelins ---
      var firstRanges = rangeCells(nextTable);
      if (!firstRanges.length) return null;
      var r2 = textOf(firstRanges[0]).trim();
      if (!isSuccessor(r1, r2)) return null; // autre tableau : on ne touche pas
      applyCaseA(doc, nextTable, r1, lead.orphans);
      if (nextSection.dataset) nextSection.dataset.tblContFixed = "A:" + r1;
      return "A";
    }

    // --- Cas B : pas de tableau derriere (fin de tableau) ---
    // Garde-fous stricts : queue de ligne finale, cellule prev non
    // terminee, orphelin qui continue en minuscule.
    var r1p = parseRange(r1);
    if (!r1p || r1p.end !== null) return null; // R1 non final : doute -> stop
    var prevCells = cellCells(prevTable);
    if (!prevCells.length) return null;
    if (!endsIncomplete(textOf(prevCells[prevCells.length - 1]))) return null;
    if (!startsLower(textOf(lead.orphans[0]))) return null;
    applyCaseB(doc, prevTable, lead.orphans);
    if (nextSection.dataset) nextSection.dataset.tblContFixed = "B:" + r1;
    return "B";
  }

  return {
    parseRange: parseRange,
    isSuccessor: isSuccessor,
    endsIncomplete: endsIncomplete,
    startsLower: startsLower,
    tryFixPair: tryFixPair
  };
}));
