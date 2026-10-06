/* Overlay "tete de mort rouge" au-dessus du portrait d'un personnage dont les
   PV courants sont <= 0 :
   - fiche de personnage (portrait de la colonne Portrait) ;
   - onglet Equipe : grille d'ordre de marche + colonne Classe (expedition).
   L'overlay est pose/retire dynamiquement : des que les PV redeviennent > 0
   il disparait (saisie dans la fiche, saisie dans le tableau, resynchronisation).

   Charge par index.html avant script.js et classes/equipe.js. Les deux
   consommateurs appellent ces helpers sans jamais planter si le fichier est
   absent (tests, chargement partiel). */
(function () {
  'use strict';

  /* Crane : crane + machoire, orbites, nez, dents (viewBox 32x32) */
  var SKULL_SVG =
    '<svg viewBox="0 0 32 32" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">' +
      '<path fill="currentColor" d="M16 2.2C9 2.2 3.4 7.4 3.4 14.2c0 3.6 1.6 6.8 4.2 9v2.2a4.1 4.1 0 0 0 4.1 4.1h8.6a4.1 4.1 0 0 0 4.1-4.1V23.2c2.6-2.2 4.2-5.4 4.2-9C28.6 7.4 23 2.2 16 2.2z"/>' +
      '<ellipse cx="11.4" cy="14.6" rx="3.5" ry="4.2" fill="#161616"/>' +
      '<ellipse cx="20.6" cy="14.6" rx="3.5" ry="4.2" fill="#161616"/>' +
      '<path fill="#161616" d="M16 19.4l2.4 4h-4.8z"/>' +
      '<rect x="11.7" y="26.2" width="8.6" height="1" fill="#161616"/>' +
      '<rect x="14.4" y="27.2" width="1" height="2.3" fill="#161616"/>' +
      '<rect x="17.1" y="27.2" width="1" height="2.3" fill="#161616"/>' +
    '</svg>';

  /* PV courants : '' / null / non numerique -> pas de valeur exploitable */
  function toPV(raw) {
    if (raw === null || raw === undefined) return null;
    var s = String(raw).trim();
    if (s === '') return null;
    var n = Number(s);
    return isFinite(n) ? n : null;
  }

  function isDead(raw) {
    var pv = toPV(raw);
    return pv !== null && pv <= 0;
  }

  /* Enveloppe le portrait dans un conteneur ancre (.portrait-holder) : c'est lui
     qui porte l'overlay, quelle que soit la taille/le contexte du portrait
     (fiche 280px, tableau 50px, case d'ordre de marche en %). */
  function holderOf(portrait) {
    var parent = portrait.parentNode;
    if (parent && parent.classList && parent.classList.contains('portrait-holder')) return parent;
    if (!parent || !parent.insertBefore) return null;
    var holder = document.createElement('span');
    holder.className = 'portrait-holder';
    parent.insertBefore(holder, portrait);
    holder.appendChild(portrait);
    return holder;
  }

  /* dead = true : pose l'overlay (idempotent) ; dead = false : le retire */
  function apply(portrait, dead) {
    if (!portrait || !portrait.parentNode) return;
    var holder = holderOf(portrait);
    if (!holder) return;
    var overlay = holder.querySelector('.dead-overlay');
    if (dead) {
      if (!overlay) {
        overlay = document.createElement('span');
        overlay.className = 'dead-overlay';
        overlay.setAttribute('aria-hidden', 'true');
        overlay.innerHTML = SKULL_SVG;
        holder.appendChild(overlay);
      }
    } else if (overlay) {
      overlay.parentNode.removeChild(overlay);
    }
  }

  /* Commodite : applique sur le premier portrait trouve dans un conteneur */
  function applyIn(root, selector, dead) {
    if (!root || !root.querySelector) return;
    apply(root.querySelector(selector), dead);
  }

  window.DCCDeadOverlay = {
    isDead: isDead,
    apply: apply,
    applyIn: applyIn
  };
})();
