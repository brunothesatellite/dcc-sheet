if (!window.DCCModules) window.DCCModules = {};

window.DCCModules.elfe = {
  render(container, charId, data) {
    const v = (field, def = '') => data[field] ?? def;
    const k = (field) => `elfe-${charId}-${field}`;
    const bc = window.DCCModules.blocCommun;

    container.innerHTML = bc.render(container, charId, 'elfe', data) + `
      <div class="sheet-page">
        <div class="page-title">Fiche d'Elfe - Partie 2</div>

        <div class="section-title">Sorts d'elfe &amp; pouvoirs</div>
        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Incantation</label>
            <input type="text" data-key="${k('incantation')}" value="${v('incantation')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Familier</label>
            <input type="text" data-key="${k('familier')}" value="${v('familier')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Patron</label>
            <input type="text" data-key="${k('patron')}" value="${v('patron')}">
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Corruption</label>
            <input type="text" data-key="${k('corruption')}" value="${v('corruption')}">
          </div>
          <div class="field" style="flex:1"></div>
        </div>

        <p style="font-size:0.9em; margin:6px 0 12px 0">
          Traits elfiques: Les elfes vivent longtemps et ont un sens aigu de la magie.
          Ils peuvent detecter les portes et passages secrets et les alignements.
        </p>

        <div class="section-title">Sorts elfiques</div>
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px">
          <thead>
            <tr>
              <th style="border:1px solid #999; padding:4px; text-align:left">Niveau</th>
              <th style="border:1px solid #999; padding:4px; text-align:left">Test</th>
              <th style="border:1px solid #999; padding:4px; text-align:left">Effet</th>
            </tr>
          </thead>
          <tbody>
            ${[1, 2, 3, 4, 5, 6, 7].map(n => `
              <tr>
                <td style="border:1px solid #999; padding:2px">
                  <input type="text" data-key="${k('sort_elfique_niveau_' + n)}" value="${v('sort_elfique_niveau_' + n)}"
                    style="width:100%; border:none; background:transparent">
                </td>
                <td style="border:1px solid #999; padding:2px">
                  <input type="text" data-key="${k('sort_elfique_test_' + n)}" value="${v('sort_elfique_test_' + n)}"
                    style="width:100%; border:none; background:transparent">
                </td>
                <td style="border:1px solid #999; padding:2px">
                  <input type="text" data-key="${k('sort_elfique_effet_' + n)}" value="${v('sort_elfique_effet_' + n)}"
                    style="width:100%; border:none; background:transparent">
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">Sorts</div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px">
          ${[0, 1, 2].map(col => `
            <div>
              ${[1, 2, 3, 4, 5, 6, 7].map(n => `
                <input type="text" data-key="${k('sort_' + (col * 7 + n))}" value="${v('sort_' + (col * 7 + n))}"
                  style="width:100%; margin-bottom:4px">
              `).join('')}
            </div>
          `).join('')}
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
