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

  return r;
};
