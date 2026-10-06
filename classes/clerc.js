if (!window.DCCModules) window.DCCModules = {};

window.DCCModules.clerc = {
  render(container, charId, data) {
    data = data || {};
    const k = (field) => `clerc-${charId}-${field}`;
    const bc = window.DCCModules.blocCommun;

    /* Une ligne de sort porte 3 cles partageant le meme index :
         sort_N        : nom du sort (cle historique, conservee)
         sort_niveau_N : niveau du sort
         sort_test_N   : test du sort
       Base ancienne ou import JSON sans sort_niveau_N / sort_test_N :
       le champ se charge vide (aucune valeur par defaut imposee).
       Ancienne grille 3x7 (sort_{colonne}_{ligne}) sans niveau ni test :
       les noms sont compacts en sort_1..sort_n, les champs annexes vides. */
    var spellData = Object.assign({}, data);
    var seen = {};
    Object.keys(spellData).forEach(function (key) {
      var m = key.match(/^sort_(?:niveau_|test_)?(\d+)$/);
      if (m) seen[m[1]] = true;
    });
    var spellIndices = Object.keys(seen).map(Number).sort(function (a, b) { return a - b; });

    if (spellIndices.length === 0) {
      var gridValues = [];
      for (var col = 1; col <= 3; col++) {
        for (var row = 1; row <= 7; row++) {
          var gv = spellData['sort_' + col + '_' + row];
          if (typeof gv === 'string' && gv.trim() !== '') gridValues.push(gv);
        }
      }
      gridValues.forEach(function (val, i) { spellData['sort_' + (i + 1)] = val; });
      spellIndices = gridValues.map(function (val, i) { return i + 1; });
    }

    // Toujours une ligne vierge en fin de tableau
    if (spellIndices.length === 0) spellIndices.push(1);
    spellIndices.push(Math.max.apply(null, spellIndices) + 1);

    const v = (field, def = '') => spellData[field] ?? def;

    function spellRow(n) {
      return `
        <tr data-spell="${n}">
          <td class="row-num">${n}</td>
          <td class="sort-name">${bc.spellLookup('spell', !String(v('sort_' + n) ?? '').trim())}<input type="text" data-key="${k('sort_' + n)}" value="${v('sort_' + n)}"></td>
          <td><input type="text" data-key="${k('sort_niveau_' + n)}" value="${v('sort_niveau_' + n)}" placeholder="1-5"></td>
          <td><input type="text" data-key="${k('sort_test_' + n)}" value="${v('sort_test_' + n)}"></td>
          <td class="row-del"><button type="button" class="btn-spell-del" data-del="${n}">&#10005;</button></td>
        </tr>`;
    }

    function spellsHTML() {
      return spellIndices.map(spellRow).join('');
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
        <table class="dtable" id="clerc-spells-${charId}">
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

        <div class="section-bar">Notes</div>
        <div class="row">
          <div class="field">
            <textarea data-key="${k('notes')}" rows="6">${v('notes')}</textarea>
          </div>
        </div>
      </div>
    `;

    // --- Dynamic spells logic (meme mecanique que le Mage, sans ligne de note) ---
    var self = this;
    var table = container.querySelector('#clerc-spells-' + charId);
    var tbody = table.querySelector('tbody');
    var addBtn = container.querySelector('#btn-spell-add-' + charId);

    // Numerotation continue : une suppression au milieu laisse un trou dans
    // les indexes (les cles doivent rester alignees), pas dans l'affichage.
    renumber();

    function rowsOf(spellIdx) {
      return Array.prototype.slice.call(
        tbody.querySelectorAll('tr[data-spell="' + spellIdx + '"]'));
    }

    function allRows() {
      return Array.prototype.slice.call(tbody.querySelectorAll('tr[data-spell]'));
    }

    function renumber() {
      var seenIdx = {};
      var num = 1;
      allRows().forEach(function (tr) {
        var idx = tr.getAttribute('data-spell');
        if (seenIdx[idx]) return;
        seenIdx[idx] = true;
        var rowNum = tr.querySelector('.row-num');
        if (rowNum) rowNum.textContent = num;
        num++;
      });
    }

    function getNextIndex() {
      var max = 0;
      allRows().forEach(function (tr) {
        var idx = parseInt(tr.getAttribute('data-spell'), 10);
        if (idx > max) max = idx;
      });
      return max + 1;
    }

    function rowFilled(tr) {
      var inputs = tr.querySelectorAll('input[data-key]');
      for (var i = 0; i < inputs.length; i++) {
        if (inputs[i].value.trim() !== '') return true;
      }
      return false;
    }

    function removeEmptyTrailing() {
      var rows = allRows();
      for (var i = rows.length - 1; i > 0; i--) {
        if (rowFilled(rows[i])) break;
        rows[i].remove();
      }
    }

    async function deleteSpell(spellIdx) {
      var rows = rowsOf(spellIdx);
      if (rows.length === 0) return;

      var hasData = false;
      rows.forEach(function (tr) {
        if (rowFilled(tr)) hasData = true;
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

      // Au moins une ligne vierge
      if (allRows().length === 0) {
        tbody.insertAdjacentHTML('beforeend', self._spellRowHTML(charId, getNextIndex(), k));
      }

      renumber();
      window.bindAutoSave('clerc', charId);
      window.scheduleSave('clerc', charId);
    }

    function addSpell() {
      tbody.insertAdjacentHTML('beforeend', self._spellRowHTML(charId, getNextIndex(), k));
      renumber();
      window.bindAutoSave('clerc', charId);
      window.scheduleSave('clerc', charId);
    }

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

  /* Ligne vierge ajoutee a la demande : nom / niveau / test vides, quel que
     soit l'index (un sort supprime ne doit pas reapparaitre dans la ligne
     recreee). */
  _spellRowHTML(charId, n, k) {
    const bc = window.DCCModules.blocCommun;
    return `
      <tr data-spell="${n}">
        <td class="row-num">${n}</td>
        <td class="sort-name">${bc.spellLookup('spell', true)}<input type="text" data-key="${k('sort_' + n)}" value=""></td>
        <td><input type="text" data-key="${k('sort_niveau_' + n)}" value="" placeholder="1-5"></td>
        <td><input type="text" data-key="${k('sort_test_' + n)}" value=""></td>
        <td class="row-del"><button type="button" class="btn-spell-del" data-del="${n}">&#10005;</button></td>
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
