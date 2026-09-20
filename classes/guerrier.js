window.DCCModules = window.DCCModules || {};

window.DCCModules.guerrier = {
  render(container, charId, data = {}) {
    const bc = window.DCCModules.blocCommun;

    container.innerHTML = bc.render(container, charId, 'guerrier', data) + `
      <div class="sheet-page">
        <h2 class="page-title">Fiche de Guerrier - Partie 2</h2>

        <h3 class="section-title">Capacites de guerrier</h3>
        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Crit sur</label>
            <input type="text" data-key="guerrier-${charId}-crit-sur" value="${data['crit-sur'] || ''}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Arme Chance</label>
            <input type="text" data-key="guerrier-${charId}-arme-chance" value="${data['arme-chance'] || ''}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">HFA</label>
            <input type="text" data-key="guerrier-${charId}-hfa" value="${data.hfa || ''}">
          </div>
        </div>
        <div class="row">
          <div class="field">
            <label class="field-label">Ajout niveau initiative</label>
            <input type="text" data-key="guerrier-${charId}-ajout-niveau-initiative" value="${data['ajout-niveau-initiative'] || ''}">
          </div>
        </div>

        <h3 class="section-title">Table de guerison</h3>
        <table>
          <thead>
            <tr>
              <th>Niveau</th>
              <th>Des</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${[1, 2, 3, 4, 5, 6, 7].map(n => `
            <tr>
              <td>${n}</td>
              <td><input type="text" data-key="guerrier-${charId}-guerison-des-${n}" value="${data[`guerison-des-${n}`] || ''}"></td>
              <td><input type="text" data-key="guerrier-${charId}-guerison-total-${n}" value="${data[`guerison-total-${n}`] || ''}"></td>
            </tr>`).join('')}
          </tbody>
        </table>

        <h3 class="section-title">Manoeuvres de combat</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px;">
          ${Array.from({ length: 7 }, (_, i) => `
          <input type="text" data-key="guerrier-${charId}-manoeuvre-${i + 1}" value="${data[`manoeuvre-${i + 1}`] || ''}">`).join('')}
        </div>
      </div>
    `;
  },

  collectData(container) {
    const data = {};
    container.querySelectorAll('[data-key]').forEach(el => {
      const key = el.getAttribute('data-key');
      const field = key.replace(/^guerrier-[^-]+-/, '');
      data[field] = el.value;
    });
    return data;
  }
};
