if (!window.DCCModules) window.DCCModules = {};

window.DCCModules.elfe = {
  render(container, charId, data) {
    data = data || {};
    const v = (field, def = '') => data[field] ?? def;
    const k = (field) => `elfe-${charId}-${field}`;
    const bc = window.DCCModules.blocCommun;

    const FIXED_COUNT = 2;
    const MIN_INDEX = FIXED_COUNT + 1;

    // Detect existing free-spell indices (>= 3, non-empty values only)
    var spellIndices = [];
    Object.keys(data).forEach(function (key) {
      var m = key.match(/^sort_(?:nom|niveau|test|effet)_(\d+)$/);
      if (!m) return;
      var idx = parseInt(m[1], 10);
      var val = data[key];
      if (idx >= MIN_INDEX && typeof val === 'string' && val.trim() !== '' && spellIndices.indexOf(idx) === -1) {
        spellIndices.push(idx);
      }
    });
    spellIndices.sort(function (a, b) { return a - b; });

    if (spellIndices.length === 0) {
      spellIndices.push(MIN_INDEX);
    }
    spellIndices.push(Math.max.apply(null, spellIndices) + 1);

    function spellRow(n) {
      return `
        <tr data-spell="${n}">
          <td class="row-num" rowspan="2">${n}</td>
          <td class="sort-name"><input type="text" data-key="${k('sort_nom_' + n)}" value="${v('sort_nom_' + n)}"></td>
          <td><input type="text" data-key="${k('sort_niveau_' + n)}" value="${v('sort_niveau_' + n)}" placeholder="1-5"></td>
          <td><input type="text" data-key="${k('sort_test_' + n)}" value="${v('sort_test_' + n)}"></td>
          <td class="row-del" rowspan="2"><button type="button" class="btn-spell-del" data-del="${n}">&#10005;</button></td>
        </tr>
        <tr data-spell="${n}">
          <td colspan="3" class="sort-notes"><textarea data-key="${k('sort_effet_' + n)}" rows="1">${v('sort_effet_' + n)}</textarea></td>
        </tr>`;
    }

    function spellsHTML() {
      return spellIndices.map(spellRow).join('');
    }

    container.innerHTML = bc.render(container, charId, 'elfe', data) + `
      <div class="sheet-page">
        <!-- ====== CAPACITES ELFIQUES ====== -->
        <div class="section-bar">Capacités elfiques</div>

        <div class="row">
          <div class="field">
            <label class="field-label">Test d'incantation</label>
            <input type="text" data-key="${k('incantation')}" value="${v('incantation')}">
          </div>
          <div class="field">
            <label class="field-label">Familier</label>
            <input type="text" data-key="${k('familier')}" value="${v('familier')}">
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label class="field-label">Patron(s)</label>
            <input type="text" data-key="${k('patron')}" value="${v('patron')}">
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label class="field-label">Corruption</label>
            <input type="text" data-key="${k('corruption')}" value="${v('corruption')}">
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label class="field-label">Traits elfiques</label>
            <div class="traits-text">
              Sensibilité au fer, immunité au sommeil/paralysie, infravision,
              sens surdeveloppés, mod. de Cha à un sort de niveau 1
            </div>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label class="field-label">Autres notes</label>
            <textarea data-key="${k('autres_notes')}" rows="2">${v('autres_notes')}</textarea>
          </div>
        </div>

        <!-- ====== SORTS ====== -->
        <div class="section-bar">Sorts</div>

        <table class="dtable" id="elfe-spells-${charId}">
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
            <tr class="row-fixed">
              <td class="row-num" rowspan="2">1</td>
              <td class="sort-fixed">Lier un patron</td>
              <td>1</td>
              <td></td>
              <td class="row-del" rowspan="2"></td>
            </tr>
            <tr class="row-fixed">
              <td colspan="3"></td>
            </tr>
            <tr class="row-fixed">
              <td class="row-num" rowspan="2">2</td>
              <td class="sort-fixed">Invoquer un Patron</td>
              <td>1</td>
              <td></td>
              <td class="row-del" rowspan="2"></td>
            </tr>
            <tr class="row-fixed">
              <td colspan="3" class="patron-effet">(&nbsp;<input type="text" class="patron-jours" data-key="${k('patron_invoc_nb')}" value="${v('patron_invoc_nb')}" placeholder="___">&nbsp;/jour)</td>
            </tr>
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

    // --- Dynamic spells logic (meme mecanique que le Mage) ---
    var self = this;
    var table = container.querySelector('#elfe-spells-' + charId);
    var tbody = table.querySelector('tbody');
    var addBtn = container.querySelector('#btn-spell-add-' + charId);

    function renumber() {
      var rows = tbody.querySelectorAll('tr[data-spell]');
      var seen = {};
      var num = FIXED_COUNT + 1;
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
      var max = FIXED_COUNT;
      tbody.querySelectorAll('tr[data-spell]').forEach(function (tr) {
        var idx = parseInt(tr.getAttribute('data-spell'), 10);
        if (idx > max) max = idx;
      });
      return max + 1;
    }

    function rowsHaveData(rows) {
      var hasData = false;
      rows.forEach(function (tr) {
        tr.querySelectorAll('input, textarea').forEach(function (el) {
          if (el.value.trim() !== '') hasData = true;
        });
      });
      return hasData;
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
        if (!rowsHaveData(rows) && Object.keys(spells).length > 1) {
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

      if (rowsHaveData(rows)) {
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

      // Ensure at least one free pair
      if (tbody.querySelectorAll('tr[data-spell]').length === 0) {
        var newIdx = getNextIndex();
        tbody.insertAdjacentHTML('beforeend', self._spellRowHTML(charId, newIdx, k, v));
      }

      renumber();
      window.bindAutoSave('elfe', charId);
      window.scheduleSave('elfe', charId);
    }

    function addSpell() {
      var newIdx = getNextIndex();
      tbody.insertAdjacentHTML('beforeend', self._spellRowHTML(charId, newIdx, k, v));
      renumber();
      window.bindAutoSave('elfe', charId);
      window.scheduleSave('elfe', charId);
    }

    // Event delegation for delete buttons (lignes fixes : pas de data-spell, pas de bouton)
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
        <td class="sort-name"><input type="text" data-key="${k('sort_nom_' + n)}" value="${v('sort_nom_' + n)}"></td>
        <td><input type="text" data-key="${k('sort_niveau_' + n)}" value="${v('sort_niveau_' + n)}" placeholder="1-5"></td>
        <td><input type="text" data-key="${k('sort_test_' + n)}" value="${v('sort_test_' + n)}"></td>
        <td class="row-del" rowspan="2"><button type="button" class="btn-spell-del" data-del="${n}">&#10005;</button></td>
      </tr>
      <tr data-spell="${n}">
        <td colspan="3" class="sort-notes"><textarea data-key="${k('sort_effet_' + n)}" rows="1">${v('sort_effet_' + n)}</textarea></td>
      </tr>`;
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
