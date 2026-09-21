window.DCCModules = window.DCCModules || {};

window.DCCModules.nain = {
  render(container, charId, data = {}) {
    const v = (field, fallback = '') => data[field] ?? fallback;
    const k = (field) => `nain-${charId}-${field}`;
    const bc = window.DCCModules.blocCommun;

    container.innerHTML = bc.render(container, charId, 'nain', data) + `
      <div class="sheet-page">
        <div class="section-bar">Capacités de nain</div>

        <div class="cap-label">Infravision</div>

        <div class="cap-label">Comp. souterraines : perception os/gemmes, délect. construction</div>

        <div class="label-on-line">
          <label class="cap-label">Arme soumise au mod. de Chance :</label>
          <input type="text" data-key="${k('arme_chance')}" value="${v('arme_chance')}">
        </div>

        <div class="label-on-line">
          <label class="cap-label">Hauts faits d'arme (dé :</label>
          <input type="text" data-key="${k('hfa')}" value="${v('hfa')}" style="max-width:60px;">
          <label class="cap-label">)</label>
        </div>

        <div class="cap-label">Coup de bouclier (d'd'action d14)</div>

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
    container.querySelectorAll('[data-key]').forEach((el) => {
      data[el.dataset.key] = el.value;
    });
    return data;
  }
};
