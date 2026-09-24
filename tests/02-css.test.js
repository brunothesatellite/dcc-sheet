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

  return r;
};
