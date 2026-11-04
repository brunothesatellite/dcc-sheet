'use strict';

/* ------------------------------------------------------------------ *
 * 27. Evolution #4 « Escouades » — notion EXCLUSIVE du niveau 0 (S0)
 *
 * - script.js         : lecture (squadOf, garde R11), groupement alpha,
 *                       ecriture unique (get -> save, garde lvl0), selecteur
 *                       de carte, modale de gestion, bandeau de liste ;
 * - classes/equipe.js : bandeaux des DEUX tableaux (S4-S7) — execute dans
 *                       jsdom, comme 04-equipe ;
 * - lvl0-roll.js      : promote() supprime l'escouade (R10) ;
 * - export / import   : data.escouade voyage (R4) et reste ignore sur un
 *                       perso niv.1+ a l'affichage (R11).
 * ------------------------------------------------------------------ */

const { createReporter } = require('./helpers/assert');
const { createEnv, read } = require('./helpers/env');

/* Extrait le texte entre deux marqueurs (pas de parsing : les tests sont
   des assertions de CABLAGE, comme partout dans la batterie). */
function section(src, from, to) {
  const a = src.indexOf(from);
  if (a === -1) return '';
  const b = src.indexOf(to, a + from.length);
  return b === -1 ? src.slice(a) : src.slice(a, b);
}

function count(src, needle) {
  return src.split(needle).length - 1;
}

/* Hash de couleur attendu : meme algorithme que squadColor() des deux
   fichiers (6 teintes, h = h*31 + code, >>>0) — recalcule ici a la main
   pour ne pas relire la implementation testee. */
const SQUAD_COLORS = ['#c0392b', '#2980b9', '#27ae60', '#8e44ad', '#d35400', '#16a085'];
function expectedColor(name) {
  const s = String(name || '').toLowerCase();
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return SQUAD_COLORS[h % SQUAD_COLORS.length];
}

/* ------------------------------------------------------------------ *
 * 1. Lecture : squadOf() — garde de niveau 0 (R11) + robustesse
 * ------------------------------------------------------------------ */
function testRead(r, js) {
  r.eq(count(js, 'function squadOf('), 1, 'squadOf défini une seule fois');

  const body = section(js, 'function squadOf(', 'var SQUAD_COLORS');
  r.ok(body.indexOf('charData.class !== \'lvl0\'') !== -1,
    'squadOf : garde class !== \'lvl0\' (R11 — un niv.1+ n\'est jamais éligible)');
  r.ok(body.indexOf('JSON.parse(charData.data || \'{}\')') !== -1,
    'squadOf : lecture du JSON du perso');
  r.ok(body.indexOf('.trim()') !== -1, 'squadOf : nom trimé');
  r.ok(body.indexOf('return \'\';') !== -1, 'squadOf : sans escouade = chaîne vide');
  r.ok(body.indexOf('catch') !== -1, 'squadOf : JSON cassé toléré (repli sur \'\')');
}

/* ------------------------------------------------------------------ *
 * 2. Groupement : alpha insensible à la casse, « Sans escouade » en dernier
 * ------------------------------------------------------------------ */
