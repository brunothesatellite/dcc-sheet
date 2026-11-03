'use strict';

/* Évolution #1 — bouton INIT (onglet Équipe, « Personnages en expédition ») :
   - logique pure : parseInitiative / rollInitiative (rng injectable) —
     +x, -x, 1d20+x, 1dY+x, dé absent -> d20, illisible -> d20 + 0 ;
   - clic : tirage pour TOUS les PJ, compteurs de tour à 0, le jet va dans
     « Init. combat » (jamais dans la colonne « Init. » = formule de la fiche) ;
   - confirmation SEULEMENT si un état existe déjà (init. renseignée ou tour > 0) ;
   - persistance : UNE écriture debouncée, init_combat rempli, tours purgés ;
   - mise en page : les deux boutons (INIT + RAZ) sont SUR UNE MÊME LIGNE
     SOUS LE tableau (aucun pied de tableau — un tfoot imposait sa largeur
     minimale à la table entière et le tableau débordait en mobile) ;
   - régressions : INIT avant le RAZ, ennemis / RAZ / resync intacts,
     rendu sans team-state.js. */

const { createReporter } = require('./helpers/assert');
const { createEnv, delay } = require('./helpers/env');

const SAVE_DELAY = 750; /* debounce 600 ms + marge */

function j(v) {
  return JSON.stringify(v);
}

function click(el) {
  el.dispatchEvent(new el.ownerDocument.defaultView.MouseEvent('click', { bubbles: true, cancelable: true }));
}

function expTableOf(container) {
  return container.querySelector('table.team-table:not(.team-table-enemies):not(.team-table-stats)');
}

/* Ligne d'actions SUR UNE LIGNE SOUS LE tableau (les boutons ne sont plus
   dans un pied de tableau : le tfoot imposait sa largeur minimale à la table
   entière et celle-ci débordait en mobile). */
function actionsRowOf(container) {
  return container.querySelector('.table-actions');
}

function btnInitOf(container) {
  const row = actionsRowOf(container);
  return row ? row.querySelector('.btn-init') : null;
}

function btnRazOf(container) {
  const row = actionsRowOf(container);
  return row ? row.querySelector('.btn-raz') : null;
}

function initInputsOf(container) {
  const exp = expTableOf(container);
  return exp ? [].slice.call(exp.querySelectorAll('.init-combat-input')) : [];
}

function countersOf(container) {
  const exp = expTableOf(container);
  return exp ? [].slice.call(exp.querySelectorAll('.turn-counter')) : [];
}

function initValuesOf(container) {
  return initInputsOf(container).map(function (i) { return i.value; });
}

function counterValuesOf(container) {
  return countersOf(container).map(function (c) { return c.textContent; });
}

/* ------------------------------------------------------------------ *
 * 1. Logique pure : parseInitiative / rollInitiative
 * ------------------------------------------------------------------ */
