'use strict';

const { createReporter } = require('./helpers/assert');
const { read } = require('./helpers/env');

module.exports = function suite() {
  const r = createReporter('02-css');
  const css = read('style.css');

  const opens = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  r.eq(opens, closes, 'CSS braces balanced (' + opens + '/' + closes + ')');

  const critical = [
    '.team-table .char-class-content',
    '.team-detail-wrap',
    'tr.team-detail.open .team-detail-wrap',
    '.team-table-enemies',
    '.team-table .char-class-labels',
    '.portrait-picker-grid',
    '.sorts-grid',
    '@media (max-width: 600px)',
    '.team-stat-value',
    '.chevron',
    '.team-table-stats',
    '.team-table-stats .stat-max',
    '.team-table-stats .stat-min',
    '.team-table-stats .stat-group',
    '.team-table-stats .stat-chevron-cell .chevron',
    'tr.team-stats-detail.open .team-detail-wrap',
    '.spell-lookup',
    'html:not(.has-spell-reader) .spell-lookup',
    '.spell-lookup[hidden]',
    '.spell-viewer-overlay',
    '.spell-viewer-header',
    '.spell-viewer-title',
    '.spell-viewer-names',
    '.spell-viewer-sub',
    '.spell-viewer .page',
    '.spell-viewer .page h3.spell-title',
    '.spell-viewer table.stackable',
    '@media (max-width: 599px)',
    '.patron-pick-overlay',
    '.patron-pick',
    '.patron-pick-item',
    '.patron-pick-item.is-unresolved',
    '.portrait-holder',
    '.dead-overlay',
    '.marching-slot .portrait-holder',
  ];
  critical.forEach(function (sel) {
    r.ok(css.indexOf(sel) !== -1, 'CSS selector present: ' + sel);
  });

  // La popup doit desactiver l'ancrage de defilement du navigateur : sinon le
  // recale manuel de loadUp() (scrollTop += delta) est double par le navigateur
  // et la popup s'ouvre en decalage d'une page entiere.
  const svBody = css.match(/\.spell-viewer-body \{[^}]+\}/);
  r.ok(!!svBody, '.spell-viewer-body block found');
  if (svBody) {
    r.ok(svBody[0].indexOf('overflow-anchor: none') !== -1,
      '.spell-viewer-body disables scroll anchoring (overflow-anchor: none)');
    r.ok(svBody[0].indexOf('overflow-y: auto') !== -1, '.spell-viewer-body is the scroll container');
  }

  // Cellule de sort du clerc : la loupe ne doit pas empieter sur le champ
  // texte -> la cellule n'est qu'un conteneur, le champ est l'input encadre
  // (meme disposition que td.sort-name du mage / de l'elfe).
  const sortCell = css.match(/\.sort-cell \{[^}]+\}/);
  r.ok(!!sortCell, '.sort-cell block found');
  if (sortCell) {
    r.ok(sortCell[0].indexOf('background') === -1, '.sort-cell is a plain container (no background)');
  }
  const sharedField = css.match(/\.dtable td\.sort-notes textarea,\s*\.dtable td\.sort-name input,\s*\.sort-cell input \{[^}]+\}/);
  r.ok(!!sharedField, 'clerc field shares the mage/elfe input rule');
  if (sharedField) {
    r.ok(sharedField[0].indexOf('border: 1px solid var(--input-border)') !== -1,
      'shared rule gives the field its border');
  }

  const blockMatch = css.match(/\.team-table \.char-class-content \{[^}]+\}/);
  r.ok(!!blockMatch, '.char-class-content block found');
  if (blockMatch) {
    r.ok(blockMatch[0].indexOf('display: flex') !== -1, '.char-class-content uses display:flex');
    r.ok(blockMatch[0].indexOf('flex-direction: column') === -1, '.char-class-content is not column');
  }


  // nom : pas de debordement hors colonne (ellipsis si trop long)
  const nameBlock = css.match(/\.team-table \.char-name \{[^}]+\}/);
  r.ok(!!nameBlock, '.char-name block found');
  if (nameBlock) {
    r.ok(nameBlock[0].indexOf('text-overflow: ellipsis') !== -1, '.char-name uses text-overflow: ellipsis');
    r.ok(nameBlock[0].indexOf('overflow: hidden') !== -1, '.char-name hides overflow');
    r.ok(nameBlock[0].indexOf('white-space: nowrap') !== -1, '.char-name keeps nowrap');
  }
  const media = css.match(/@media \(max-width: 600px\) \{/g) || [];
  r.ok(media.length >= 1, 'has mobile media query (got ' + media.length + ')');

  // stats : min/max = texte seul, pas de fond
  const maxBlock = css.match(/\.team-table-stats \.stat-max \{[^}]+\}/);
  r.ok(!!maxBlock, '.stat-max block found');
  if (maxBlock) {
    r.ok(maxBlock[0].indexOf('background') === -1, '.stat-max has no background');
    r.ok(maxBlock[0].indexOf('color:') !== -1, '.stat-max has color');
  }
  const minBlock = css.match(/\.team-table-stats \.stat-min \{[^}]+\}/);
  r.ok(!!minBlock, '.stat-min block found');
  if (minBlock) {
    r.ok(minBlock[0].indexOf('background') === -1, '.stat-min has no background');
  }

  // ouverture chevron ne force pas les 3 vals en rouge
  r.ok(css.indexOf('.stat-group[aria-expanded="true"] .val') === -1,
    'no forced red on open AGI/END/PRE vals');
  r.ok(css.indexOf('.team-table-stats .stat-group[aria-expanded="true"] .val') === -1,
    'no forced red rule for expanded stats vals');

  // header groupe : fond = field-bg (lisibilité)
  const thGroup = css.match(/\.team-table-stats thead \.stat-group \{[^}]+\}/);
  r.ok(!!thGroup, 'thead .stat-group block found');
  if (thGroup) {
    r.ok(thGroup[0].indexOf('var(--field-bg)') !== -1, 'thead group uses --field-bg');
  }

  // Popup de choix du patron : carte centrée, au-dessus de la popup pleine page
  const pickOverlay = css.match(/\.patron-pick-overlay \{[^}]+\}/);
  r.ok(!!pickOverlay, '.patron-pick-overlay block found');
  if (pickOverlay) {
    r.ok(pickOverlay[0].indexOf('position: fixed') !== -1, '.patron-pick-overlay is fixed');
    r.ok(pickOverlay[0].indexOf('z-index: 3100') !== -1,
      '.patron-pick-overlay above the spell viewer (3100 > 3000)');
  }
  const pickItem = css.match(/\.patron-pick-item \{[^}]+\}/);
  r.ok(!!pickItem, '.patron-pick-item block found');
  if (pickItem) {
    r.ok(pickItem[0].indexOf('cursor: pointer') !== -1, '.patron-pick-item is clickable');
    r.ok(pickItem[0].indexOf('background: transparent') !== -1, '.patron-pick-item starts transparent');
  }

  // Overlay "tete de mort" : ancre positionnee + aucun interception de clic
  // (portrait cliquable, drag & drop de l'ordre de marche preserves)
  const holderBlock = css.match(/\.portrait-holder \{[^}]+\}/);
  r.ok(!!holderBlock, '.portrait-holder block found');
  if (holderBlock) {
    r.ok(holderBlock[0].indexOf('position: relative') !== -1, '.portrait-holder is the positioning context');
  }
  const deadBlock = css.match(/\.dead-overlay \{[^}]+\}/);
  r.ok(!!deadBlock, '.dead-overlay block found');
  if (deadBlock) {
    r.ok(deadBlock[0].indexOf('position: absolute') !== -1, '.dead-overlay is absolute');
    r.ok(deadBlock[0].indexOf('pointer-events: none') !== -1, '.dead-overlay never blocks clicks');
  }

  return r;
};
