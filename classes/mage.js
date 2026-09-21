window.DCCModules = window.DCCModules || {};

window.DCCModules.mage = {
  render(container, charId, data = {}) {
    const k = (field) => `mage-${charId}-${field}`;
    const v = (field, def = '') => data[field] ?? def;
    const bc = window.DCCModules.blocCommun;

    const SORTS_ROWS = Array.from({ length: 20 }, (_, i) => i + 1);

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

        <table class="dtable">
          <thead>
            <tr>
              <th style="width:30px">#</th>
              <th>Nom du sort</th>
              <th style="width:60px">Niveau</th>
              <th style="width:70px">Test</th>
            </tr>
          </thead>
          <tbody>
            ${SORTS_ROWS.map(n => `
              <tr>
                <td class="row-num" rowspan="2">${n}</td>
                <td><input type="text" data-key="${k('sort_nom_' + n)}" value="${v('sort_nom_' + n)}"></td>
                <td><input type="text" data-key="${k('sort_niveau_' + n)}" value="${v('sort_niveau_' + n)}" placeholder="1-5"></td>
                <td><input type="text" data-key="${k('sort_test_' + n)}" value="${v('sort_test_' + n)}"></td>
              </tr>
              <tr>
                <td colspan="3" class="sort-notes"><textarea data-key="${k('sort_effet_' + n)}" rows="1">${v('sort_effet_' + n)}</textarea></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
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
