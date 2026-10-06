/**
 * DCC - Garde des portraits (module OPTIONNEL).
 *
 * Objectif : ne jamais demander une image dont le dossier n'est pas installé
 * sur le serveur (droits / redistribution) et afficher, à la place,
 * un placeholder « Aucune image disponible » (SVG inline, zero requete).
 *
 * Source de verite : api/icons.php (action=list) → noms des dossiers presents
 * dans icons/ (meme mecanisme historique du selecteur de portraits).
 *
 *   window.DCCPortraitGuard = {
 *     setDirs(dirs),            // resultat de icons.php (null = inconnu)
 *     getDirs(),
 *     folderOf(sourceKey),      // 'funnel' -> 'funnel-tokens'
 *     has(sourceKey),           // dossier present OU inconnu (on affiche)
 *     isMissing(sourceKey),     // dossier confirme absent
 *     isMissingSrc(src),        // idem a partir d'un chemin d'image
 *     placeholder(className, opts),  // Element <div> de remplacement
 *     emptyMessage(cls),        // texte pour un selecteur vide
 *     LABEL
 *   }
 *
 * Absent de la page → les appelants gardent leur comportement historique
 * (images rendues telles quelles), comme dead-overlay.js / team-state.js.
 */
(function () {
  'use strict';

  var LABEL = 'Aucune image disponible';

  /* null = inconnu : icons.php pas encore lu ou en echec → on affiche les
     images (decision : pas de placeholder par erreur sur un serveur sain) */
  var dirs = null;

  var SILHOUETTE =
    '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="currentColor">' +
      '<circle cx="12" cy="8.6" r="3.9"/>' +
      '<path d="M4.6 20.8c0-4 3.3-6.7 7.4-6.7s7.4 2.7 7.4 6.7z"/>' +
    '</svg>';

  function setDirs(list) {
    dirs = Array.isArray(list) ? list : null;
  }

  function getDirs() {
    return dirs;
  }

  /* Dossier (sans "icons/") d'une source, d'apres son premier chemin image */
  function folderOf(sourceKey) {
    var sources = window.PortraitSources || [];
    for (var i = 0; i < sources.length; i++) {
      var ps = sources[i];
      if (!ps || !ps.meta || ps.meta.key !== sourceKey) continue;
      for (var key in ps) {
        if (key === 'meta' || key === 'byMetier') continue;
        var entry = ps[key];
        var first = Array.isArray(entry) ? entry[0] : entry;
        if (typeof first === 'string') {
          var slash = first.lastIndexOf('/');
          if (slash !== -1) return first.slice(0, slash).replace(/^icons\//, '');
        }
      }
    }
    return '';
  }

  function folderAvailable(folder) {
    if (!folder) return true;
    if (!Array.isArray(dirs)) return true; /* inconnu → on affiche */
    return dirs.indexOf(folder) !== -1;
  }

  function has(sourceKey) {
    return folderAvailable(folderOf(sourceKey));
  }

  function isMissing(sourceKey) {
    return !has(sourceKey);
  }

  /* "icons/funnel-tokens/x.png" → "funnel-tokens" ; tout ce qui n'est pas
     sous icons/ (images du lecteur de sorts, captures, data:) n'est jamais
     considere comme absent. */
  function srcFolder(src) {
    var path = String(src || '');
    if (path.indexOf('icons/') !== 0) return '';
    var slash = path.lastIndexOf('/');
    if (slash === -1) return '';
    return path.slice(0, slash).replace(/^icons\//, '');
  }

  function isMissingSrc(src) {
    if (!Array.isArray(dirs)) return false;
    var folder = srcFolder(src);
    if (!folder) return false;
    return dirs.indexOf(folder) === -1;
  }

  /**
   * Placeholder de remplacement.
   *   className : classes de la taille a conserver
   *               (ex. 'portrait-img clickable' / 'char-card-portrait')
   *   opts.showLabel : texte visible (portrait de la fiche) ; le libelle
   *               est toujours present en aria-label + title (decision :
   *               libelle partout, y compris sur les vignettes).
   */
  function placeholder(className, opts) {
    opts = opts || {};
    var node = document.createElement('div');
    node.className = (className || '') + ' portrait-missing';
    node.setAttribute('role', 'img');
    node.setAttribute('aria-label', LABEL);
    node.title = LABEL;
    node.innerHTML = SILHOUETTE;
    if (opts.showLabel) {
      var text = document.createElement('span');
      text.className = 'portrait-missing-text';
      text.textContent = LABEL;
      node.appendChild(text);
    }
    return node;
  }

  /* Message du selecteur de portraits quand la grille ressort vide */
  function emptyMessage(cls) {
    if (cls === 'lvl0') {
      return 'Les portraits de niveau 0 ne sont pas installés sur ce serveur ' +
        '(droits d\'image).';
    }
    return LABEL + '.';
  }

  window.DCCPortraitGuard = {
    LABEL: LABEL,
    setDirs: setDirs,
    getDirs: getDirs,
    folderOf: folderOf,
    has: has,
    isMissing: isMissing,
    folderAvailable: folderAvailable,
    isMissingSrc: isMissingSrc,
    placeholder: placeholder,
    emptyMessage: emptyMessage,
  };
})();