function testPure(r) {
  const env = createEnv();
  env.loadEquipe();
  const mod = env.window.DCCModules.equipe;

  r.ok(!!mod && typeof mod.parseInitiative === 'function', 'parseInitiative exposé');
  r.ok(!!mod && typeof mod.rollInitiative === 'function', 'rollInitiative exposé');
  if (!mod || typeof mod.parseInitiative !== 'function') return;

  /* --- lecture des formules --- */
  const cases = [
    ['1d20+2', { count: 1, sides: 20, mod: 2 }],
    ['1d16-1', { count: 1, sides: 16, mod: -1 }],
    ['+3', { count: 1, sides: 20, mod: 3 }],
    ['-1', { count: 1, sides: 20, mod: -1 }],
    ['3', { count: 1, sides: 20, mod: 3 }],
    ['d20+5', { count: 1, sides: 20, mod: 5 }],
    ['1D20 + 5', { count: 1, sides: 20, mod: 5 }],
    ['  1d20-3  ', { count: 1, sides: 20, mod: -3 }],
    ['2d6+1', { count: 2, sides: 6, mod: 1 }],
    ['', { count: 1, sides: 20, mod: 0 }],
    [null, { count: 1, sides: 20, mod: 0 }],
    [undefined, { count: 1, sides: 20, mod: 0 }],
    ['nawak', { count: 1, sides: 20, mod: 0 }],
    ['1d20+2/1d8', { count: 1, sides: 20, mod: 0 }],
    /* garde-fous : repli sur d20 + mod valide */
    ['1d0', { count: 1, sides: 20, mod: 0 }],
    ['0d6', { count: 1, sides: 20, mod: 0 }],
    ['1d2000', { count: 1, sides: 20, mod: 0 }],
    ['999d6', { count: 1, sides: 20, mod: 0 }],
    ['1d20+2', { count: 1, sides: 20, mod: 2 }],
  ];
  cases.forEach(function (c) {
    r.eq(j(mod.parseInitiative(c[0])), j(c[1]),
      'parse(' + JSON.stringify(c[0]) + ') = ' + j(c[1]));
  });

  /* --- tirage : bornes incluses, modificateur appliqué --- */
  const min = function () { return 0; };
  const max = function () { return 0.999999; };

  r.eq(mod.rollInitiative('1d20+2', min), 3, '1d20+2 (dé minimum) = 3');
  r.eq(mod.rollInitiative('1d20+2', max), 22, '1d20+2 (dé maximum) = 22');
  r.eq(mod.rollInitiative('+3', min), 4, '+3 = d20 + 3 (spec : coquille « 30 » = +3)');
  r.eq(mod.rollInitiative('-1', max), 19, '-1 (dé max) = 19');
  r.eq(mod.rollInitiative('1d16-1', min), 0, '1d16-1 peut descendre à 0');
  r.eq(mod.rollInitiative('2d6+1', min), 3, '2d6+1 (dé min) = 3');
  r.eq(mod.rollInitiative('2d6+1', max), 13, '2d6+1 (dé max) = 13');
  r.eq(mod.rollInitiative('', min), 1, 'formule vide (dé min) = 1');
  r.eq(mod.rollInitiative('', max), 20, 'formule vide (dé max) = 20');
  r.eq(mod.rollInitiative('nawak', min), 1, 'formule illisible -> d20 (dé min)');
  r.ok(Number.isInteger(mod.rollInitiative('1d16-1', min)), 'le jet est un entier');

  /* rng par défaut = Math.random (patché côté window du script chargé) */
  const realRandom = env.window.Math.random;
  env.window.Math.random = function () { return 0.5; };
  r.eq(mod.rollInitiative('1d20+2'), 13, 'rng par défaut = Math.random (1d20 -> 11, +2)');
  env.window.Math.random = realRandom;
}

/* ------------------------------------------------------------------ *
 * 2. Onglet Équipe : bouton, tirage, confirmation, persistance
 * ------------------------------------------------------------------ */
function buildEnv(r, opts) {
  const o = opts || {};
  const env = createEnv();
  let modalCalls = 0;
  let modalResult = o.modalResult !== false;
  env.window.showModal = function () {
    modalCalls += 1;
    return Promise.resolve(modalResult);
  };
  if (o.loadTeamState !== false) env.load('team-state.js');
  env.load('marching-order.js');
  env.loadEquipe();

  const mod = env.window.DCCModules.equipe;
  if (!mod || typeof mod.render !== 'function') {
    r.fail('module equipe non chargé');
    return null;
  }

  /* rng déterministe : chaque dé sort son minimum */
  env.window.Math.random = function () { return 0; };

  const chars = [
    { id: 1, name: 'Travok', class: 'clerc', data: JSON.stringify({ initiative: '+2', points_de_vie: '4' }) },
    { id: 2, name: 'Sergiu', class: 'mage', data: JSON.stringify({ initiative: '1d16-1', points_de_vie: '7' }) },
    { id: 3, name: 'Nix', class: 'lvl0', data: JSON.stringify({ points_de_vie: '5' }) },
  ];
  const container = env.document.getElementById('root');
  const saves = [];

  mod.render(container, chars, function () {}, '', function () {},
    { 1: 0, 2: 1, 3: 2 }, function () {},
    o.initialState || { init_combat: {}, tours: {}, ennemis: [] },
    function (state) { saves.push(state); });

  return {
    env, mod, container, chars, saves, modalCalls: function () { return modalCalls; },
    setModalResult: function (v) { modalResult = v; },
  };
}

