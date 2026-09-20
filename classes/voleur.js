// DCC RPG Voleur Character Sheet Module
(function () {
  window.DCCModules = window.DCCModules || {};

  function render(container, charId, data) {
    data = data || {};
    const bc = window.DCCModules.blocCommun;

    function val(field, def) {
      const key = `voleur-${charId}-${field}`;
      const v = data[field] !== undefined ? data[field] : (def || '');
      return `<input class="field-input" type="text" data-key="${key}" value="${v}">`;
    }

    function textarea(field, def, rows) {
      const key = `voleur-${charId}-${field}`;
      const v = data[field] !== undefined ? data[field] : (def || '');
      return `<textarea class="field-input textarea" data-key="${key}" rows="${rows || 4}">${v}</textarea>`;
    }

    container.innerHTML = bc.render(container, charId, 'voleur', data) + `
      <div class="sheet-page">
        <div class="page-title">Voleur - Page 2</div>
        <div class="section-title">Capacites de voleur</div>
        <div class="row">
          <div class="field">
            <span class="field-label">De de chance</span>
            ${val('de-chance')}
          </div>
          <div class="field">
            <span class="field-label">Attaque sournoise</span>
            ${val('attaque-sournoise')}
          </div>
        </div>
        <div class="row">
          <div class="field">
            <span class="field-label">Deplacement silencieux</span>
            ${val('deplacement-silencieux')}
          </div>
          <div class="field">
            <span class="field-label">Se cacher dans l'ombre</span>
            ${val('cacher-ombre')}
          </div>
        </div>
        <div class="row">
          <div class="field">
            <span class="field-label">Vol a la tire</span>
            ${val('vol-tire')}
          </div>
          <div class="field">
            <span class="field-label">Escal. parois abruptes</span>
            ${val('escalade-parois')}
          </div>
        </div>
        <div class="row">
          <div class="field">
            <span class="field-label">Crocheter les serrures</span>
            ${val('crocheter-serrures')}
          </div>
          <div class="field">
            <span class="field-label">Detecter les pieges</span>
            ${val('detecter-pieges')}
          </div>
        </div>
        <div class="row">
          <div class="field">
            <span class="field-label">Desamorcer les pieges</span>
            ${val('desamorcer-pieges')}
          </div>
          <div class="field">
            <span class="field-label">Falsifier documents</span>
            ${val('falsifier-documents')}
          </div>
        </div>
        <div class="row">
          <div class="field">
            <span class="field-label">Se deguiser</span>
            ${val('deguiser')}
          </div>
          <div class="field">
            <span class="field-label">Lire langues inconnues</span>
            ${val('lire-langues')}
          </div>
        </div>
        <div class="row">
          <div class="field">
            <span class="field-label">Utiliser des poisons</span>
            ${val('utiliser-poisons')}
          </div>
          <div class="field">
            <span class="field-label">Incant. parchemin</span>
            ${val('incanter-parchemin')}
          </div>
        </div>
        <p class="info-text">Argot des voleurs: Les voleurs ont leur propre jargon.</p>
        <div class="section-title">Notes</div>
        ${textarea('notes', '', 10)}
      </div>
    `;
  }

  function collectData(container) {
    const inputs = container.querySelectorAll('[data-key]');
    const result = {};
    inputs.forEach(function (el) {
      const key = el.getAttribute('data-key');
      const parts = key.split('-');
      if (parts[0] === 'voleur' && parts[1]) {
        const field = parts.slice(2).join('-');
        result[field] = el.value;
      }
    });
    return result;
  }

  window.DCCModules.voleur = {
    render: render,
    collectData: collectData
  };
})();
