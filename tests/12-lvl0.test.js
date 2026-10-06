'use strict';

/* Niveau 0 (funnel) :
   - lvl0-data.js  : listes sources converties (noms / metiers / chance / equipement) ;
   - lvl0-roll.js  : moteur de tirage PUR (RNG injectable) : barème de mods,
                     race (« commence par »), arme CàC/distance, promotion ;
   - funnel-icons.js: catalogue de portraits + mapping métier -> tokens ;
   - classes/lvl0.js: fiche BLOC_COMMUN sans dé de vie + Notes ;
   - câblage        : onglet, pastille mobile, boutons « Autre tirage »/Promouvoir, API. */

const { createReporter } = require('./helpers/assert');
const { createEnv, read, exists, collectSheetData } = require('./helpers/env');

/* RNG déterministe (mulberry32) : les tirages sont reproductibles */
function rngFrom(seed) {
  let a = seed >>> 0;
  return function () {
    a += 0x6D2B79F5;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function loadRoll() {
  const env = createEnv();
  env.load('lvl0-data.js');
  env.load('funnel-icons.js');
  env.load('lvl0-roll.js');
  return env;
}

/* ------------------------------------------------------------------ *
 * 1. Données sources
 * ------------------------------------------------------------------ */
function testData(r, env) {
  const d = env.window.DCCLvl0Data;
  r.ok(!!d, 'lvl0-data.js : window.DCCLvl0Data exposé');
  if (!d) return;

  r.ok(Array.isArray(d.noms) && d.noms.length > 100, 'noms non vides (' + (d.noms || []).length + ')');
  r.ok(Array.isArray(d.metiers) && d.metiers.length === 100, 'metiers = table d100 (' + (d.metiers || []).length + ')');
  r.ok(Array.isArray(d.chance) && d.chance.length > 10, 'jets chanceux non vides (' + (d.chance || []).length + ')');
  r.ok(Array.isArray(d.equipement) && d.equipement.length > 10, 'equipements non vides (' + (d.equipement || []).length + ')');

  const bad = d.metiers.filter(function (m) {
    return !m || !m.metier || !m.arme || !m.equipement;
  });
  r.eq(bad.length, 0, 'chaque métier a metier/arme/equipement (' + bad.length + ' incomplets)');

  r.ok(!d.noms.some(function (n) { return /�/.test(n); }), 'noms en UTF-8 sans caractères de remplacement');
  r.ok(!d.metiers.some(function (m) { return /�/.test(m.metier + m.arme); }), 'métiers en UTF-8 sans caractères de remplacement');

  const f = env.window.FunnelIcons;
  r.ok(!!f, 'funnel-icons.js : window.FunnelIcons exposé');
  if (!f) return;

  r.ok(f.meta && f.meta.key === 'funnel', 'clé de source = funnel');
  r.ok(Array.isArray(f.lvl0) && f.lvl0.length >= 70, 'portraits funnel (' + (f.lvl0 || []).length + ')');
  r.ok(f.lvl0.every(function (p) { return p.indexOf('icons/funnel-tokens/') === 0; }), 'chemins des portraits cohérents');
  r.ok(Object.keys(f.byMetier || {}).length >= 50, 'métiers cartographiés (' + Object.keys(f.byMetier || {}).length + ')');

  const outOfRange = [];
  Object.keys(f.byMetier).forEach(function (m) {
    f.byMetier[m].forEach(function (i) {
      if (!(i >= 0 && i < f.lvl0.length)) outOfRange.push(m + ':' + i);
    });
  });
  r.eq(outOfRange.length, 0, 'indices de portraits dans le catalogue');

  /* Au moins un métier de la table d100 doit être cartographié */
  const R = env.window.DCCLvl0Roll;
  const normalized = {};
  Object.keys(f.byMetier).forEach(function (key) { normalized[R.norm(key)] = true; });
  const matched = d.metiers.filter(function (m) {
    return !!normalized[R.norm(m.metier)];
  });
  r.ok(matched.length >= 50, 'métiers de la table trouvés dans le catalogue (' + matched.length + ')');
}

/* ------------------------------------------------------------------ *
 * 2. Barème de modificateurs + format
 * ------------------------------------------------------------------ */
function testStatMod(r, R) {
  const cases = [
    [3, -3], [4, -2], [5, -2], [6, -1], [7, -1], [8, -1],
    [9, 0], [12, 0], [13, 1], [15, 1], [16, 2], [17, 2], [18, 3],
  ];
  cases.forEach(function (c) {
    r.eq(R.statMod(c[0]), c[1], 'statMod(' + c[0] + ') = ' + c[1]);
  });
  r.eq(R.statMod('13'), 1, 'statMod("13") string');
  r.eq(R.statMod(''), 0, 'statMod("") = 0');

  r.eq(R.formatMod(1), '+1', 'formatMod(1) = +1');
  r.eq(R.formatMod(0), '0', 'formatMod(0) = 0');
  r.eq(R.formatMod(-2), '-2', 'formatMod(-2) = -2');

  r.eq(R.formatBonus(0), '+0', 'formatBonus(0) = +0');
  r.eq(R.formatBonus(1), '+1', 'formatBonus(1) = +1');
  r.eq(R.formatBonus(-2), '-2', 'formatBonus(-2) = -2');
}

/* ------------------------------------------------------------------ *
 * 3. Race : détection, mouvement, langues, notes, classes autorisées
 * ------------------------------------------------------------------ */
function testRace(r, R) {
  r.eq(R.raceOf('Elfe fauconnier'), 'elfe', '« Elfe … » → elfe (casse)');
  r.eq(R.raceOf('Nain mineur'), 'nain', '« Nain … » → nain');
  r.eq(R.raceOf('Halfelin volailler'), 'halfelin', '« Halfelin … » → halfelin');
  r.eq(R.raceOf('nain ratier'), 'nain', 'détection insensible à la casse');
  r.eq(R.raceOf('Bûcheron'), null, 'Bûcheron → aucune race');
  r.eq(R.raceOf('Forgeron nain'), null, '« contient » ne suffit pas (commence par)');

  r.eq(R.movementOf('Bûcheron'), '30', 'mouvement 30');
  r.eq(R.movementOf('Nain mineur'), '20', 'mouvement 20 (nain)');
  r.eq(R.movementOf('Halfelin vagabond'), '20', 'mouvement 20 (halfelin)');

  r.eq(R.languesOf('Bûcheron'), 'commun', 'langues : commun');
  r.eq(R.languesOf('Nain ratier'), 'commun, nain', 'langues : commun, nain');
  r.eq(R.languesOf('Halfelin vagabond'), 'commun, halfelin', 'langues : commun, halfelin');
  r.eq(R.languesOf('Elfe sage'), 'commun, elfique', 'langues : commun, elfique');

  r.eq(R.notesOf('Nain ratier'), 'Infravision', 'notes nain');
  r.eq(R.notesOf('Halfelin vagabond'), 'Infravision', 'notes halfelin');
  r.eq(R.notesOf('Elfe sage'), 'Sens très développés et sensibles au fer', 'notes elfe');
  r.eq(R.notesOf('Bûcheron'), '', 'notes d’un métier non racial');

  r.eq(JSON.stringify(R.allowedClasses('Nain mineur')), JSON.stringify(['nain']),
    'promotion nain → classe unique');
  r.eq(JSON.stringify(R.allowedClasses('Elfe sage')), JSON.stringify(['elfe']),
    'promotion elfe → classe unique');
  r.eq(JSON.stringify(R.allowedClasses('Halfelin marin')), JSON.stringify(['halfelin']),
    'promotion halfelin → classe unique');
  r.eq(JSON.stringify(R.allowedClasses('Bûcheron')),
    JSON.stringify(['clerc', 'guerrier', 'mage', 'voleur']),
    'promotion métier ordinaire → 4 classes');
}

/* ------------------------------------------------------------------ *
 * 4. Arme : CàC / distance, dé de dégâts, modificateurs
 * ------------------------------------------------------------------ */
function testWeapons(r, R) {
  let w = R.weaponInfo('Bâton 1d4');
  r.eq(w.ranged, false, 'Bâton 1d4 → CàC');
  r.eq(w.degats, '1d4', 'Bâton → 1d4');

  w = R.weaponInfo('Hachette 1d6 3/6/9');
  r.eq(w.ranged, true, 'Hachette 1d6 3/6/9 → distance (plage x/y/z)');
  r.eq(w.degats, '1d6', 'Hachette → 1d6');

  w = R.weaponInfo('Dague 1d4/1d10 3/6/9');
  r.eq(w.ranged, true, 'Dague 1d4/1d10 3/6/9 → distance');
  r.eq(w.degats, '1d4', 'premier dé = 1d4 (pas 1d10)');

  w = R.weaponInfo('Arc court* 1d6 15/30/45');
  r.eq(w.ranged, true, 'Arc 1d6 15/30/45 → distance');
  r.eq(w.degats, '1d6', 'Arc → 1d6');

  w = R.weaponInfo('Épée courte 1d6');
  r.eq(w.ranged, false, 'Épée courte 1d6 → CàC');

  w = R.weaponInfo('Marteau (comme Gourdin 1d4)');
  r.eq(w.ranged, false, 'Marteau (comme Gourdin 1d4) → CàC');
  r.eq(w.degats, '1d4', 'Gourdin → 1d4');

  r.eq(R.weaponInfo('Plume (comme Fléchette 1d4 6/12/18)').ranged, true,
    'Fléchette 1d4 6/12/18 → distance');

  r.eq(R.damageWithMod('1d4', 1), '1d4+1', 'dégât + mod positif');
  r.eq(R.damageWithMod('1d4', 0), '1d4', 'dégât sans mod');
  r.eq(R.damageWithMod('1d4', -2), '1d4-2', 'dégât + mod négatif');
  r.eq(R.damageWithMod('', 1), '', 'pas de dé → pas de dégât');
}

/* ------------------------------------------------------------------ *
 * 5. Tirage complet
 * ------------------------------------------------------------------ */
function testRoll(r, env, R) {
  const data = env.window.DCCLvl0Data;
  const funnel = env.window.FunnelIcons;
  const metiersByArme = {};
  data.metiers.forEach(function (m) { metiersByArme[m.metier + '|' + m.arme] = m; });
  const portraitsByMetier = {};
  Object.keys(funnel.byMetier).forEach(function (key) {
    portraitsByMetier[R.norm(key)] = funnel.byMetier[key];
  });

  for (let i = 0; i < 20; i++) {
    const d = R.roll(rngFrom(1000 + i), funnel);
    const tag = '#' + i;

    r.eq(d.niveau, '0', tag + ' niveau = 0');
    r.eq(d.px, '0', tag + ' px = 0');
    r.eq(d.attaque, '+0', tag + ' attaque = +0');
    r.eq(d.des_action, '1d20', tag + ' dés d’action = 1d20');
    r.eq(d.des_critique, 'd4', tag + ' dés critique = d4');
    r.eq(d.table_critique, 'I', tag + ' table critique = I');
    r.eq(d.titre, '', tag + ' titre vide');
    r.eq(d.alignement, '', tag + ' alignement vide');
    r.eq(d.armure, '', tag + ' armure vide');
    r.eq(d.portrait_source, 'funnel', tag + ' source de portrait = funnel');

    /* Caractéristiques et modifs */
    const stats = ['force', 'agilite', 'endurance', 'presence', 'chance', 'intelligence'];
    stats.forEach(function (s) {
      const v = parseInt(d[s], 10);
      if (!(v >= 3 && v <= 18)) r.fail(tag + ' ' + s + ' hors 3..18 (' + d[s] + ')');
      r.eq(d[s + '_mod'], R.formatMod(R.statMod(v)), tag + ' ' + s + '_mod');
    });

    /* CA, PV, initiative */
    r.eq(d.classe_armure, String(10 + R.statMod(d.agilite)), tag + ' CA = 10 + mod AGI');
    const pv = parseInt(d.points_de_vie, 10);
    r.ok(pv >= 1 && pv <= 7, tag + ' PV max entre 1 et 7 (' + d.points_de_vie + ')');
    r.eq(d.max_pv, d.points_de_vie, tag + ' PV courant = PV max');
    const agiMod = R.statMod(d.agilite);
    r.eq(d.initiative, agiMod === 0 ? '1d20' : '1d20' + R.formatMod(agiMod),
      tag + ' initiative = 1d20 + mod AGI');
    r.ok(/^1d20([+-]\d+)?$/.test(d.initiative), tag + ' initiative au format 1d20 (' + d.initiative + ')');

    /* Décision Q3 bis : JS = modificateurs */
    r.eq(d.js_reflexe, d.agilite_mod, tag + ' JS Ref = mod AGI');
    r.eq(d.js_vigueur, d.endurance_mod, tag + ' JS Vig = mod END');
    r.eq(d.js_volonte, d.presence_mod, tag + ' JS Vol = mod PRE');

    /* Race et métier */
    const race = R.raceOf(d.metier);
    r.eq(d.mouvement, race === 'nain' || race === 'halfelin' ? '20' : '30', tag + ' mouvement');
    r.eq(d.langues, R.languesOf(d.metier), tag + ' langues');
    r.eq(d.notes, R.notesOf(d.metier), tag + ' notes');

    /* Mété tiré réellement dans la table */
    const row = metiersByArme[d.metier + '|' + d.armes];
    r.ok(!!row, tag + ' métier/arme issus de la table (' + d.metier + ' / ' + d.armes + ')');
    if (row) {
      r.ok(d.equipement.indexOf(row.equipement) !== -1,
        tag + ' équipement du métier présent');
    }
    r.ok(d.equipement.split('\n').length >= 4,
      tag + ' équipement : 3 objets tirés + métier (' + d.equipement.split('\n').length + ' lignes)');

    /* Trésor : 5d12 */
    const m = /^5d12 pc = (\d+) pc$/.exec(d.tresor);
    r.ok(!!m, tag + ' trésor format 5d12 (' + d.tresor + ')');
    if (m) {
      const total = parseInt(m[1], 10);
      r.ok(total >= 5 && total <= 60, tag + ' trésor entre 5 et 60 (' + total + ')');
    }

    /* Portrait indexé dans le catalogue et cohérent avec le métier */
    const idx = parseInt(d.portrait_index, 10);
    r.ok(idx >= 0 && idx < funnel.lvl0.length, tag + ' portrait dans le catalogue (' + d.portrait_index + ')');
    const mapped = portraitsByMetier[R.norm(d.metier)];
    if (mapped) {
      r.ok(mapped.indexOf(idx) !== -1, tag + ' portrait du métier (' + d.metier + ')');
    }

    /* CàC / distance : un seul côté renseigné */
    const w = R.weaponInfo(d.armes);
    if (w.ranged) {
      r.eq(d.degats_cac, '', tag + ' arme de distance → dégâts CàC vides');
      r.eq(d.degats_distance, R.damageWithMod(w.degats, R.statMod(d.agilite)),
        tag + ' dégâts distance = dé + mod AGI');
    } else {
      r.eq(d.degats_distance, '', tag + ' arme de CàC → dégâts distance vides');
      r.eq(d.degats_cac, R.damageWithMod(w.degats, R.statMod(d.force)),
        tag + ' dégâts CàC = dé + mod FOR');
    }
    r.eq(d.attaque_cac, R.formatBonus(R.statMod(d.force)), tag + ' attaque CàC = mod FOR');
    r.eq(d.att_distance, R.formatBonus(R.statMod(d.agilite)), tag + ' attaque distance = mod AGI');
  }
}

/* ------------------------------------------------------------------ *
 * 6. Promotion niveau 0 → niveau 1
 * ------------------------------------------------------------------ */
function testPromote(r, env, R) {
  const funnel = env.window.FunnelIcons;
  const d = R.roll(rngFrom(42), funnel);

  /* Valeurs que le tirage niveau 0 ne produit pas : elles doivent
     SURVIVRE à la promotion (décision : fiche intégrale sauf portrait) */
  d.titre = 'Épée brisée';
  d.alignement = 'Chaotique';
  d.armure = 'Cuir souple';
  d.attaque = '+1';
  d.des_critique = 'd12';
  d.table_critique = 'II';
  d.js_reflexe = '+3';
  d.js_vigueur = '+2';
  d.js_volonte = '-1';
  d.cle_experimentale = 'conservée'; /* clé hors liste : rien ne se perd */

  const p = R.promote(d);

  /* Recopie intégrale : tout part tel quel, sauf niveau et portrait */
  Object.keys(d).forEach(function (key) {
    if (key === 'niveau' || key === 'portrait_source' || key === 'portrait_index') return;
    r.eq(p[key], d[key], 'promotion recopie ' + key);
  });
  r.ok(Object.keys(p).length >= Object.keys(d).length, 'aucune clé perdue à la promotion');

  r.eq(p.niveau, '1', 'niveau 1');
  r.eq(p.px, '0', 'PX remis à 0');

  /* Seuls éléments réécrits : le portrait */
  r.eq(p.portrait_source, '', 'portrait retiré (source)');
  r.eq(p.portrait_index, '0', 'portrait retiré (index)');

  /* Les anciens champs « vides » sont désormais conservés */
  r.eq(p.js_reflexe, '+3', 'JS Ref conservé');
  r.eq(p.js_vigueur, '+2', 'JS Vig conservé');
  r.eq(p.js_volonte, '-1', 'JS Vol conservé');
  r.eq(p.titre, 'Épée brisée', 'titre conservé');
  r.eq(p.alignement, 'Chaotique', 'alignement conservé');
  r.eq(p.armure, 'Cuir souple', 'armure conservée');
  r.eq(p.attaque, '+1', 'attaque conservée');
  r.eq(p.des_critique, 'd12', 'dés de critique conservés');
  r.eq(p.table_critique, 'II', 'table critique conservée');
  r.eq(p.cle_experimentale, 'conservée', 'clé hors liste conservée');
  r.ok(!Object.prototype.hasOwnProperty.call(p, '_targetClass'), 'aucune clé technique dans les données');
}

/* ------------------------------------------------------------------ *
 * 7. Fiche classes/lvl0.js
 * ------------------------------------------------------------------ */
function testSheet(r) {
  const env = createEnv();
  env.loadClass('lvl0');
  const mod = env.window.DCCModules && env.window.DCCModules.lvl0;
  r.ok(!!mod, 'DCCModules.lvl0 exposé');
  if (!mod) return;
  r.ok(typeof mod.render === 'function', 'render est une fonction');
  r.ok(typeof mod.collectData === 'function', 'collectData est une fonction');

  const container = env.document.getElementById('root');
  mod.render(container, '9', {
    nom: 'Adrik Graybeard',
    metier: 'Bûcheron',
    niveau: '0',
    points_de_vie: '3',
    max_pv: '3',
    classe_armure: '11',
    attaque_cac: '+0',
    portrait_source: 'funnel',
    portrait_index: '3',
    notes: 'Infravision',
  });

  const keys = Array.prototype.slice.call(container.querySelectorAll('[data-key]'))
    .map(function (el) { return el.getAttribute('data-key'); });

  r.eq(container.querySelectorAll('.hit-die').length, 0, 'aucun dé de vie affiché (spec 2)');
  r.ok(keys.indexOf('lvl0-9-nom') !== -1, 'clé lvl0-9-nom');
  r.ok(keys.indexOf('lvl0-9-points_de_vie') !== -1, 'clé lvl0-9-points_de_vie');
  r.ok(keys.indexOf('lvl0-9-max_pv') !== -1, 'clé lvl0-9-max_pv');
  r.ok(keys.indexOf('lvl0-9-classe_armure') !== -1, 'clé lvl0-9-classe_armure');
  r.ok(keys.indexOf('lvl0-9-attaque_cac') !== -1, 'clé lvl0-9-attaque_cac');
  r.ok(keys.indexOf('lvl0-9-portrait_source') !== -1, 'clé lvl0-9-portrait_source');
  r.ok(keys.indexOf('lvl0-9-notes') !== -1, 'section Notes présente');
  r.ok(keys.every(function (k) { return k.indexOf('lvl0-9-') === 0; }), 'préfixe lvl0-9- partout');

  const notes = container.querySelector('[data-key="lvl0-9-notes"]');
  r.eq(notes ? notes.value : null, 'Infravision', 'valeur des notes rendue');

  const nom = container.querySelector('[data-key="lvl0-9-nom"]');
  nom.value = 'Roundtrip';
  const collected = mod.collectData(container);
  r.eq(collected.nom, 'Roundtrip', 'collectData renvoie le nom édité');
  r.eq(collected.notes, 'Infravision', 'collectData renvoie les notes');

  const viaHelper = collectSheetData('lvl0', '9', container);
  r.eq(viaHelper.nom, 'Roundtrip', 'collectSheetData (auto-save) renvoie le nom');
}

/* ------------------------------------------------------------------ *
 * 8. Registre des portraits : la source funnel est bien branchée
 * ------------------------------------------------------------------ */
function testPortraitRegistry(r) {
  const env = createEnv();
  ['dcc-icons.js', 'dd-red-box-icons.js', 'shadow-icons.js', 'shadowdark-icons.js',
    'comics-icons.js', 'gonzo-icons.js', 'osr-icons.js', 'funnel-icons.js',
    'portrait-icons.js'].forEach(function (f) { env.load(f); });

  const PS = env.window.PortraitSources;
  r.ok(Array.isArray(PS), 'window.PortraitSources exposé');
  if (!Array.isArray(PS)) return;

  r.eq(PS.length, 8, '8 sources de portraits (got ' + PS.length + ')');
  r.eq(PS[0].meta.key, 'dcc', 'source DCC toujours en tête (fallback inchangé)');
  r.ok(PS.some(function (ps) { return ps.meta && ps.meta.key === 'funnel'; }),
    'source funnel enregistrée dans PortraitSources');

  const lvl0 = env.window.getPortraitSrc('funnel', 'lvl0', 5);
  r.eq(lvl0.source, 'funnel', 'getPortraitSrc source = funnel');
  r.ok(lvl0.src !== '', 'portrait niveau 0 résolu (image non vide)');
  r.ok(/^icons\/funnel-tokens\/.+\.png$/.test(lvl0.src),
    'chemin du token niveau 0 (' + lvl0.src + ')');

  /* Le funnel n'apparait pas sur les fiches de classe, ni les classes sur lvl0 */
  PS.forEach(function (ps) {
    if (ps.meta.key === 'funnel') {
      r.eq(ps.clerc, undefined, 'funnel sans entrée clerc');
    } else {
      r.eq(ps.lvl0, undefined, 'source ' + ps.meta.key + ' sans entrée lvl0');
    }
  });

  const clerc = env.window.getPortraitSrc('dcc', 'clerc', 0);
  r.ok(clerc.src.indexOf('icons/dcc-pc-tokens/') === 0, 'portrait clerc inchangé (' + clerc.src + ')');
}

/* ------------------------------------------------------------------ *
 * 9. Câblage : index.html, style.css, script.js, API
 * ------------------------------------------------------------------ */
function testWiring(r) {
  const html = read('index.html');

  const iVoleur = html.indexOf('data-class="voleur"');
  const iLvl0 = html.indexOf('data-class="lvl0"');
  r.ok(iVoleur !== -1 && iLvl0 !== -1 && iLvl0 > iVoleur,
    'onglet « Niveau 0 » placé après Voleur');

  r.ok(html.indexOf('id="btn-lvl0-mobile"') !== -1, 'pastille mobile « Lvl 0 » dans le topbar');
  r.ok(html.indexOf('class="logo">Dungeon Crawl Classics</a>') < html.indexOf('id="btn-lvl0-mobile"'),
    'pastille à droite du titre');
  r.ok(html.indexOf('title="Niveau 0">Lvl 0</button>') !== -1, 'libellé de la pastille');

  ['lvl0-data.js', 'lvl0-roll.js', 'funnel-icons.js'].forEach(function (src) {
    r.ok(html.indexOf('<script src="' + src + '"></script>') !== -1, 'index.html charge ' + src);
  });
  r.ok(html.indexOf('funnel-icons.js') < html.indexOf('portrait-icons.js'),
    'funnel-icons.js chargé avant portrait-icons.js');
  r.ok(html.indexOf('lvl0-roll.js') < html.indexOf('script.js'),
    'lvl0-roll.js chargé avant script.js');

  const css = read('style.css');
  ['.tab-lvl0', '.btn-lvl0-mobile', '.btn-reroll', '.btn-promote', '.promo-class-list',
    '.promo-class-row', '.promo-delete-row'].forEach(function (sel) {
    r.ok(css.indexOf(sel + ' {') !== -1 || css.indexOf(sel + ',') !== -1,
      'style.css contient ' + sel);
  });
  const titleBlock = css.match(/\.sheet-title \{[^}]+\}/);
  r.ok(!!titleBlock, '.sheet-title block found');
  if (titleBlock) {
    /* Le nom doit occuper toute une ligne sous les boutons de l'en-tête */
    r.ok(titleBlock[0].indexOf('flex: 1 1 100%') !== -1,
      '.sheet-title occupe une ligne entière (flex: 1 1 100%)');
  }
  const headerBlock = css.match(/\.sheet-header \{[^}]+\}/);
  r.ok(!!headerBlock, '.sheet-header block found');
  if (headerBlock) {
    r.ok(headerBlock[0].indexOf('flex-wrap: wrap') !== -1,
      '.sheet-header autorise le passage à la ligne');
  }
  const mobileRule = css.match(/\.tab-lvl0 \{\s*display: none;/);
  r.ok(!!mobileRule, 'onglet masqué en mobile (pastille le remplace)');
  /* En PC l'onglet a le style commun des classes : pas d'accent « Equipe » */
  r.eq(css.indexOf('.tab-lvl0:hover'), -1, 'pas d\'accent hover sur l\'onglet Niveau 0');
  r.eq(css.indexOf('.tab-lvl0.active'), -1, 'pas d\'accent actif sur l\'onglet Niveau 0');
  r.eq(/\.tab-lvl0 \{\s*background: var\(--tab-active\)/.test(css), false,
    "l'onglet Niveau 0 n'a pas le fond de l'onglet Equipe");

  const js = read('script.js');

  /* En-tête : boutons d'abord, nom en DERNIERE ligne (jamais à côté) */
  const iToggle = js.indexOf('header.appendChild(toggleWrapper)');
  const iTitle = js.indexOf('header.appendChild(title)');
  r.ok(iToggle !== -1 && iTitle !== -1 && iToggle < iTitle,
    'nom ajouté après les boutons dans l\'en-tête');
  r.ok(js.indexOf('className: \'sheet-title\'') !== -1, 'nom du personnage en .sheet-title');
  ['rerollLvl0', 'promoteLvl0', 'showPromoteModal', 'randomPortraitFor',
    "switchTab('lvl0')"].forEach(function (needle) {
    r.ok(js.indexOf(needle) !== -1, 'script.js contient ' + needle);
  });
  /* Le pied de modale doit réutiliser la classe standard : sinon les boutons
     perdent la mise en forme de `.modal-actions button` (padding, font, case) */
  r.ok(js.indexOf("className: 'modal-actions'") !== -1,
    'modale promotion : pied standard .modal-actions');
  r.ok(js.indexOf('promo-actions') === -1, 'modale promotion : pas de pied de modale maison');
  r.ok(/const CLASSES = \[[^\]]*'lvl0'/.test(js), 'CLASSES contient lvl0');
  r.ok(/cls === 'lvl0'/.test(js), 'branches niveau 0 présentes dans script.js');
  r.ok(js.indexOf('DCCLvl0Roll.roll()') !== -1, 'la création lvl0 tire au sort');

  /* « Autre tirage » : présent seulement pendant la session de tirage */
  r.ok(js.indexOf("textContent: 'Autre tirage'") !== -1, 'libellé du bouton = « Autre tirage »');
  r.ok(js.indexOf("textContent: 'Retire'") === -1, 'ancien libellé « Retire » retiré');
  r.ok(js.indexOf('rollSessionId = res.character.id') !== -1, 'session de tirage ouverte à la création');
  r.ok(js.indexOf('rollSessionId = null') !== -1, 'session de tirage fermée en quittant la fiche');
  r.ok(/if \(rollSessionId !== null && charData\.id === rollSessionId\)/.test(js),
    'bouton conditionné à la session de tirage');
  r.ok(js.indexOf('if (rollSessionId !== null && charData.id !== rollSessionId) rollSessionId = null;') !== -1,
    'session fermée à l\'ouverture d\'un autre personnage');
  r.ok(js.indexOf("/* Retour a la liste = fin de la session de tirage */") !== -1,
    'session fermée au retour à la liste');
  r.ok(js.indexOf("/* Changer d'onglet = quitter la fiche = fin de la session de tirage */") !== -1,
    'session fermée au changement d\'onglet');
  r.ok(js.indexOf('rollSessionId = null') < js.indexOf("textContent: 'Autre tirage'"),
    'les sorties de fiche sont gérées avant le rendu de l\'entête');

  const php = read('api/characters.php');
  r.ok(php.indexOf("'lvl0'") !== -1, "api/characters.php accepte la classe 'lvl0'");

  const equipe = read('classes/equipe.js');
  r.ok(equipe.indexOf("lvl0: 'Niv.0'") !== -1, 'onglet Équipe connaît le libellé Niv.0');
}

module.exports = async function suite() {
  const r = createReporter('12-lvl0');

  let env;
  try {
    env = loadRoll();
  } catch (e) {
    r.fail('chargement des modules niveau 0: ' + e.message);
    return r;
  }

  const R = env.window.DCCLvl0Roll;
  r.ok(!!R, 'lvl0-roll.js : window.DCCLvl0Roll exposé');
  if (!R) return r;

  ['statMod', 'formatMod', 'formatBonus', 'raceOf', 'movementOf', 'languesOf', 'notesOf',
    'allowedClasses', 'weaponInfo', 'portraitIndexFor', 'roll', 'promote'].forEach(function (fn) {
    r.ok(typeof R[fn] === 'function', 'DCCLvl0Roll.' + fn + ' est une fonction');
  });

  testData(r, env);
  testStatMod(r, R);
  testRace(r, R);
  testWeapons(r, R);
  testRoll(r, env, R);
  testPromote(r, env, R);
  testSheet(r);
  testPortraitRegistry(r);
  testWiring(r);

  r.ok(exists('tools/build-lvl0-data.js'), 'générateur présent (tools/build-lvl0-data.js)');

  return r;
};
