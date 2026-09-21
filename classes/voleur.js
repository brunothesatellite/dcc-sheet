// DCC RPG Voleur Character Sheet Module
(function () {
  window.DCCModules = window.DCCModules || {};

  function render(container, charId, data) {
    data = data || {};
    const v = (field, def = '') => data[field] ?? def;
    const k = (field) => `voleur-${charId}-${field}`;
    const bc = window.DCCModules.blocCommun;

    function skillLine(label, prefix, field) {
      const val = v(field);
      const key = k(field);
      return `<span class="skill-label">${label}</span><span class="skill-prefix">${prefix}</span><input type="text" class="skill-input" data-key="${key}" value="${val}">`;
    }

    function labelOnly(text) {
      return `<span class="skill-label">${text}</span><span class="skill-prefix"></span><span></span>`;
    }

    function emptyCells() {
      return '<span></span><span></span><span></span>';
    }

    container.innerHTML = bc.render(container, charId, 'voleur', data) + `
      <div class="sheet-page">
        <div class="section-bar">Capacités de voleur</div>

        <div class="skills-grid">
          ${skillLine('Dé de chance', 'd', 'de-chance')}
          ${skillLine('Falsifier documents', '+', 'falsifier-documents')}

          ${skillLine('Attaque sournoise', '+', 'attaque-sournoise')}
          ${skillLine('Se déguiser', '+', 'deguiser')}

          ${skillLine('Déplacement silencieux', '+', 'deplacement-silencieux')}
          ${skillLine('Lire langues inconnues', '+', 'lire-langues')}

          ${skillLine('Se cacher dans l\'ombre', '+', 'cacher-ombre')}
          ${skillLine('Utiliser des poisons', '+', 'utiliser-poisons')}

          ${skillLine('Vol à la tire', '+', 'vol-tire')}
          ${skillLine('Incant. parchemin', 'd', 'incanter-parchemin')}

          ${skillLine('Escal. parois abruptes', '+', 'escalade-parois')}
          ${labelOnly('Argot des voleurs')}

          ${skillLine('Crocheter les serrures', '+', 'crocheter-serrures')}
          ${emptyCells()}

          ${skillLine('Détecter les pièges', '+', 'detecter-pieges')}
          ${emptyCells()}

          ${skillLine('Désamorcer les pièges', '+', 'desamorcer-pieges')}
          ${emptyCells()}
        </div>

        <div class="section-bar">Notes</div>
        <div>
          <textarea data-key="${k('notes')}" rows="6">${v('notes')}</textarea>
        </div>
      </div>
    `;
  }

  function collectData(container) {
    const data = {};
    container.querySelectorAll('[data-key]').forEach(el => {
      const key = el.getAttribute('data-key');
      const parts = key.split('-');
      if (parts[0] === 'voleur' && parts[1]) {
        const field = parts.slice(2).join('-');
        data[field] = el.value;
      }
    });
    return data;
  }

  window.DCCModules.voleur = {
    render: render,
    collectData: collectData
  };
})();