function testGrouping(r, js) {
  r.eq(count(js, 'function groupBySquad('), 1, 'groupBySquad défini une seule fois');

  const body = section(js, 'function groupBySquad(', 'function squadBanner(');
  r.ok(body.indexOf('squadOf(c)') !== -1, 'groupBySquad : passe par squadOf (garde lvl0)');
  r.ok(body.indexOf('s.toLowerCase()') !== -1,
    'groupBySquad : clé de groupe en minuscules (unicité insensible à la casse)');
  r.ok(body.indexOf('localeCompare') !== -1, 'groupBySquad : tri alphabétique des en-têtes');
  r.ok(body.indexOf('groups.push({ label: \'\', members: rest })') !== -1,
    'groupBySquad : « Sans escouade » poussé APRÈS le tri (en dernier)');
  r.ok(body.indexOf('members: rest }') > body.indexOf('groups.sort'),
    'groupBySquad : le groupe « Sans escouade » est ajouté après le tri alpha');

  /* Bandeau de la liste */
  r.eq(count(js, 'function squadBanner('), 1, 'squadBanner défini une seule fois');
  const banner = section(js, 'function squadBanner(', 'function squadNamesOf(');
  r.ok(banner.indexOf('squad-bar-list') !== -1, 'bandeau : classe .squad-bar-list');
  r.ok(banner.indexOf('is-void') !== -1, 'bandeau : « Sans escouade » en .is-void');
  r.ok(banner.indexOf('textContent') !== -1, 'bandeau : libellé en textContent (R9)');
  r.ok(banner.indexOf('squadColor(group.label)') !== -1, 'bandeau : pastille de couleur');

  /* Sélecteur de noms proposé aux cartes */
  const names = section(js, 'function squadNamesOf(', 'async function setCharacterSquad(');
  r.ok(names.indexOf('squadOf(c)') !== -1, 'squadNamesOf : noms dérivés des lvl0');
}

/* ------------------------------------------------------------------ *
 * 3. Écriture unique : setCharacterSquad() — get d'abord, 1 save, garde lvl0
 * ------------------------------------------------------------------ */
function testWrite(r, js) {
  r.eq(count(js, 'function setCharacterSquad('), 1, 'setCharacterSquad défini une seule fois');

  const body = section(js, 'async function setCharacterSquad(', 'function createSquadPicker(');
  r.ok(body.indexOf('action: \'get\'') !== -1, 'écriture : relecture en base (action=get)');
  r.ok(body.indexOf('action: \'save\'') !== -1, 'écriture : une action=save');
  r.ok(count(body, 'action: \'save\'') === 1, 'écriture : UNE SEULE requête save');
  r.ok(body.indexOf('action: \'get\'') < body.indexOf('action: \'save\''),
    'écriture : get AVANT save (jamais le snapshot de la carte)');
  r.ok(body.indexOf('fresh.class !== \'lvl0\'') !== -1,
    'écriture : refus d\'un id non-lvl0 (R11)');
  r.ok(body.indexOf('invalidateEquipePanel()') !== -1,
    'écriture : invalidation du panneau Équipe');
  r.ok(body.indexOf('.slice(0, 40)') !== -1, 'écriture : nom borné à 40 caractères');
  r.ok(body.indexOf('delete parsed.escouade') !== -1,
    'écriture : escouade vide = suppression de la clé (pas de chaîne persistée)');
  r.ok(body.indexOf('JSON.parse(fresh.data || \'{}\')') !== -1,
    'écriture : part du JSON relu en base, pas d\'un état local');

  /* Sélecteur de carte : stopPropagation (la carte ouvre la fiche) */
  const picker = section(js, 'function createSquadPicker(', 'function showSquadNameModal(');
  r.ok(count(picker, 'stopPropagation()') >= 2,
    'sélecteur : stopPropagation sur click ET change');
  r.ok(picker.indexOf('\'__new__\'') !== -1, 'sélecteur : option « + Nouvelle… »');
  r.ok(picker.indexOf('loadClassCharacters(\'lvl0\', false)') !== -1,
    'sélecteur : la liste est resegmentée, on reste sur la liste');
  r.ok(picker.indexOf('sel.value = current') !== -1,
    'sélecteur : en cas d\'annulation ou d\'échec, la valeur connue est restaurée');
}

/* ------------------------------------------------------------------ *
 * 4. Rendu : liste segmentée, carte lvl0 SEULEMENT, bouton « Escouades »
 * ------------------------------------------------------------------ */
