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
  ];
  critical.forEach(function (sel) {
    r.ok(css.indexOf(sel) !== -1, 'CSS selector present: ' + sel);
  });

  const blockMatch = css.match(/\.team-table \.char-class-content \{[^}]+\}/);
  r.ok(!!blockMatch, '.char-class-content block found');
  if (blockMatch) {
    r.ok(blockMatch[0].indexOf('display: flex') !== -1, '.char-class-content uses display:flex');
    r.ok(blockMatch[0].indexOf('flex-direction: column') === -1, '.char-class-content is not column');
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
