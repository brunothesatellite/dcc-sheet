'use strict';

/* Garde des portraits (portrait-guard.js) : quand le dossier d'une source
   n'est pas installe sur le serveur (droits), afficher un placeholder
   « Aucune image disponible » (SVG inline, ZERO requete / 404) sur la fiche,
   les cartes et l'onglet Equipe, plus un message explicite dans le selecteur
   de portraits vide.
   Module OPTIONNEL : absent -> comportement historique (images telles quelles). */

const { createReporter } = require('./helpers/assert');
const { createEnv, read } = require('./helpers/env');

function loadGuard() {
  const env = createEnv();
  ['dcc-icons.js', 'dd-red-box-icons.js', 'shadow-icons.js', 'shadowdark-icons.js',
    'comics-icons.js', 'gonzo-icons.js', 'osr-icons.js', 'funnel-icons.js',
    'portrait-icons.js', 'portrait-guard.js'].forEach(function (f) { env.load(f); });
  return env;
}

module.exports = function suite() {
  const r = createReporter('13-portrait-guard');

  /* --- 0. Module optionnel ------------------------------------------- */
  const bare = createEnv();
  r.eq(bare.window.DCCPortraitGuard, undefined, 'module absent = comportement historique');

  const env = loadGuard();
  const G = env.window.DCCPortraitGuard;
  r.ok(!!G, 'window.DCCPortraitGuard exposé');
  if (!G) return r;

  ['setDirs', 'getDirs', 'folderOf', 'has', 'isMissing', 'isMissingSrc',
    'placeholder', 'emptyMessage'].forEach(function (fn) {
    r.ok(typeof G[fn] === 'function', 'DCCPortraitGuard.' + fn + ' est une fonction');
  });

  /* --- 1. Dossiers : source -> nom de dossier ------------------------ */
  r.eq(G.folderOf('funnel'), 'funnel-tokens', "folderOf('funnel')");
  r.eq(G.folderOf('dcc'), 'dcc-pc-tokens', "folderOf('dcc')");
  r.eq(G.folderOf('gonzo'), 'gonzo', "folderOf('gonzo')");
  r.eq(G.folderOf('inconnu'), '', 'folderOf(source inconnue) = vide');

  /* --- 2. Etats : inconnu / present / absent -------------------------- */
  G.setDirs(null);
  r.eq(G.getDirs(), null, 'setDirs(null) → inconnu');
  r.eq(G.has('funnel'), true, 'inconnu → on affiche (pas de placeholder par erreur)');
  r.eq(G.isMissing('funnel'), false, 'inconnu → pas manquant');
  r.eq(G.isMissingSrc('icons/funnel-tokens/x.png'), false, 'inconnu → src non manquante');

  G.setDirs(['dcc-pc-tokens', 'gonzo', 'osr', 'shadow', 'shadowdark',
    'dd-red-box', 'jeff-stevens']);
  r.eq(G.has('funnel'), false, 'dossier funnel-tokens absent → false');
  r.eq(G.isMissing('funnel'), true, 'isMissing(funnel) = true');
  r.eq(G.isMissingSrc('icons/funnel-tokens/DCC_0-level_Alchemist_Female_280px.png'), true,
    'src funnel → manquante (aucune requete envoyée)');
  r.eq(G.isMissingSrc('icons/dcc-pc-tokens/DCC_PC_Cleric_Female_280px.png'), false,
    'src dcc → présente (inchangée)');
  r.eq(G.isMissingSrc('../dcc-spells-reader/pages/127.png'), false,
    'hors icons/ (lecteur de sorts) → jamais touché');
  r.eq(G.isMissingSrc('captures/choix-portrait.png'), false,
    'hors icons/ (captures) → jamais touché');
  r.eq(G.has('dcc'), true, 'dossier dcc présent → true');
  r.eq(G.has('gonzo'), true, 'autre dossier présent');
  r.eq(G.isMissing('osr'), false, 'osr présent dans dirs');
  r.eq(G.isMissing('funnel-tokens'), false,
    'nom de dossier passé à la place d’une source → inconnu → on affiche');

  G.setDirs(['funnel-tokens']);
  r.eq(G.has('funnel'), true, 'funnel installé → présent');
  r.eq(G.has('dcc'), false, 'dcc absent quand seul funnel est installé');

  /* --- 3. Placeholder : aucune requête, libellé partout --------------- */
  const ph = G.placeholder('portrait-img clickable', { showLabel: true });
  r.eq(ph.tagName, 'DIV', 'placeholder = <div> (pas de <img> → zéro 404)');
  r.ok(ph.className.indexOf('portrait-missing') !== -1, 'classe portrait-missing');
  r.ok(ph.className.indexOf('portrait-img') !== -1, 'classe de taille conservée');
  r.eq(ph.getAttribute('src'), null, 'aucun attribut src');
  r.eq(ph.getAttribute('role'), 'img', 'role=img');
  r.eq(ph.getAttribute('aria-label'), G.LABEL, 'aria-label partout');
  r.eq(ph.title, G.LABEL, 'title / infobulle partout');
  r.ok(!!ph.querySelector('svg'), 'silhouette SVG inline (aucune requête)');
  r.ok(!!ph.querySelector('.portrait-missing-text'), 'libellé visible (portrait de fiche)');

  const phSmall = G.placeholder('char-card-portrait');
  r.ok(phSmall.className.indexOf('portrait-missing') !== -1, 'vignette : classe ok');
  r.eq(phSmall.querySelector('.portrait-missing-text'), null,
    'vignette : pas de libellé visible (aria-label + title suffisent)');
  r.eq(phSmall.getAttribute('aria-label'), G.LABEL, 'vignette : libellé présent partout');

  /* --- 4. Message du selecteur vide ---------------------------------- */
  const lvl0Msg = G.emptyMessage('lvl0');
  r.ok(lvl0Msg.indexOf('niveau 0') !== -1, 'message lvl0 parle des portraits de niveau 0');
  r.ok(lvl0Msg.indexOf('droits') !== -1, 'message lvl0 explique la cause (droits)');
  r.eq(G.emptyMessage('clerc'), G.LABEL + '.', 'message générique pour une classe');

  /* --- 5. Câblage : index.html / script.js / equipe.js / style.css --- */
  const html = read('index.html');
  r.ok(html.indexOf('<script src="portrait-guard.js"></script>') !== -1,
    'index.html charge portrait-guard.js');
  r.ok(html.indexOf('portrait-guard.js') < html.indexOf('<script src="script.js">'),
    'portrait-guard.js chargé avant script.js');

  const js = read('script.js');
  ['initPortraitGuard', 'sweepPortraits', 'DCCPortraitGuard.setDirs',
    'guard.isMissing', 'guard.placeholder', 'portrait-picker-empty',
    'initPortraitGuard()'].forEach(function (needle) {
    r.ok(js.indexOf(needle) !== -1, 'script.js contient ' + needle);
  });
  /* Le 1er affichage attend la liste des dossiers (3 s max) : pas de 404 */
  r.ok(/Promise\.race\(\[\s*initPortraitGuard\(\)/.test(js),
    'premier affichage attend la liste des dossiers (timeout 3 s)');
  /* Balayage prudent : on ne touche ni aux data:, ni aux URL externes */
  r.ok(js.indexOf("src.indexOf('data:') === 0") !== -1, 'balayage ignore les data:');
  r.ok(js.indexOf("src.indexOf('http') === 0") !== -1, 'balayage ignore les URL externes');
  /* Le clic du portrait est delegate sur la zone (survit au remplacement) */
  r.ok(js.indexOf('area.addEventListener(\'click\'') !== -1,
    'clic du portrait délégué à la zone (placeholder cliquable)');

  const eq = read('classes/equipe.js');
  ["placeholder('team-portrait')", "placeholder('marching-portrait')",
    'DCCPortraitGuard.isMissing', "querySelector('.team-portrait')"].forEach(function (needle) {
    r.ok(eq.indexOf(needle) !== -1, 'equipe.js contient ' + needle);
  });
  r.ok(eq.indexOf("querySelector('img.team-portrait')") === -1,
    'equipe.js ne cible plus uniquement <img> (placeholder inclus)');

  const css = read('style.css');
  ['.portrait-missing {', '.portrait-missing svg {', '.portrait-missing-text {',
    '.portrait-picker-empty {'].forEach(function (sel) {
    r.ok(css.indexOf(sel) !== -1, 'style.css contient ' + sel);
  });
  const missingBlock = css.match(/\.portrait-missing \{[^}]+\}/);
  r.ok(!!missingBlock, '.portrait-missing block found');
  if (missingBlock) {
    r.ok(missingBlock[0].indexOf('border: 1px dashed') !== -1,
      'placeholder à bordure pointillée (visiblement différent d’une image)');
    r.ok(missingBlock[0].indexOf('flex-direction: column') !== -1,
      'placeholder en colonne (silhouette + libellé)');
  }

  return r;
};