function testRender(r, js) {
  /* Liste : un bandeau + une grille par groupe */
  const list = section(js, 'function renderCharList(', 'function createCharCard(');
  r.ok(list.indexOf('if (cls === \'lvl0\')') !== -1, 'liste : segmentée pour le Niveau 0');
  r.ok(list.indexOf('groupBySquad(sorted)') !== -1, 'liste : groupement par escouade');
  r.ok(list.indexOf('squadBanner(group)') !== -1, 'liste : bandeau par groupe');
  r.ok(list.indexOf('var squadGrid = el(\'div\', { className: \'char-grid\' })') !== -1,
    'liste : UNE .char-grid par groupe');
  r.ok(list.indexOf('squadNamesOf(sorted)') !== -1,
    'liste : noms d\'escouade proposés sur les cartes');
  r.ok(list.indexOf('if (a.is_active !== b.is_active)') !== -1 &&
        list.indexOf('localeCompare(a.updated_at || \'\')') !== -1,
    'liste : tri actifs puis updated_at INCHANGÉ (tri interne de chaque groupe)');

  /* Carte : sélecteur construit SOUS une condition lvl0 */
  const card = section(js, 'function createCharCard(', 'function squadOf(');
  r.ok(card.indexOf('if (cls === \'lvl0\') actions.appendChild(createSquadPicker(') !== -1,
    'carte : sélecteur seulement si cls === \'lvl0\' (R11)');
  r.ok(count(card, 'createSquadPicker(') === 1,
    'carte : une seule construction de sélecteur, conditionnée');

  /* Bouton d'entrée de la modale */
  const newBtn = section(js, 'function createNewButton(', 'function renderCharList(');
  r.ok(newBtn.indexOf('if (cls === \'lvl0\')') !== -1 &&
        newBtn.indexOf('showSquadsModal()') !== -1,
    'bouton « Escouades » conditionné au Niveau 0 (R11)');
  r.ok(newBtn.indexOf('textContent: \'+ Nouveau\'') !== -1, 'bouton « + Nouveau » inchangé');
  r.ok(newBtn.indexOf('cls === \'lvl0\' ? startLvl0Roll() : createCharacter(cls)') !== -1,
    '« + Nouveau » : comportement évolution #3 inchangé');

  /* Signature de composition de l'onglet Équipe (plan §4.7) */
  const ids = section(js, 'function expeditionIdsAttr(', 'async function fetchExpeditionChars(');
  r.ok(ids.indexOf('squadOf(c)') !== -1,
    'data-expedition-ids : la signature porte aussi les escouades (sinon groupement périmé)');
}

/* ------------------------------------------------------------------ *
 * 5. Modale de gestion : membres lvl0 uniquement, écritures au fil de l'eau
 * ------------------------------------------------------------------ */
function testModal(r, js) {
  r.eq(count(js, 'function showSquadsModal('), 1, 'showSquadsModal défini une seule fois');

  const body = section(js, 'function showSquadsModal(', '9. Character CRUD');
  r.ok(body.indexOf('action: \'list\', class: \'lvl0\'') !== -1,
    'modale : la liste des membres vient de action=list&class=lvl0 (R11)');
  r.ok(body.indexOf('textContent: \'Escouades\'') !== -1, 'modale : titre « Escouades »');
  r.ok(body.indexOf('à la promotion') !== -1 && body.indexOf('sort de son escouade') !== -1,
    'modale : aide « à la promotion, le personnage sort de son escouade »');
  r.ok(body.indexOf('maxlength: \'40\'') !== -1, 'modale : champ nom borné à 40');
  r.ok(body.indexOf('type: \'confirm\'') !== -1, 'modale : suppression confirmée');
  r.ok(body.indexOf('textContent: \'Renommer\'') !== -1, 'modale : renommage');
  r.ok(body.indexOf('textContent: \'Supprimer\'') !== -1, 'modale : suppression');
  r.ok(body.indexOf('groupBySquad(lvl0)') !== -1,
    'modale : regroupement par escouade, « Sans escouade » jamais listé');
  r.ok(body.indexOf('showToast(\'Une escouade « \'') !== -1,
    'modale : unicité du nom au renommage');
  r.ok(body.indexOf('setCharacterSquad(group.members[i].id, next)') !== -1,
    'modale : renommage = boucle de save sur les membres');
  r.ok(body.indexOf('setCharacterSquad(group.members[i].id, \'\')') !== -1,
    'modale : suppression = membres repassés en sans escouade');
  r.ok(body.indexOf('chk.checked ? group.label : \'\'') !== -1,
    'modale : affecter/désaffecter par case à cocher');
  r.ok(body.indexOf('e.key === \'Escape\'') !== -1, 'modale : fermeture Échap');
  r.ok(body.indexOf('overlay.addEventListener(\'click\'') !== -1,
    'modale : fermeture par clic extérieur');
  r.ok(body.indexOf('textContent: \'Fermer\'') !== -1, 'modale : bouton Fermer');
  r.ok(count(body, 'setCharacterSquad(') >= 4,
    'modale : toutes les écritures passent par setCharacterSquad (case, renommer, supprimer, créer)');
}

