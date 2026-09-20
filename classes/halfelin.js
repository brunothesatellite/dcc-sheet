window.DCCModules = window.DCCModules || {};

window.DCCModules.halfelin = {
  render(container, charId, data = {}) {
    const v = (field, fallback = '') => data[field] ?? fallback;
    const k = (field) => `halfelin-${charId}-${field}`;
    const bc = window.DCCModules.blocCommun;

    container.innerHTML = bc.render(container, charId, 'halfelin', data) + `
      <div class="sheet-page">
        <h2 class="page-title">Fiche de Halfelin - Partie 2</h2>

        <h3 class="section-title">Capacites de halfelin</h3>

        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Arbaletes</label>
            <input type="text" data-key="${k('arbaletes')}" value="${v('arbaletes')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Camouflage</label>
            <input type="text" data-key="${k('camouflage')}" value="${v('camouflage')}">
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Coup chanceux</label>
            <input type="text" data-key="${k('coup_chanceux')}" value="${v('coup_chanceux')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Porte-bonheur</label>
            <input type="text" data-key="${k('porte_bonheur')}" value="${v('porte_bonheur')}">
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Taille</label>
            <input type="text" data-key="${k('taille')}" value="${v('taille')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Infravision</label>
            <input type="text" data-key="${k('infravision')}" value="${v('infravision')}">
          </div>
        </div>
      </div>
    `;
  },

  collectData(container) {
    const data = {};
    container.querySelectorAll('[data-key]').forEach((el) => {
      data[el.dataset.key] = el.value;
    });
    return data;
  }
};
