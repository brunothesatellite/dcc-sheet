// DCC RPG Personnage de niveau 0 (funnel) - fiche simplifiee
// Spec : BLOC_COMMUN + Notes, SANS le de de vie dans le bouclier PV.
(function () {
  window.DCCModules = window.DCCModules || {};

  function render(container, charId, data) {
    data = data || {};
    const v = (field, def = '') => data[field] ?? def;
    const k = (field) => `lvl0-${charId}-${field}`;
    const bc = window.DCCModules.blocCommun;

    container.innerHTML = bc.render(container, charId, 'lvl0', data) + `
      <div class="sheet-page">
        <div class="section-bar">Notes</div>
        <div>
          <textarea data-key="${k('notes')}" rows="6" placeholder="Notes du personnage...">${v('notes')}</textarea>
        </div>
      </div>
    `;

    /* Le de de vie n'existe pas pour les niveaux 0 : le casque n'affiche
       que les PV courants et le maximum. */
    container.querySelectorAll('.hit-die').forEach((el) => {
      if (el.parentNode) el.parentNode.removeChild(el);
    });
  }

  function collectData(container) {
    const data = {};
    container.querySelectorAll('[data-key]').forEach((el) => {
      const key = el.getAttribute('data-key');
      const parts = key.split('-');
      if (parts[0] === 'lvl0' && parts[1]) {
        const field = parts.slice(2).join('-');
        data[field] = el.value;
      }
    });
    return data;
  }

  window.DCCModules.lvl0 = {
    render: render,
    collectData: collectData,
  };
})();
