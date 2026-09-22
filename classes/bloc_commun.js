if (!window.DCCModules) window.DCCModules = {};

window.DCCModules.blocCommun = {
  render(container, charId, cls, data) {
    const v = (field, def = '') => data[field] ?? def;
    const k = (field) => `${cls}-${charId}-${field}`;

    return `
      <div class="sheet-page">

        <!-- Identite -->
        <div class="row" style="margin-bottom:4px;">
          <div class="field"><div class="field-label">Nom</div><input type="text" data-key="${k('nom')}" value="${v('nom')}" placeholder="Nom du personnage"></div>
          <div class="field"><div class="field-label">Titre</div><input type="text" data-key="${k('titre')}" value="${v('titre')}" placeholder="Titre"></div>
        </div>
        <div class="row" style="margin-bottom:4px;">
          <div class="field" style="flex:2"><div class="field-label">Metier</div><input type="text" data-key="${k('metier')}" value="${v('metier')}" placeholder="Metier"></div>
          <div class="field"><div class="field-label">Alignement</div><input type="text" data-key="${k('alignement')}" value="${v('alignement')}" placeholder="Alignement"></div>
          <div class="field"><div class="field-label">Mouvement</div><input type="text" data-key="${k('mouvement')}" value="${v('mouvement')}" placeholder="30"></div>
        </div>
        <div class="row" style="margin-bottom:8px;">
          <div class="field"><div class="field-label">Niveau</div><input type="text" data-key="${k('niveau')}" value="${v('niveau')}" placeholder="1"></div>
          <div class="field"><div class="field-label">PX</div><input type="text" data-key="${k('px')}" value="${v('px')}" placeholder="0"></div>
        </div>

        <!-- Defense + Combat -->
        <div class="row">
          <div style="flex:1;">
            <div class="defense-area">
              <div class="shield">
                <div class="shield-shape"><input type="text" data-key="${k('classe_armure')}" value="${v('classe_armure')}" placeholder="10"></div>
                <div class="shield-label">Classe d'armure</div>
              </div>
              <div class="helmet">
                <div class="helmet-shape">
                  <input type="text" data-key="${k('points_de_vie')}" value="${v('points_de_vie')}" placeholder="0">
                  <div class="helmet-max">Max: <input type="text" data-key="${k('max_pv')}" value="${v('max_pv')}" placeholder="0"></div>
                  <div class="hit-die">${({'guerrier':'d12','nain':'d10','clerc':'d8','elfe':'d6','voleur':'d6','halfelin':'d6','mage':'d4'})[cls] || 'd8'}</div>
                </div>
                <div class="helmet-label">Points de vie</div>
              </div>
            </div>
          </div>
          <div style="flex:1;">
            <div class="combat-box">
              <div class="section-bar">Combat</div>
              <div class="combat-field"><label>Initiative:</label><input type="text" data-key="${k('initiative')}" value="${v('initiative')}" placeholder="0"></div>
              <div class="combat-field"><label>Des(s) d'action:</label><input type="text" data-key="${k('des_action')}" value="${v('des_action')}" placeholder="1d20"></div>
              <div class="combat-field"><label>Attaque:</label><input type="text" data-key="${k('attaque')}" value="${v('attaque')}" placeholder="+0"></div>
              <div class="combat-field"><label>Des critique:</label><input type="text" data-key="${k('des_critique')}" value="${v('des_critique')}" placeholder="d20"></div>
              <div class="combat-field"><label>Table critique:</label><input type="text" data-key="${k('table_critique')}" value="${v('table_critique')}"></div>
            </div>
          </div>
        </div>

        <!-- Separateur -->
        <div style="border-top: 2px solid var(--ink); margin: 8px 0;"></div>

        <!-- 2 colonnes : Stats a gauche, Combat etendu a droite -->
        <div class="stats-and-combat">
          <div class="stats-col">
            <div class="stat-block">
              <div class="stat-block-top">
                <div class="stat-name">Force</div>
                <div class="stat-value"><input type="text" data-key="${k('force')}" value="${v('force')}" placeholder="0"></div>
              </div>
              <div class="stat-block-bottom">
                <div class="stat-mod">Modif.: <input type="text" data-key="${k('force_mod')}" value="${v('force_mod')}" placeholder="0"></div>
              </div>
            </div>
            <div class="stat-block">
              <div class="stat-block-top">
                <div class="stat-name">Agilite</div>
                <div class="stat-value"><input type="text" data-key="${k('agilite')}" value="${v('agilite')}" placeholder="0"></div>
                <div class="stat-circle">
                  <input type="text" data-key="${k('js_reflexe')}" value="${v('js_reflexe')}" placeholder="0">
                  <div class="stat-circle-label">JS Ref</div>
                </div>
              </div>
              <div class="stat-block-bottom">
                <div class="stat-mod">Modif.: <input type="text" data-key="${k('agilite_mod')}" value="${v('agilite_mod')}" placeholder="0"></div>
              </div>
            </div>
            <div class="stat-block">
              <div class="stat-block-top">
                <div class="stat-name">Endurance</div>
                <div class="stat-value"><input type="text" data-key="${k('endurance')}" value="${v('endurance')}" placeholder="0"></div>
                <div class="stat-circle">
                  <input type="text" data-key="${k('js_vigueur')}" value="${v('js_vigueur')}" placeholder="0">
                  <div class="stat-circle-label">JS Vig</div>
                </div>
              </div>
              <div class="stat-block-bottom">
                <div class="stat-mod">Modif.: <input type="text" data-key="${k('endurance_mod')}" value="${v('endurance_mod')}" placeholder="0"></div>
              </div>
            </div>
            <div class="stat-block">
              <div class="stat-block-top">
                <div class="stat-name">Presence</div>
                <div class="stat-value"><input type="text" data-key="${k('presence')}" value="${v('presence')}" placeholder="0"></div>
                <div class="stat-circle">
                  <input type="text" data-key="${k('js_volonte')}" value="${v('js_volonte')}" placeholder="0">
                  <div class="stat-circle-label">JS Vol</div>
                </div>
              </div>
              <div class="stat-block-bottom">
                <div class="stat-mod">Modif.: <input type="text" data-key="${k('presence_mod')}" value="${v('presence_mod')}" placeholder="0"></div>
              </div>
            </div>
            <div class="stat-block">
              <div class="stat-block-top">
                <div class="stat-name">Chance</div>
                <div class="stat-value"><input type="text" data-key="${k('chance')}" value="${v('chance')}" placeholder="0"></div>
                <div class="stat-extra">
                  <div class="field">
                    <div class="field-label">Jet chanceux</div>
                    <textarea data-key="${k('jet_chanceux')}" rows="1">${v('jet_chanceux')}</textarea>
                  </div>
                </div>
              </div>
              <div class="stat-block-bottom">
                <div class="stat-mod">Modif.: <input type="text" data-key="${k('chance_mod')}" value="${v('chance_mod')}" placeholder="0"></div>
              </div>
            </div>
            <div class="stat-block">
              <div class="stat-block-top">
                <div class="stat-name">Intelligence</div>
                <div class="stat-value"><input type="text" data-key="${k('intelligence')}" value="${v('intelligence')}" placeholder="0"></div>
                <div class="stat-extra">
                  <div class="field">
                    <div class="field-label">Langues</div>
                    <textarea data-key="${k('langues')}" rows="1">${v('langues')}</textarea>
                  </div>
                </div>
              </div>
              <div class="stat-block-bottom">
                <div class="stat-mod">Modif.: <input type="text" data-key="${k('intelligence_mod')}" value="${v('intelligence_mod')}" placeholder="0"></div>
              </div>
            </div>
          </div>
          <div class="combat-ext-col">
            <div class="combat-ext">
              <div class="combat-ext-field"><label>Attaque CAC</label><input type="text" data-key="${k('attaque_cac')}" value="${v('attaque_cac')}" placeholder="+0"></div>
              <div class="combat-ext-field"><label>Degats CAC</label><input type="text" data-key="${k('degats_cac')}" value="${v('degats_cac')}" placeholder="1d6"></div>
              <div class="combat-ext-field"><label>Att. a distance</label><input type="text" data-key="${k('att_distance')}" value="${v('att_distance')}" placeholder="+0"></div>
              <div class="combat-ext-field"><label>Degats distance</label><input type="text" data-key="${k('degats_distance')}" value="${v('degats_distance')}" placeholder="1d6"></div>
            </div>
            <div class="portrait-area">
              <input type="hidden" data-key="${k('portrait_source')}" value="${v('portrait_source', 'dcc')}">
              <input type="hidden" data-key="${k('portrait_index')}" value="${v('portrait_index', '0')}">
              <img class="portrait-img" data-portrait-img alt="Portrait">
              <div class="portrait-switch">
                <label class="switch">
                  <input type="checkbox" data-portrait-toggle>
                  <span class="switch-slider"></span>
                </label>
                <span class="portrait-source-label">DCC</span>
              </div>
            </div>
          </div>
        </div>

      </div>

      <!-- PAGE 2 : Equipement -->
      <div class="sheet-page">

        <div class="row" style="align-items: stretch;">
          <div class="field">
            <div class="section-bar">Armes</div>
            <textarea data-key="${k('armes')}" rows="5" placeholder="Liste des armes...">${v('armes')}</textarea>
          </div>
          <div class="field">
            <div class="section-bar">Equipement</div>
            <textarea data-key="${k('equipement')}" rows="5" placeholder="Liste de l'equipement...">${v('equipement')}</textarea>
          </div>
        </div>

        <div class="row" style="align-items: stretch;">
          <div class="field">
            <div class="section-bar">Tresor</div>
            <textarea data-key="${k('tresor')}" rows="4" placeholder="Tresor...">${v('tresor')}</textarea>
          </div>
          <div class="field">
            <div class="section-bar">Armure</div>
            <textarea data-key="${k('armure')}" rows="4" placeholder="Description de l'armure...">${v('armure')}</textarea>
          </div>
        </div>

      </div>
      `;
  }
};
