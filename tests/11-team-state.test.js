'use strict';

/* État combat de l'équipe (onglet Équipe) :
   - team-state.js : logique pure (sanitize, normalize, export par index,
     remap d'import, filtre des lignes d'ennemis vides) ;
   - onglet Équipe : pré-remplissage depuis la base, sauvegarde debouncée
     600 ms, RAZ propagée, ids inconnus ignorés ;
   - sans team-state.js : rendu intact, aucune sauvegarde (module optionnel). */

const { createReporter } = require('./helpers/assert');
const { createEnv, delay } = require('./helpers/env');

function fire(el, type) {
  el.dispatchEvent(new el.ownerDocument.defaultView.Event(type, { bubbles: true, cancelable: true }));
}

function click(el) {
  el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
}

function j(v) {
  return JSON.stringify(v);
}

const SAVE_DELAY = 750; /* debounce 600 ms + marge */

/* ------------------------------------------------------------------ *
 * 1. Logique pure de team-state.js
 * ------------------------------------------------------------------ */
function testPureLogic(r) {
  const env = createEnv();
  env.load('team-state.js');
  const S = env.window.DCCTeamState;

  r.ok(!!S, 'window.DCCTeamState exposé');
  if (!S) return;

  /* --- sanitize : seules les valeurs exploitables --- */
  const dirty = {
    init_combat: { '1': ' 12 ', '2': '', 'x': '5', '3': null, '0': '9' },
    tours: { '1': 0, '2': 3, '3': 'abc', bad: 2 },
    ennemis: [
      { nom: ' Gobelin ', ac: '14', att: '+2', pv: '5', init: '9', tour: 1 },
      { nom: '', ac: '', att: '', pv: '', init: '', tour: 0 },
      'pas-un-objet',
    ],
    junk: true,
  };
  const clean = S.sanitize(dirty);
  /* Les clés non numériques sont purgées ; la clé « 0 » survit (index 0 de
     l'export) — normalize() la retire ensuite faute de perso id 0. */
  r.eq(j(clean.init_combat), j({ '0': '9', '1': '12' }),
    'sanitize : init trimmé, chaînes invalides ignorées');
  r.eq(j(clean.tours), j({ '2': 3 }),
    'sanitize : tour 0 et valeurs non entières ignorés');
  r.eq(clean.ennemis.length, 1, 'sanitize : ligne d\'ennemi entièrement vide filtrée');
  r.eq(clean.ennemis[0].nom, 'Gobelin', 'sanitize : nom d\'ennemi trimmé');
  r.eq(clean.ennemis[0].tour, 1, 'sanitize : tour d\'ennemi conservé');

  r.eq(j(S.sanitize(null)), j({ init_combat: {}, tours: {}, ennemis: [] }),
    'sanitize(null) : état vide (pas de plantage)');
  r.eq(j(S.sanitize('bob')), j({ init_combat: {}, tours: {}, ennemis: [] }),
    'sanitize("bob") : état vide (pas de plantage)');
  r.eq(j(S.sanitize(dirty)), j(clean), 'sanitize : idempotent');

  /* --- isEmpty --- */
  r.eq(S.isEmpty(clean), false, 'isEmpty : état renseigné -> false');
  r.eq(S.isEmpty(S.sanitize(null)), true, 'isEmpty : état vide -> true');

  /* --- normalize : purge des ids absents (perso supprimé / auberge) --- */
  const norm = S.normalize({
    init_combat: { '1': '12', '99': '5' },
    tours: { '99': 3, '2': 2 },
    ennemis: dirty.ennemis,
  }, [{ id: 1 }, { id: 2 }]);
  r.eq(j(norm.init_combat), j({ '1': '12' }), 'normalize : id inconnu purgé (init)');
  r.eq(j(norm.tours), j({ '2': 2 }), 'normalize : id inconnu purgé (tours)');
  r.eq(norm.ennemis.length, 1, 'normalize : ennemis indépendants des ids');

  /* --- buildExport : clés = index dans characters[] (ids non stables) --- */
  const entries = [{ id: 46, is_active: 1 }, { id: 47, is_active: 0 }, { id: 48, is_active: 1 }];
  const exported = S.buildExport({
    init_combat: { '46': '14', '48': '9', '99': '1' },
    tours: { '46': 2, '99': 4 },
    ennemis: dirty.ennemis,
  }, entries);
  r.eq(j(exported.init_combat), j({ '0': '14', '2': '9' }), 'buildExport : ids -> index (init)');
  r.eq(j(exported.tours), j({ '0': 2 }), 'buildExport : ids -> index (tours), id hors entrées purgé');
  r.eq(exported.ennemis.length, 1, 'buildExport : ennemis copiés tels quels');
  r.eq(S.buildExport({ init_combat: {}, tours: {}, ennemis: [] }, entries), null,
    'buildExport : rien à exporter -> null');
  r.eq(S.buildExport(null, entries), null, 'buildExport : état null -> null');

  /* --- remapImport : index du fichier -> nouveaux ids --- */
  const imported = S.remapImport(
    { init_combat: { '0': '14', '2': '9' }, tours: { '0': 2 }, ennemis: dirty.ennemis },
    [60, 61, 62]
  );
  r.ok(!!imported, 'remapImport : état valide restauré');
  if (imported) {
    r.eq(j(imported.init_combat), j({ '60': '14', '62': '9' }), 'remapImport : init remappé sur les nouveaux ids');
    r.eq(j(imported.tours), j({ '60': 2 }), 'remapImport : tours remappés sur les nouveaux ids');
    r.eq(imported.ennemis.length, 1, 'remapImport : ennemis repris');
  }

  r.eq(S.remapImport({ init_combat: { '7': '12' } }, [60, 61, 62]), null,
    'remapImport : index hors fichier -> null (import = remise à zéro)');
  r.eq(j(S.remapImport({ init_combat: { 'x': '12' } }, [60])),
    j({ init_combat: {}, tours: {}, ennemis: [] }),
    'remapImport : clé non numérique purgée -> état vide (remise à zéro)');
  r.eq(S.remapImport('bob', [60]), null, 'remapImport : charge invalide -> null');
  r.eq(j(S.remapImport({}, [60, 61])), j({ init_combat: {}, tours: {}, ennemis: [] }),
    'remapImport : objet vide -> état vide (remise à zéro)');
}

