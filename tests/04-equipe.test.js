'use strict';

const { createReporter } = require('./helpers/assert');
const { createEnv, delay } = require('./helpers/env');

const CHARACTERS = [
  {
    id: 1,
    name: 'Travok',
    class: 'clerc',
    data: JSON.stringify({
      attaque_cac: '+1',
      degats_cac: '1d6+1',
      att_distance: '+3',
      degats_distance: '1d8',
      initiative: '+2',
      classe_armure: '14',
      points_de_vie: '7',
    }),
  },
  {
    id: 2,
    name: 'Sergiu',
    class: 'mage',
    data: JSON.stringify({
      initiative: '+1',
      classe_armure: '10',
      points_de_vie: '4',
    }),
  },
];

function counts(container) {
  return {
    details: container.querySelectorAll('tr.team-detail').length,
    expanded: container.querySelectorAll('.char-class[aria-expanded="true"]').length,
  };
}

function click(el) {
  el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
}

function keydown(el, key) {
  const win = el.ownerDocument.defaultView;
  el.dispatchEvent(new win.KeyboardEvent('keydown', { key: key, bubbles: true, cancelable: true }));
}

function detailHtml(container) {
  const detail = container.querySelector('tr.team-detail');
  const td = detail ? detail.querySelector('td') : null;
  return td ? td.innerHTML : '';
}

