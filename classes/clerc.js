if (!window.DCCModules) window.DCCModules = {};

window.DCCModules.clerc = {
  render(container, charId, data) {
    data = data || {};
    const v = (field, def = '') => data[field] ?? def;
    const k = (field) => `clerc-${charId}-${field}`;
    const bc = window.DCCModules.blocCommun;

    // --- Spell values : migration grille legacy 3x7 -> liste plate ---
    var maxNew = 0;
    Object.keys(data).forEach(function (key) {
      var m = key.match(/^sort_(\d+)$/);
      if (m) maxNew = Math.max(maxNew, parseInt(m[1], 10));
    });

    var spellValues = [];
    if (maxNew > 0) {
      for (var n = 1; n <= maxNew; n++) {
        var nv = data['sort_' + n];
        if (typeof nv === 'string' && nv.trim() !== '') spellValues.push(nv);
      }
    } else {
      for (var c = 1; c <= 3; c++) {
        for (var r = 1; r <= 7; r++) {
          var lv = data['sort_' + c + '_' + r];
          if (typeof lv === 'string' && lv.trim() !== '') spellValues.push(lv);
        }
      }
    }
    if (spellValues.length === 0) spellValues.push('');
    spellValues.push('');

    function spellCell(n, val) {
      return `
        <div class="sort-cell" data-spell="${n}">
          <span class="sort-num">${n}</span>
          <input type="text" data-key="${k('sort_' + n)}" value="${val}" placeholder="Nom du sort">
          <button type="button" class="btn-spell-del" data-del="${n}">&#10005;</button>
        </div>`;
    }

    function cellsHTML() {
      return spellValues.map(function (val, i) { return spellCell(i + 1, val); }).join('');
    }

    container.innerHTML = bc.render(container, charId, 'clerc', data) + `
      <div class="sheet-page">
        <!-- Sorts de clerc & pouvoirs -->
        <div class="section-bar" style="font-size:14px; padding:8px;">Sorts de clerc &amp; pouvoirs</div>

        <div class="row" style="margin-bottom:6px;">
          <div class="field" style="flex:2;">
            <div class="field-label">Dieu</div>
            <input type="text" data-key="${k('dieu')}" value="${v('dieu')}" placeholder="Nom du dieu">
          </div>
          <div class="field">
            <div class="field-label">Test d'incant.:</div>
            <input type="text" data-key="${k('test_incantation')}" value="${v('test_incantation')}">
          </div>
          <div class="field">
            <div class="field-label">Risque de défaveur:</div>
            <input type="text" data-key="${k('risque_defaire')}" value="${v('risque_defaire', '0')}" style="text-align:center; font-size:16px; font-weight:700;">
          </div>
        </div>

        <div style="font-size:11px; margin-bottom:6px; color:var(--muted);">
          <strong>Pouvoirs:</strong> aide divine, repousser impies (+mods Pre+Cha), imposition des mains.
        </div>

        <table class="dtable">
          <thead>
            <tr>
              <th style="text-align:left; width:40%;">Imposition des mains (décalage d'alignement)</th>
              <th>12</th>
              <th>14</th>
              <th>20</th>
              <th>22+</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>(identique)</td>
              <td class="impos-val">2 dés</td>
              <td class="impos-val">3 dés</td>
              <td class="impos-val">4 dés</td>
              <td class="impos-val">5 dés</td>
            </tr>
            <tr>
              <td>(adjacent)</td>
              <td class="impos-val">1 dé</td>
              <td class="impos-val">2 dés</td>
              <td class="impos-val">3 dés</td>
              <td class="impos-val">4 dés</td>
            </tr>
            <tr>
              <td>(opposé)</td>
              <td class="impos-val">1 dé</td>
              <td class="impos-val">1 dé</td>
              <td class="impos-val">2 dés</td>
              <td class="impos-val">3 dés</td>
            </tr>
          </tbody>
        </table>

        <div class="section-bar">Sorts</div>
        <div class="sorts-grid" id="clerc-spells-${charId}">
          ${cellsHTML()}
        </div>
        <button type="button" class="btn-spell-add" id="btn-spell-add-${charId}">+ Ajouter un sort</button>

        <div class="section-bar">Notes</div>
        <div class="row">
          <div class="field">
            <textarea data-key="${k('notes')}" rows="6">${v('notes')}</textarea>
          </div>
        </div>
      </div>
    `;

    // --- Dynamic spells logic (meme mecanique que le Mage) ---
    var grid = container.querySelector('#clerc-spells-' + charId);
    var addBtn = container.querySelector('#btn-spell-add-' + charId);

    function renumber() {
      var num = 1;
      grid.querySelectorAll('.sort-cell .sort-num').forEach(function (el) {
        el.textContent = num++;
      });
    }

    function getNextIndex() {
      var max = 0;
      grid.querySelectorAll('.sort-cell').forEach(function (cell) {
        var idx = parseInt(cell.getAttribute('data-spell'), 10);
        if (idx > max) max = idx;
      });
      return max + 1;
    }

    function cellEmpty(cell) {
      var input = cell.querySelector('input');
      return !input || input.value.trim() === '';
    }

    function removeEmptyTrailing() {
      while (grid.querySelectorAll('.sort-cell').length > 1) {
        var cells = grid.querySelectorAll('.sort-cell');
        var last = cells[cells.length - 1];
        if (!cellEmpty(last)) break;
        last.remove();
      }
    }

    function ensureTrailingEmpty() {
      var cells = grid.querySelectorAll('.sort-cell');
      var last = cells[cells.length - 1];
      if (last && cellEmpty(last)) return;
      grid.insertAdjacentHTML('beforeend', spellCell(getNextIndex(), ''));
    }

    async function deleteSpell(cell) {
      if (!cell) return;

      if (!cellEmpty(cell)) {
        var confirmed = await window.showModal({
          title: 'Suppression',
          message: 'Supprimer ce sort ?',
          type: 'confirm',
          okText: 'Supprimer',
          danger: true,
        });
        if (!confirmed) return;
      }

      cell.remove();
      removeEmptyTrailing();
      ensureTrailingEmpty();
      renumber();
      window.bindAutoSave('clerc', charId);
      window.scheduleSave('clerc', charId);
    }

    function addSpell() {
      grid.insertAdjacentHTML('beforeend', spellCell(getNextIndex(), ''));
      renumber();
      window.bindAutoSave('clerc', charId);
      window.scheduleSave('clerc', charId);
    }

    grid.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn-spell-del');
      if (!btn) return;
      e.preventDefault();
      deleteSpell(btn.closest('.sort-cell'));
    });

    addBtn.addEventListener('click', function () {
      addSpell();
    });
  },

  collectData(container) {
    const data = {};
    container.querySelectorAll('[data-key]').forEach(el => {
      const key = el.getAttribute('data-key');
      const parts = key.split('-');
      const field = parts.slice(2).join('-');
      data[field] = el.value;
    });
    return data;
  }
};
