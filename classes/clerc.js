if (!window.DCCModules) window.DCCModules = {};

window.DCCModules.clerc = {
  render(container, charId, data) {
    const v = (field, def = '') => data[field] ?? def;
    const k = (field) => `clerc-${charId}-${field}`;
    const bc = window.DCCModules.blocCommun;

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
            <div class="field-label">Risque de defaveur:</div>
            <input type="text" data-key="${k('risque_defaire')}" value="${v('risque_defaire', '0')}" style="text-align:center; font-size:16px; font-weight:700;">
          </div>
        </div>

        <div style="font-size:11px; margin-bottom:6px; color:var(--muted);">
          <strong>Pouvoirs:</strong> aide divine, repousser impiés (+mods Pre+Cha), imposition les mains.
        </div>

        <table class="dtable">
          <thead>
            <tr>
              <th style="text-align:left; width:40%;">Imposition des mains (decalage d'alignement)</th>
              <th>12</th>
              <th>14</th>
              <th>20</th>
              <th>22+</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>(identique)</td>
              <td><input type="text" data-key="${k('impos_id_12')}" value="${v('impos_id_12', '2 des')}"></td>
              <td><input type="text" data-key="${k('impos_id_14')}" value="${v('impos_id_14', '3 des')}"></td>
              <td><input type="text" data-key="${k('impos_id_20')}" value="${v('impos_id_20', '4 des')}"></td>
              <td><input type="text" data-key="${k('impos_id_22')}" value="${v('impos_id_22', '5 des')}"></td>
            </tr>
            <tr>
              <td>(adjacent)</td>
              <td><input type="text" data-key="${k('impos_adj_12')}" value="${v('impos_adj_12', '1 de')}"></td>
              <td><input type="text" data-key="${k('impos_adj_14')}" value="${v('impos_adj_14', '2 des')}"></td>
              <td><input type="text" data-key="${k('impos_adj_20')}" value="${v('impos_adj_20', '3 des')}"></td>
              <td><input type="text" data-key="${k('impos_adj_22')}" value="${v('impos_adj_22', '4 des')}"></td>
            </tr>
            <tr>
              <td>(oppose)</td>
              <td><input type="text" data-key="${k('impos_opp_12')}" value="${v('impos_opp_12', '1 de')}"></td>
              <td><input type="text" data-key="${k('impos_opp_14')}" value="${v('impos_opp_14', '1 de')}"></td>
              <td><input type="text" data-key="${k('impos_opp_20')}" value="${v('impos_opp_20', '2 des')}"></td>
              <td><input type="text" data-key="${k('impos_opp_22')}" value="${v('impos_opp_22', '3 des')}"></td>
            </tr>
          </tbody>
        </table>

        <div class="section-bar">Sorts</div>
        <div class="sorts-grid">
          <div class="sort-col">
            <input type="text" data-key="${k('sort_1_1')}" value="${v('sort_1_1')}">
            <input type="text" data-key="${k('sort_1_2')}" value="${v('sort_1_2')}">
            <input type="text" data-key="${k('sort_1_3')}" value="${v('sort_1_3')}">
            <input type="text" data-key="${k('sort_1_4')}" value="${v('sort_1_4')}">
            <input type="text" data-key="${k('sort_1_5')}" value="${v('sort_1_5')}">
            <input type="text" data-key="${k('sort_1_6')}" value="${v('sort_1_6')}">
            <input type="text" data-key="${k('sort_1_7')}" value="${v('sort_1_7')}">
          </div>
          <div class="sort-col">
            <input type="text" data-key="${k('sort_2_1')}" value="${v('sort_2_1')}">
            <input type="text" data-key="${k('sort_2_2')}" value="${v('sort_2_2')}">
            <input type="text" data-key="${k('sort_2_3')}" value="${v('sort_2_3')}">
            <input type="text" data-key="${k('sort_2_4')}" value="${v('sort_2_4')}">
            <input type="text" data-key="${k('sort_2_5')}" value="${v('sort_2_5')}">
            <input type="text" data-key="${k('sort_2_6')}" value="${v('sort_2_6')}">
            <input type="text" data-key="${k('sort_2_7')}" value="${v('sort_2_7')}">
          </div>
          <div class="sort-col">
            <input type="text" data-key="${k('sort_3_1')}" value="${v('sort_3_1')}">
            <input type="text" data-key="${k('sort_3_2')}" value="${v('sort_3_2')}">
            <input type="text" data-key="${k('sort_3_3')}" value="${v('sort_3_3')}">
            <input type="text" data-key="${k('sort_3_4')}" value="${v('sort_3_4')}">
            <input type="text" data-key="${k('sort_3_5')}" value="${v('sort_3_5')}">
            <input type="text" data-key="${k('sort_3_6')}" value="${v('sort_3_6')}">
            <input type="text" data-key="${k('sort_3_7')}" value="${v('sort_3_7')}">
          </div>
        </div>

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
