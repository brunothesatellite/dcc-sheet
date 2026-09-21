window.DCCModules = window.DCCModules || {};

window.DCCModules.mage = {
  render(container, charId, data = {}) {
    const k = (field) => `mage-${charId}-${field}`;
    const v = (field, def = '') => data[field] ?? def;
    const bc = window.DCCModules.blocCommun;

    // Detect existing spell indices from data
    var spellIndices = [];
    Object.keys(data).forEach(function (key) {
      var m = key.match(/^sort_nom_(\d+)$/);
      if (m) spellIndices.push(parseInt(m[1], 10));
    });
    spellIndices.sort(function (a, b) { return a - b; });

    // Always ensure at least 1 empty row, and one extra at the end
    if (spellIndices.length === 0) {
      spellIndices.push(1);
    }
    var nextIndex = spellIndices.length > 0 ? Math.max.apply(null, spellIndices) + 1 : 1;
    spellIndices.push(nextIndex);

    function spellRow(n) {
      return `
        <tr data-spell="${n}">
          <td class="row-num" rowspan="2">${n}</td>
          <td class="sort-name"><input type="text" data-key="${k('sort_nom_' + n)}" value="${v('sort_nom_' + n)}"></td>
          <td><input type="text" data-key="${k('sort_niveau_' + n)}" value="${v('sort_niveau_' + n)}" placeholder="1-5"></td>
          <td><input type="text" data-key="${k('sort_test_' + n)}" value="${v('sort_test_' + n)}"></td>
          <td class="row-del"><button type="button" class="btn-spell-del" data-del="${n}">&#10005;</button></td>
        </tr>
        <tr data-spell="${n}">
          <td colspan="3" class="sort-notes"><textarea data-key="${k('sort_effet_' + n)}" rows="1">${v('sort_effet_' + n)}</textarea></td>
          <td class="row-del"></td>
        </tr>`;
    }

    function spellsHTML() {
      return spellIndices.map(spellRow).join('');
    }

    container.innerHTML = bc.render(container, charId, 'mage', data) + `
      <div class="sheet-page">
        <div class="section-bar">Capacités de Mage</div>

        <div class="row">
          <div class="field">
            <div class="label-on-line">
              <label class="field-label">Test d'incantation :</label>
              <input type="text" data-key="${k('incantation')}" value="${v('incantation')}">
            </div>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <div class="label-on-line">
              <label class="field-label">Familier :</label>
              <input type="text" data-key="${k('familier')}" value="${v('familier')}">
            </div>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <div class="label-on-line">
              <label class="field-label">Patron(s) :</label>
              <input type="text" data-key="${k('patron')}" value="${v('patron')}">
            </div>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <div class="label-on-line">
              <label class="field-label">Corruption :</label>
              <input type="text" data-key="${k('corruption')}" value="${v('corruption')}">
            </div>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <div class="mod-text">Mod. de chance pour corruption et magie mercurielle</div>
          </div>
        </div>

        <!-- ====== SORTS ====== -->
        <div class="section-bar">Sorts</div>

        <table class="dtable" id="mage-spells-${charId}">
          <thead>
            <tr>
              <th style="width:30px">#</th>
              <th>Nom du sort</th>
              <th style="width:60px">Niveau</th>
              <th style="width:70px">Test</th>
              <th style="width:30px"></th>
            </tr>
          </thead>
          <tbody>
            ${spellsHTML()}
          </tbody>
        </table>
        <button type="button" class="btn-spell-add" id="btn-spell-add-${charId}">+ Ajouter un sort</button>

        <!-- ====== NOTES ====== -->
        <div class="section-bar">Notes</div>
        <div class="row">
          <div class="field">
            <textarea data-key="${k('notes')}" rows="6">${v('notes')}</textarea>
          </div>
        </div>
      </div>
    `;

    // --- Dynamic spells logic ---
    var self = this;
    var table = container.querySelector('#mage-spells-' + charId);
    var tbody = table.querySelector('tbody');
    var addBtn = container.querySelector('#btn-spell-add-' + charId);

    function renumber() {
      var rows = tbody.querySelectorAll('tr[data-spell]');
      var seen = {};
      var num = 1;
      rows.forEach(function (tr) {
        var idx = tr.getAttribute('data-spell');
        if (!seen[idx]) {
          seen[idx] = true;
          var rowNum = tr.querySelector('.row-num');
          if (rowNum) rowNum.textContent = num;
          num++;
        }
      });
    }

    function getNextIndex() {
      var max = 0;
      tbody.querySelectorAll('tr[data-spell]').forEach(function (tr) {
        var idx = parseInt(tr.getAttribute('data-spell'), 10);
        if (idx > max) max = idx;
      });
      return max + 1;
    }

    function getFilledIndices() {
      var filled = {};
      tbody.querySelectorAll('input[data-key], textarea[data-key]').forEach(function (el) {
        if (el.value.trim() !== '') {
          var key = el.getAttribute('data-key');
          var m = key.match(/sort_(?:nom|niveau|test|effet)_(\d+)$/);
          if (m) filled[m[1]] = true;
        }
      });
      return filled;
    }

    function removeEmptyTrailing() {
      var spells = {};
      tbody.querySelectorAll('tr[data-spell]').forEach(function (tr) {
        var idx = tr.getAttribute('data-spell');
        if (!spells[idx]) spells[idx] = [];
        spells[idx].push(tr);
      });

      var indices = Object.keys(spells).map(Number).sort(function (a, b) { return b - a; });

      for (var i = 0; i < indices.length; i++) {
        var idx = indices[i];
        var rows = spells[idx];
        var filled = false;
        rows.forEach(function (tr) {
          tr.querySelectorAll('input, textarea').forEach(function (el) {
            if (el.value.trim() !== '') filled = true;
          });
        });
        if (!filled && indices.length > 1) {
          rows.forEach(function (tr) { tr.remove(); });
          delete spells[idx];
        } else {
          break;
        }
      }
    }

    async function deleteSpell(spellIdx) {
      var rows = tbody.querySelectorAll('tr[data-spell="' + spellIdx + '"]');
      if (rows.length === 0) return;

      var hasData = false;
      rows.forEach(function (tr) {
        tr.querySelectorAll('input, textarea').forEach(function (el) {
          if (el.value.trim() !== '') hasData = true;
        });
      });

      if (hasData) {
        var confirmed = await window.showModal({
          title: 'Suppression',
          message: 'Supprimer ce sort ?',
          type: 'confirm',
          okText: 'Supprimer',
          danger: true,
        });
        if (!confirmed) return;
      }

      rows.forEach(function (tr) { tr.remove(); });
      removeEmptyTrailing();

      // Ensure at least one empty row
      if (tbody.querySelectorAll('tr[data-spell]').length === 0) {
        var newIdx = getNextIndex();
        tbody.insertAdjacentHTML('beforeend', self._spellRowHTML(charId, newIdx, k, v));
      }

      renumber();
      window.bindAutoSave('mage', charId);
      window.scheduleSave('mage', charId);
    }

    function addSpell() {
      var newIdx = getNextIndex();
      tbody.insertAdjacentHTML('beforeend', self._spellRowHTML(charId, newIdx, k, v));
      renumber();
      window.bindAutoSave('mage', charId);
      window.scheduleSave('mage', charId);
    }

    // Event delegation for delete buttons
    tbody.addEventListener('click', function (e) {
      var btn = e.target.closest('.btn-spell-del');
      if (!btn) return;
      e.preventDefault();
      var idx = parseInt(btn.getAttribute('data-del'), 10);
      deleteSpell(idx);
    });

    addBtn.addEventListener('click', function () {
      addSpell();
    });
  },

  _spellRowHTML(charId, n, k, v) {
    return `
      <tr data-spell="${n}">
        <td class="row-num" rowspan="2">${n}</td>
        <td><input type="text" data-key="${k('sort_nom_' + n)}" value="${v('sort_nom_' + n)}"></td>
        <td><input type="text" data-key="${k('sort_niveau_' + n)}" value="${v('sort_niveau_' + n)}" placeholder="1-5"></td>
        <td><input type="text" data-key="${k('sort_test_' + n)}" value="${v('sort_test_' + n)}"></td>
        <td class="row-del"><button type="button" class="btn-spell-del" data-del="${n}">&#10005;</button></td>
      </tr>
      <tr data-spell="${n}">
        <td colspan="3" class="sort-notes"><textarea data-key="${k('sort_effet_' + n)}" rows="1">${v('sort_effet_' + n)}</textarea></td>
        <td class="row-del"></td>
      </tr>`;
  },

  collectData(container) {
    const data = {};
    container.querySelectorAll('[data-key]').forEach(el => {
      const key = el.getAttribute('data-key');
      data[key] = el.value;
    });
    return data;
  }
};