/* ------------------------------------------------------------------ *
 * 2. Onglet Équipe : pré-remplissage + sauvegarde
 * ------------------------------------------------------------------ */
function charRow(container, id) {
  return container.querySelector('tr[data-char-id="' + id + '"]');
}

function enemyRows(container) {
  return container.querySelectorAll('table.team-table-enemies tbody tr');
}

function initInput(container, id) {
  const tr = charRow(container, id);
  return tr ? tr.querySelector('.init-combat-input') : null;
}

function turnCounter(container, id) {
  const tr = charRow(container, id);
  return tr ? tr.querySelector('.turn-counter') : null;
}

function testEquipe(r) {
  const env = createEnv();
  env.window.showModal = function () { return Promise.resolve(true); };
  env.load('team-state.js');
  env.load('marching-order.js');
  env.loadEquipe();

  const mod = env.window.DCCModules.equipe;
  if (!mod || typeof mod.render !== 'function') {
    r.fail('module equipe non chargé');
    return;
  }

  const chars = [
    { id: 1, name: 'Travok', class: 'clerc', data: JSON.stringify({ points_de_vie: '4' }) },
    { id: 2, name: 'Sergiu', class: 'mage', data: JSON.stringify({ points_de_vie: '7' }) },
  ];

  const initialState = {
    init_combat: { '1': '12', '99': '5' },   /* id 99 : perso supprimé */
    tours: { '2': 3 },
    ennemis: [
      { nom: 'Gobelin', ac: '14', att: '+2', pv: '5', init: '9', tour: 1 },
      { nom: '', ac: '', att: '', pv: '', init: '', tour: 0 },  /* vide : non persisté */
    ],
  };

  const container = env.document.getElementById('root');
  const saves = [];
  mod.render(container, chars, function () {}, '', function () {},
    { 1: 0, 2: 1 }, function () {}, initialState, function (state) {
      saves.push(state);
    });

  /* --- Pré-remplissage depuis la base --- */
  r.eq(initInput(container, 1).value, '12', 'init. combat pré-rempli depuis la base');
  r.eq(initInput(container, 2).value, '', 'init. combat vide quand rien en base');
  r.eq(turnCounter(container, 2).textContent, '3', 'tour restauré depuis la base');
  r.eq(turnCounter(container, 2).style.getPropertyValue('--fill'), '60%',
    'remplissage du compteur cohérent avec le tour restauré');
  r.eq(turnCounter(container, 1).textContent, '0', 'tour par défaut à 0');

  /* Ids inconnus ignorés : aucune ligne 99 */
  r.eq(container.querySelectorAll('tr[data-char-id="99"]').length, 0,
    'id inconnu ignoré à l\'affichage');

  /* --- Ennemis : lignes renseignées + plancher de 3 lignes --- */
  r.eq(enemyRows(container).length, 3,
    '3 lignes d\'ennemis affichées (1 renseignée + plancher de 3)');
  r.eq(enemyRows(container)[0].children[0].querySelector('input').value, 'Gobelin',
    'ennemi restauré : nom');
  r.eq(enemyRows(container)[0].children[1].querySelector('input').value, '14',
    'ennemi restauré : AC');
  r.eq(enemyRows(container)[0].children[4].querySelector('input').value, '9',
    'ennemi restauré : Init.');
  r.eq(enemyRows(container)[0].children[5].querySelector('.turn-counter').textContent, '1',
    'ennemi restauré : tour');
  r.eq(enemyRows(container)[1].children[0].querySelector('input').value, '',
    'ligne vide affichée mais non persistée');

  /* --- Aucune écriture au simple affichage --- */
  r.eq(saves.length, 0, 'aucune sauvegarde au rendu');

  /* --- Saisie init. combat -> sauvegarde debouncée --- */
  const input2 = initInput(container, 2);
  input2.value = '9';
  fire(input2, 'input');
  r.eq(saves.length, 0, 'pas d\'écriture immédiate (debounce 600 ms)');
  return (async function () {
    await delay(SAVE_DELAY);
    r.eq(saves.length, 1, 'une seule écriture après le debounce');
    r.eq(j(saves[0].init_combat), j({ '1': '12', '2': '9' }),
      'init. combat de tout le groupe relu dans le DOM');
    r.eq(j(saves[0].tours), j({ '2': 3 }), 'tours relus dans le DOM');
    r.eq(saves[0].ennemis.length, 1, 'lignes d\'ennemis entièrement vides filtrées à l\'écriture');

    /* --- Clic sur compteur de tour --- */
    click(turnCounter(container, 1));
    await delay(SAVE_DELAY);
    r.eq(saves.length, 2, 'clic sur tour -> écriture');
    r.eq(j(saves[1].tours), j({ '1': 1, '2': 3 }), 'tour incrémenté en base');

    /* --- Ajout d'un ennemi renseigné --- */
    const btnAdd = container.querySelector('.btn-group .btn-add');
    r.ok(!!btnAdd, 'bouton « + Ajouter » présent');
    click(btnAdd);
    const rows = enemyRows(container);
    r.eq(rows.length, 4, 'ligne ajoutée');
    const nomInput = rows[3].children[0].querySelector('input');
    nomInput.value = 'Orc';
    fire(nomInput, 'input');
    await delay(SAVE_DELAY);
    r.eq(saves.length, 3, 'ennemi saisi -> écriture');
    r.eq(saves[2].ennemis.length, 2, 'les 2 ennemis renseignés persistés (lignes vides ignorées)');
    r.eq(saves[2].ennemis[1].nom, 'Orc', 'nouvel ennemi en base');

    /* --- Suppression de la ligne --- */
    const btnRemove = container.querySelector('.btn-group .btn-remove');
    click(btnRemove);
    await delay(SAVE_DELAY);
    r.eq(saves.length, 4, 'suppression de ligne -> écriture');
    r.eq(saves[3].ennemis.length, 1, 'ennemi supprimé de la base');

    /* --- RAZ ennemis -> plus aucun ennemi en base --- */
    const btnRazEnemies = container.querySelector('.btn-group .btn-raz');
    click(btnRazEnemies);
    await delay(SAVE_DELAY);
    r.eq(saves.length, 5, 'RAZ ennemis -> écriture');
    r.eq(saves[4].ennemis.length, 0, 'tableau vidé -> aucun ennemi persisté');
    r.eq(enemyRows(container).length, 3, 'RAZ : retour à 3 lignes vides');

    /* --- RAZ Init. combat + tours --- */
    const btnRazInit = container.querySelector('tfoot .btn-raz');
    r.ok(!!btnRazInit, 'bouton RAZ (init. combat + tours) présent');
    click(btnRazInit);
    await delay(SAVE_DELAY);
    r.eq(saves.length, 6, 'RAZ init./tours -> écriture');
    r.eq(j(saves[5].init_combat), j({}), 'RAZ : plus aucune init. combat en base');
    r.eq(j(saves[5].tours), j({}), 'RAZ : plus aucun tour en base');
    r.eq(turnCounter(container, 2).textContent, '0', 'RAZ : compteur remis à 0');

    /* --- resync : l'état affiché est préservé --- */
    click(turnCounter(container, 1));      /* tour relancé après la RAZ */
    input2.value = '7';
    fire(input2, 'input');
    const fresh = JSON.parse(JSON.stringify(chars));
    r.eq(mod.resync(fresh), true, 'resync sans changement de composition');
    r.eq(initInput(container, 2).value, '7', 'resync : init. combat en cours conservée');
    r.eq(turnCounter(container, 1).textContent, '1', 'resync : tour conservé');
    await delay(SAVE_DELAY);
    r.eq(saves[saves.length - 1].init_combat['2'], '7',
      'resync : saisie courante ré-écrite en base');
    r.eq(saves[saves.length - 1].tours['1'], 1,
      'resync : tour relancé ré-écrit en base');

    /* --- Pas d'action → pas d'écriture parasite --- */
    const afterResync = saves.length;
    await delay(SAVE_DELAY);
    r.eq(saves.length, afterResync, 'sans nouvelle action : aucune écriture supplémentaire');
    r.ok(afterResync >= 7, 'au moins 7 écritures cumulées (got ' + afterResync + ')');
  })();
}

