/* ============================================================
   DCC Sheet - Consultation des definitions de sorts
   ------------------------------------------------------------
   Ouvre le texte HTML d'un sort (plein ecran, scroll infini)
   a partir du dossier frere ../dcc-spells-reader.
   Si ce dossier n'est pas accessible, aucune icone n'apparait.
   ============================================================ */
(function () {
  'use strict';

  var BASE = '../dcc-spells-reader';
  var RANGES = [[127, 303], [322, 356]];

  var index = null;        // slug -> [ { page, id, title }, ... ] (ordre du livre)
  var readyPromise = null;
  var pageCache = {};

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

  function ensureReady() {
    if (readyPromise) return readyPromise;
    if (window.DCC_ANCHORS) {
      readyPromise = Promise.resolve(enable(window.DCC_ANCHORS));
      return readyPromise;
    }
    readyPromise = loadScript(BASE + '/content/anchors.js').then(function (ok) {
      return enable(ok ? window.DCC_ANCHORS : null);
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

  function fuzzyMatch(q) {
    var best = 3;
    var out = [];
    Object.keys(index).forEach(function (k) {
      if (k.length < 6 || Math.abs(k.length - q.length) > 2) return;
      var d = editDistance(q, k);
      if (d < best) { best = d; out = [k]; }
      else if (d === best && d < 3) out.push(k);
    });
    return out;
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
    if (!index) return null;
    var name = cleanName(raw);
    var q = slugify(name);
    if (!q) return null;
    var pool = candidates(q, name);
    if (!pool.length) return null;
    if (pool.length > 1) {
      var bySlug = pool.filter(function (a) { return slugify(a.title) === q; });
      if (bySlug.length) pool = bySlug;
      var byTitle = pool.filter(function (a) {
        return String(a.title).trim().toLowerCase() === name.trim().toLowerCase();
      });
      if (byTitle.length) pool = byTitle;
    }
    return pool[0];
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

  function openViewer(title, page, id) {
    if (document.querySelector('.spell-viewer-overlay')) return;

    var overlay = document.createElement('div');
    overlay.className = 'spell-viewer-overlay';
    overlay.innerHTML =
      '<div class="spell-viewer">' +
        '<div class="spell-viewer-header">' +
          '<span class="spell-viewer-title"></span>' +
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

    var body = overlay.querySelector('.spell-viewer-body');
    var pages = overlay.querySelector('.sv-pages');
    var status = overlay.querySelector('.sv-status');
    var sentinelTop = overlay.querySelector('.sv-sentinel-top');
    var sentinelBottom = overlay.querySelector('.sv-sentinel-bottom');

    var first = null, last = null;
    var busyTop = false, busyBottom = false, closed = false, started = false;
    var io = null;
    var prevOverflow = document.body.style.overflow;

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
      var before = body.scrollHeight;
      return loadPage(n).then(function (html) {
        busyTop = false;
        setStatus('');
        if (closed || !html) return false;
        insert(n, html, 'top');
        first = n;
        body.scrollTop += body.scrollHeight - before;
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

    function scrollToAnchor() {
      var target = id ? overlay.querySelector('#' + id) : null;
      if (!target) return;
      if (typeof target.scrollIntoView === 'function') {
        target.scrollIntoView({ block: 'start' });
      } else {
        body.scrollTop = target.offsetTop || 0;
      }
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
  }

  /* ---------------------------------------------------------
     Actions declenchees par les icones
     --------------------------------------------------------- */
  function openSpell(raw) {
    var name = cleanName(raw);
    if (!name) return;
    ensureReady().then(function (ok) {
      if (!ok) return;
      var hit = resolve(name);
      if (!hit) {
        notify('Sort introuvable',
          'Sort introuvable : « ' + name + ' ». V\u00e9rifiez le nom du sort.');
        return;
      }
      openViewer(name, hit.page, hit.id);
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
        var hit = resolve(variants[i]);
        if (hit) {
          openViewer(variants[i], hit.page, hit.id);
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
    ensureReady: ensureReady,
    isAvailable: isAvailable,
    openSpell: openSpell,
    openPatron: openPatron,
    setAnchors: function (anchors) {
      window.DCC_ANCHORS = anchors;
      index = null;
      readyPromise = null;
      return ensureReady();
    }
  };
})();
