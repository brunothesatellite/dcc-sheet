/* ============================================================
   DCC Sheet - Visionneuse d'aide des classes (Niveau 0 & 7 classes)
   ------------------------------------------------------------
   Deux modes, un seul composant (meme pattern que spell-reader.js) :
     openClass(cls) : fiche de la classe + Table 1-1 des
                      caracteristiques (cas 1, depuis une fiche) ;
     openFull()     : document integral + sommaire (cas 2, global).
   Donnees : window.DCC_CLASS_HELP (aide-classes-data.js).
   Aucune requete, 100 % hors-ligne (APK compris).
   ============================================================ */
(function () {
  'use strict';

  function data() {
    return window.DCC_CLASS_HELP || null;
  }

  function sectionHtml(id) {
    var d = data();
    if (!d || !d.sections[id]) return '';
    return '<section class="help-section" data-sec="' + id + '">' +
      d.sections[id] + '</section>';
  }

  /* openViewer est aussi réutilisé par ref-reader.js (Référence complète) :
     il retourne l'overlay (undefined si déjà ouvert ou sans données) et
     accepte un onClose optionnel (ex. détacher un scroll infini). */
  function openViewer(title, sub, html, toc, onClose) {
    if (document.querySelector('.help-overlay')) return;
    var d = data();
    if (!d) return;

    var overlay = document.createElement('div');
    overlay.className = 'help-overlay';
    overlay.innerHTML =
      '<div class="help-viewer">' +
        '<div class="help-header">' +
          '<div class="help-names">' +
            '<span class="help-title"></span>' +
            '<span class="help-sub" hidden></span>' +
          '</div>' +
          '<button type="button" class="help-close" aria-label="Fermer">&times;</button>' +
        '</div>' +
        '<div class="help-body">' +
          '<div class="help-column">' +
            '<div class="help-toc" hidden></div>' +
            '<div class="help-content"></div>' +
          '</div>' +
        '</div>' +
      '</div>';

    overlay.querySelector('.help-title').textContent = title;
    var subEl = overlay.querySelector('.help-sub');
    if (sub) {
      subEl.textContent = sub;
      subEl.hidden = false;
    }

    var tocEl = overlay.querySelector('.help-toc');
    var content = overlay.querySelector('.help-content');
    content.innerHTML = html;

    /* Sommaire cliquable (mode integral) : retour a la ligne, pas de
       defilement horizontal (inutilisable a la souris sur PC). */
    if (toc && toc.length) {
      tocEl.hidden = false;
      toc.forEach(function (pair) {
        var b = document.createElement('button');
        b.type = 'button';
        b.textContent = pair[1];
        b.setAttribute('data-goto', pair[0]);
        b.addEventListener('click', function () {
          var sec = content.querySelector('[data-sec="' + pair[0] + '"]');
          if (sec && typeof sec.scrollIntoView === 'function') {
            sec.scrollIntoView({ block: 'start' });
          }
        });
        tocEl.appendChild(b);
      });
    }

    var body = overlay.querySelector('.help-body');
    var prevOverflow = document.body.style.overflow;

    function close() {
      /* onClose d'abord : le lecteur (référence complète) y mémorise la
         position — géométrie encore attachée au DOM, sinon rects à zéro. */
      if (typeof onClose === 'function') onClose();
      document.body.style.overflow = prevOverflow;
      document.removeEventListener('keydown', onKey);
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }

    function onKey(e) {
      if (e.key === 'Escape') close();
    }

    overlay.querySelector('.help-close').addEventListener('click', close);
    body.addEventListener('click', function (e) {
      if (e.target === body || e.target.classList.contains('help-column')) close();
    });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';
    return overlay;
  }

  /* Cas 1 : fiche de la classe suivie de la Table 1-1 (commune). */
  function openClass(cls) {
    var d = data();
    if (!d) return;
    var sec = (d.classOf && d.classOf[cls]) || null;
    if (!sec || !d.sections[sec]) return;
    var label = (d.labels && d.labels[cls]) || cls;
    var html = sectionHtml(sec) +
      '<div class="help-divider">Table commune à toutes les classes</div>' +
      sectionHtml('carac');
    openViewer('Résumé — ' + label, 'Fiche de classe + Table 1-1 des caractéristiques', html, null);
  }

  /* Cas 2 : document integral, dans l'ordre du resume. */
  function openFull() {
    var d = data();
    if (!d) return;
    var html = '';
    d.order.forEach(function (id) { html += sectionHtml(id); });
    html += '<div class="help-foot">' + d.foot + '</div>';
    openViewer('Référence des classes', 'Niveau 0 & 7 classes — document intégral',
      html, d.toc);
  }

  window.DCCClassHelp = {
    openClass: openClass,
    openFull: openFull,
    openViewer: openViewer,
  };
})();
