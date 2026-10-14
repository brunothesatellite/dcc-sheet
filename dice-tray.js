/* =========================================================================
   Dice Tray — overlay plein ecran du portage dice-box-dcc (R2/R3/R6/R7).

   Meme principe que les autres fenetres plein ecran de la webapp
   (#map-module) : conteneur #dice-module en position fixed, croix en haut
   a droite, fermeture par Échap (d'abord la modale d'aide, C10).

   Lazy-loading (C5) : le moteur 3D (three.js, ~1,85 Mo) n'est charge qu'a
   la premiere ouverture, via import('./dice/app.js') — aucune ressource du
   module ne pese au demarrage de la webapp.

   Fermeture = masquage seul (R6, R7) : hidden + pause de la boucle de
   rendu et de l'AudioContext ; l'etat du tapis (des, positions, valeurs)
   vit en memoire JS tant que la page reste ouverte. Aucune persistance,
   aucun appel api/* — seule exception validee : la preference muet
   dicebox.sound geree par le SoundBank.

   Sans WebGL ou si l'import echoue : toast d'erreur + fermeture propre
   (C8) ; l'echec n'est pas memorise (l'utilisateur peut reessayer).
   ====================================================================== */
(function () {
  'use strict';

  var moduleEl = null;
  var ready = false;
  var visible = false;
  var engineMod = null;      // module ESM dice/app.js (charge une seule fois)
  var enginePromise = null;  // chargement en cours (memoisation)
  var trayApi = null;        // instance de initDiceTray() -> { pause, resume }

  /* D6 a pips (remplace l'emoji 🎲 du source, C13) : bandeau du module
     (#dt-title) ET bouton « Lancer » — MAJ 14/10 : d6 au lieu du D20. */
  var DICE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3.5" y="3.5" width="17" height="17" rx="4"/><circle cx="8.5" cy="8.5" r="1.3" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.3" fill="currentColor" stroke="none"/><circle cx="15.5" cy="15.5" r="1.3" fill="currentColor" stroke="none"/></svg>';
  var CLOSE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>';

  /* Coquille dice-* (markup source adapte, §5 du plan) ; le picker est
     rempli par dice/app.js, les badges/blayer par dice/tray.js. */
  var HTML =
    '<header id="dt-top">' +
      '<div class="dt-title">' + DICE_ICON + 'Tapis de dés</div>' +
      '<button id="dt-close" type="button" aria-label="Fermer le tapis de dés" title="Fermer">' + CLOSE_ICON + '</button>' +
    '</header>' +
    '<div id="dice-pickerBar">' +
      '<div id="dice-picker" role="toolbar" aria-label="Choisir un dé"></div>' +
    '</div>' +
    '<main id="dice-stage">' +
      '<div id="dice-frame">' +
        '<div id="dice-tray" aria-label="Tapis de dés">' +
          '<button id="dice-soundBtn" type="button" aria-label="Couper le son">🔊</button>' +
          '<button id="dice-helpBtn" type="button" aria-label="Aide et gestes">?</button>' +
          '<div id="dice-toast" role="status"></div>' +
          '<div id="dice-hint">Tapis vide par défaut — choisis un dé en haut, ou clique « Lancer » après en avoir ajouté</div>' +
        '</div>' +
      '</div>' +
    '</main>' +
    '<footer id="dice-actionbar">' +
      '<button id="dice-clearBtn" class="act ghost" type="button" aria-label="Vider">🗑 <span>Vider</span></button>' +
      '<div id="dice-total" hidden></div>' +
      '<button id="dice-rollBtn" class="act primary" type="button">' + DICE_ICON + ' <span>Lancer</span></button>' +
    '</footer>' +
    '<div id="dice-helpModal" class="modal" hidden>' +
      '<div class="card" role="dialog" aria-modal="true" aria-label="Gestes">' +
        '<h2>Gestes</h2>' +
        '<ul>' +
          '<li>Toucher un dé <b>en haut</b> : l’ajouter au tapis</li>' +
          '<li>Toucher un dé <b>sur le tapis</b> : le lancer</li>' +
          '<li><b>Appui long</b> sur un dé : le retirer</li>' +
          '<li><b>Glisser-déposer</b> : déplacer · <b>lâcher avec élan</b> : lancer manuel</li>' +
          '<li><b>D%</b> : dizaines (00–90) · avec un D10 : 00 + 0 = 100</li>' +
          '<li>🎲 <b>Lancer</b> : lance tous les dés (+ total, clic dessus = masquer)</li>' +
          '<li>🗑 <b>Vider</b> : tout retirer, sans confirmation</li>' +
        '</ul>' +
        '<div class="dice-row"><button id="dice-hClose" class="btn" type="button">Fermer</button></div>' +
      '</div>' +
    '</div>';

  function notify(msg, type) {
    if (typeof window.showToast === 'function') window.showToast(msg, type);
  }

  function buildDOM() {
    moduleEl = document.createElement('div');
    moduleEl.id = 'dice-module';
    moduleEl.hidden = true;
    moduleEl.innerHTML = HTML;
    document.body.appendChild(moduleEl);
    moduleEl.querySelector('#dt-close').addEventListener('click', close);
  }

  /* WebGL requis par le moteur (C8) : jsdom / vieux navigateurs -> echec
     immediat sans meme charger three.js. */
  function hasWebGL() {
    try {
      var c = document.createElement('canvas');
      return !!(c.getContext('webgl2') || c.getContext('webgl'));
    } catch (e) {
      return false;
    }
  }

  function failEngine(err) {
    enginePromise = null; /* echec non memorise : re-testable (C8) */
    if (err) console.error('[dice-tray] moteur 3D indisponible :' + (err.message ? ' ' + err.message : ''));
    notify('Dés 3D indisponibles sur ce navigateur', 'error');
    close();
  }

  function initEngine() {
    try {
      trayApi = engineMod.initDiceTray(moduleEl, {
        toast: function (m) { notify(m); }
      });
      /* Fermé pendant le chargement : init mais boucle deja en veille. */
      if (!visible && trayApi) trayApi.pause();
    } catch (err) {
      failEngine(err);
    }
  }

  function ensureEngine() {
    if (trayApi) { trayApi.resume(); return; }
    if (engineMod) { initEngine(); return; }
    if (enginePromise) return;
    if (!hasWebGL()) { failEngine(new Error('WebGL indisponible')); return; }
    try {
      enginePromise = import('./dice/app.js').then(function (mod) {
        enginePromise = null;
        engineMod = mod;
        if (visible) initEngine();
      }, failEngine);
    } catch (err) {
      failEngine(err);
    }
  }

  /* Échap : d'abord la modale d'aide des gestes, puis le module (C10,
     comportement source conserve). */
  function onKeydown(e) {
    if (e.key !== 'Escape' || !visible) return;
    e.preventDefault();
    var modal = moduleEl.querySelector('#dice-helpModal');
    if (modal && !modal.hidden) { modal.hidden = true; return; }
    close();
  }

  function open() {
    if (visible) return; /* anti-double ouverture */
    if (!ready) {
      buildDOM();
      ready = true;
    }
    moduleEl.hidden = false;
    visible = true;
    document.addEventListener('keydown', onKeydown);
    ensureEngine();
  }

  function close() {
    if (!visible) return;
    visible = false;
    /* Masquage seul : aucun destruct, l'etat du tapis reste en memoire (R6). */
    moduleEl.hidden = true;
    document.removeEventListener('keydown', onKeydown);
    if (trayApi) trayApi.pause();
  }

  window.DCCDiceTray = {
    open: open,
    close: close,
    isOpen: function () { return visible; }
  };
})();
