/* ============================================================
   DCC Sheet - Consultation des definitions de sorts
   ------------------------------------------------------------
   Ouvre le texte HTML d'un sort (plein ecran, scroll infini)
   a partir du dossier frere ../dcc-spells-reader.
   Si ce dossier n'est pas accessible, aucune icone n'apparait.
   Les noms saisis en anglais sont traduits en francais via
   ../dcc-spells-reader/spell-translation.js avant resolution.
   ============================================================ */
(function () {
  'use strict';

  var BASE = '../dcc-spells-reader';
  var RANGES = [[127, 303], [322, 356]];

  var index = null;        // slug -> [ { page, id, title }, ... ] (ordre du livre)
  var readyPromise = null;
  var pageCache = {};
  var transFrom = {};      // slug(EN) -> nom francais canonique
  var transPromise = null; // chargement de spell-translation.js (une seule fois)

  /* ---------------------------------------------------------
     Chargement de script (la reussite = dossier present)
     --------------------------------------------------------- */
  function loadScript(src) {
    return new Promise(function (resolve) {
      var s = document.createElement('script');
      s.src = src;
      s.onload = function () { resolve(true); };
      s.onerror = function () { s.remove(); resolve(false); };
      document.head.appendChild(s);
    });
  }

  /* ---------------------------------------------------------
     Normalisation (identique au dcc-spells-reader)
     --------------------------------------------------------- */
  function slugify(s) {
    return String(s)
      .replace(/\u0153/g, 'oe')
      .replace(/\u0152/g, 'Oe')
      .replace(/\u00e6/g, 'ae')
      .replace(/\u00c6/g, 'Ae')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '');
  }

  /* Retire une eventuelle reference de page en fin de champ :
     "Boule de feu 203", "Boule de feu p. 203", "Boule de feu (page 203)" */
  function cleanName(raw) {
    var s = String(raw == null ? '' : raw).replace(/\s+/g, ' ').trim();
    if (!s) return '';
    var m = /^(.*?)\s*[([]\s*(?:p(?:age|\.)?|n(?:°|o|º)\s*\.?)?\s*\d{1,3}\s*[)\]]\s*$/i.exec(s);
    if (m && m[1].trim().length >= 2) return m[1].trim();
    m = /^(.*?)\s*(?:[-–—·:,\t]+\s*)?(?:p(?:age|\.)?\s*|n(?:°|o|º)\s*\.?\s*|#\s*)?(\d{1,3})\s*$/.exec(s);
    if (m && m[1].trim().length >= 2) return m[1].trim().replace(/[\s:,\-–—]+$/, '');
    return s;
  }

  function tokensOf(name) {
    return String(name)
      .replace(/\u0153/g, 'oe')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(function (w) { return w.length >= 3; });
  }

  /* ---------------------------------------------------------
     Pages disponibles (trou 304-321 saute)
     --------------------------------------------------------- */
  function inRange(n) {
    return RANGES.some(function (r) { return n >= r[0] && n <= r[1]; });
  }
  function nextPage(n) {
    for (var p = n + 1; p <= RANGES[RANGES.length - 1][1]; p++) if (inRange(p)) return p;
    return null;
  }
  function prevPage(n) {
    for (var p = n - 1; p >= RANGES[0][0]; p--) if (inRange(p)) return p;
    return null;
  }

  /* ---------------------------------------------------------
     Index des ancres + detection du dossier frere
     --------------------------------------------------------- */
  function buildIndex(anchors) {
    var bySlug = {};
    Object.keys(anchors).forEach(function (key) {
      var i = key.lastIndexOf('|');
      var slug = i === -1 ? key : key.slice(0, i);
      if (!bySlug[slug]) bySlug[slug] = [];
      bySlug[slug].push(anchors[key]);
    });
    return bySlug;
  }

  function enable(anchors) {
    if (!anchors || !Object.keys(anchors).length) return false;
    index = buildIndex(anchors);
    document.documentElement.classList.add('has-spell-reader');
    return true;
  }

  /* ---------------------------------------------------------
     Traductions FR <-> EN (dossier frere, optionnel)
     --------------------------------------------------------- */
  function parseTranslations(text) {
    var out = {};
    var re = /"((?:[^"\\]|\\.)*)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
    var m;
    while ((m = re.exec(String(text || '')))) out[m[1]] = m[2];
    return out;
  }

  function buildTranslations(map) {
    transFrom = {};
    if (!map || typeof map !== 'object') return false;
    Object.keys(map).forEach(function (fr) {
      var en = slugify(map[fr]);
      if (en) transFrom[en] = fr;
    });
    return Object.keys(transFrom).length > 0;
  }

  /* Le fichier du lecteur est un module ES (export const) : on le lit en
     texte et on en extrait les paires, pour rester compatible avec un simple
     chargement sans bundler. Priorite a window.DCC_SPELL_TRANSLATIONS. */
  function loadTranslations() {
    if (transPromise) return transPromise;
    if (window.DCC_SPELL_TRANSLATIONS && typeof window.DCC_SPELL_TRANSLATIONS === 'object') {
      buildTranslations(window.DCC_SPELL_TRANSLATIONS);
      transPromise = Promise.resolve(true);
      return transPromise;
    }
    if (typeof window.fetch !== 'function') {
      transPromise = Promise.resolve(false);
      return transPromise;
    }
    transPromise = window.fetch(BASE + '/spell-translation.js')
      .then(function (res) { return res && res.ok ? res.text() : ''; })
      .then(function (txt) { return buildTranslations(parseTranslations(txt)); })
      .catch(function () { return false; });
    return transPromise;
  }

  function ensureReady() {
    if (readyPromise) return readyPromise;
    if (window.DCC_ANCHORS) {
      var ok = enable(window.DCC_ANCHORS);
      readyPromise = ok
        ? loadTranslations().then(function () { return true; })
        : Promise.resolve(false);
      return readyPromise;
    }
    readyPromise = loadScript(BASE + '/content/anchors.js').then(function (ok) {
      if (!ok || !enable(window.DCC_ANCHORS)) return false;
      return loadTranslations().then(function () { return true; });
    });
    return readyPromise;
  }

  function isAvailable() { return !!index; }

  /* ---------------------------------------------------------
     Resolution d'un nom de sort -> ancre
     --------------------------------------------------------- */
  function sortPool(slugs, q) {
    return slugs
      .slice()
      .sort(function (a, b) { return Math.abs(a.length - q.length) - Math.abs(b.length - q.length); })
      .reduce(function (acc, k) { return acc.concat(index[k]); }, []);
  }

  function tokensMatch(q, name) {
    var toks = tokensOf(name);
    if (toks.length < 2) return [];
    return Object.keys(index).filter(function (k) {
      return toks.every(function (t) { return k.indexOf(t) !== -1; });
    });
  }

  /* Distance d'edit (peclet) : ultime filet contre les fautes de frappe */
  function editDistance(a, b) {
    if (a === b) return 0;
    var m = a.length, n = b.length;
    if (Math.abs(m - n) > 2) return 99;
    var prev = new Array(n + 1);
    var cur = new Array(n + 1);
    var j;
    for (j = 0; j <= n; j++) prev[j] = j;
    for (var i = 1; i <= m; i++) {
      cur[0] = i;
      var ca = a.charAt(i - 1);
      for (j = 1; j <= n; j++) {
        cur[j] = Math.min(
          prev[j] + 1,
          cur[j - 1] + 1,
          prev[j - 1] + (ca === b.charAt(j - 1) ? 0 : 1)
        );
      }
      var swap = prev;
      prev = cur;
      cur = swap;
    }
    return prev[n];
  }

  function fuzzyKeys(q, keys) {
    var best = 3;
    var out = [];
    keys.forEach(function (k) {
      if (k.length < 6 || Math.abs(k.length - q.length) > 2) return;
      var d = editDistance(q, k);
      if (d < best) { best = d; out = [k]; }
      else if (d === best && d < 3) out.push(k);
    });
    return out;
  }

  function fuzzyMatch(q) {
    return fuzzyKeys(q, Object.keys(index));
  }

  /* Nom anglais (ou faute de frappe dessus) -> nom francais du livre */
  function toFrench(q) {
    if (!q || q.length < 6) return null;
    if (transFrom[q]) return transFrom[q];
    var near = fuzzyKeys(q, Object.keys(transFrom));
    if (near.length) return transFrom[near[0]];
    return null;
  }

  function candidates(q, name) {
    if (!index || !q) return [];
    if (index[q]) return index[q].slice();

    var alt = q.length > 3
      ? [q.charAt(q.length - 1) === 's' ? q.slice(0, -1) : q + 's']
      : [];
    for (var i = 0; i < alt.length; i++) {
      if (index[alt[i]]) return index[alt[i]].slice();
    }

    var keys = Object.keys(index);
    var pref = [], cont = [];
    keys.forEach(function (k) {
      if (Math.min(k.length, q.length) < 4) return;
      if (k.indexOf(q) === 0 || q.indexOf(k) === 0) pref.push(k);
      else if (k.indexOf(q) !== -1 || q.indexOf(k) !== -1) cont.push(k);
    });

    var pool = pref.length ? pref : (cont.length ? cont : null);
    if (!pool) {
      pool = tokensMatch(q, name);
      if (!pool.length) pool = fuzzyMatch(q);
    }
    return sortPool(pool, q);
  }

  function resolve(raw) {
    var l = lookup(raw);
    return l ? l.hit : null;
  }

  /* Resolution complete : renvoie l'ancre + le libelle canonique.
     Un nom saisi en anglais est traduit en francais d'abord (le livre est
     en francais), la saisie d'origine est conservee pour l'affichage. */
  function lookup(raw) {
    if (!index) return null;
    var typed = cleanName(raw);
    var q = slugify(typed);
    if (!q) return null;

    // 1. nom deja present tel quel dans le livre (aucune ambiguite)
    if (index[q]) return refine(index[q].slice(), q, typed, typed, null);

    // 2. nom anglais connu -> francais canonique
    var fr = transFrom[q];
    if (fr) {
      var pool = candidates(slugify(fr), fr);
      if (pool.length) return refine(pool, slugify(fr), fr, typed, fr);
    }

    // 3. resolution directe (singulier/pluriel, prefixe, mots-cles, fautes de frappe)
    var direct = candidates(q, typed);
    if (direct.length) return refine(direct, q, typed, typed, null);

    // 4. faute de frappe sur un nom anglais
    fr = toFrench(q);
    if (fr) {
      var alt = candidates(slugify(fr), fr);
      if (alt.length) return refine(alt, slugify(fr), fr, typed, fr);
    }
    return null;
  }

  function refine(pool, q, name, typed, translated) {
    if (pool.length > 1) {
      var bySlug = pool.filter(function (a) { return slugify(a.title) === q; });
      if (bySlug.length) pool = bySlug;
      var byTitle = pool.filter(function (a) {
        return String(a.title).trim().toLowerCase() === name.trim().toLowerCase();
      });
      if (byTitle.length) pool = byTitle;
    }
    return { hit: pool[0], typed: typed, name: translated || typed, translated: !!translated };
  }

  /* Libelle affiche en en-tete + eventuel nom d'origine (anglais) */
  function viewerLabels(l) {
    var title = l.translated ? (l.hit.title || l.name) : l.typed;
    return { title: title, sub: slugify(l.typed) === slugify(title) ? '' : l.typed };
  }

  /* ---------------------------------------------------------
     Messages
     --------------------------------------------------------- */
  function notify(title, message) {
    if (typeof window.showModal === 'function') {
      window.showModal({ title: title, message: message });
    } else {
      window.alert(title + '\n' + message);
    }
  }

  /* ---------------------------------------------------------
     Popup plein ecran + scroll infini
     --------------------------------------------------------- */
  function loadPage(n) {
    if (pageCache[n] !== undefined) return Promise.resolve(pageCache[n]);
    return loadScript(BASE + '/content/' + n + '.js').then(function (ok) {
      var html = (ok && window.DCC_PAGES && window.DCC_PAGES[n]) || null;
      pageCache[n] = html;
      return html;
    });
  }

  function openViewer(title, page, id, sub) {
    if (document.querySelector('.spell-viewer-overlay')) return;

    var overlay = document.createElement('div');
    overlay.className = 'spell-viewer-overlay';
    overlay.innerHTML =
      '<div class="spell-viewer">' +
        '<div class="spell-viewer-header">' +
          '<div class="spell-viewer-names">' +
            '<span class="spell-viewer-title"></span>' +
            '<span class="spell-viewer-sub" hidden></span>' +
          '</div>' +
          '<button type="button" class="spell-viewer-close" aria-label="Fermer">&times;</button>' +
        '</div>' +
        '<div class="spell-viewer-body">' +
          '<div class="spell-viewer-column">' +
            '<div class="sv-sentinel sv-sentinel-top"></div>' +
            '<div class="sv-pages"></div>' +
            '<div class="sv-sentinel sv-sentinel-bottom"></div>' +
            '<div class="sv-status" hidden></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    overlay.querySelector('.spell-viewer-title').textContent = title;
    var subEl = overlay.querySelector('.spell-viewer-sub');
    if (sub) {
      subEl.textContent = sub;
      subEl.hidden = false;
    }

    var body = overlay.querySelector('.spell-viewer-body');
    var pages = overlay.querySelector('.sv-pages');
    var status = overlay.querySelector('.sv-status');
    var sentinelTop = overlay.querySelector('.sv-sentinel-top');
    var sentinelBottom = overlay.querySelector('.sv-sentinel-bottom');

    var first = null, last = null;
    var busyTop = false, busyBottom = false, closed = false, started = false;
    var io = null;
    var prevOverflow = document.body.style.overflow;
    var anchorScroll = null; // position attendue tant que l'utilisateur n'a pas defile

    function setStatus(txt) {
      status.textContent = txt || '';
      status.hidden = !txt;
    }

    function insert(n, html, where) {
      var wrap = document.createElement('div');
      wrap.innerHTML = html;
      var node = wrap.firstElementChild;
      if (!node) return null;
      node.setAttribute('data-loaded-page', n);
      if (where === 'top' && pages.firstElementChild) pages.insertBefore(node, pages.firstElementChild);
      else pages.appendChild(node);
      return node;
    }

    function loadDown() {
      if (closed || busyBottom || last === null) return Promise.resolve(false);
      var n = nextPage(last);
      if (n === null) return Promise.resolve(false);
      busyBottom = true;
      setStatus('Chargement…');
      return loadPage(n).then(function (html) {
        busyBottom = false;
        setStatus('');
        if (closed || !html) return false;
        insert(n, html, 'bottom');
        last = n;
        return true;
      });
    }

    function loadUp() {
      if (closed || busyTop || first === null) return Promise.resolve(false);
      var n = prevPage(first);
      if (n === null) return Promise.resolve(false);
      busyTop = true;
      setStatus('Chargement…');
      return loadPage(n).then(function (html) {
        busyTop = false;
        setStatus('');
        if (closed || !html) return false;
        // Mesure APRES l'effacement du status : celui-ci (dans le flux) fausserait
        // la compensation d'environ sa propre hauteur (~38 px de decalage).
        // NB : .spell-viewer-body porte overflow-anchor:none (style.css) : sinon le
        // navigateur epingle deja la vue et la compensation serait doublee (ecart
        // d'une page entiere, reAnchor() le prenant pour un defilement utilisateur).
        var before = body.scrollHeight;
        insert(n, html, 'top');
        first = n;
        var delta = body.scrollHeight - before;
        body.scrollTop += delta;
        if (anchorScroll !== null) anchorScroll += delta;
        reAnchor();
        return true;
      });
    }

    function visible(el) {
      var h = body.clientHeight || 0;
      if (h <= 0 || !el || !el.getBoundingClientRect) return false;
      var r = el.getBoundingClientRect();
      return r.top < h + 300 && r.bottom > -300;
    }

    function maybeLoad() {
      if (closed || !started) return;
      var guard = 0;
      function step() {
        if (closed || guard++ > 6) return;
        if (visible(sentinelBottom)) {
          loadDown().then(function (more) { if (more) step(); });
        }
      }
      if (visible(sentinelTop)) loadUp();
      step();
    }

    function anchorTarget() {
      return id ? overlay.querySelector('#' + id) : null;
    }

    /* Ecart (px) entre le debut du sort et le haut de la zone de lecture.
       Geometrie par rapport au conteneur : ne depend pas de l'offsetParent. */
    function anchorGap() {
      var target = anchorTarget();
      if (!target || !target.getBoundingClientRect || !body.getBoundingClientRect) return null;
      return target.getBoundingClientRect().top - body.getBoundingClientRect().top;
    }

    function scrollToAnchor() {
      var target = anchorTarget();
      if (!target) return false;
      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ block: 'start' });
      } else {
        var gap = anchorGap();
        if (gap === null) return false;
        body.scrollTop += gap;
      }
      anchorScroll = body.scrollTop;
      return true;
    }

    /* Recalibre l'ancre apres une insertion au-dessus ou un swap de polices
       (Google Fonts), uniquement si l'utilisateur n'a pas defile entre temps. */
    function reAnchor() {
      if (closed || !started || anchorScroll === null) return;
      if (Math.abs(body.scrollTop - anchorScroll) > 2) return;
      scrollToAnchor();
    }

    function close() {
      if (closed) return;
      closed = true;
      if (io) io.disconnect();
      document.removeEventListener('keydown', onKey);
      overlay.remove();
      document.body.style.overflow = prevOverflow;
    }

    function onKey(e) {
      if (e.key === 'Escape') close();
    }

    overlay.querySelector('.spell-viewer-close').addEventListener('click', close);
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    if (typeof window.IntersectionObserver === 'function') {
      io = new window.IntersectionObserver(maybeLoad, { root: body, rootMargin: '400px 0px' });
      io.observe(sentinelTop);
      io.observe(sentinelBottom);
    } else {
      body.addEventListener('scroll', maybeLoad);
    }

    loadPage(page).then(function (html) {
      if (closed) return;
      if (!html) {
        setStatus('Page indisponible.');
        return;
      }
      insert(page, html, 'bottom');
      first = last = page;
      started = true;
      scrollToAnchor();
      maybeLoad();
    });

    // Google Fonts (display=swap) : si la substitution de la police a lieu apres
    // le scroll, le debut du sort a bouge - on recale tant qu'on n'a pas defile.
    if (document.fonts && document.fonts.ready && typeof document.fonts.ready.then === 'function') {
      document.fonts.ready.then(function () { reAnchor(); });
    }
  }

  /* ---------------------------------------------------------
     Actions declenchees par les icones
     --------------------------------------------------------- */
  function openSpell(raw) {
    var name = cleanName(raw);
    if (!name) return;
    ensureReady().then(function (ok) {
      if (!ok) return;
      var l = lookup(name);
      if (!l) {
        notify('Sort introuvable',
          'Sort introuvable : « ' + name + ' ». V\u00e9rifiez le nom du sort'
          + (Object.keys(transFrom).length ? ' (fran\u00e7ais ou anglais).' : '.'));
        return;
      }
      var lab = viewerLabels(l);
      openViewer(lab.title, l.hit.page, l.hit.id, lab.sub);
    });
  }

  function openPatron(btn) {
    var scope = (btn.closest && btn.closest('.sheet-page')) || document;
    var input = scope.querySelector('input[data-key$="-patron"]');
    var base = String((input && input.value) || '').replace(/\s+/g, ' ').trim();

    var variants = [];
    if (base) {
      variants.push(base);
      var cut = base.split(/[(\n]/)[0].trim();
      if (cut && cut !== base) variants.push(cut);
    }
    if (!variants.length) {
      notify('Patron manquant',
        'Renseignez le champ \u00ab Patron(s) \u00bb pour afficher les sorts de votre patron.');
      return;
    }

    ensureReady().then(function (ok) {
      if (!ok) return;
      for (var i = 0; i < variants.length; i++) {
        var l = lookup(variants[i]);
        if (l) {
          var lab = viewerLabels(l);
          openViewer(lab.title, l.hit.page, l.hit.id, lab.sub);
          return;
        }
      }
      notify('Patron introuvable',
        'Patron introuvable : \u00ab ' + variants[0] + ' \u00bb. V\u00e9rifiez le champ \u00ab Patron(s) \u00bb.');
    });
  }

  /* ---------------------------------------------------------
     Evenements globaux (delegation)
     --------------------------------------------------------- */
  document.addEventListener('input', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'INPUT' || !t.getAttribute) return;
    var key = t.getAttribute('data-key') || '';
    if (!/sort_(?:nom_)?\d+$/.test(key)) return;
    var cell = t.closest ? (t.closest('.sort-name') || t.closest('.sort-cell')) : null;
    if (!cell) return;
    var btn = cell.querySelector('.spell-lookup[data-lookup="spell"]');
    if (btn) btn.hidden = t.value.trim() === '';
  }, true);

  document.addEventListener('click', function (e) {
    var btn = e.target && e.target.closest ? e.target.closest('.spell-lookup') : null;
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    if (btn.getAttribute('data-lookup') === 'patron') {
      openPatron(btn);
      return;
    }
    var cell = btn.closest('.sort-name') || btn.closest('.sort-cell') || btn.closest('.sort-fixed');
    var input = cell ? cell.querySelector('input[data-key]') : null;
    openSpell(input ? input.value : btn.getAttribute('data-name'));
  }, false);

  /* ---------------------------------------------------------
     Demarrage (script charge en fin de body : le DOM est pret)
     --------------------------------------------------------- */
  ensureReady();

  window.DCCSpellReader = {
    slugify: slugify,
    cleanName: cleanName,
    resolve: resolve,
    lookup: lookup,
    translate: function (raw) {
      var q = slugify(cleanName(raw));
      if (!q) return null;
      if (transFrom[q]) return transFrom[q];
      if (index && index[q]) return null; // deja un nom francais du livre
      return toFrench(q);
    },
    ensureReady: ensureReady,
    loadTranslations: loadTranslations,
    setTranslations: function (map) {
      window.DCC_SPELL_TRANSLATIONS = map;
      transPromise = null;
      transFrom = {};
      if (map && typeof map === 'object') {
        buildTranslations(map);
        transPromise = Promise.resolve(true);
      }
      return transPromise;
    },
    isAvailable: isAvailable,
    openSpell: openSpell,
    openPatron: openPatron,
    setAnchors: function (anchors) {
      window.DCC_ANCHORS = anchors;
      index = null;
      readyPromise = null;
      transPromise = null;
      transFrom = {};
      return ensureReady();
    }
  };
})();
