// DCC RPG Voleur Character Sheet Module
(function () {
  window.DCCModules = window.DCCModules || {};

  function render(container, charId, data) {
    data = data || {};

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

    function stat(field, label) {
      const valKey = `voleur-${charId}-${field}`;
      const modKey = `voleur-${charId}-${field}-mod`;
      const v = data[field] !== undefined ? data[field] : '';
      const m = data[`${field}-mod`] !== undefined ? data[`${field}-mod`] : '';
      return `
        <div class="stat-row">
          <span class="stat-name">${label}</span>
          <input class="stat-value" type="text" data-key="${valKey}" value="${v}">
          <input class="stat-mod" type="text" data-key="${modKey}" value="${m}">
        </div>`;
    }

    function derived(field, label) {
      const key = `voleur-${charId}-${field}`;
      const v = data[field] !== undefined ? data[field] : '';
      return `
        <div class="field derived-field">
          <span class="field-label">${label}</span>
          <input class="field-input" type="text" data-key="${key}" value="${v}">
        </div>`;
    }

    const page1 = `
      <div class="sheet-page">
        <div class="page-title">Voleur</div>
        <div class="row">
          <div class="field">
            <span class="field-label">Nom</span>
            ${val('nom')}
          </div>
          <div class="field">
            <span class="field-label">Titre</span>
            ${val('titre')}
          </div>
          <div class="field" style="flex:2">
            <span class="field-label">Metier</span>
            ${val('metier')}
          </div>
          <div class="field">
            <span class="field-label">Alignement</span>
            ${val('alignement')}
          </div>
        </div>
        <div class="row">
          <div class="field">
            <span class="field-label">Mouvement</span>
            ${val('mouvement')}
          </div>
          <div class="field">
            <span class="field-label">Niveau</span>
            ${val('niveau')}
          </div>
          <div class="field">
            <span class="field-label">PX</span>
            ${val('px')}
          </div>
          <div class="field">
            <span class="field-label">CA</span>
            ${val('ca')}
          </div>
          <div class="field">
            <span class="field-label">PV</span>
            ${val('pv')}
          </div>
          <div class="field">
            <span class="field-label">Max PV</span>
            ${val('max-pv')}
          </div>
        </div>
        <div class="section-title">Combat</div>
        <div class="row">
          <div class="field">
            <span class="field-label">Initiative</span>
            ${val('initiative')}
          </div>
          <div class="field">
            <span class="field-label">Des d'action</span>
            ${val('des-action')}
          </div>
          <div class="field">
            <span class="field-label">Attaque</span>
            ${val('attaque')}
          </div>
          <div class="field">
            <span class="field-label">Des critique</span>
            ${val('des-critique')}
          </div>
          <div class="field">
            <span class="field-label">Table critique</span>
            ${val('table-critique')}
          </div>
        </div>
        <div class="section-title">Caracteristiques</div>
        <div class="row">
          <div class="stat-block">
            ${stat('force', 'Force')}
            <div class="derived-group">
              ${derived('attaque-cac', 'Attaque CAC')}
              ${derived('degats-cac', 'Degats CAC')}
            </div>
          </div>
          <div class="stat-block">
            ${stat('agilite', 'Agilite')}
            <div class="derived-group">
              ${derived('js-reflexe', 'JS Reflexe')}
              ${derived('att-distance', 'Att distance')}
            </div>
          </div>
          <div class="stat-block">
            ${stat('endurance', 'Endurance')}
            <div class="derived-group">
              ${derived('js-vigueur', 'JS Vigueur')}
            </div>
          </div>
        </div>
        <div class="row">
          <div class="stat-block">
            ${stat('presence', 'Presence')}
            <div class="derived-group">
              ${derived('js-volonte', 'JS Volonte')}
            </div>
          </div>
          <div class="stat-block">
            ${stat('chance', 'Chance')}
            <div class="derived-group">
              ${derived('jet-chanceux', 'Jet chanceux')}
            </div>
          </div>
          <div class="stat-block">
            ${stat('intelligence', 'Intelligence')}
            <div class="derived-group">
              ${derived('langues', 'Langues')}
            </div>
          </div>
        </div>
      </div>`;

    const page2 = `
      <div class="sheet-page">
        <div class="page-title">Voleur - Page 2</div>
        <div class="row">
          <div class="field" style="flex:1">
            <span class="field-label">Armes</span>
            ${textarea('armes', '', 4)}
          </div>
          <div class="field" style="flex:1">
            <span class="field-label">Equipement</span>
            ${textarea('equipement', '', 4)}
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex:1">
            <span class="field-label">Tresor</span>
            ${textarea('tresor', '', 4)}
          </div>
          <div class="field" style="flex:1">
            <span class="field-label">Armure</span>
            ${textarea('armure', '', 4)}
          </div>
        </div>
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
      </div>`;

    container.innerHTML = page1 + page2;
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