/* ------------------------------------------------------------------ *
 * 6. Promotion : le promu SORT de son escouade (R10) — lvl0-roll.js exécuté
 * ------------------------------------------------------------------ */
function testPromote(r) {
  const env = createEnv();
  env.load('lvl0-data.js');
  env.load('funnel-icons.js');
  env.load('lvl0-roll.js');
  const R = env.window.DCCLvl0Roll;
  if (!R || typeof R.promote !== 'function') {
    r.fail('lvl0-roll.js : DCCLvl0Roll.promote indisponible');
    return;
  }

  const out = R.promote({
    niveau: '0',
    px: '12',
    escouade: 'Alpha',
    titre: 'Épée brisée',
    portrait_source: 'x',
    portrait_index: '3',
  });

  r.ok(!Object.prototype.hasOwnProperty.call(out, 'escouade'),
    'R10 : promote() supprime la clé escouade');
  r.eq(out.niveau, '1', 'promotion : niveau 1');
  r.eq(out.px, '12', 'promotion : PX conservés');
  r.eq(out.titre, 'Épée brisée', 'promotion : les autres clés sont recopiées');
  r.eq(out.portrait_source, '', 'promotion : portrait retiré (inchangé)');

  /* Un perso SANS escouade ne gagne rien du tout */
  const bare = R.promote({ niveau: '0', px: '0' });
  r.ok(!Object.prototype.hasOwnProperty.call(bare, 'escouade'),
    'promotion : aucune clé escouade inventée');
}

/* ------------------------------------------------------------------ *
 * 7. Onglet Équipe : bandeaux des DEUX tableaux (S4-S7) — jsdom
 * ------------------------------------------------------------------ */
function makeChar(id, name, cls, squad) {
  const data = {
    initiative: '+1',
    classe_armure: '10',
    points_de_vie: '5',
    force: '10',
    agilite: '10',
    endurance: '10',
    presence: '10',
    chance: '10',
    intelligence: '10',
    js_reflexe: '0',
    js_vigueur: '0',
    js_volonte: '0',
  };
  if (squad) data.escouade = squad;
  return { id: id, name: name, class: cls, data: JSON.stringify(data), is_active: 1 };
}

function headLabel(tr) {
  const td = tr.querySelector('td');
  if (!td) return '';
  const texts = [].slice.call(td.childNodes)
    .filter(function (n) { return n.nodeType === 3 && n.textContent.trim(); });
  return texts.length ? texts[0].textContent.trim() : '';
}

function tableRows(table, attr) {
  return [].slice.call(table.querySelectorAll('tr[' + attr + ']'))
    .map(function (tr) { return tr.getAttribute(attr); });
}

