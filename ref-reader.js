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
  var tocPromise = null;     // promesse de chargement du sommaire (mémoïsée)
  var tocWaiters = [];       // fn() à appeler dès que toc est connu
  var pagePromises = {};     // n -> Promise<html|null> (1 seul <script> par page)
  var resumePage = null;     // page visible à la fermeture (réouverture au même endroit)
  var resumeOffset = 0;      // décalage dans resumePage (px depuis le haut de page)
  var resumeAtTop = false;   // vrai si le sommaire était visible (page pas encore atteinte)

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
    if (tocPromise) return tocPromise;
    if (Array.isArray(window.DCC_REF_TOC) && window.DCC_REF_TOC.length) {
      toc = window.DCC_REF_TOC;
      tocPromise = Promise.resolve(true);
      return tocPromise;
    }
    tocPromise = loadScript(BASE + '/contentref/toc.js').then(function (ok) {
      toc = (ok && Array.isArray(window.DCC_REF_TOC) && window.DCC_REF_TOC.length)
        ? window.DCC_REF_TOC : null;
      var waiters = tocWaiters;
      tocWaiters = [];
      waiters.forEach(function (fn) {
        try { fn(); } catch (_) { /* un rendu ne casse jamais le chargement */ }
      });
      return true; // le sommaire est optionnel (repli) : ne bloque jamais
    });
    return tocPromise;
  }

  /* fn() appelée dès que toc est connu (immédiat si déjà là). */
  function onTocReady(fn) {
    if (toc) { fn(); return; }
    tocWaiters.push(fn);
    loadToc();
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
          var html = (ok && window.DCC_REF_PAGES && window.DCC_REF_PAGES[n]) || null;
          /* Un échec (serveur froid APK, réseau) n'est PAS mémorisé : la
             tentative suivante (re-clic, scroll) recharge au lieu de rester
             bloquée sur « Page indisponible » jusqu'au refresh. */
          if (!html) delete pagePromises[n];
          return html;
        });
      }
    }
    return pagePromises[n];
  }

  /* Normalisation pour rapprocher un titre du sommaire d'une ancre ou
     d'un intertitre (titres courts du sommaire vs titres longs des pages,
     accents, casse, ponctuation). */
  function slugify(s) {
    return String(s || '').toLowerCase().normalize('NFD')
      .replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '');
  }

  function deplural(s) {
    return String(s || '').split(' ').map(function (w) {
      return (w.length > 3 && w.charAt(w.length - 1) === 's') ? w.slice(0, -1) : w;
    }).join(' ');
  }

  function anchorsOf(page) {
    var a = window.DCC_REF_ANCHORS;
    var list = [];
    if (!a || typeof a !== 'object') return list;
    Object.keys(a).forEach(function (key) {
      var e = a[key];
      if (e && e.page === page && e.id) {
        var i = key.lastIndexOf('|');
        list.push({ slug: i === -1 ? key : key.slice(0, i), id: e.id });
      }
    });
    return list;
  }

  /* id d'ancre pour (titre, page) : slug exact, puis préfixe (titres courts
     du sommaire : « Table critique I » vs « ...ipersonnages... »), puis
     meilleur préfixe commun (seuil 6). null = repli texte au clic. */
  function anchorIdFor(title, page) {
    var s = slugify(title);
    if (!s) return null;
    var cands = anchorsOf(page);
    var i, best, n, cs;
    for (i = 0; i < cands.length; i++) {
      if (cands[i].slug === s) return cands[i].id;
    }
    best = null;
    for (i = 0; i < cands.length; i++) {
      cs = cands[i].slug;
      if (cs.indexOf(s) === 0 || s.indexOf(cs) === 0) {
        if (!best || cs.length > best.slug.length) best = cands[i];
      }
    }
    if (best) return best.id;
    best = null;
    var bestN = 0;
    for (i = 0; i < cands.length; i++) {
      cs = cands[i].slug;
      n = 0;
      while (n < s.length && n < cs.length && s[n] === cs[n]) n++;
      if (n > bestN) { bestN = n; best = cands[i]; }
    }
    return (best && bestN >= 6) ? best.id : null;
  }

  /* Repli quand l'ancre est absente (contenu en cours d'écriture : certains
     intertitres n'ont pas encore d'id) : on vise l'intertitre lui-même
     (texte rapproché, pluriels tolérés), ou le sigle final (« Table
     critique DR » → intertitre parlant de critiques + « dr »). */
  function textTarget(pageNode, title) {
    var nt = deplural(slugify(title));
    if (!nt || !pageNode || !pageNode.querySelectorAll) return null;
    var heads = pageNode.querySelectorAll('h1, h2, h3, h4');
    var i, nh;
    for (i = 0; i < heads.length; i++) {
      nh = deplural(slugify(heads[i].textContent));
      if (nh && (nh.indexOf(nt) !== -1 || nt.indexOf(nh) !== -1)) return heads[i];
    }
    var words = nt.split(' ');
    var last = words[words.length - 1];
    if (last && last.length <= 3) {
      for (i = 0; i < heads.length; i++) {
        nh = ' ' + deplural(slugify(heads[i].textContent)) + ' ';
        if (nh.indexOf('critique') !== -1 && nh.indexOf(' ' + last + ' ') !== -1) {
          return heads[i];
        }
      }
    }
    return null;
  }

  /* Modèle de sommaire depuis DCC_REF_TOC [{s} | {t, d, p}].
     Repli : boutons « Page 5 … Page 61 » quand le sommaire manque. */
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
        var e = { title: item.t, disp: item.d, page: item.p,
          anchor: anchorIdFor(item.t, item.p) };
        entries.push(e);
        if (current && current.page === null) {
          current.page = item.p;
          current.anchor = e.anchor;
          current.title = item.t;
        }
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

  /* Page vide ou tronquée (fichier en cours d'écriture côté contenu,
     script vide mais valide) : ni tableau, ni intertitre, presque pas de
     texte. On la saute au lieu d'insérer une page blanche. */
  function isTruncated(html) {
    if (!html || typeof html !== 'string') return true;
    if (/<table[\s>]/i.test(html)) return false;
    if (/<h[1-4][\s>]/i.test(html)) return false;
    var txt = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
    return txt.length < 30;
  }

  function openReference(page) {
    if (!isAvailable()) return;
    if (!window.DCCClassHelp || typeof window.DCCClassHelp.openViewer !== 'function') return;
    /* Sans page explicite, on reprend où l'utilisateur avait fermé (pas de
       remise à zéro). Un appel explicite (sommaire, test) garde la priorité
       et repart du haut de la page demandée. */
    var explicit = (page >= REF_FIRST && page <= REF_LAST);
    var start = explicit ? page
      : (resumePage !== null && inRange(resumePage) ? resumePage : REF_FIRST);
    var restoreOffset = explicit ? 0 : resumeOffset;
    // Corps monté après ouverture (le chrome aide-classes fournit toc + contenu).
    var viewer = null; // overlay retourné par openViewer
    var body = null, pages = null, status = null;
    var first = null, last = null;
    var closed = false, started = false;
    var loadingDown = false, loadingUp = false;
    var anchorScroll = null;
    var resizeObs = null;      // observateur de taille du sommaire (1.2)
    var onFontsDone = null;    // handler 'loadingdone' détaché à la fermeture

    function onClose() {
      closed = true;
      try { savePosition(); } catch (_) { /* la sauvegarde ne casse jamais la fermeture */ }
      if (resizeObs && typeof resizeObs.disconnect === 'function') resizeObs.disconnect();
      if (onFontsDone && document.fonts && typeof document.fonts.removeEventListener === 'function') {
        document.fonts.removeEventListener('loadingdone', onFontsDone);
      }
    }

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

    /* Sommaire cliquable en premier (sections R6 + entrées) : (re)construit à
       l'ouverture, puis reconstruit si toc.js arrive APRÈS l'ouverture — la
       fenêtre silencieuse du premier chargement servait un sommaire de repli
       « Page 5 … Page 61 » jusqu'au refresh. */
    function renderToc() {
      tocEl.innerHTML = '';
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
          scrollToPage(parseInt(b.getAttribute('data-goto'), 10), e);
        });
        tocEl.appendChild(b);
      });
    }
    renderToc();
    if (!toc) {
      /* Sommaire de repli affiché : on le remplace dès que toc.js résout
         (l'observateur de taille 1.2 + reAnchor absorbent le changement de
         hauteur du sommaire). */
      onTocReady(function () {
        if (closed) return;
        renderToc();
        reAnchor();
      });
    }

    /* Bouton « Sommaire » à GAUCHE de la croix (qui ferme) : remonte au
       sommaire cliquable du début. La croix garde son rôle de fermeture. */
    var closeBtn = viewer.querySelector('.help-close');
    if (closeBtn && closeBtn.parentNode) {
      var homeBtn = document.createElement('button');
      homeBtn.type = 'button';
      homeBtn.className = 'help-home';
      homeBtn.textContent = '\u2630'; // ☰ sommaire
      homeBtn.title = 'Revenir au sommaire';
      homeBtn.setAttribute('aria-label', 'Revenir au sommaire');
      closeBtn.parentNode.insertBefore(homeBtn, closeBtn);
      homeBtn.addEventListener('click', function () {
        /* Le recalage du scroll infini doit viser le sommaire, pas la
           dernière page cliquée. */
        anchorEl = null;
        anchorScroll = null;
        anchorOffset = 0;
        if (!scrollToTarget(tocEl) && body) {
          body.scrollTop = 0; // repli ultime
        }
      });
    }

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
        /* Position du point d'insertion AVANT insertion : la compensation
           n'a de sens que si l'insertion décale le contenu VISIBLE. Un
           « retardataire » qui arrive SOUS le viewport ne bouge pas la vue —
           le compenser faisait sauter la lecture d'environ une page
           (bug « page au hasard », surtout au premier chargement où l'ordre
           réseau est aléatoire). En jsdom, les rects sont à 0 : la condition
           reste vraie, les tests existants sont inchangés. */
        var refTop = refNode.getBoundingClientRect().top;
        var scBottom = body.getBoundingClientRect().bottom;
        var before = body.scrollHeight;
        pages.insertBefore(node, refNode);
        /* Raccord AVANT la mesure du delta : le correctif modifie les
           hauteurs (ligne "(suite)" ou fusion), y compris dans la page
           precedente situee au-dessus, donc la compensation doit l'inclure. */
        fixTableContinuationsFor(node);
        /* Idem pour les tableaux responsives (table-fit.js) : keep/scroll
           changent la hauteur du nœud — à inclure dans le delta. */
        if (window.DCCTableFit) window.DCCTableFit.fitAll(node);
        var delta = body.scrollHeight - before;
        if (refTop <= scBottom) {
          body.scrollTop += delta;
          if (anchorScroll !== null) anchorScroll += delta;
        }
      } else {
        pages.appendChild(node);
        fixTableContinuationsFor(node);
        /* Tableaux responsives (table-fit.js) : keep/scroll posés à
           l'insertion — sous garde pour ne jamais casser sans lui. */
        if (window.DCCTableFit) window.DCCTableFit.fitAll(node);
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
        if (isTruncated(html)) return true; // page vide : on la saute, on continue
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
        if (isTruncated(html)) return true; // page vide : on la saute, on continue
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
            if (closed || !html || isTruncated(html)) return;
            insert(n, html);
          });
        })(p);
      }
    }

    /* Compteur monotone : seul le DERNIER clic fait défiler. Sans lui,
       deux clics rapprochés se disputent le scroll (le premier promesse
       résolue en dernier gagne) et l'on atterrit sur une mauvaise page. */
    var lastRequest = 0;
    /* Élément visé par le dernier clic (intertitre ou page) : le recalage
       re-scrolle vers LUI (miroir des sorts), jamais vers un nombre mémorisé
       que swap de polices et raccords de tableaux auraient périmé. */
    var anchorEl = null;
    /* Décalage de l'ancre sous le haut du port : 0 après un clic sommaire
       (intertitre calé en haut), = décalage mémorisé après une restauration
       (scroll manuel) — sans lui, reAnchor() écrasait le décalage restauré
       en recalant le haut de page, d'où retour « sur l'ancre » au lieu de
       l'endroit où le scroll s'était arrêté. */
    var anchorOffset = 0;

    /* Mémorisation à la fermeture : première page visible + décalage dans
       cette page. Page pas encore atteinte (sommaire visible) : on rouvrira
       en haut (resumeAtTop) au lieu de sauter en haut de page. Repli : page
       de l'ancre cliquée, sinon page de départ. */
    function savePosition() {
      if (!body || !pages || !pages.children || !pages.children.length) return;
      if (!body.getBoundingClientRect) return;
      var bodyRect = body.getBoundingClientRect();
      var i, child, r, pn;
      for (i = 0; i < pages.children.length; i++) {
        child = pages.children[i];
        if (!child.getBoundingClientRect) continue;
        r = child.getBoundingClientRect();
        if (r.bottom > bodyRect.top + 1) {
          pn = parseInt(child.getAttribute('data-loaded-page') || '0', 10);
          if (inRange(pn)) {
            resumePage = pn;
            if (r.top > bodyRect.top) {
              resumeAtTop = true;
              resumeOffset = 0;
            } else {
              resumeAtTop = false;
              resumeOffset = bodyRect.top - r.top;
            }
          }
          return;
        }
      }
      if (anchorEl && body.contains(anchorEl)) {
        var holder = null;
        if (anchorEl.getAttribute && anchorEl.getAttribute('data-loaded-page')) {
          holder = anchorEl;
        } else if (anchorEl.closest) {
          holder = anchorEl.closest('[data-loaded-page]');
        }
        if (holder) {
          pn = parseInt(holder.getAttribute('data-loaded-page') || '0', 10);
          if (inRange(pn)) {
            resumePage = pn; resumeOffset = 0; resumeAtTop = false; return;
          }
        }
      }
      resumePage = start;
      resumeOffset = 0;
      resumeAtTop = false;
    }

    /* Restauration à la réouverture : cale la page mémorisée à son décalage
       (0 = haut de page en haut du port). Les préchargements au-dessus
       compensent ensuite via insert(), et reAnchor() garde le décalage
       (anchorOffset) au lieu de recaler le haut de page. */
    function restorePosition(node) {
      if (!node || !body.getBoundingClientRect || !node.getBoundingClientRect) return;
      body.scrollTop +=
        node.getBoundingClientRect().top - body.getBoundingClientRect().top + restoreOffset;
      anchorEl = node;
      anchorScroll = body.scrollTop;
      anchorOffset = restoreOffset;
    }

    /* Défilement vers une cible (miroir du scrollToAnchor des sorts) :
       géométrie d'abord — déterministe, mesurable, aucun effet de bord sur
       les conteneurs ancêtres ni dépendance à scrollIntoView ; celui-ci
       ne sert qu'en repli si la géométrie manque. */
    function scrollToTarget(el) {
      if (!el) return false;
      if (el.getBoundingClientRect && body.getBoundingClientRect) {
        body.scrollTop += el.getBoundingClientRect().top - body.getBoundingClientRect().top;
        return true;
      }
      if (typeof el.scrollIntoView === 'function') {
        el.scrollIntoView({ block: 'start' });
        return true;
      }
      return false;
    }

    function scrollToPage(p, entry) {
      if (!inRange(p)) return false;
      var req = ++lastRequest;
      loadPage(p).then(function (html) {
        if (closed || req !== lastRequest) return; // clic plus récent pris en charge
        if (!html || isTruncated(html)) { setStatus('Page indisponible.'); return; }
        /* insert() retourne null si la page est déjà dans le DOM (cas
           fréquent : page préchargée p-2..p+5) — on cible alors la page
           existante, sans quoi « il ne se passe rien ». */
        var node = insert(p, html) ||
          pages.querySelector('[data-loaded-page="' + p + '"]');
        if (!node) { setStatus('Page indisponible.'); return; }
        /* Vise l'intertitre, pas le haut de page : sinon une entrée au
           milieu de page (ex. « Équivalences monétaires » p.16) atterrit
           sur le premier tableau de la page (Table 3-2). Ordre : ancre du
           fichier, intertitre au texte rapproché, haut de page. */
        var target = null;
        if (entry && entry.anchor) {
          try { target = node.querySelector('#' + entry.anchor); } catch (_) { target = null; }
        }
        if (!target && entry && entry.title) target = textTarget(node, entry.title);
        scrollToTarget(target || node);
        anchorEl = target || node;
        anchorScroll = body.scrollTop;
        anchorOffset = 0; // clic : l'intertitre est calé en haut, sans décalage
        preloadAround(p);
        maybeLoadMore();
      });
      return true;
    }

    /* Recalage après insertion au-dessus ou swap de polices,
       uniquement si l'utilisateur n'a pas défilé entre temps.
       Garde le décalage de l'ancre (scroll manuel restauré) au lieu de
       recaler le haut de page. */
    function reAnchor() {
      if (closed || !started || anchorScroll === null) return;
      if (Math.abs(body.scrollTop - anchorScroll) > 2) return;
      if (anchorEl && body.contains(anchorEl)) {
        scrollToTarget(anchorEl);
        if (anchorOffset) body.scrollTop += anchorOffset;
      }
      anchorScroll = body.scrollTop;
    }

    body.addEventListener('scroll', maybeLoadMore);

    loadPage(start).then(function (html) {
      if (closed) return;
      if (!html || isTruncated(html)) {
        setStatus('Page indisponible.');
        preloadAround(start); // les voisines valides restent accessibles
        return;
      }
      insert(start, html);
      first = last = start;
      started = true;
      if (!explicit && !resumeAtTop && resumePage !== null && inRange(resumePage)) {
        var startNode = pages.querySelector('[data-loaded-page="' + start + '"]');
        restorePosition(startNode);
      }
      preloadAround(start);
      maybeLoadMore();
    });

    /* Recalage polices : document.fonts.ready est une promesse ONE-SHOT,
       le plus souvent déjà résolue à l'ouverture (l'UI principale utilise
       les mêmes familles) → le .then partait en microtâche immédiate (no-op)
       et ne se rejouait jamais quand les polices du viewer arrivaient.
       'loadingdone' se déclenche à CHAQUE fin de chargement de polices. */
    if (document.fonts) {
      if (typeof document.fonts.addEventListener === 'function') {
        onFontsDone = function () { reAnchor(); };
        document.fonts.addEventListener('loadingdone', onFontsDone);
      }
      if (document.fonts.ready && typeof document.fonts.ready.then === 'function') {
        document.fonts.ready.then(function () { reAnchor(); });
      }
    }
    /* Le sommaire (Barlow Condensed, majuscules, flex-wrap) se ré-enroule au
       swap de polices : toute variation de hauteur au-dessus de l'ancre est
       reperée par l'observateur de taille → reAnchor(). */
    if (typeof ResizeObserver === 'function') {
      try {
        resizeObs = new ResizeObserver(function () { reAnchor(); });
        resizeObs.observe(tocEl);
      } catch (_) { /* jamais de crash pour un observateur (jsdom, vieux webviews) */ }
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
    /* Hooks d'audit (tests/26-anchors-audit) : rejouent la résolution RÉELLE
       du sommaire (anchorIdFor + textTarget) contre le contenu déployé —
       jamais de copie de l'algorithme dans les tests. */
    _anchorIdFor: anchorIdFor,
    _textTarget: textTarget,
    setAnchors: function (anchors) {
      window.DCC_REF_ANCHORS = anchors;
      toc = null;
      tocPromise = null;
      available = false;
      readyPromise = null;
      resumePage = null;
      resumeOffset = 0;
      resumeAtTop = false;
      if (document.documentElement && document.documentElement.classList) {
        document.documentElement.classList.remove('has-ref-reader');
      }
      return ensureReady();
    },
    FIRST: REF_FIRST,
    LAST: REF_LAST
  };
})();
