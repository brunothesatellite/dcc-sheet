if (!window.DCCModules) window.DCCModules = {};

window.DCCModules.elfe = {
  render(container, charId, data) {
    const v = (field, def = '') => data[field] ?? def;
    const k = (field) => `elfe-${charId}-${field}`;
    const bc = window.DCCModules.blocCommun;

    const SORTS_FREE_ROWS = [3, 4, 5, 6, 7];

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
              sans signe developpé, mod. de Cha à un sort de niveau 1
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

        <table class="dtable">
          <thead>
            <tr>
              <th style="width:30px">#</th>
              <th>Nom du sort</th>
              <th style="width:70px">Niveau</th>
              <th style="width:80px">Test</th>
              <th>Effet mercuriel &amp; Notes</th>
            </tr>
          </thead>
          <tbody>
            <tr class="row-fixed">
              <td class="row-num">1</td>
              <td class="sort-fixed">Lier un patron</td>
              <td>1</td>
              <td></td>
              <td></td>
            </tr>
            <tr class="row-fixed">
              <td class="row-num">2</td>
              <td class="sort-fixed">Invoquer un Patron</td>
              <td>1</td>
              <td></td>
              <td class="patron-effet">(&nbsp;<input type="text" class="patron-jours" data-key="${k('patron_invoc_nb')}" value="${v('patron_invoc_nb')}" placeholder="___">&nbsp;/jour)</td>
            </tr>
            ${SORTS_FREE_ROWS.map(n => `
              <tr>
                <td class="row-num">${n}</td>
                <td><input type="text" data-key="${k('sort_nom_' + n)}" value="${v('sort_nom_' + n)}"></td>
                <td><input type="text" data-key="${k('sort_niveau_' + n)}" value="${v('sort_niveau_' + n)}"></td>
                <td><input type="text" data-key="${k('sort_test_' + n)}" value="${v('sort_test_' + n)}"></td>
                <td><textarea data-key="${k('sort_effet_' + n)}" rows="1">${v('sort_effet_' + n)}</textarea></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <!-- ====== NOTES ====== -->
        <div class="section-bar">Notes</div>
        <div class="row">
          <div class="field">
            <textarea data-key="${k('notes')}" rows="6">${v('notes')}</textarea>
          </div>
        </div>
      </div>
    `;
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
