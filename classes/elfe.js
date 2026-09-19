if (!window.DCCModules) window.DCCModules = {};

window.DCCModules.elfe = {
  render(container, charId, data) {
    const v = (field, def = '') => data[field] ?? def;
    const k = (field) => `elfe-${charId}-${field}`;

    container.innerHTML = `
      <div class="sheet-page">
        <div class="page-title">Fiche d'Elfe - Partie 1</div>

        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Nom</label>
            <input type="text" data-key="${k('nom')}" value="${v('nom')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Titre</label>
            <input type="text" data-key="${k('titre')}" value="${v('titre')}">
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex:2">
            <label class="field-label">Metier</label>
            <input type="text" data-key="${k('metier')}" value="${v('metier')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Alignement</label>
            <input type="text" data-key="${k('alignement')}" value="${v('alignement')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Mouvement</label>
            <input type="text" data-key="${k('mouvement')}" value="${v('mouvement')}">
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Niveau</label>
            <input type="text" data-key="${k('niveau')}" value="${v('niveau')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">PX</label>
            <input type="text" data-key="${k('px')}" value="${v('px')}">
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex:2; text-align:center">
            <label class="field-label">Classe d'armure</label>
            <input type="text" data-key="${k('classe_armure')}" value="${v('classe_armure')}"
              style="text-align:center; font-size:1.5em; font-weight:bold">
          </div>
          <div class="field" style="flex:2; text-align:center">
            <label class="field-label">Points de vie</label>
            <input type="text" data-key="${k('points_de_vie')}" value="${v('points_de_vie')}"
              style="text-align:center; font-size:1.5em; font-weight:bold">
          </div>
          <div class="field" style="flex:1; text-align:center">
            <label class="field-label">Max PV</label>
            <input type="text" data-key="${k('max_pv')}" value="${v('max_pv')}"
              style="text-align:center">
          </div>
        </div>

        <div class="section-title">Combat</div>
        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Initiative</label>
            <input type="text" data-key="${k('initiative')}" value="${v('initiative')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Des(s) d'action</label>
            <input type="text" data-key="${k('des_action')}" value="${v('des_action')}">
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Attaque / Des critique</label>
            <input type="text" data-key="${k('attaque_critique')}" value="${v('attaque_critique')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Table critique</label>
            <input type="text" data-key="${k('table_critique')}" value="${v('table_critique')}">
          </div>
        </div>

        <div class="section-title">Caracteristiques</div>

        <div class="stat-row">
          <div class="stat-name">Force</div>
          <div class="stat-value">
            <input type="text" data-key="${k('force')}" value="${v('force')}">
          </div>
          <div class="stat-mod">Mod:
            <input type="text" data-key="${k('force_mod')}" value="${v('force_mod')}" style="width:40px">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Attaque CAC</label>
            <input type="text" data-key="${k('attaque_cac')}" value="${v('attaque_cac')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Degats CAC</label>
            <input type="text" data-key="${k('degats_cac')}" value="${v('degats_cac')}">
          </div>
        </div>

        <div class="stat-row">
          <div class="stat-name">Agilite</div>
          <div class="stat-value">
            <input type="text" data-key="${k('agilite')}" value="${v('agilite')}">
          </div>
          <div class="stat-mod">Mod:
            <input type="text" data-key="${k('agilite_mod')}" value="${v('agilite_mod')}" style="width:40px">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">JS Reflexe</label>
            <input type="text" data-key="${k('js_reflexe')}" value="${v('js_reflexe')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Att. distance</label>
            <input type="text" data-key="${k('att_distance')}" value="${v('att_distance')}">
          </div>
        </div>

        <div class="stat-row">
          <div class="stat-name">Endurance</div>
          <div class="stat-value">
            <input type="text" data-key="${k('endurance')}" value="${v('endurance')}">
          </div>
          <div class="stat-mod">Mod:
            <input type="text" data-key="${k('endurance_mod')}" value="${v('endurance_mod')}" style="width:40px">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">JS Vigueur</label>
            <input type="text" data-key="${k('js_vigueur')}" value="${v('js_vigueur')}">
          </div>
        </div>

        <div class="stat-row">
          <div class="stat-name">Presence</div>
          <div class="stat-value">
            <input type="text" data-key="${k('presence')}" value="${v('presence')}">
          </div>
          <div class="stat-mod">Mod:
            <input type="text" data-key="${k('presence_mod')}" value="${v('presence_mod')}" style="width:40px">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">JS Volonte</label>
            <input type="text" data-key="${k('js_volonte')}" value="${v('js_volonte')}">
          </div>
        </div>

        <div class="stat-row">
          <div class="stat-name">Chance</div>
          <div class="stat-value">
            <input type="text" data-key="${k('chance')}" value="${v('chance')}">
          </div>
          <div class="stat-mod">Mod:
            <input type="text" data-key="${k('chance_mod')}" value="${v('chance_mod')}" style="width:40px">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Jet chanceux</label>
            <input type="text" data-key="${k('jet_chanceux')}" value="${v('jet_chanceux')}">
          </div>
        </div>

        <div class="stat-row">
          <div class="stat-name">Intelligence</div>
          <div class="stat-value">
            <input type="text" data-key="${k('intelligence')}" value="${v('intelligence')}">
          </div>
          <div class="stat-mod">Mod:
            <input type="text" data-key="${k('intelligence_mod')}" value="${v('intelligence_mod')}" style="width:40px">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Langues</label>
            <input type="text" data-key="${k('langues')}" value="${v('langues')}">
          </div>
        </div>
      </div>

      <div class="sheet-page">
        <div class="page-title">Fiche d'Elfe - Partie 2</div>

        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Armes</label>
            <textarea data-key="${k('armes')}" rows="4">${v('armes')}</textarea>
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Equipement</label>
            <textarea data-key="${k('equipement')}" rows="4">${v('equipement')}</textarea>
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Tresor</label>
            <textarea data-key="${k('tresor')}" rows="4">${v('tresor')}</textarea>
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Armure</label>
            <textarea data-key="${k('armure')}" rows="4">${v('armure')}</textarea>
          </div>
        </div>

        <div class="section-title">Sorts d'elfe &amp; pouvoirs</div>
        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Incantation</label>
            <input type="text" data-key="${k('incantation')}" value="${v('incantation')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Familier</label>
            <input type="text" data-key="${k('familier')}" value="${v('familier')}">
          </div>
          <div class="field" style="flex:1">
            <label class="field-label">Patron</label>
            <input type="text" data-key="${k('patron')}" value="${v('patron')}">
          </div>
        </div>
        <div class="row">
          <div class="field" style="flex:1">
            <label class="field-label">Corruption</label>
            <input type="text" data-key="${k('corruption')}" value="${v('corruption')}">
          </div>
          <div class="field" style="flex:1"></div>
        </div>

        <p style="font-size:0.9em; margin:6px 0 12px 0">
          Traits elfiques: Les elfes vivent longtemps et ont un sens aigu de la magie.
          Ils peuvent detecter les portes et passages secrets et les alignements.
        </p>

        <div class="section-title">Sorts elfiques</div>
        <table style="width:100%; border-collapse:collapse; margin-bottom:12px">
          <thead>
            <tr>
              <th style="border:1px solid #999; padding:4px; text-align:left">Niveau</th>
              <th style="border:1px solid #999; padding:4px; text-align:left">Test</th>
              <th style="border:1px solid #999; padding:4px; text-align:left">Effet</th>
            </tr>
          </thead>
          <tbody>
            ${[1, 2, 3, 4, 5, 6, 7].map(n => `
              <tr>
                <td style="border:1px solid #999; padding:2px">
                  <input type="text" data-key="${k('sort_elfique_niveau_' + n)}" value="${v('sort_elfique_niveau_' + n)}"
                    style="width:100%; border:none; background:transparent">
                </td>
                <td style="border:1px solid #999; padding:2px">
                  <input type="text" data-key="${k('sort_elfique_test_' + n)}" value="${v('sort_elfique_test_' + n)}"
                    style="width:100%; border:none; background:transparent">
                </td>
                <td style="border:1px solid #999; padding:2px">
                  <input type="text" data-key="${k('sort_elfique_effet_' + n)}" value="${v('sort_elfique_effet_' + n)}"
                    style="width:100%; border:none; background:transparent">
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="section-title">Sorts</div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px">
          ${[0, 1, 2].map(col => `
            <div>
              ${[1, 2, 3, 4, 5, 6, 7].map(n => `
                <input type="text" data-key="${k('sort_' + (col * 7 + n))}" value="${v('sort_' + (col * 7 + n))}"
                  style="width:100%; margin-bottom:4px">
              `).join('')}
            </div>
          `).join('')}
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
