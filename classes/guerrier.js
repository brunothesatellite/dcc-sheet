window.DCCModules = window.DCCModules || {};

window.DCCModules.guerrier = {
  render(container, charId, data = {}) {
    const v = (field, def = '') => data[field] ?? def;
    const k = (field) => `guerrier-${charId}-${field}`;
    const bc = window.DCCModules.blocCommun;

    container.innerHTML = bc.render(container, charId, 'guerrier', data) + `
      <div class="sheet-page">
        <div class="page-title">Fiche de Guerrier - Partie 2</div>

        <div class="section-bar">Capacités de guerrier</div>

        <div class="row">
          <div class="field">
            <div class="label-on-line">
              <label class="field-label">Coup critique sur :</label>
              <input type="text" data-key="${k('coup_critique')}" value="${v('coup_critique')}">
            </div>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <div class="label-on-line">
              <label class="field-label">Arme soumise au mod. de Chance :</label>
              <input type="text" data-key="${k('arme_chance')}" value="${v('arme_chance')}">
            </div>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <div class="inline-field">
              Ajout du niveau à l'initiative, Hauts faits d'armes (dé :
              <input type="text" data-key="${k('hfa')}" value="${v('hfa')}">
              )
            </div>
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