async function run() {
  const r = createReporter('04-equipe');
  const env = createEnv();
  env.loadEquipe();

  let switched = 0;
  let opened = 0;
  env.window.switchTab = function () { switched += 1; };
  env.window.openSheet = function () { opened += 1; };

  const mod = env.window.DCCModules.equipe;
  if (!mod || typeof mod.render !== 'function') {
    r.fail('equipe module not loaded');
    return r;
  }

  const container = env.document.getElementById('root');
  let savePvCalls = 0;
  let saveNotesCalls = 0;
  mod.render(container, CHARACTERS, function () { savePvCalls += 1; }, '', function () { saveNotesCalls += 1; });

  const tds = Array.prototype.slice.call(container.querySelectorAll('.char-class'));
  r.eq(tds.length, 2, 'two class cells');
  r.eq(counts(container).details, 0, 'initially no detail row');
  r.eq(counts(container).expanded, 0, 'initially none expanded');

  // aria basics on class cells
  tds.forEach(function (td) {
    r.eq(td.getAttribute('role'), 'button', 'class cell role=button');
    r.eq(td.getAttribute('tabindex'), '0', 'class cell tabindex=0');
    r.eq(td.getAttribute('aria-expanded'), 'false', 'class cell aria-expanded=false');
    r.ok(!!td.getAttribute('aria-controls'), 'class cell has aria-controls');
    r.ok(!!td.querySelector('.chevron'), 'class cell has chevron');
    r.ok(!!td.querySelector('.char-class-labels'), 'class cell has char-class-labels');
  });

  click(tds[0]);
  r.eq(counts(container).details, 1, 'open char1 -> 1 detail');
  r.eq(counts(container).expanded, 1, 'open char1 -> 1 expanded');
  r.eq(tds[0].getAttribute('aria-expanded'), 'true', 'char1 aria-expanded=true');

  const detail = container.querySelector('tr.team-detail');
  r.ok(!!detail, 'detail row exists');
  if (detail) {
    const td = detail.querySelector('td');
    r.eq(td.colSpan, 7, 'detail colspan=7');
    r.ok(td.innerHTML.indexOf('team-detail-wrap') !== -1, 'detail has wrap for animation');
    r.ok(td.innerHTML.indexOf('Att CàC') !== -1 || td.innerHTML.indexOf('Att Cac') !== -1 || td.innerHTML.indexOf('⚔ Att') !== -1, 'detail has melee label');
    r.ok(td.innerHTML.indexOf('Att Dist') !== -1, 'detail has distance label');
    r.ok(td.innerHTML.indexOf('+1') !== -1, 'detail shows attaque_cac +1');
    r.ok(td.innerHTML.indexOf('1d6+1') !== -1, 'detail shows degats_cac');
    r.ok(td.innerHTML.indexOf('+3') !== -1, 'detail shows att_distance');
    r.ok(td.innerHTML.indexOf('+0</span>') === -1, 'no +0 placeholder on filled char');
    r.ok(td.innerHTML.indexOf('>1d6</span>') === -1, 'no bare 1d6 placeholder on filled char');
  }

  click(tds[1]);
  r.eq(counts(container).details, 1, 'switch to char2 still 1 detail');
  r.eq(counts(container).expanded, 1, 'switch to char2 still 1 expanded');
  const expandedNow = container.querySelector('.char-class[aria-expanded="true"]');
  r.ok(expandedNow === tds[1], 'char2 is the expanded one');

  const html2 = detailHtml(container);
  const dashCount = (html2.match(/>-<\/span>/g) || []).length;
  r.eq(dashCount, 4, 'empty combat fields show 4 dashes (got ' + dashCount + ')');
  r.ok(html2.indexOf('+0</span>') === -1, 'no +0 when empty');
  r.ok(html2.indexOf('1d6</span>') === -1, 'no 1d6 when empty');
  r.ok(html2.indexOf('empty') !== -1, 'empty values keep empty class');

  click(tds[1]);
  r.eq(counts(container).expanded, 0, 're-click char2 collapses aria');
  r.eq(counts(container).details, 1, 'collapse keeps detail until anim ends');
  await delay(320);
  r.eq(counts(container).details, 0, 'async collapse removes detail row');

  keydown(tds[0], 'Enter');
  r.eq(counts(container).details, 1, 'keyboard Enter opens');
  r.eq(counts(container).expanded, 1, 'keyboard Enter sets expanded');

  // space key while open toggles closed
  keydown(container.querySelector('.char-class[aria-expanded="true"]'), ' ');
  r.eq(counts(container).expanded, 0, 'keyboard Space collapses');
  await delay(320);
  r.eq(counts(container).details, 0, 'Space collapse removes detail after anim');

  // name click still opens sheet
  keydown(tds[0], 'Enter');
  await delay(10);
  const names = Array.prototype.slice.call(container.querySelectorAll('.char-name'));
  r.eq(names.length, 2, 'two name cells');
  click(names[0]);
  await delay(150);
  r.ok(switched >= 1, 'name click calls switchTab');
  r.ok(opened >= 1, 'name click calls openSheet after timeout');

  // open detail still present after name click (does not force re-render of equipe)
  r.eq(counts(container).expanded, 1, 'detail still open after name click');

  // close open detail
  click(container.querySelector('.char-class[aria-expanded="true"]'));
  r.eq(counts(container).expanded, 0, 'close sets aria-expanded false');
  r.eq(counts(container).details, 1, 'close keeps detail until anim ends');
  await delay(320);
  r.eq(counts(container).details, 0, 'async close removes detail row');

  // enemy table structure
  const enemies = container.querySelector('table.team-table-enemies');
  r.ok(!!enemies, 'enemy table has team-table-enemies class');
  if (enemies) {
    const ths = Array.prototype.slice.call(enemies.querySelectorAll('thead th')).map(function (th) {
      return th.textContent.trim();
    });
    const expected = ['Ennemi', 'AC', 'ATT', 'PV', 'Init.', 'Tour'];
    r.eq(ths.join('|'), expected.join('|'), 'enemy column order');
    const rows = enemies.querySelectorAll('tbody tr');
    r.eq(rows.length, 3, '3 empty enemy rows by default');

    // add / remove / RAZ
    const group = container.querySelector('.btn-group');
    r.ok(!!group, 'enemy buttons group present');
    if (group) {
      click(group.querySelector('.btn-add'));
      r.eq(enemies.querySelectorAll('tbody tr').length, 4, 'add enemy row');
      click(group.querySelector('.btn-remove'));
      r.eq(enemies.querySelectorAll('tbody tr').length, 3, 'remove enemy row');
      click(group.querySelector('.btn-raz'));
      r.eq(enemies.querySelectorAll('tbody tr').length, 3, 'RAZ resets to 3 rows');
    }
  }

  // counters present for characters
  r.ok(container.querySelectorAll('.turn-counter').length >= 2, 'turn counters rendered');

  // notes area
  const notes = container.querySelector('textarea');
  r.ok(!!notes, 'notes textarea present');

  // char table headers
  const charTable = container.querySelector('table.team-table:not(.team-table-enemies)');
  r.ok(!!charTable, 'character team table present');
  if (charTable) {
    const ths = Array.prototype.slice.call(charTable.querySelectorAll('thead th')).map(function (th) {
      return th.textContent.trim();
    });
    r.ok(ths.indexOf('Nom') !== -1 && ths.indexOf('Classe') !== -1, 'character table has Nom + Classe columns');
    r.eq(ths.length, 7, 'character table has 7 columns');
  }

  return r;
}

module.exports = run;
