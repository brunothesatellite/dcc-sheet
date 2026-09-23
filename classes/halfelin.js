window.DCCModules = window.DCCModules || {};

window.DCCModules.halfelin = {
  render(container, charId, data = {}) {
    const v = (field, fallback = '') => data[field] ?? fallback;
    const k = (field) => `halfelin-${charId}-${field}`;
    const bc = window.DCCModules.blocCommun;

    container.innerHTML = bc.render(container, charId, 'halfelin', data) + `
      <div class="sheet-page">
        <div class="section-bar">Capacités de halfelin</div>

        <div class="capacites-grid">
          <!-- Colonne gauche -->
          <div class="capacites-left">
            <div class="cap-label">Infravision</div>
            <div class="label-on-line">
              <label class="cap-label">Discrétion :</label>
              <input type="text" data-key="${k('discretion')}" value="${v('discretion')}">
            </div>
            <div class="cap-label">Porte-bonheur</div>
            <div class="cap-label">Petite taille/lenteur</div>
          </div>
          <!-- Colonne droite -->
          <div class="capacites-right">
            <div class="combat-info">
              <div class="combat-info-title">Combat à deux armes</div>
              <ul>
                <li>Dés d'action d16+d16</li>
                <li>Crit sur 16 naturel</li>
                <li>Maladresse seulement sur 2x1</li>
                <li>si Agi &gt;16, règles normales</li>
              </ul>
            </div>
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
    container.querySelectorAll('[data-key]').forEach((el) => {
      data[el.dataset.key] = el.value;
    });
    return data;
  }
};
