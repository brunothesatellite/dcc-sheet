window.DCCModules = window.DCCModules || {};

window.DCCModules.mage = {
  render(container, charId, data = {}) {
    const k = (field) => `mage-${charId}-${field}`;
    const v = (field, def = '') => data[field] ?? def;
    const bc = window.DCCModules.blocCommun;

    container.innerHTML = bc.render(container, charId, 'mage', data) + `
      <div class="sheet-page">
        <div class="section-title">Sorts de mage & pouvoirs</div>
        <div class="row">
          <div class="field"><span class="field-label">Incantation</span><input type="text" data-key="${k('incantation')}" value="${v('incantation')}"></div>
          <div class="field"><span class="field-label">Familier</span><input type="text" data-key="${k('familier')}" value="${v('familier')}"></div>
        </div>
        <div class="row">
          <div class="field"><span class="field-label">Patron</span><input type="text" data-key="${k('patron')}" value="${v('patron')}"></div>
          <div class="field"><span class="field-label">Corruption</span><input type="text" data-key="${k('corruption')}" value="${v('corruption')}"></div>
        </div>
        <div class="row">
          <div class="field" style="text-align:center"><span class="field-label">Risque de defaire</span><input type="text" data-key="${k('risqueDefaire')}" value="${v('risqueDefaire', '0')}" style="font-weight:bold; text-align:center;"></div>
          <div class="field"><span class="field-label">Magie mercurielle mod.</span><input type="text" data-key="${k('magieMercurielle')}" value="${v('magieMercurielle')}"></div>
        </div>

        <div class="section-title">Grimoire</div>
        <div class="row">
          <div class="field"><textarea data-key="${k('grimoire')}" rows="8" style="width:100%">${v('grimoire')}</textarea></div>
        </div>

        <div class="section-title">Formules magiques</div>
        <div class="row">
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr>
                <th style="border:1px solid #888; padding:4px; text-align:left;">Niveau</th>
                <th style="border:1px solid #888; padding:4px; text-align:left;">Test</th>
                <th style="border:1px solid #888; padding:4px; text-align:left;">Effet</th>
              </tr>
            </thead>
            <tbody>
              ${[1,2,3,4,5,6,7].map(i => `
              <tr>
                <td style="border:1px solid #888; padding:4px;"><input type="text" data-key="${k('formuleNiveau' + i)}" value="${v('formuleNiveau' + i)}" style="width:100%;border:none;background:transparent;"></td>
                <td style="border:1px solid #888; padding:4px;"><input type="text" data-key="${k('formuleTest' + i)}" value="${v('formuleTest' + i)}" style="width:100%;border:none;background:transparent;"></td>
                <td style="border:1px solid #888; padding:4px;"><input type="text" data-key="${k('formuleEffet' + i)}" value="${v('formuleEffet' + i)}" style="width:100%;border:none;background:transparent;"></td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section-title">Sorts</div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
          ${['A','B','C'].map(col => `
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="font-weight:bold; text-align:center;">Colonne ${col}</div>
            ${[1,2,3,4,5,6,7].map(i => `
            <div class="field"><span class="field-label">Sort ${i}</span><input type="text" data-key="${k('sort' + col + i)}" value="${v('sort' + col + i)}"></div>
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
      data[key] = el.value;
    });
    return data;
  }
};
