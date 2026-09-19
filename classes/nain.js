window.DCCModules = window.DCCModules || {};

window.DCCModules.nain = {
  render(container, charId, data = {}) {
    const v = (field, fallback = '') => data[field] ?? fallback;
    const k = (field) => `nain-${charId}-${field}`;

    container.innerHTML = `
      <!-- PAGE 1 -->
      <div class="sheet-page">
        <h2 class="page-title">Fiche de Nain - Partie 1</h2>

        <div class="row">
          <div class="field" style="flex:2">
            <label class="field-label">Nom</label>
            <input type="text" data-key="${k('nom')}" value="${v('nom')}">
          </div>
          <div class="field">
            <label class="field-label">Titre</label>
            <input type="text" data-key="${k('titre')}" value="${v('titre')}">
          </div>
        </div>

        <div class="row">
          <div class="field" style="flex:2">
            <label class="field-label">Classe</label>
            <input type="text" data-key="${k('classe')}" value="${v('classe')}">
          </div>
          <div class="field">
            <label class="field-label">Alignement</label>
            <input type="text" data-key="${k('alignement')}" value="${v('alignement')}">
          </div>
          <div class="field">
            <label class="field-label">Mouvement</label>
            <input type="text" data-key="${k('mouvement')}" value="${v('mouvement')}">
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label class="field-label">Niveau</label>
            <input type="text" data-key="${k('niveau')}" value="${v('niveau')}">
          </div>
          <div class="field">
            <label class="field-label">PX</label>
            <input type="text" data-key="${k('px')}" value="${v('px')}">
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label class="field-label">Classe d'armure</label>
            <input type="text" data-key="${k('classe_armure')}" value="${v('classe_armure')}">
          </div>
          <div class="field">
            <label class="field-label">Points de vie</label>
            <input type="text" data-key="${k('points_de_vie')}" value="${v('points_de_vie')}">
          </div>
          <div class="field">
            <label class="field-label">Max PV</label>
            <input type="text" data-key="${k('max_pv')}" value="${v('max_pv')}">
          </div>
        </div>

        <h3 class="section-title">Combat</h3>
        <div class="row">
          <div class="field">
            <label class="field-label">Initiative</label>
            <input type="text" data-key="${k('initiative')}" value="${v('initiative')}">
          </div>
          <div class="field">
            <label class="field-label">Des(s) d'action</label>
            <input type="text" data-key="${k('des_action')}" value="${v('des_action')}">
          </div>
          <div class="field">
            <label class="field-label">Attaque / Des critique</label>
            <input type="text" data-key="${k('attaque_des_critique')}" value="${v('attaque_des_critique')}">
          </div>
          <div class="field">
            <label class="field-label">Table critique</label>
            <input type="text" data-key="${k('table_critique')}" value="${v('table_critique')}">
          </div>
        </div>

        <h3 class="section-title">Caracteristiques</h3>

        <div class="stat-row">
          <div class="stat-name">Force</div>
          <div class="stat-value">
            <input type="text" data-key="${k('force')}" value="${v('force')}">
          </div>
          <div class="stat-mod">
            <input type="text" data-key="${k('force_mod')}" value="${v('force_mod')}">
          </div>
          <div class="field">
            <label class="field-label">Attaque CAC</label>
            <input type="text" data-key="${k('force_attaque_cac')}" value="${v('force_attaque_cac')}">
          </div>
          <div class="field">
            <label class="field-label">Degats CAC</label>
            <input type="text" data-key="${k('force_degats_cac')}" value="${v('force_degats_cac')}">
          </div>
        </div>

        <div class="stat-row">
          <div class="stat-name">Agilite</div>
          <div class="stat-value">
            <input type="text" data-key="${k('agilite')}" value="${v('agilite')}">
          </div>
          <div class="stat-mod">
            <input type="text" data-key="${k('agilite_mod')}" value="${v('agilite_mod')}">
          </div>
          <div class="field">
            <label class="field-label">JS Reflexe</label>
            <input type="text" data-key="${k('agilite_js_reflexe')}" value="${v('agilite_js_reflexe')}">
          </div>
          <div class="field">
            <label class="field-label">Att. distance</label>
            <input type="text" data-key="${k('agilite_att_distance')}" value="${v('agilite_att_distance')}">
          </div>
        </div>

        <div class="stat-row">
          <div class="stat-name">Endurance</div>
          <div class="stat-value">
            <input type="text" data-key="${k('endurance')}" value="${v('endurance')}">
          </div>
          <div class="stat-mod">
            <input type="text" data-key="${k('endurance_mod')}" value="${v('endurance_mod')}">
          </div>
          <div class="field">
            <label class="field-label">JS Vigueur</label>
            <input type="text" data-key="${k('endurance_js_vigueur')}" value="${v('endurance_js_vigueur')}">
          </div>
        </div>

        <div class="stat-row">
          <div class="stat-name">Presence</div>
          <div class="stat-value">
            <input type="text" data-key="${k('presence')}" value="${v('presence')}">
          </div>
          <div class="stat-mod">
            <input type="text" data-key="${k('presence_mod')}" value="${v('presence_mod')}">
          </div>
          <div class="field">
            <label class="field-label">JS Volonte</label>
            <input type="text" data-key="${k('presence_js_volonte')}" value="${v('presence_js_volonte')}">
          </div>
        </div>

        <div class="stat-row">
          <div class="stat-name">Chance</div>
          <div class="stat-value">
            <input type="text" data-key="${k('chance')}" value="${v('chance')}">
          </div>
          <div class="stat-mod">
            <input type="text" data-key="${k('chance_mod')}" value="${v('chance_mod')}">
          </div>
          <div class="field">
            <label class="field-label">Jet chanceux</label>
            <input type="text" data-key="${k('chance_jet_chanceux')}" value="${v('chance_jet_chanceux')}">
          </div>
        </div>

        <div class="stat-row">
          <div class="stat-name">Intelligence</div>
          <div class="stat-value">
            <input type="text" data-key="${k('intelligence')}" value="${v('intelligence')}">
          </div>
          <div class="stat-mod">
            <input type="text" data-key="${k('intelligence_mod')}" value="${v('intelligence_mod')}">
          </div>
          <div class="field">
            <label class="field-label">Langues</label>
            <input type="text" data-key="${k('intelligence_langues')}" value="${v('intelligence_langues')}">
          </div>
        </div>
      </div>

      <!-- PAGE 2 -->
      <div class="sheet-page">
        <h2 class="page-title">Fiche de Nain - Partie 2</h2>

        <div class="row">
          <div class="field">
            <label class="field-label">Armes</label>
            <textarea data-key="${k('armes')}">${v('armes')}</textarea>
          </div>
          <div class="field">
            <label class="field-label">Equipement</label>
            <textarea data-key="${k('equipement')}">${v('equipement')}</textarea>
          </div>
        </div>

        <div class="row">
          <div class="field">
            <label class="field-label">Tresor</label>
            <textarea data-key="${k('tresor')}">${v('tresor')}</textarea>
          </div>
          <div class="field">
            <label class="field-label">Armure</label>
            <textarea data-key="${k('armure')}">${v('armure')}</textarea>
          </div>
        </div>

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
