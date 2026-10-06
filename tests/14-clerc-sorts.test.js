'use strict';

/* Fiche Clerc : section SORTS.
   - mise en page identique a mage / elfe (table .dtable, 1 ligne par sort,
     pas de ligne de note) ;
   - 2 champs sauvegardables en plus par sort : sort_niveau_N / sort_test_N ;
   - compatibilite : base ancienne ou import JSON sans ces 2 cles -> champs
     vides ; ancienne grille 3x7 toujours lue. */

const { createReporter } = require('./helpers/assert');
const { createEnv, collectSheetData } = require('./helpers/env');

function delay(ms) {
  return new Promise(function (resolve) { setTimeout(resolve, ms); });
}

module.exports = async function suite() {
  const r = createReporter('14-clerc-sorts');

  const env = createEnv();
  env.loadClass('clerc');
  env.window.scheduleSave = function () {};

  let modalCount = 0;
  env.window.showModal = function () {
    modalCount += 1;
    return Promise.resolve(true);
  };

  const mod = env.window.DCCModules.clerc;
  const container = env.document.getElementById('root');

  function render(data) { mod.render(container, '1', data || {}); }
  function table() { return container.querySelector('#clerc-spells-1'); }
  function rows() {
    return Array.prototype.slice.call(table().querySelectorAll('tr[data-spell]'));
  }
  function field(name) { return container.querySelector('[data-key="clerc-1-' + name + '"]'); }

  /* ---------------------------------------------------------------
     1. Meme mise en page que mage / elfe
     --------------------------------------------------------------- */
  render({ sort_1: 'Bénédiction 75', sort_niveau_1: '1', sort_test_1: '+2' });

  const t = table();
  if (r.ok(!!t, 'table #clerc-spells-1 presente')) {
    r.ok(t.classList.contains('dtable'), 'table avec la classe .dtable partagee');

    const heads = Array.prototype.slice.call(t.querySelectorAll('thead th'))
      .map(function (th) { return th.textContent.trim(); });
    r.eq(JSON.stringify(heads), JSON.stringify(['#', 'Nom du sort', 'Niveau', 'Test', '']),
      'memes entetes que mage/elfe');
  }

  r.eq(rows().length, 2, '2 lignes (1 renseignee + 1 vierge poussee en fin)');
  r.eq(table().querySelectorAll('.sort-notes').length, 0, 'aucune ligne de note');
  r.eq(table().querySelectorAll('textarea').length, 0, 'aucun textarea dans le tableau');

  const first = rows()[0];
  r.eq(first.querySelectorAll('td').length, 5, 'ligne = 5 cellules (num, nom, niveau, test, suppression)');
  r.eq(first.querySelector('.row-num').textContent, '1', 'numero de ligne affiche');
  r.ok(!!first.querySelector('td.sort-name input'), 'champ nom dans td.sort-name');
  r.ok(!!first.querySelector('td.sort-name .spell-lookup'), 'loupe de consultation presente');
  r.eq(field('sort_1').value, 'Bénédiction 75', 'nom charge');
  r.eq(field('sort_niveau_1').value, '1', 'niveau charge');
  r.eq(field('sort_test_1').value, '+2', 'test charge');

  /* ---------------------------------------------------------------
     2. Compat : base ancienne / import JSON sans niveau ni test
     --------------------------------------------------------------- */
  render({ sort_1: 'Bénédiction' });
  r.eq(rows().length, 2, 'base ancienne : 2 lignes');
  r.ok(!!field('sort_niveau_1'), 'base ancienne : champ niveau present');
  r.ok(!!field('sort_test_1'), 'base ancienne : champ test present');
  r.eq(field('sort_niveau_1').value, '', 'base ancienne : niveau vide');
  r.eq(field('sort_test_1').value, '', 'base ancienne : test vide');

  /* ---------------------------------------------------------------
     3. Compat : ancienne grille 3x7 (sort_{colonne}_{ligne})
     --------------------------------------------------------------- */
  render({ sort_1_1: 'Bénédiction', sort_2_1: 'Guérison 121' });
  const gridRows = rows();
  r.eq(gridRows.length, 3, 'grille legacy : 2 sorts + 1 vierge');
  if (gridRows.length === 3) {
    r.eq(gridRows[0].querySelector('td.sort-name input').value, 'Bénédiction',
      'grille legacy : sort 1 migre en sort_1');
    r.eq(gridRows[1].querySelector('td.sort-name input').value, 'Guérison 121',
      'grille legacy : sort 2 migre en sort_2');
  }
  r.eq(field('sort_niveau_1').value, '', 'grille legacy : niveau vide');
  r.eq(field('sort_test_2').value, '', 'grille legacy : test vide');

  /* ---------------------------------------------------------------
     4. Les 3 cles partagent le meme index (pas de decalage)
     --------------------------------------------------------------- */
  render({ sort_1: 'Bénédiction', sort_3: 'Sanctuaire' });
  const gapRows = rows();
  r.eq(gapRows.length, 3, 'trou d\'index : 2 sorts + 1 vierge (pas de compactage)');
  if (gapRows.length === 3) {
    r.eq(gapRows[1].getAttribute('data-spell'), '3', 'index 3 conserve pour le 2e sort');
    r.eq(gapRows[1].querySelector('td.sort-name input').value, 'Sanctuaire',
      'nom rattache a l\'index 3');
    r.eq(gapRows[1].querySelector('.row-num').textContent, '2', 'renumerotation affichee');
  }
  r.ok(!!field('sort_niveau_3'), 'niveau rattache a l\'index 3');
  r.eq(field('sort_niveau_3').value, '', 'niveau de l\'index 3 vide');
  r.ok(!field('sort_niveau_2'), 'aucun champ fantome pour l\'index vide');

  /* ---------------------------------------------------------------
     5. Sauvegarde (auto-save) + export/import JSON
     --------------------------------------------------------------- */
  render({ sort_1: 'Bénédiction 75', sort_niveau_1: '1', sort_test_1: '+2' });

  let saved = collectSheetData('clerc', '1', container);
  r.eq(saved.sort_1, 'Bénédiction 75', 'auto-save : nom');
  r.eq(saved.sort_niveau_1, '1', 'auto-save : niveau');
  r.eq(saved.sort_test_1, '+2', 'auto-save : test');

  field('sort_niveau_1').value = '3';
  field('sort_test_1').value = '+4';
  saved = collectSheetData('clerc', '1', container);
  r.eq(saved.sort_niveau_1, '3', 'auto-save : niveau modifie relu');
  r.eq(saved.sort_test_1, '+4', 'auto-save : test modifie relu');

  const modData = mod.collectData(container);
  r.eq(modData.sort_niveau_1, '3', 'collectData du module : niveau');
  r.eq(modData.sort_test_1, '+4', 'collectData du module : test');

  // export -> import : les 2 champs survivent au tour JSON
  render(JSON.parse(JSON.stringify(saved)));
  r.eq(field('sort_niveau_1').value, '3', 'import JSON : niveau restaure');
  r.eq(field('sort_test_1').value, '+4', 'import JSON : test restaure');

  /* ---------------------------------------------------------------
     6. Ajout / suppression de ligne
     --------------------------------------------------------------- */
  render({ sort_1: 'Bénédiction 75', sort_niveau_1: '1', sort_test_1: '+2' });

  container.querySelector('#btn-spell-add-1').click();
  const added = rows();
  r.eq(added.length, 3, '+ Ajouter un sort ajoute une ligne');

  const last = added[added.length - 1];
  const newIdx = last.getAttribute('data-spell');
  const newNiveau = last.querySelector('[data-key="clerc-1-sort_niveau_' + newIdx + '"]');
  const newTest = last.querySelector('[data-key="clerc-1-sort_test_' + newIdx + '"]');
  r.ok(!!newNiveau, 'nouvelle ligne : champ niveau');
  r.ok(!!newTest, 'nouvelle ligne : champ test');
  r.eq(newNiveau ? newNiveau.value : null, '', 'nouvelle ligne : niveau vide');
  r.eq(newTest ? newTest.value : null, '', 'nouvelle ligne : test vide');

  // suppression d'une ligne vide : pas de confirmation
  let modalBefore = modalCount;
  last.querySelector('.btn-spell-del').click();
  await delay(10);
  r.eq(modalCount, modalBefore, 'ligne vide supprimee sans confirmation');
  r.eq(rows().length, 1, 'lignes vierges en fin retirees');

  // suppression d'une ligne renseignee : confirmation, puis retrait
  modalBefore = modalCount;
  rows()[0].querySelector('.btn-spell-del').click();
  await delay(10);
  r.eq(modalCount, modalBefore + 1, 'ligne renseignee : confirmation demandee');
  r.eq(rows().length, 1, 'une ligne vierge reste apres suppression totale');
  r.eq(rows()[0].querySelector('td.sort-name input').value, '',
    'la ligne restante est vierge');

  // la suppression annulee (refus de la modale) ne retire rien
  env.window.showModal = function () {
    modalCount += 1;
    return Promise.resolve(false);
  };
  render({ sort_1: 'Bénédiction 75', sort_niveau_1: '1', sort_test_1: '+2' });
  rows()[0].querySelector('.btn-spell-del').click();
  await delay(10);
  r.eq(rows().length, 2, 'suppression annulee : lignes conservees');
  r.eq(field('sort_niveau_1').value, '1', 'suppression annulee : niveau conserve');

  return r;
};
