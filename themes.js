/* ============================================================
   DCC Sheet - Couples de themes clair + sombre (17 couples)
   ------------------------------------------------------------
   L'utilisateur choisit un COUPLE dans une IHM dediee (apercu
   clair/sombre) ; le bouton theme continue de basculer clair/sombre
   dans le couple. Choix persiste en base (users.theme_pair, defaut
   'defaut' a la creation) + localStorage (affichage immediat).
   Donnees visuelles : themes.css (blocs html[data-pair][data-theme]
   + mini-apercus .theme-picker .pv[...]).
   ============================================================ */
(function () {
  'use strict';

  var LS_PAIR = 'dcc-theme-pair';
  var LS_MODE = 'dcc-theme';
  var DEFAULT_PAIR = 'defaut';

  var PAIRS = [
    { id: 'defaut', name: 'Défaut', desc: 'Le thème actuel : parchemin clair, nuit d\u2019encre. Thème de création de compte.', tag: 'Actuel' },
    { id: 'taverne', name: 'Taverne', desc: 'Chêne ciré et miel le jour, braises sous la cendre la nuit.' },
    { id: 'crypte', name: 'Crypte', desc: 'Pierre froide et os blanchi, puis lueur spectrale des profondeurs.' },
    { id: 'sylve', name: 'Sylve', desc: 'Mousse ancienne et écorce claire, puis ronces sous la lune.' },
    { id: 'arcanes', name: 'Arcanes', desc: 'Parchemin violet du grimoire, puis vide incandescent du rituel.' },
    { id: 'brasier', name: 'Brasier', desc: 'Sang et or des bannières, puis fournaise des forges naines.' },
    { id: 'grimoire', name: 'Grimoire', desc: 'Le parchemin du résumé v4 : encre sang-de-bœuf, titres serif.' },
    { id: 'papyrus', name: 'Papyrus', desc: 'Sable du désert et ocre des scribes, puis or des tombeaux.' },
    { id: 'brume', name: 'Brume', desc: 'Brouillard gris-bleu du matin, puis givre des nuits claires.' },
    { id: 'herbier', name: 'Herbier', desc: 'Planches botaniques vert tendre, puis sous-bois à la lanterne.' },
    { id: 'cuir', name: 'Cuir', desc: 'Reliure fauve et tranches dorées, puis tannerie à la bougie.' },
    { id: 'cendre', name: 'Cendre', desc: 'Gris de cendre et pierre froide, puis suie du bivouac.' },
    { id: 'g-parchemin', name: 'Parchemin', desc: 'Le parchemin classique, au grand jour comme à la veillée.' },
    { id: 'g-crypte', name: 'Sorcier', desc: 'La crypte du sorcier : mosaïque sombre et lueur violette, à l\u2019aube comme à minuit.' },
    { id: 'g-enluminure', name: 'Enluminure', desc: 'Or et outremer au grand jour, complies à la lueur des cierges.' },
    { id: 'g-guerre', name: 'Guerre', desc: 'Cuir fauve du manuel, puis braises du bivouac.' },
    { id: 'g-reliquaire', name: 'Reliquaire', desc: 'Os et sang à la lumière du jour, puis minuit du reliquaire.' },
  ];

  function validPair(id) {
    for (var i = 0; i < PAIRS.length; i++) {
      if (PAIRS[i].id === id) return id;
    }
    return DEFAULT_PAIR;
  }

  function validMode(mode) {
    return mode === 'dark' ? 'dark' : 'light';
  }

  function current() {
    var pair = DEFAULT_PAIR;
    try {
      pair = validPair(localStorage.getItem(LS_PAIR) || DEFAULT_PAIR);
    } catch (e) { /* stockage indisponible */ }
    var mode = 'light';
    try {
      mode = validMode(localStorage.getItem(LS_MODE) || 'light');
    } catch (e) { /* stockage indisponible */ }
    var attr = document.documentElement.getAttribute('data-pair');
    if (attr) pair = validPair(attr);
    var m = document.documentElement.getAttribute('data-theme');
    if (m) mode = validMode(m);
    return { pair: pair, mode: mode };
  }

  /* Applique couple + mode (DOM + localStorage). Le bouton theme garde
     la main sur le mode via data-theme ; ici on ne fait que poser. */
  function apply(pair, mode) {
    pair = validPair(pair);
    mode = validMode(mode == null ? current().mode : mode);
    document.documentElement.setAttribute('data-pair', pair);
    document.documentElement.setAttribute('data-theme', mode);
    try {
      localStorage.setItem(LS_PAIR, pair);
      localStorage.setItem(LS_MODE, mode);
    } catch (e) { /* stockage indisponible */ }
    return { pair: pair, mode: mode };
  }

  /* Couche API minimale (meme contrat que map-draw.js : JSON ou erreur). */
  async function callApi(body) {
    var res = await fetch('api/auth.php', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    var json = await res.json();
    if (!res.ok || json.ok === false) {
      throw new Error((json && json.error) || 'Erreur serveur');
    }
    return json;
  }

  function loadServer() {
    return callApi({ action: 'theme_get' }).then(function (res) {
      return validPair(res.pair || DEFAULT_PAIR);
    });
  }

  function save(pair) {
    pair = validPair(pair);
    return callApi({ action: 'theme_save', pair: pair }).then(function () {
      return pair;
    });
  }

  /* Demarrage : localStorage immediat (pas de flash), puis la base fait
     foi des qu'elle repond (non connecte : on garde le local). */
  function init() {
    apply(current().pair, current().mode);
    loadServer().then(function (pair) {
      var cur = current();
      if (pair !== cur.pair) apply(pair, cur.mode);
    }).catch(function () { /* hors-ligne ou non connecte : local */ });
  }

  function previewHTML(id, mode) {
    return '<div class="pv" data-pair="' + id + '" data-mode="' + mode + '">' +
      '<div class="pv-top"><span class="pv-logo">DCC</span>' +
      '<span class="pv-dots"><i></i><i></i><i></i></span></div>' +
      '<span class="pv-tab">Mage</span>' +
      '<div class="pv-body"><div class="pv-sec">Capacités</div>' +
      '<div class="pv-field">Boule de feu — niveau 3</div>' +
      '<div class="pv-field">1d20 + Int + niveau</div>' +
      '<div class="pv-row"><div class="pv-btn go">Valider</div>' +
      '<div class="pv-btn alt">Export</div></div></div>' +
      '<span class="pv-mode">' + (mode === 'light' ? 'Clair' : 'Sombre') + '</span></div>';
  }

  /* Selecteur : grille des 17 couples, bascule Clair/Sombre, apercu en
     direct sur l'app (Annuler restaure), Valider persiste en base. */
  function openPicker() {
    if (document.querySelector('.theme-overlay')) return;
    var cur = current();
    var selected = cur.pair;
    var mode = cur.mode;
    var snapPair = cur.pair;
    var snapMode = cur.mode;

    var overlay = document.createElement('div');
    overlay.className = 'theme-overlay';
    overlay.innerHTML =
      '<div class="theme-picker" role="dialog" aria-modal="true" aria-label="Choisir un thème">' +
        '<div class="theme-head">' +
          '<div class="theme-title">Choisir un thème</div>' +
          '<div class="theme-sub">Le bouton de thème continuera de basculer clair / sombre ' +
          'dans le couple choisi. Choix enregistré sur votre compte.</div>' +
        '</div>' +
        '<div class="theme-tools">' +
          '<div class="theme-seg">' +
            '<button type="button" data-mode="light">Clair</button>' +
            '<button type="button" data-mode="dark">Sombre</button>' +
          '</div>' +
          '<span class="theme-hint">17 couples · prévisualisation en direct</span>' +
        '</div>' +
        '<div class="theme-grid"></div>' +
        '<div class="theme-foot">' +
          '<button type="button" class="theme-cancel">Annuler</button>' +
          '<button type="button" class="theme-valid">Valider</button>' +
        '</div>' +
      '</div>';

    var grid = overlay.querySelector('.theme-grid');

    function render() {
      grid.innerHTML = '';
      PAIRS.forEach(function (p) {
        var card = document.createElement('div');
        card.className = 'theme-card' + (p.id === selected ? ' selected' : '');
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-pressed', p.id === selected ? 'true' : 'false');
        card.innerHTML = '<span class="theme-check">✓</span>' +
          '<div class="theme-name">' + p.name +
          (p.tag ? '<span class="theme-tag">' + p.tag + '</span>' : '') + '</div>' +
          '<div class="theme-desc">' + p.desc + '</div>' + previewHTML(p.id, mode);
        card.addEventListener('click', function () {
          selected = p.id;
          apply(selected, mode);
          render();
        });
        card.addEventListener('keydown', function (e) {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            selected = p.id;
            apply(selected, mode);
            render();
          }
        });
        grid.appendChild(card);
      });
      var segBtns = overlay.querySelectorAll('.theme-seg button');
      for (var i = 0; i < segBtns.length; i++) {
        (function (btn) {
          var active = btn.getAttribute('data-mode') === mode;
          btn.classList.toggle('active', active);
        })(segBtns[i]);
      }
    }

    function close(keep) {
      if (!keep) apply(snapPair, snapMode);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    }

    function onKey(e) {
      if (e.key === 'Escape') close(false);
    }

    overlay.querySelector('.theme-seg').addEventListener('click', function (e) {
      var btn = e.target && e.target.closest ? e.target.closest('button[data-mode]') : null;
      if (!btn) return;
      mode = validMode(btn.getAttribute('data-mode'));
      apply(selected, mode);
      render();
    });
    overlay.querySelector('.theme-cancel').addEventListener('click', function () { close(false); });
    overlay.querySelector('.theme-valid').addEventListener('click', function () {
      var pair = validPair(selected);
      save(pair).then(function () {
        apply(pair, mode);
        close(true);
        if (typeof window.showToast === 'function') {
          window.showToast('Thème « ' + pairName(pair) + ' » enregistré', 'success');
        }
      }).catch(function (err) {
        if (typeof window.showModal === 'function') {
          window.showModal({ title: 'Erreur', message: 'Thème non enregistré : ' + err.message, type: 'alert' });
        }
      });
    });
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) close(false);
    });
    document.addEventListener('keydown', onKey);

    render();
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
  }

  function pairName(id) {
    for (var i = 0; i < PAIRS.length; i++) {
      if (PAIRS[i].id === id) return PAIRS[i].name;
    }
    return id;
  }

  window.DCCThemes = {
    pairs: PAIRS,
    current: current,
    apply: apply,
    save: save,
    loadServer: loadServer,
    init: init,
    openPicker: openPicker,
  };

  /* Application immediate (avant DOMContentLoaded : pas de flash). */
  try {
    apply(current().pair, current().mode);
  } catch (e) { /* DOM pas pret (tests) : init() le fera */ }
})();
