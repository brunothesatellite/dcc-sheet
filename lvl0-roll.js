/**
 * DCC Niveau 0 — moteur de tirage aléatoire (PUR, sans DOM).
 *
 * window.DCCLvl0Roll = {
 *   statMod, formatMod, formatBonus, raceOf, languageOf, movementOf, languesOf,
 *   notesOf, allowedClasses, weaponInfo, portraitIndexFor, roll, promote
 * }
 *
 * Toute fonction accepte un générateur aléatoire injectable (`rng`) :
 * les tests passent un RNG déterministe. Par défaut : Math.random.
 *
 * Sources de données : window.DCCLvl0Data (lvl0-data.js) et
 * window.FunnelIcons (funnel-icons.js) — voir tools/build-lvl0-data.js.
 */
(function () {
  'use strict';

  var RACES = ['elfe', 'nain', 'halfelin'];

  /* ------------------------------------------------------------ utilitaires */

  function data() {
    return window.DCCLvl0Data || { noms: [], metiers: [], chance: [], equipement: [] };
  }

  function defaultRng() { return Math.random(); }

  /* Entier entre min et max INCLUS */
  function randInt(rng, min, max) {
    return min + Math.floor(rng() * (max - min + 1));
  }

  function pick(list, rng) {
    if (!list || list.length === 0) return '';
    return list[randInt(rng, 0, list.length - 1)];
  }

  /* n tirages distincts (ou moins si la liste est plus courte) */
  function pickDistinct(list, count, rng) {
    var pool = (list || []).slice();
    var out = [];
    while (out.length < count && pool.length > 0) {
      var i = randInt(rng, 0, pool.length - 1);
      out.push(pool[i]);
      pool.splice(i, 1);
    }
    return out;
  }

  /* Texte insensible à la casse / aux accents / aux apostrophes */
  function norm(s) {
    return String(s == null ? '' : s)
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[\u2019\u02bc]/g, "'")
      .replace(/\s+/g, ' ')
      .trim();
  }

  /* --------------------------------------------------- caractéristiques */

  /* Barème DCC : 3 => -3, 4-5 => -2, 6-8 => -1, 9-12 => 0,
     13-15 => +1, 16-17 => +2, 18 => +3 */
  function statMod(value) {
    var v = parseInt(value, 10);
    if (!isFinite(v)) return 0;
    if (v <= 3) return -3;
    if (v <= 5) return -2;
    if (v <= 8) return -1;
    if (v <= 12) return 0;
    if (v <= 15) return 1;
    if (v <= 17) return 2;
    return 3;
  }

  /* "+1" / "0" / "-2" : format des modificateurs affichés dans les champs */
  function formatMod(mod) {
    var m = parseInt(mod, 10) || 0;
    return m > 0 ? '+' + m : String(m);
  }

  /* "+0" / "+1" / "-2" : notation des bonus (champ « Attaque », attaques) */
  function formatBonus(mod) {
    var m = parseInt(mod, 10) || 0;
    return m >= 0 ? '+' + m : String(m);
  }

  /* ---------------------------------------------------------------- race */

  /* Décision Q8 : « commence par » elfe / nain / halfelin (casse indifférente) */
  function raceOf(metier) {
    var m = norm(metier);
    if (!m) return null;
    for (var i = 0; i < RACES.length; i++) {
      if (m.indexOf(RACES[i]) === 0) return RACES[i];
    }
    return null;
  }

  function languageOf(race) {
    if (race === 'elfe') return 'elfique';
    return race || '';
  }

  function movementOf(metier) {
    var race = raceOf(metier);
    return (race === 'nain' || race === 'halfelin') ? '20' : '30';
  }

  function languesOf(metier) {
    var race = raceOf(metier);
    var langues = ['commun'];
    if (race) langues.push(languageOf(race));
    return langues.join(', ');
  }

  function notesOf(metier) {
    var race = raceOf(metier);
    if (race === 'nain' || race === 'halfelin') return 'Infravision';
    if (race === 'elfe') return 'Sens très développés et sensibles au fer';
    return '';
  }

  /* Classes disponibles à la promotion (spec 6) */
  function allowedClasses(metier) {
    var race = raceOf(metier);
    if (race) return [race];
    return ['clerc', 'guerrier', 'mage', 'voleur'];
  }

  /* ---------------------------------------------------------------- arme */

  /* Décision Q5 : une plage chiffrée x/y/z (3/6/9, 15/30/45…) = arme de
     distance ; "1d4/1d10" est de la notation de dégâts (2 jetons) = CàC. */
  function isRanged(text) {
    return /\b\d+\/\d+\/\d+\b/.test(String(text || ''));
  }

  /* Premier dé trouvé dans la description, normalisé ("1d4") */
  function firstDie(text) {
    var m = /(\d+)\s*d\s*(\d+)/i.exec(String(text || ''));
    if (!m) return '';
    return m[1] + 'd' + m[2];
  }

  function weaponInfo(arme) {
    var text = String(arme || '');
    return {
      ranged: isRanged(text),
      degats: firstDie(text),
    };
  }

  /* Dégât + modificateur : "1d6", "1d4+1", "1d4-2" (mod nul → dé seul) */
  function damageWithMod(die, mod) {
    if (!die) return '';
    var m = parseInt(mod, 10) || 0;
    return m === 0 ? die : die + formatMod(m);
  }

  /* ----------------------------------------------------------- portraits */

  /* Index dans FunnelIcons.lvl0 pour un métier donné (échantillon aléatoire).
     Métier absent du catalogue → portrait pris au hasard parmi tous les tokens. */
  function portraitIndexFor(metier, rng, funnel) {
    funnel = funnel || window.FunnelIcons;
    var pool = [];
    if (funnel && Array.isArray(funnel.lvl0)) {
      var normalized = {};
      if (funnel.byMetier) {
        Object.keys(funnel.byMetier).forEach(function (key) {
          normalized[norm(key)] = funnel.byMetier[key];
        });
      }
      var hits = normalized[norm(metier)];
      if (Array.isArray(hits) && hits.length > 0) pool = hits;
      else pool = funnel.lvl0.map(function (_, i) { return i; });
    }
    if (pool.length === 0) return 0;
    return pool[randInt(rng, 0, pool.length - 1)];
  }

  /* ------------------------------------------------------------- tirage */

  /* 3d6 */
  function roll3d6(rng) {
    return randInt(rng, 1, 6) + randInt(rng, 1, 6) + randInt(rng, 1, 6);
  }

  /* Tirage complet d'un personnage de niveau 0 (objets = chaînes, comme
     les champs de saisie de la fiche). */
  function roll(rng, funnel) {
    rng = rng || defaultRng;
    var src = data();

    var metierRow = pick(src.metiers, rng) || { metier: '', arme: '', equipement: '' };
    var metier = metierRow.metier || '';
    var force = roll3d6(rng);
    var agilite = roll3d6(rng);
    var endurance = roll3d6(rng);
    var presence = roll3d6(rng);
    var chance = roll3d6(rng);
    var intelligence = roll3d6(rng);

    var forceMod = statMod(force);
    var agiliteMod = statMod(agilite);
    var enduranceMod = statMod(endurance);
    var presenceMod = statMod(presence);
    var chanceMod = statMod(chance);
    var intelligenceMod = statMod(intelligence);

    var w = weaponInfo(metierRow.arme);

    /* PV max : 1d4 + mod END — plancher à 1 (personnage non né mort) */
    var pvMax = Math.max(1, randInt(rng, 1, 4) + enduranceMod);

    var equipItems = pickDistinct(src.equipement, 3, rng);
    if (metierRow.equipement) equipItems.push(metierRow.equipement);

    var tresor = 0;
    for (var i = 0; i < 5; i++) tresor += randInt(rng, 1, 12);

    var portraitIndex = portraitIndexFor(metier, rng, funnel);

    return {
      nom: pick(src.noms, rng) || 'Sans nom',
      titre: '',
      metier: metier,
      alignement: '',
      mouvement: movementOf(metier),
      niveau: '0',
      px: '0',

      classe_armure: String(10 + agiliteMod),
      points_de_vie: String(pvMax),
      max_pv: String(pvMax),

      initiative: agiliteMod === 0 ? '1d20' : '1d20' + formatMod(agiliteMod),
      des_action: '1d20',
      attaque: '+0',
      des_critique: 'd4',
      table_critique: 'I',

      force: String(force),
      force_mod: formatMod(forceMod),
      agilite: String(agilite),
      agilite_mod: formatMod(agiliteMod),
      endurance: String(endurance),
      endurance_mod: formatMod(enduranceMod),
      presence: String(presence),
      presence_mod: formatMod(presenceMod),
      chance: String(chance),
      chance_mod: formatMod(chanceMod),
      intelligence: String(intelligence),
      intelligence_mod: formatMod(intelligenceMod),

      /* Décision Q3 bis : les jets de sauvegarde valent les modificateurs */
      js_reflexe: formatMod(agiliteMod),
      js_vigueur: formatMod(enduranceMod),
      js_volonte: formatMod(presenceMod),

      jet_chanceux: pick(src.chance, rng) || '',
      langues: languesOf(metier),

      attaque_cac: formatBonus(forceMod),
      degats_cac: w.ranged ? '' : damageWithMod(w.degats, forceMod),
      att_distance: formatBonus(agiliteMod),
      degats_distance: w.ranged ? damageWithMod(w.degats, agiliteMod) : '',

      armes: metierRow.arme || '',
      equipement: equipItems.join('\n'),
      tresor: tresor + ' pc',
      armure: '',

      portrait_source: 'funnel',
      portrait_index: String(portraitIndex),

      notes: notesOf(metier),
    };
  }

  /* ---------------------------------------------------------- puissance */

  /* Somme des modificateurs des 6 caractéristiques : indicateur de synthese
     affiche en rouge a droite du nom sur la fiche de niveau 0 (et nulle part
     ailleurs) pour juger d'un coup d'oeil la puissance d'un tirage. */
  var POWER_STATS = ['force', 'agilite', 'endurance', 'presence', 'chance', 'intelligence'];

  function powerOf(data0) {
    var sum = 0;
    data0 = data0 || {};
    POWER_STATS.forEach(function (key) {
      sum += statMod(data0[key]);
    });
    return sum;
  }

  /* ---------------------------------------------------------- promotion */

  /* Décision (6 octobre) : la promotion recopie la fiche ENTIERE, à
     l'exception du portrait (tire pour la classe choisie) :
     - rien n'est ecrase (JS, titre, alignement, armure, attaque,
       des/table de critique, et toute cle hors liste survivent) ;
     - seuls `niveau` (-> 1) et le portrait sont reecrits. */
  function promote(data0) {
    var out = {};
    data0 = data0 || {};
    Object.keys(data0).forEach(function (key) {
      out[key] = data0[key];
    });

    out.niveau = '1';
    out.px = data0.px || '0';

    /* Portrait retire : tire pour la classe par l'appelant */
    out.portrait_source = '';
    out.portrait_index = '0';

    return out;
  }

  window.DCCLvl0Roll = {
    RACES: RACES,
    statMod: statMod,
    formatMod: formatMod,
    formatBonus: formatBonus,
    norm: norm,
    raceOf: raceOf,
    languageOf: languageOf,
    movementOf: movementOf,
    languesOf: languesOf,
    notesOf: notesOf,
    allowedClasses: allowedClasses,
    isRanged: isRanged,
    firstDie: firstDie,
    weaponInfo: weaponInfo,
    damageWithMod: damageWithMod,
    powerOf: powerOf,
    portraitIndexFor: portraitIndexFor,
    roll: roll,
    promote: promote,
  };
})();