function testEquipe(r) {
  const env = createEnv();
  env.loadEquipe();
  env.load('marching-order.js');
  const mod = env.window.DCCModules && env.window.DCCModules.equipe;
  if (!mod || typeof mod.render !== 'function') {
    r.fail('equipe module not loaded');
    return;
  }
  const container = env.document.getElementById('root');
  const noop = function () {};
  const expTable = function () {
    return container.querySelector('table.team-table:not(.team-table-enemies):not(.team-table-stats)');
  };
  const statsTable = function () {
    return container.querySelector('table.team-table-stats');
  };
  const heads = function (t) {
    return t ? [].slice.call(t.querySelectorAll('tr.squad-head')) : [];
  };

  /* --- S6 : aucune escouade représentée -> strictement l'affichage actuel */
  mod.render(container, [
    makeChar(1, 'Travok', 'clerc'),
    makeChar(2, 'Sergiu', 'mage'),
    makeChar(3, 'Borin', 'lvl0'),
    makeChar(4, 'Wrena', 'lvl0'),
  ], noop, '', noop);

  r.eq(heads(expTable()).length, 0, 'S6 : aucun bandeau sans escouade (expédition)');
  r.eq(heads(statsTable()).length, 0, 'S6 : aucun bandeau sans escouade (stats)');
  r.eq(expTable().querySelectorAll('tbody').length, 1, 'S6 : un seul tbody (expédition)');
  r.eq(statsTable().querySelectorAll('tbody').length, 1, 'S6 : un seul tbody (stats)');
  r.eq(tableRows(expTable(), 'data-char-id').join(','), '1,2,3,4',
    'S6 : ordre des lignes inchangé (expédition)');
  r.eq(tableRows(statsTable(), 'data-id').join(','), '1,2,3,4',
    'S6 : ordre des lignes inchangé (stats)');

  /* --- S6 bis : des lvl0 avec escouade mais AUCUN niv.1+ -> pas de
         « Hors escouade » (blocs vides jamais rendus) */
  mod.render(container, [
    makeChar(3, 'Borin', 'lvl0', 'Bravo'),
    makeChar(4, 'Wrena', 'lvl0', 'Alpha'),
  ], noop, '', noop);
  r.eq(heads(expTable()).length, 2, 'S6 : deux escouades = deux bandeaux');
  r.eq(headLabel(heads(expTable())[0]), 'Alpha', 'bandeau 1 : Alpha (alpha avant Bravo)');
  r.eq(headLabel(heads(expTable())[1]), 'Bravo', 'bandeau 2 : Bravo');
  r.ok(!expTable().querySelector('tr.squad-head.is-void'),
    'aucun bloc vide « Hors escouade » quand tout le monde est lvl0');

  /* --- S4 + S5 + S7 : niv.1+ d\'abord, groupes lvl0 alpha, sans en dernier */
  const CHARS = [
    makeChar(1, 'Travok', 'clerc'),
    makeChar(2, 'Sergiu', 'mage'),
    makeChar(7, 'Zora', 'clerc', 'Zombie'), /* R11 : escouade héritée d'un niv.1+ : ignorée */
    makeChar(3, 'Borin', 'lvl0', 'Bravo'),
    makeChar(4, 'Wrena', 'lvl0', 'Alpha'),
    makeChar(6, 'Mara', 'lvl0', 'alpha'),  /* même escouade, casse différente */
    makeChar(5, 'Grub', 'lvl0'),
  ];
  mod.render(container, CHARS, noop, '', noop);

  const exp = expTable();
  const stats = statsTable();

  r.eq(heads(exp).length, 4, 'expédition : 4 bandeaux (Hors escouade, Alpha, Bravo, Sans escouade)');
  r.eq(heads(stats).length, 4, 'stats : mêmes 4 bandeaux');

  const labels = heads(exp).map(headLabel);
  r.eq(labels.join('|'), 'Hors escouade|Alpha|Bravo|Sans escouade',
    'S5/S7 : niv.1+ d\'abord, groupes lvl0 alpha, « Sans escouade » en dernier');
  r.eq(heads(stats).map(headLabel).join('|'), 'Hors escouade|Alpha|Bravo|Sans escouade',
    'S5 : même ordre dans les deux tableaux');

  /* S7 : blocs vides en .is-void, groupes pleins sans ce traitement */
  r.ok(heads(exp)[0].classList.contains('is-void'), 'S7 : « Hors escouade » en .is-void');
  r.ok(heads(exp)[3].classList.contains('is-void'), 'S7 : « Sans escouade » en .is-void');
  r.ok(!heads(exp)[1].classList.contains('is-void'), 'groupe Alpha : pas de traitement muet');
  r.ok(!!heads(exp)[1].querySelector('.squad-dot'), 'groupe Alpha : pastille de couleur');
  r.ok(!heads(exp)[0].querySelector('.squad-dot'), 'bloc muet : pas de pastille');

  /* S4 : colspan = nombre réel de colonnes du tableau, et aucun id sur un bandeau */
  const expCols = exp.querySelector('thead tr').children.length;
  const statsCols = stats.querySelector('thead tr').children.length;
  heads(exp).forEach(function (tr, i) {
    r.eq(tr.querySelector('td').colSpan, expCols, 'expédition : colspan bandeau ' + i);
    r.ok(!tr.hasAttribute('data-char-id') && !tr.hasAttribute('data-id'),
      'expédition : bandeau ' + i + ' sans data-char-id/data-id (invisible de resync)');
  });
  heads(stats).forEach(function (tr, i) {
    r.eq(tr.querySelector('td').colSpan, statsCols, 'stats : colspan bandeau ' + i);
    r.ok(!tr.hasAttribute('data-id'), 'stats : bandeau ' + i + ' sans data-id');
  });

  /* Un <tbody> par bloc : zébrage propre, détail dans le bon bloc */
  r.eq(exp.querySelectorAll('tbody').length, 4, 'expédition : un <tbody> par bloc');
  r.eq(stats.querySelectorAll('tbody').length, 4, 'stats : un <tbody> par bloc');
  r.eq(tableRows(exp, 'data-char-id').join(','), '1,2,7,4,6,3,5',
    'S5 : ordre des lignes persos (niv.1+ d\'abord, puis groupes, puis sans escouade)');
  r.eq(tableRows(stats, 'data-id').join(','), '1,2,7,4,6,3,5',
    'stats : même ordre');
  r.eq(exp.querySelectorAll('tr[data-char-id]').length, CHARS.length,
    'aucune ligne persos perdue ni dupliquée (expédition)');
  r.eq(stats.querySelectorAll('tr.stats-char-row').length, CHARS.length,
    'aucune ligne persos perdue ni dupliquée (stats)');

  heads(exp).forEach(function (h) {
    const tb = h.parentNode;
    r.eq(tb.tagName.toLowerCase(), 'tbody', 'bandeau toujours dans un tbody');
    r.eq(h.previousElementSibling, null, 'bandeau en tête de son tbody');
    r.ok(tb.querySelector('tr[data-char-id]'), 'le bloc du bandeau contient ses lignes');
  });

  /* Un niv.1+ porteur d'une escouade héritée reste dans « Hors escouade » */
  const hors = heads(exp)[0].parentNode;
  r.ok(!!hors.querySelector('tr[data-char-id="1"]') &&
        !!hors.querySelector('tr[data-char-id="2"]') &&
        !!hors.querySelector('tr[data-char-id="7"]'),
    'R11 : le niv.1+ à escouade héritée reste dans « Hors escouade »');
  r.ok(!exp.querySelector('tr.squad-head') || !exp.textContent.includes('Zombie'),
    'R11 : l\'escouade héritée d\'un niv.1+ n\'est jamais affichée');

  /* Détail déplié : la ligne reste dans le bloc de sa mère */
  const rowAlpha = exp.querySelector('tr[data-char-id="4"]');
  const classCell = rowAlpha.querySelector('.char-class');
  if (classCell) {
    classCell.dispatchEvent(new env.window.MouseEvent('click', { bubbles: true, cancelable: true }));
    const detail = exp.querySelector('tr.team-detail');
    r.ok(!!detail, 'détail déplié après la ligne mère');
    if (detail) {
      r.eq(detail.parentNode, rowAlpha.parentNode, 'détail dans le tbody du bloc Alpha');
      r.eq(detail.previousElementSibling, rowAlpha, 'détail juste APRÈS sa ligne mère');
    }
  } else {
    r.fail('cellule .char-class introuvable pour le test de détail');
  }

  /* Pastille : même hash que la liste Niveau 0 (lien visuel des 3 écrans) */
  const dot = heads(exp)[1].querySelector('.squad-dot');
  const probe = env.document.createElement('span');
  probe.style.background = expectedColor('Alpha');
  r.eq(dot.style.background, probe.style.background,
    'pastille Alpha : hash de couleur identique à celui de la liste');

  /* resync : les bandeaux ne perturbent ni la composition ni les lignes */
  r.eq(mod.resync(CHARS), true, 'resync : composition inchangée -> pas de reload');
  r.eq(container.querySelectorAll('tr[data-char-id]').length, CHARS.length,
    'resync : toujours une ligne par perso après bandeaux');

  /* --- R6 : une ligne par perso, bandeaux compris */
  r.eq(stats.querySelectorAll('tr.stats-char-row').length, CHARS.length,
    'stats : une ligne par perso après bandeaux');
}