async function testInitButton(r) {
  const ctx = buildEnv(r);
  if (!ctx) return;
  const { env, mod, container, saves } = ctx;

  /* --- structure : ligne d'actions SOUS le tableau, INIT à gauche du RAZ,
         aucun bouton dans la table elle-même --- */
  const exp = expTableOf(container);
  r.ok(!!exp, 'tableau expédition présent');
  r.ok(!exp || !exp.querySelector('tfoot'), 'aucun pied de tableau (boutons sortis de la table)');
  r.ok(!exp || !exp.querySelector('.btn-init'), 'aucun INIT dans la table');
  r.ok(!exp || !exp.querySelector('.btn-raz'), 'aucun RAZ dans la table');

  const row = actionsRowOf(container);
  r.ok(!!row, 'ligne .table-actions présente');
  r.eq(row && exp ? row.previousElementSibling === exp : false, true,
    'la ligne d\'actions est posée IMMÉDIATEMENT après le tableau');
  r.eq(row && exp ? row.parentNode === exp.parentNode : false, true,
    'la ligne est au même niveau que le tableau (pas dans une cellule)');

  const btnInit = btnInitOf(container);
  const btnRaz = btnRazOf(container);
  r.ok(!!btnInit, 'bouton INIT présent dans la ligne d\'actions');
  r.ok(!!btnRaz, 'bouton RAZ présent dans la ligne d\'actions');
  if (btnInit && btnRaz) {
    r.eq(btnInit.parentNode, row, 'INIT est un enfant direct de la ligne');
    r.eq(btnRaz.parentNode, row, 'RAZ est un enfant direct de la ligne');
    r.eq(btnInit.textContent, 'INIT', 'libellé INIT');
    r.eq(btnInit.getAttribute('type'), 'button', 'INIT est type=button');
    r.ok(!!btnInit.getAttribute('aria-label'), 'INIT : aria-label renseigné');
    const FOLLOWING = env.window.Node.DOCUMENT_POSITION_FOLLOWING;
    r.ok(!!(btnInit.compareDocumentPosition(btnRaz) & FOLLOWING),
      'INIT est placé À GAUCHE du RAZ (même ligne)');
  }

  /* --- état initial : aucun jet, aucun tour --- */
  r.eq(j(initValuesOf(container)), j(['', '', '']), 'aucun jet au rendu');
  r.eq(j(counterValuesOf(container)), j(['0', '0', '0']), 'tours à 0 au rendu');
  r.eq(ctx.modalCalls(), 0, 'aucune modale au rendu');

  /* --- ennemi témoin : ne doit pas bouger --- */
  const enemyInits = container.querySelectorAll('table.team-table-enemies tbody tr');
  const enemyInitInput = enemyInits.length ? enemyInits[0].children[4].querySelector('input') : null;
  if (enemyInitInput) enemyInitInput.value = '7';

  /* --- 1er clic : SANS état -> pas de confirmation, tirage immédiat --- */
  if (btnInit) click(btnInit);
  r.eq(ctx.modalCalls(), 0, 'sans état existant : AUCUNE confirmation');
  r.eq(j(initValuesOf(container)), j(['3', '0', '1']),
    'tirage pour tous les PJ (1d20+2 -> 3, 1d16-1 -> 0, vide -> d20 = 1)');
  r.eq(j(counterValuesOf(container)), j(['0', '0', '0']), 'tours à 0 après le tirage');
  if (enemyInitInput) r.eq(enemyInitInput.value, '7', 'ennemis non touchés par INIT');

  /* --- persistance : une seule écriture, jet en base, tours purgés --- */
  await delay(SAVE_DELAY);
  r.eq(saves.length, 1, 'une seule écriture debouncée après le tirage');
  if (saves.length === 1) {
    r.eq(j(saves[0].init_combat), j({ '1': '3', '2': '0', '3': '1' }),
      'init_combat = jets en base');
    r.eq(j(saves[0].tours), j({}), 'tours à 0 jamais persistés');
  }

  /* --- 2e clic : AVEC état -> confirmation demandée (d'abord annulée) --- */
  const counters = countersOf(container);
  if (counters[0]) click(counters[0]);                 /* tour 1 (sans délai : pas d'écriture isolée) */
  const inputs = initInputsOf(container);
  if (inputs[0]) inputs[0].value = '9';                /* jet saisi à la main */
  r.eq(counterValuesOf(container)[0], '1', 'tour incrémenté avant le 2e clic');

  ctx.setModalResult(false);
  if (btnInit) click(btnInit);
  await delay(30);
  r.eq(ctx.modalCalls(), 1, 'avec état existant : confirmation demandée');
  r.eq(initValuesOf(container)[0], '9', 'annulation : jet manuel conservé');
  r.eq(counterValuesOf(container)[0], '1', 'annulation : tour conservé');
  r.eq(saves.length, 1, 'annulation : aucune écriture');

  /* confirmation : jet écrasé, tour remis à 0 */
  ctx.setModalResult(true);
  if (btnInit) click(btnInit);
  await delay(30);
  r.eq(ctx.modalCalls(), 2, 'confirmation relancée puis acceptée');
  r.eq(initValuesOf(container)[0], '3', 'confirmation : jet manuel écrasé');
  r.eq(j(counterValuesOf(container)), j(['0', '0', '0']), 'confirmation : tours à 0');

  await delay(SAVE_DELAY);
  r.ok(saves.length >= 2, 'écriture propagée après confirmation (' + saves.length + ')');
  const last = saves[saves.length - 1];
  r.eq(j(last.init_combat), j({ '1': '3', '2': '0', '3': '1' }),
    'état final relu dans le DOM en base');
  r.eq(j(last.tours), j({}), 'tours purgés en base après le tirage');

  /* --- resync : les jets sont conservés (colonne « Init. » seule rafraîchie) --- */
  const fresh = JSON.parse(JSON.stringify(ctx.chars));
  const f0 = JSON.parse(fresh[0].data);
  f0.initiative = '+9';
  fresh[0].data = JSON.stringify(f0);
  r.eq(mod.resync(fresh), true, 'resync sans changement de composition');
  r.eq(j(initValuesOf(container)), j(['3', '0', '1']), 'resync : jets conservés');
  r.eq(j(counterValuesOf(container)), j(['0', '0', '0']), 'resync : tours conservés');
  r.eq(container.querySelector('tr[data-char-id="1"]').children[2].textContent, '+9',
    'resync : colonne « Init. » = formule fraîche de la fiche');

  /* --- RAZ toujours fonctionnel après INIT --- */
  if (btnRaz) click(btnRaz);
  await delay(30);
  r.eq(j(initValuesOf(container)), j(['', '', '']), 'RAZ : jets effacés après INIT');
  r.eq(j(counterValuesOf(container)), j(['0', '0', '0']), 'RAZ : tours à 0 après INIT');

  /* --- 0 personnage : ni tableau, ni bouton --- */
  mod.render(container, [], function () {}, '', function () {});
  r.ok(!expTableOf(container), 'aucun tableau sans personnage');
  r.ok(!btnInitOf(container), 'aucun bouton INIT sans personnage');
}

/* ------------------------------------------------------------------ *
 * 3. Sans team-state.js : module optionnel, pas de plantage
 * ------------------------------------------------------------------ */
async function testWithoutHelper(r) {
  const ctx = buildEnv(r, { loadTeamState: false });
  if (!ctx) return;
  const { container, saves } = ctx;

  const btnInit = btnInitOf(container);
  r.ok(!!btnInit, 'sans team-state : bouton INIT présent');
  if (btnInit) click(btnInit);
  await delay(30);
  r.eq(j(initValuesOf(container)), j(['3', '0', '1']),
    'sans team-state : jet affiché malgré tout');

  await delay(SAVE_DELAY);
  r.eq(saves.length, 0, 'sans team-state : aucune écriture (module optionnel)');
}

async function run() {
  const r = createReporter('25-init-expedition');
  testPure(r);
  await testInitButton(r);
  await testWithoutHelper(r);
  await delay(50);
  return r;
}

module.exports = run;
