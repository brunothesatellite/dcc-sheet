/* ============================================================
   DCC Sheet - Référence complète (contenu optionnel contentref)
   ------------------------------------------------------------
   Affiche les pages de ../dcc-spells-reader/contentref (5..61) en
   plein écran : chrome aide-classes.js (titre + sommaire + croix),
   corps en parchemin infini (même mécanisme et caches que
   spell-reader.js : seuils 800 px, batch 3, précharge p-2..p+5).
   La page 4 (TABLE DES MATIÈRES imprimée du livre) n'est PAS
   affichée : redondante avec le sommaire cliquable.
   Contenu optionnel : sans contentref déployé (ou ancien contenu
   avec seulement content/), bouton et entrée restent invisibles,
   sans erreur console ni toast (détection indépendante des sorts).
   ============================================================ */
(function () {
  'use strict';

  var BASE = '../dcc-spells-reader';
  /* La page 4 scan (sommaire imprimé du livre) est exclue : notre
     sommaire cliquable la remplace. Plage affichée : 5..61. */
  var REF_FIRST = 5;
  var REF_LAST = 61;

  var readyPromise = null;
  var available = false;
  var toc = null;            // window.DCC_REF_TOC une fois chargé (peut rester null)
  var pagePromises = {};     // n -> Promise<html|null> (1 seul <script> par page)

  /* Chargement de script silencieux (la réussite = contenu présent).
     Aucun console.error, aucun toast : l'échec est un cas normal
     (contenu non déployé ou ancien contenu sans contentref). */
  function loadScript(src) {
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(true); };
      s.onerror = function () { s.remove(); resolve(false); };
      document.head.appendChild(s);
    });
  }

  function hasAnchors() {
    var a = window.DCC_REF_ANCHORS;
    return !!a && typeof a === 'object' && Object.keys(a).length > 0;
  }

  function enable() {
    available = true;
    if (document.documentElement && document.documentElement.classList) {
      document.documentElement.classList.add('has-ref-reader');
    }
    return true;
  }

  function loadToc() {
    if (Array.isArray(window.DCC_REF_TOC) && window.DCC_REF_TOC.length) {
      toc = window.DCC_REF_TOC;
      return Promise.resolve(true);
    }
    return loadScript(BASE + '/contentref/toc.js').then(function (ok) {
      toc = (ok && Array.isArray(window.DCC_REF_TOC) && window.DCC_REF_TOC.length)
        ? window.DCC_REF_TOC : null;
      return true; // le sommaire est optionnel (repli) : ne bloque jamais
    });
  }

  function ensureReady() {
    if (readyPromise) return readyPromise;
    if (hasAnchors()) {
      enable();
      readyPromise = loadToc().then(function () { return true; });
      return readyPromise;
    }
    readyPromise = loadScript(BASE + '/contentref/anchors-ref.js').then(function (ok) {
      if (!ok || !hasAnchors()) return false;
      enable();
      return loadToc().then(function () { return true; });
    });
    return readyPromise;
  }

  function isAvailable() { return available; }

  function inRange(n) { return n >= REF_FIRST && n <= REF_LAST; }

  function nextPage(n) {
    for (var p = n + 1; p <= REF_LAST; p++) if (inRange(p)) return p;
    return null;
  }

  function prevPage(n) {
    for (var p = n - 1; p >= REF_FIRST; p--) if (inRange(p)) return p;
    return null;
  }

  function loadPage(n) {
    if (!pagePromises[n]) {
      if (window.DCC_REF_PAGES && window.DCC_REF_PAGES[n]) {
        pagePromises[n] = Promise.resolve(window.DCC_REF_PAGES[n]);
      } else {
        pagePromises[n] = loadScript(BASE + '/contentref/' + n + '.js').then(function (ok) {
          return (ok && window.DCC_REF_PAGES && window.DCC_REF_PAGES[n]) || null;
        });
      }
    }
    return pagePromises[n];
  }

  /* Modèle de sommaire depuis DCC_REF_TOC [{s} | {t, d, p}].
     Repli : boutons « Page 4 … Page 61 » quand le sommaire manque. */
  function tocEntries() {
    var list = Array.isArray(toc) ? toc : [];
    var entries = [];
    var current = null;
    list.forEach(function (item) {
      if (!item || typeof item !== 'object') return;
      if (typeof item.s === 'string' && item.s) {
        current = { section: item.s, page: null };
        entries.push(current);
      } else if (typeof item.t === 'string' && item.t && item.p >= REF_FIRST && item.p <= REF_LAST) {
        var e = { title: item.t, disp: item.d, page: item.p };
        entries.push(e);
        if (current && current.page === null) current.page = item.p;
      }
    });
    if (!entries.length) {
      for (var p = REF_FIRST; p <= REF_LAST; p++) {
        entries.push({ title: 'Page ' + p, disp: null, page: p });
      }
    }
    return entries;
  }

  /* Raccord des tableaux coupés entre 2 pages (rendu seul, même
     mécanisme que spell-reader.js, idempotent, ne jette jamais). */
  function fixTableContinuationsFor(node) {
    if (!window.DCC_TABLE_CONT || !node) return;
    var prev = node.previousElementSibling;
    var next = node.nextElementSibling;
    if (prev && prev.tagName === 'SECTION' && node.tagName === 'SECTION') {
      try {
        window.DCC_TABLE_CONT.tryFixPair(prev, node, document);
      } catch (_) { /* jamais de crash de rendu */ }
    }
    if (node.tagName === 'SECTION' && next && next.tagName === 'SECTION') {
      try {
        window.DCC_TABLE_CONT.tryFixPair(node, next, document);
      } catch (_) { /* jamais de crash de rendu */ }
    }
  }

  function openReference(page) {
    if (!isAvailable()) return;
    if (!window.DCCClassHelp || typeof window.DCCClassHelp.openViewer !== 'function') return;
    var start = (page >= REF_FIRST && page <= REF_LAST) ? page : REF_FIRST;
    // Corps monté après ouverture (le chrome aide-classes fournit toc + contenu).
    var viewer = null; // overlay retourné par openViewer
    var body = null, pages = null, status = null;
    var first = null, last = null;
    var closed = false, started = false;
    var loadingDown = false, loadingUp = false;
    var anchorScroll = null;

    function onClose() { closed = true; }

    viewer = window.DCCClassHelp.openViewer(
      'Référence complète', 'Document intégral — sommaire cliquable', '', null, onClose);
    if (!viewer) return; // déjà ouvert (ou aide indisponible)
    body = viewer.querySelector('.help-body');
    var tocEl = viewer.querySelector('.help-toc');
    var content = viewer.querySelector('.help-content');
    if (!body || !tocEl || !content) return;
    content.innerHTML =
      '<div class="spell-viewer">' +
        '<div class="sv-sentinel sv-sentinel-top"></div>' +
        '<div class="sv-pages"></div>' +
        '<div class="sv-sentinel sv-sentinel-bottom"></div>' +
        '<div class="sv-status" hidden></div>' +
      '</div>';
    pages = content.querySelector('.sv-pages');
    status = content.querySelector('.sv-status');

    function setStatus(txt) {
      if (!status) return;
      status.textContent = txt || '';
      status.hidden = !txt;
    }

    /* Sommaire cliquable en premier (sections R6 + entrées). */
    tocEl.hidden = false;
    tocEntries().forEach(function (e) {
      var b = document.createElement('button');
      b.type = 'button';
      if (e.section !== undefined) {
        b.className = 'help-toc-sec';
        b.textContent = e.section;
        if (e.page === null) { b.disabled = true; }
        else { b.setAttribute('data-goto', e.page); }
      } else {
        /* Libellé = numéro de page SCAN (e.page), celui affiché dans
           l'en-tête de chaque page (« Page 16 ») — le numéro imprimé
           du livre (d) décale d'unité par endroits et ferait croire
           à un saut sur la mauvaise page. */
        b.textContent = e.title + ' (p. ' + e.page + ')';
        b.setAttribute('data-goto', e.page);
      }
      b.addEventListener('click', function () {
        scrollToPage(parseInt(b.getAttribute('data-goto'), 10));
      });
      tocEl.appendChild(b);
    });

    /* Insertion ordonnée par numéro de page + compensation du scroll
       quand la page est ajoutée au-dessus (miroir spell-reader.js). */
    function insert(n, html) {
      if (pages.querySelector('[data-loaded-page="' + n + '"]')) return null;
      var wrap = document.createElement('div');
      wrap.innerHTML = html;
      var node = wrap.firstElementChild;
      if (!node) return null;
      node.setAttribute('data-loaded-page', n);
      var children = pages.children;
      var refNode = null;
      for (var i = 0; i < children.length; i++) {
        var pn = parseInt(children[i].getAttribute('data-loaded-page') || '0', 10);
        if (pn > n) { refNode = children[i]; break; }
      }
      if (refNode) {
        var before = body.scrollHeight;
        pages.insertBefore(node, refNode);
        fixTableContinuationsFor(node);
        var delta = body.scrollHeight - before;
        body.scrollTop += delta;
        if (anchorScroll !== null) anchorScroll += delta;
      } else {
        pages.appendChild(node);
        fixTableContinuationsFor(node);
      }
      if (pages.firstElementChild) {
        first = parseInt(pages.firstElementChild.getAttribute('data-loaded-page'), 10);
      }
      if (pages.lastElementChild) {
        last = parseInt(pages.lastElementChild.getAttribute('data-loaded-page'), 10);
      }
      reAnchor();
      return node;
    }

    function loadDown() {
      if (closed || last === null || loadingDown) return Promise.resolve(false);
      var n = nextPage(last);
      if (n === null) return Promise.resolve(false);
      loadingDown = true;
      setStatus('Chargement…');
      return loadPage(n).then(function (html) {
        loadingDown = false;
        setStatus('');
        if (closed || !html) return false;
        return !!insert(n, html);
      });
    }

    function loadUp() {
      if (closed || first === null || loadingUp) return Promise.resolve(false);
      var n = prevPage(first);
      if (n === null) return Promise.resolve(false);
      loadingUp = true;
      setStatus('Chargement…');
      return loadPage(n).then(function (html) {
        loadingUp = false;
        setStatus('');
        if (closed || !html) return false;
        return !!insert(n, html);
      });
    }

    /* Chargement par position de scroll : seuil 800 px, 3 pages par batch. */
    function maybeLoadMore() {
      if (closed || !started) return;
      var st = body.scrollTop;
      var sh = body.scrollHeight;
      var ch = body.clientHeight;
      if (st + ch >= sh - 800) {
        (function () {
          var cnt = 0;
          (function stepDown() {
            if (closed || cnt >= 3) return;
            loadDown().then(function (more) { if (more) { cnt++; stepDown(); } });
          })();
        })();
      }
      if (st < 800) {
        (function () {
          var cnt = 0;
          (function stepUp() {
            if (closed || cnt >= 3) return;
            loadUp().then(function (more) { if (more) { cnt++; stepUp(); } });
          })();
        })();
      }
    }

    /* Pré-chargement des pages voisines (p-2 .. p+5) en parallèle. */
    function preloadAround(pageNum) {
      for (var p = pageNum - 2; p <= pageNum + 5; p++) {
        if (p === pageNum || !inRange(p)) continue;
        (function (n) {
          loadPage(n).then(function (html) {
            if (closed || !html) return;
            insert(n, html);
          });
        })(p);
      }
    }

    /* Compteur monotone : seul le DERNIER clic fait défiler. Sans lui,
       deux clics rapprochés se disputent le scroll (le premier promesse
       résolue en dernier gagne) et l'on atterrit sur une mauvaise page. */
    var lastRequest = 0;

    function scrollToPage(p) {
      if (!inRange(p)) return false;
      var req = ++lastRequest;
      loadPage(p).then(function (html) {
        if (closed || req !== lastRequest) return; // clic plus récent pris en charge
        /* insert() retourne null si la page est déjà dans le DOM (cas
           fréquent : page préchargée p-2..p+5) — on cible alors la page
           existante, sans quoi « il ne se passe rien ». */
        var node = insert(p, html) ||
          pages.querySelector('[data-loaded-page="' + p + '"]');
        if (node && typeof node.scrollIntoView === 'function') {
          node.scrollIntoView({ block: 'start' });
        }
        anchorScroll = body.scrollTop;
        preloadAround(p);
        maybeLoadMore();
      });
      return true;
    }

    /* Recalage après insertion au-dessus ou swap de polices,
       uniquement si l'utilisateur n'a pas défilé entre temps. */
    function reAnchor() {
      if (closed || !started || anchorScroll === null) return;
      if (Math.abs(body.scrollTop - anchorScroll) > 2) return;
      body.scrollTop = anchorScroll;
    }

    body.addEventListener('scroll', maybeLoadMore);

    loadPage(start).then(function (html) {
      if (closed) return;
      if (!html) {
        setStatus('Page indisponible.');
        return;
      }
      insert(start, html);
      first = last = start;
      started = true;
      preloadAround(start);
      maybeLoadMore();
    });

    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
      document.fonts.ready.then(function () { reAnchor(); });
    }
  }

  /* ---------------------------------------------------------
     Démarrage (script chargé en fin de body : le DOM est prêt)
     --------------------------------------------------------- */
  ensureReady();

  window.DCCRefReader = {
    ensureReady: ensureReady,
    isAvailable: isAvailable,
    openReference: openReference,
    setAnchors: function (anchors) {
      window.DCC_REF_ANCHORS = anchors;
      toc = null;
      available = false;
      readyPromise = null;
      if (document.documentElement && document.documentElement.classList) {
        document.documentElement.classList.remove('has-ref-reader');
      }
      return ensureReady();
    },
    FIRST: REF_FIRST,
    LAST: REF_LAST
  };
})();