/* ------------------------------------------------------------------ *
 * 8. Export / import : data.escouade voyage (R4), ignoré sur niv.1+ (R11)
 * ------------------------------------------------------------------ */
function testExportImport(r, js) {
  const exp = section(js, 'var fullCharacters = [];', 'var exportObj = {');
  r.ok(exp.indexOf('data: JSON.parse(detail.character.data || \'{}\')') !== -1,
    'export : data sérialisé tel quel (data.escouade sort avec le perso, R4)');

  const imp = 'await saveCharacter(res.character.id, c.data || {}, c.name);';
  r.ok(js.indexOf(imp) !== -1,
    'import : data restituée telle quelle (aller-retour sans perte, R4)');

  /* Aller-retour JSON réel : le champ survit */
  const src = JSON.stringify({ escouade: 'Alpha', niveau: '0' });
  const back = JSON.parse(JSON.stringify(JSON.parse(src)));
  r.eq(back.escouade, 'Alpha', 'aller-retour JSON : escouade conservée');
  r.eq(back.niveau, '0', 'aller-retour JSON : niveau conservé');

  /* La garde d\'affichage est unique : squadOf() lit les deux fichiers */
  const eq = read('classes/equipe.js');
  r.ok(eq.indexOf('charData.class !== \'lvl0\'') !== -1,
    'equipe.js : même garde squadOf (R11) que script.js');
  r.ok(js.indexOf('charData.class !== \'lvl0\'') !== -1,
    'script.js : garde squadOf présente');
  r.ok(eq.indexOf('h * 31 + s.charCodeAt(i)') !== -1 &&
        js.indexOf('h * 31 + s.charCodeAt(i)') !== -1,
    'les deux fichiers partagent le même hash de couleur (cohérence des 3 écrans)');
  r.ok(eq.indexOf('SQUAD_COLORS = [') !== -1 && js.indexOf('SQUAD_COLORS = [') !== -1 &&
        section(eq, 'SQUAD_COLORS = [', ';').replace(/\s/g, '') ===
        section(js, 'SQUAD_COLORS = [', ';').replace(/\s/g, ''),
    'les deux fichiers ont les MÊMES 6 teintes');
}

module.exports = async function suite() {
  const r = createReporter('27-squads');
  const js = read('script.js');

  testRead(r, js);
  testGrouping(r, js);
  testWrite(r, js);
  testRender(r, js);
  testModal(r, js);
  testPromote(r);
  testEquipe(r);
  testExportImport(r, js);

  return r;
};
