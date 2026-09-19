function createMageSheet() {
  function render(container, charId, data) {
    data = data || {};

    container.innerHTML = `
      <div class="sheet-page">
        <div class="page-title">Mage</div>
        <div class="row">
          <div class="field"><span class="field-label">Nom</span><input type="text" data-key="mage-${charId}-nom" value="${data.nom || ''}"></div>
          <div class="field"><span class="field-label">Titre</span><input type="text" data-key="mage-${charId}-titre" value="${data.titre || ''}"></div>
        </div>
        <div class="row">
          <div class="field" style="flex:2"><span class="field-label">Metier</span><input type="text" data-key="mage-${charId}-metier" value="${data.metier || ''}"></div>
          <div class="field"><span class="field-label">Alignement</span><input type="text" data-key="mage-${charId}-alignement" value="${data.alignement || ''}"></div>
          <div class="field"><span class="field-label">Mouvement</span><input type="text" data-key="mage-${charId}-mouvement" value="${data.mouvement || ''}"></div>
        </div>
        <div class="row">
          <div class="field"><span class="field-label">Niveau</span><input type="text" data-key="mage-${charId}-niveau" value="${data.niveau || ''}"></div>
          <div class="field"><span class="field-label">PX</span><input type="text" data-key="mage-${charId}-px" value="${data.px || ''}"></div>
        </div>
        <div class="row">
          <div class="field"><span class="field-label">Classe d armure</span><input type="text" data-key="mage-${charId}-ca" value="${data.ca || ''}"></div>
          <div class="field"><span class="field-label">Points de vie</span><input type="text" data-key="mage-${charId}-pv" value="${data.pv || ''}"></div>
          <div class="field"><span class="field-label">Max PV</span><input type="text" data-key="mage-${charId}-pvMax" value="${data.pvMax || ''}"></div>
        </div>

        <div class="section-title">Combat</div>
        <div class="row">
          <div class="field"><span class="field-label">Initiative</span><input type="text" data-key="mage-${charId}-initiative" value="${data.initiative || ''}"></div>
          <div class="field"><span class="field-label">Des(s) d action</span><input type="text" data-key="mage-${charId}-desAction" value="${data.desAction || ''}"></div>
          <div class="field"><span class="field-label">Attaque / Des critique</span><input type="text" data-key="mage-${charId}-attaqueCrit" value="${data.attaqueCrit || ''}"></div>
          <div class="field"><span class="field-label">Table critique</span><input type="text" data-key="mage-${charId}-tableCrit" value="${data.tableCrit || ''}"></div>
        </div>

        <div class="section-title">Caracteristiques</div>
        <div class="stat-row">
          <div class="stat-name">Force</div>
          <div class="stat-value"><input type="text" data-key="mage-${charId}-force" value="${data.force || ''}"></div>
          <div class="stat-mod"><input type="text" data-key="mage-${charId}-forceMod" value="${data.forceMod || ''}"></div>
          <div class="stat-name">Agilite</div>
          <div class="stat-value"><input type="text" data-key="mage-${charId}-agilite" value="${data.agilite || ''}"></div>
          <div class="stat-mod"><input type="text" data-key="mage-${charId}-agiliteMod" value="${data.agiliteMod || ''}"></div>
          <div class="stat-name">Endurance</div>
          <div class="stat-value"><input type="text" data-key="mage-${charId}-endurance" value="${data.endurance || ''}"></div>
          <div class="stat-mod"><input type="text" data-key="mage-${charId}-enduranceMod" value="${data.enduranceMod || ''}"></div>
        </div>
        <div class="stat-row">
          <div class="stat-name">Presence</div>
          <div class="stat-value"><input type="text" data-key="mage-${charId}-presence" value="${data.presence || ''}"></div>
          <div class="stat-mod"><input type="text" data-key="mage-${charId}-presenceMod" value="${data.presenceMod || ''}"></div>
          <div class="stat-name">Chance</div>
          <div class="stat-value"><input type="text" data-key="mage-${charId}-chance" value="${data.chance || ''}"></div>
          <div class="stat-mod"><input type="text" data-key="mage-${charId}-chanceMod" value="${data.chanceMod || ''}"></div>
          <div class="stat-name">Intelligence</div>
          <div class="stat-value"><input type="text" data-key="mage-${charId}-intelligence" value="${data.intelligence || ''}"></div>
          <div class="stat-mod"><input type="text" data-key="mage-${charId}-intelligenceMod" value="${data.intelligenceMod || ''}"></div>
        </div>
      </div>

      <div class="sheet-page">
        <div class="row">
          <div class="field"><span class="field-label">Armes</span><textarea data-key="mage-${charId}-armes" rows="3">${data.armes || ''}</textarea></div>
          <div class="field"><span class="field-label">Equipement</span><textarea data-key="mage-${charId}-equipement" rows="3">${data.equipement || ''}</textarea></div>
        </div>
        <div class="row">
          <div class="field"><span class="field-label">Tresor</span><textarea data-key="mage-${charId}-tresor" rows="3">${data.tresor || ''}</textarea></div>
          <div class="field"><span class="field-label">Armure</span><textarea data-key="mage-${charId}-armure" rows="3">${data.armure || ''}</textarea></div>
        </div>

        <div class="section-title">Sorts de mage & pouvoirs</div>
        <div class="row">
          <div class="field"><span class="field-label">Incantation</span><input type="text" data-key="mage-${charId}-incantation" value="${data.incantation || ''}"></div>
          <div class="field"><span class="field-label">Familier</span><input type="text" data-key="mage-${charId}-familier" value="${data.familier || ''}"></div>
        </div>
        <div class="row">
          <div class="field"><span class="field-label">Patron</span><input type="text" data-key="mage-${charId}-patron" value="${data.patron || ''}"></div>
          <div class="field"><span class="field-label">Corruption</span><input type="text" data-key="mage-${charId}-corruption" value="${data.corruption || ''}"></div>
        </div>
        <div class="row">
          <div class="field" style="text-align:center"><span class="field-label">Risque de defaire</span><input type="text" data-key="mage-${charId}-risqueDefaire" value="${data.risqueDefaire || '0'}" style="font-weight:bold; text-align:center;"></div>
          <div class="field"><span class="field-label">Magie mercurielle mod.</span><input type="text" data-key="mage-${charId}-magieMercurielle" value="${data.magieMercurielle || ''}"></div>
        </div>

        <div class="section-title">Grimoire</div>
        <div class="row">
          <div class="field"><textarea data-key="mage-${charId}-grimoire" rows="8" style="width:100%">${data.grimoire || ''}</textarea></div>
        </div>

        <div class="section-title">Formules magiques</div>
        <div class="row">
          <table style="width:100%; border-collapse:collapse;">
            <thead>
              <tr>
                <th style="border:1px solid #888; padding:4px; text-align:left;">Niveau</th>
                <th style="border:1px solid #888; padding:4px; text-align:left;">Test</th>
                <th style="border:1px solid #888; padding:4px; text-align:left;">Effet</th>
              </tr>
            </thead>
            <tbody>
              ${[1,2,3,4,5,6,7].map(i => `
              <tr>
                <td style="border:1px solid #888; padding:4px;"><input type="text" data-key="mage-${charId}-formuleNiveau${i}" value="${data['formuleNiveau'+i] || ''}" style="width:100%;border:none;background:transparent;"></td>
                <td style="border:1px solid #888; padding:4px;"><input type="text" data-key="mage-${charId}-formuleTest${i}" value="${data['formuleTest'+i] || ''}" style="width:100%;border:none;background:transparent;"></td>
                <td style="border:1px solid #888; padding:4px;"><input type="text" data-key="mage-${charId}-formuleEffet${i}" value="${data['formuleEffet'+i] || ''}" style="width:100%;border:none;background:transparent;"></td>
              </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <div class="section-title">Sorts</div>
        <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
          ${['A','B','C'].map(col => `
          <div style="display:flex; flex-direction:column; gap:4px;">
            <div style="font-weight:bold; text-align:center;">Colonne ${col}</div>
            ${[1,2,3,4,5,6,7].map(i => `
            <div class="field"><span class="field-label">Sort ${i}</span><input type="text" data-key="mage-${charId}-sort${col}${i}" value="${data['sort'+col+i] || ''}"></div>
            `).join('')}
          </div>
          `).join('')}
        </div>
      </div>
    `;

    return container;
  }

  function collectData(container) {
    const data = {};
    container.querySelectorAll('[data-key]').forEach(el => {
      const key = el.getAttribute('data-key');
      data[key] = el.value;
    });
    return data;
  }

  return { render, collectData };
}

window.DCCModules = window.DCCModules || {};
window.DCCModules.mage = createMageSheet();
