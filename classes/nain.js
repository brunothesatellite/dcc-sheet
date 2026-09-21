window.DCCModules = window.DCCModules || {};

window.DCCModules.nain = {
  render(container, charId, data = {}) {
    const v = (field, fallback = '') => data[field] ?? fallback;
    const k = (field) => `nain-${charId}-${field}`;
    const bc = window.DCCModules.blocCommun;

    container.innerHTML = bc.render(container, charId, 'nain', data) + `
      <div class="sheet-page">


        <h3 class="section-title">Capacites de nain</h3>

        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Infravision</label>
            <input type="text" data-key="${k('infravision')}" value="${v('infravision')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Competences souterraines</label>
            <input type="text" data-key="${k('competences_souterraines')}" value="${v('competences_souterraines')}">
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Arme Chance</label>
            <input type="text" data-key="${k('arme_chance')}" value="${v('arme_chance')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">HFA</label>
            <input type="text" data-key="${k('hfa')}" value="${v('hfa')}">
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Coup de bouclier</label>
            <input type="text" data-key="${k('coup_de_bouclier')}" value="${v('coup_de_bouclier')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Detection</label>
            <input type="text" data-key="${k('detection')}" value="${v('detection')}">
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Rage naine</label>
            <input type="text" data-key="${k('rage_naine')}" value="${v('rage_naine')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Souffle</label>
            <input type="text" data-key="${k('souffle')}" value="${v('souffle')}">
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
