window.DCCModules = window.DCCModules || {};

window.DCCModules.guerrier = {
  render(container, charId, data = {}) {
    container.innerHTML = `
      <div class="sheet-page">
        <h2 class="page-title">Fiche de Guerrier - Partie 1</h2>

        <div class="row">
          <div class="field" style="flex:2">
            <label class="field-label">Nom</label>
            <input type="text" data-key="guerrier-${charId}-nom" value="${data.nom || ''}">
          </div>
          <div class="field">
            <label class="field-label">Titre</label>
            <input type="text" data-key="guerrier-${charId}-titre" value="${data.titre || ''}">
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex:2">
            <label class="field-label">Metier</label>
            <input type="text" data-key="guerrier-${charId}-metier" value="${data.metier || ''}">
          </div>
          <div class="field">
            <label class="field-label">Alignement</label>
            <input type="text" data-key="guerrier-${charId}-alignement" value="${data.alignement || ''}">
          </div>
          <div class="field">
            <label class="field-label">Mouvement</label>
            <input type="text" data-key="guerrier-${charId}-mouvement" value="${data.mouvement || ''}">
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label class="field-label">Niveau</label>
            <input type="text" data-key="guerrier-${charId}-niveau" value="${data.niveau || ''}">
          </div>
          <div class="field">
            <label class="field-label">PX</label>
            <input type="text" data-key="guerrier-${charId}-px" value="${data.px || ''}">
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label class="field-label">Classe d'armure</label>
            <input type="text" data-key="guerrier-${charId}-classe-armure" value="${data['classe-armure'] || ''}">
          </div>
          <div class="field">
            <label class="field-label">Points de vie</label>
            <input type="text" data-key="guerrier-${charId}-points-vie" value="${data['points-vie'] || ''}">
          </div>
          <div class="field">
            <label class="field-label">Max PV</label>
            <input type="text" data-key="guerrier-${charId}-max-pv" value="${data['max-pv'] || ''}">
          </div>
        </div>

        <h3 class="section-title">Combat</h3>
        <div class="row">
          <div class="field">
            <label class="field-label">Initiative</label>
            <input type="text" data-key="guerrier-${charId}-initiative" value="${data.initiative || ''}">
          </div>
          <div class="field">
            <label class="field-label">Des(s) d'action</label>
            <input type="text" data-key="guerrier-${charId}-des-action" value="${data['des-action'] || ''}">
          </div>
          <div class="field">
            <label class="field-label">Attaque / Des critique</label>
            <input type="text" data-key="guerrier-${charId}-attaque-critique" value="${data['attaque-critique'] || ''}">
          </div>
          <div class="field">
            <label class="field-label">Table critique</label>
            <input type="text" data-key="guerrier-${charId}-table-critique" value="${data['table-critique'] || ''}">
          </div>
        </div>

        <h3 class="section-title">Caracteristiques</h3>

        <div class="stat-row">
          <span class="stat-name">Force</span>
          <div class="field">
            <input type="text" class="stat-value" data-key="guerrier-${charId}-force" value="${data.force || ''}">
          </div>
          <div class="field">
            <input type="text" class="stat-mod" data-key="guerrier-${charId}-force-mod" value="${data['force-mod'] || ''}">
          </div>
          <div class="field">
            <label class="field-label">Attaque CAC</label>
            <input type="text" data-key="guerrier-${charId}-force-attaque-cac" value="${data['force-attaque-cac'] || ''}">
          </div>
          <div class="field">
            <label class="field-label">Degats CAC</label>
            <input type="text" data-key="guerrier-${charId}-force-degats-cac" value="${data['force-degats-cac'] || ''}">
          </div>
        </div>

        <div class="stat-row">
          <span class="stat-name">Agilite</span>
          <div class="field">
            <input type="text" class="stat-value" data-key="guerrier-${charId}-agilite" value="${data.agilite || ''}">
          </div>
          <div class="field">
            <input type="text" class="stat-mod" data-key="guerrier-${charId}-agilite-mod" value="${data['agilite-mod'] || ''}">
          </div>
          <div class="field">
            <label class="field-label">JS Reflexe</label>
            <input type="text" data-key="guerrier-${charId}-agilite-js-reflexe" value="${data['agilite-js-reflexe'] || ''}">
          </div>
          <div class="field">
            <label class="field-label">Att. distance</label>
            <input type="text" data-key="guerrier-${charId}-agilite-att-distance" value="${data['agilite-att-distance'] || ''}">
          </div>
        </div>

        <div class="stat-row">
          <span class="stat-name">Endurance</span>
          <div class="field">
            <input type="text" class="stat-value" data-key="guerrier-${charId}-endurance" value="${data.endurance || ''}">
          </div>
          <div class="field">
            <input type="text" class="stat-mod" data-key="guerrier-${charId}-endurance-mod" value="${data['endurance-mod'] || ''}">
          </div>
          <div class="field">
            <label class="field-label">JS Vigueur</label>
            <input type="text" data-key="guerrier-${charId}-endurance-js-vigueur" value="${data['endurance-js-vigueur'] || ''}">
          </div>
        </div>

        <div class="stat-row">
          <span class="stat-name">Presence</span>
          <div class="field">
            <input type="text" class="stat-value" data-key="guerrier-${charId}-presence" value="${data.presence || ''}">
          </div>
          <div class="field">
            <input type="text" class="stat-mod" data-key="guerrier-${charId}-presence-mod" value="${data['presence-mod'] || ''}">
          </div>
          <div class="field">
            <label class="field-label">JS Volonte</label>
            <input type="text" data-key="guerrier-${charId}-presence-js-volonte" value="${data['presence-js-volonte'] || ''}">
          </div>
        </div>

        <div class="stat-row">
          <span class="stat-name">Chance</span>
          <div class="field">
            <input type="text" class="stat-value" data-key="guerrier-${charId}-chance" value="${data.chance || ''}">
          </div>
          <div class="field">
            <input type="text" class="stat-mod" data-key="guerrier-${charId}-chance-mod" value="${data['chance-mod'] || ''}">
          </div>
          <div class="field">
            <label class="field-label">Jet chanceux</label>
            <input type="text" data-key="guerrier-${charId}-chance-jet-chanceux" value="${data['chance-jet-chanceux'] || ''}">
          </div>
        </div>

        <div class="stat-row">
          <span class="stat-name">Intelligence</span>
          <div class="field">
            <input type="text" class="stat-value" data-key="guerrier-${charId}-intelligence" value="${data.intelligence || ''}">
          </div>
          <div class="field">
            <input type="text" class="stat-mod" data-key="guerrier-${charId}-intelligence-mod" value="${data['intelligence-mod'] || ''}">
          </div>
          <div class="field">
            <label class="field-label">Langues</label>
            <input type="text" data-key="guerrier-${charId}-intelligence-langues" value="${data['intelligence-langues'] || ''}">
          </div>
        </div>
      </div>

      <div class="sheet-page">
        <h2 class="page-title">Fiche de Guerrier - Partie 2</h2>

        <div class="row">
          <div class="field" style="flex:2">
            <label class="field-label">Armes</label>
            <textarea data-key="guerrier-${charId}-armes" rows="4">${data.armes || ''}</textarea>
          </div>
          <div class="field" style="flex:2">
            <label class="field-label">Equipement</label>
            <textarea data-key="guerrier-${charId}-equipement" rows="4">${data.equipement || ''}</textarea>
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex:2">
            <label class="field-label">Tresor</label>
            <textarea data-key="guerrier-${charId}-tresor" rows="4">${data.tresor || ''}</textarea>
          </div>
          <div class="field" style="flex:2">
            <label class="field-label">Armure</label>
            <textarea data-key="guerrier-${charId}-armure" rows="4">${data.armure || ''}</textarea>
          </div>
        </div>

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