/* ------------------------------------------------------------------ *
 * 3. Sans team-state.js : module optionnel (comme dead-overlay.js)
 * ------------------------------------------------------------------ */
function testWithoutHelper(r) {
  const env = createEnv();
  env.load('marching-order.js');
  env.loadEquipe();

  const mod = env.window.DCCModules.equipe;
  const container = env.document.getElementById('root');
  const chars = [{ id: 1, name: 'Travok', class: 'clerc', data: '{}' }];
  const saves = [];

  let okRender = true;
  try {
    mod.render(container, chars, function () {}, '', function () {},
      { 1: 0 }, function () {},
      { init_combat: { '1': '12' }, tours: { '1': 2 }, ennemis: [] },
      function (state) { saves.push(state); });
  } catch (e) {
    okRender = false;
  }
  r.ok(okRender, 'rendu sans team-state.js ne plante pas');
  r.eq(container.querySelectorAll('table.team-table-enemies tbody tr').length, 3,
    'sans helper : 3 lignes d\'ennemis par défaut');
  r.eq(initInput(container, 1).value, '', 'sans helper : aucun pré-remplissage');

  return (async function () {
    click(turnCounter(container, 1));
    await delay(SAVE_DELAY);
    r.eq(saves.length, 0, 'sans helper : aucune sauvegarde (comportement historique)');
  })();
}

async function run() {
  const r = createReporter('11-team-state');
  testPureLogic(r);
  await testEquipe(r);
  await testWithoutHelper(r);
  await delay(50);
  return r;
}

module.exports = run;
