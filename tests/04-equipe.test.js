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
      force: '11',
      agilite: '9',
      endurance: '16',
      presence: '14',
      chance: '11',
      intelligence: '8',
      js_reflexe: '1',
      js_vigueur: '3',
      js_volonte: '3',
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
      force: '6',
      agilite: '12',
      endurance: '10',
      presence: '11',
      chance: '14',
      intelligence: '16',
      js_reflexe: '2',
      js_vigueur: '1',
      js_volonte: '',
    }),
  },
];

function counts(container) {
  return {
    details: container.querySelectorAll('tr.team-detail').length,
    expanded: container.querySelectorAll('.char-class[aria-expanded="true"]').length,
    statsDetails: container.querySelectorAll('tr.team-stats-detail').length,
    statsExpanded: container.querySelectorAll('.team-table-stats .stat-group[aria-expanded="true"]').length,
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
  let modalResult = true;
  let modalCalls = 0;
  env.window.showModal = function (opts) {
    modalCalls += 1;
    return Promise.resolve(modalResult);
  };

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
    const names = Array.prototype.slice.call(container.querySelectorAll('table.team-table:not(.team-table-enemies):not(.team-table-stats) .char-name'));
    r.eq(names.length, 2, 'two name cells in expedition table');
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
  const charTable = container.querySelector('table.team-table:not(.team-table-enemies):not(.team-table-stats)');
  r.ok(!!charTable, 'character team table present');
  if (charTable) {
    const ths = Array.prototype.slice.call(charTable.querySelectorAll('thead th')).map(function (th) {
      return th.textContent.trim();
    });
    r.ok(ths.indexOf('Nom') !== -1 && ths.indexOf('Classe') !== -1, 'character table has Nom + Classe columns');
    r.eq(ths.length, 7, 'character table has 7 columns');
  }

  // --- Section Statistiques ---
  const bars = Array.prototype.slice.call(container.querySelectorAll('.section-bar')).map(function (el) {
    return el.textContent.trim();
  });
  r.ok(bars.indexOf('Statistiques') !== -1, 'Statistiques section present');
  const idxEnn = bars.indexOf('Ennemis');
  const idxStats = bars.indexOf('Statistiques');
  const idxNotes = bars.indexOf('Notes');
  r.ok(idxEnn !== -1 && idxStats !== -1 && idxNotes !== -1, 'Ennemis / Statistiques / Notes all present');
  r.ok(idxEnn < idxStats && idxStats < idxNotes, 'section order Ennemis < Statistiques < Notes');

  const statsTable = container.querySelector('table.team-table-stats');
  r.ok(!!statsTable, 'stats table has team-table-stats');
  if (statsTable) {
    const sths = Array.prototype.slice.call(statsTable.querySelectorAll('thead th')).map(function (th) {
      return th.textContent.trim();
    });
    r.eq(sths.length, 7, 'stats table has 7 columns');
    r.eq(sths.join('|'), 'Nom|FOR|AGI|END|PRE|CHA|INT', 'stats column order');

    const statsRows = statsTable.querySelectorAll('tbody tr.stats-char-row');
    r.eq(statsRows.length, 2, 'one stats row per character');
    r.eq(counts(container).statsDetails, 0, 'no stats detail initially');
    r.eq(counts(container).statsExpanded, 0, 'no stats expanded initially');

    // min/max : FOR max=11 Travok, min=6 Sergiu ; INT max=16 Sergiu, min=8 Travok
    const travokRow = statsRows[0];
    const sergiuRow = statsRows[1];
    r.ok(travokRow.querySelectorAll('td')[1].classList.contains('stat-max'), 'Travok FOR is max');
    r.ok(sergiuRow.querySelectorAll('td')[1].classList.contains('stat-min'), 'Sergiu FOR is min');
    r.ok(travokRow.querySelectorAll('td')[6].classList.contains('stat-min'), 'Travok INT is min');
    r.ok(sergiuRow.querySelectorAll('td')[6].classList.contains('stat-max'), 'Sergiu INT is max');

    // group AGI/END/PRE + single chevron under END
    const groupCells = statsTable.querySelectorAll('tbody .stat-group');
    r.eq(groupCells.length, 6, '3 group cells x 2 characters');
    const chevrons = statsTable.querySelectorAll('tbody .stat-chevron-cell .chevron');
    r.eq(chevrons.length, 2, 'one chevron per character (under END)');
    r.ok(travokRow.querySelectorAll('td')[2].classList.contains('stat-group-start'), 'AGI is group-start');
    r.ok(travokRow.querySelectorAll('td')[3].classList.contains('stat-chevron-cell'), 'END has chevron cell');
    r.ok(travokRow.querySelectorAll('td')[4].classList.contains('stat-group-end'), 'PRE is group-end');
    r.ok(travokRow.querySelectorAll('td')[0].classList.contains('char-name'), 'stats name uses char-name class');

    // min/max = couleur texte uniquement (pas de fond surligné)
    const maxTd = travokRow.querySelectorAll('td')[1];
    r.ok(!maxTd.style.background && maxTd.className.indexOf('background') === -1, 'stat-max has no inline bg');

    // group cells aria
    groupCells.forEach(function (td) {
      r.eq(td.getAttribute('role'), 'button', 'stat group role=button');
      r.eq(td.getAttribute('tabindex'), '0', 'stat group tabindex=0');
      r.eq(td.getAttribute('aria-expanded'), 'false', 'stat group aria-expanded=false');
      r.ok(!!td.getAttribute('aria-controls'), 'stat group has aria-controls');
    });

    // open stats detail via AGI cell
    click(travokRow.querySelectorAll('td')[2]);
    r.eq(counts(container).statsDetails, 1, 'open stats -> 1 detail row');
    r.eq(counts(container).statsExpanded, 3, 'open stats -> 3 group cells expanded');
    const statsDetail = container.querySelector('tr.team-stats-detail');
    r.ok(!!statsDetail, 'stats detail row exists');
    if (statsDetail) {
      r.ok(statsDetail.previousElementSibling === travokRow, 'detail is directly under character row');
      const std = statsDetail.querySelector('td');
      r.eq(std.colSpan, 7, 'stats detail colspan=7');
      r.ok(std.innerHTML.indexOf('team-detail-wrap') !== -1, 'stats detail has wrap');
      r.ok(std.innerHTML.indexOf('JdS REF') !== -1, 'stats detail has REF label');
      r.ok(std.innerHTML.indexOf('JdS VIG') !== -1, 'stats detail has VIG label');
      r.ok(std.innerHTML.indexOf('JdS VOL') !== -1, 'stats detail has VOL label');
      r.ok(std.innerHTML.indexOf('>1</span>') !== -1, 'stats detail shows REF 1');
      r.ok(std.innerHTML.indexOf('>3</span>') !== -1, 'stats detail shows VIG 3');
    }

    // combat + stats collapses are independent
    click(tds[0]);
    r.eq(counts(container).details, 1, 'combat detail opens while stats open');
    r.eq(counts(container).statsDetails, 1, 'stats detail stays open with combat');
    click(tds[0]);
    await delay(320);
    r.eq(counts(container).details, 0, 'combat closed');
    r.eq(counts(container).statsDetails, 1, 'stats still open after combat close');

    // switch to Sergiu stats
    click(sergiuRow.querySelectorAll('td')[2]);
    r.eq(counts(container).statsDetails, 1, 'switch stats still 1 detail');
    r.eq(counts(container).statsExpanded, 3, 'switch stats still 3 expanded');
    const openStats = container.querySelector('.team-table-stats .stat-group[aria-expanded="true"]');
    r.ok(openStats && openStats.closest('tr') === sergiuRow, 'Sergiu is expanded stats row');
    const sergiuDetailHtml = container.querySelector('tr.team-stats-detail').innerHTML;
    r.ok(sergiuDetailHtml.indexOf('>2</span>') !== -1, 'Sergiu REF shows 2');
    r.ok(sergiuDetailHtml.indexOf('empty') !== -1, 'empty VOL shows empty class');

    // re-click collapses
    click(sergiuRow.querySelectorAll('td')[3]);
    r.eq(counts(container).statsExpanded, 0, 're-click collapses stats aria');
    r.eq(counts(container).statsDetails, 1, 'collapse keeps detail until anim');
    await delay(320);
    r.eq(counts(container).statsDetails, 0, 'async collapse removes stats detail');

    // keyboard
    keydown(travokRow.querySelectorAll('td')[2], 'Enter');
    r.eq(counts(container).statsDetails, 1, 'keyboard Enter opens stats');
    keydown(container.querySelector('.team-table-stats .stat-group[aria-expanded="true"]'), ' ');
    r.eq(counts(container).statsExpanded, 0, 'keyboard Space collapses stats');
    await delay(320);
    r.eq(counts(container).statsDetails, 0, 'Space collapse removes stats detail');
  }

  // --- RAZ Init. combat + Tours ---
  const expTable = container.querySelector('table.team-table:not(.team-table-enemies):not(.team-table-stats)');
  r.ok(!!expTable, 'expedition table for RAZ');
  if (expTable) {
    const foot = expTable.querySelector('tfoot');
    r.ok(!!foot, 'expedition table has tfoot');
    const footTds = foot ? foot.querySelectorAll('td') : [];
    r.eq(footTds.length, 2, 'tfoot has 2 cells');
    if (footTds.length === 2) {
      r.eq(footTds[0].colSpan, 5, 'pad cell colspan=5');
      r.eq(footTds[1].colSpan, 2, 'RAZ cell colspan=2 (Init combat + Tour)');
    }
    const btnRazExp = foot ? foot.querySelector('.btn-raz') : null;
    r.ok(!!btnRazExp, 'RAZ button in tfoot');

    const initInputs = expTable.querySelectorAll('.init-combat-input');
    r.eq(initInputs.length, 2, 'init combat inputs tagged');
    initInputs[0].value = '5';
    initInputs[1].value = '3';
    const counters = expTable.querySelectorAll('.turn-counter');
    r.ok(counters.length >= 2, 'turn counters present');
    click(counters[0]); // increment to 1
    r.eq(counters[0].textContent, '1', 'counter incremented before RAZ');

    // annulation : rien ne change
    modalResult = false;
    const callsBefore = modalCalls;
    click(btnRazExp);
    await delay(20);
    r.ok(modalCalls > callsBefore, 'RAZ asks confirmation');
    r.eq(initInputs[0].value, '5', 'cancel keeps init value');
    r.eq(counters[0].textContent, '1', 'cancel keeps counter');

    // confirmation : efface init + reset tours
    modalResult = true;
    click(btnRazExp);
    await delay(20);
    r.eq(initInputs[0].value, '', 'confirm clears init combat 1');
    r.eq(initInputs[1].value, '', 'confirm clears init combat 2');
    r.eq(counters[0].textContent, '0', 'confirm resets counter 1');
    r.eq(counters[1].textContent, '0', 'confirm resets counter 2');

    // ennemis non touchés
    const enemies = container.querySelector('table.team-table-enemies');
    if (enemies) {
      r.ok(enemies.querySelectorAll('.init-combat-input').length === 0, 'enemies have no init-combat-input class');
    }
  }

  return r;
}

module.exports = run;
