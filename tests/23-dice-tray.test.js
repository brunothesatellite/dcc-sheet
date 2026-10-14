'use strict';

/* Dice Tray : coquille de l'overlay #dice-module (dice-tray.js) —
   evolution 13/10/2026, plan2/PLAN-DICE-TRAY.md § 4.6.
   jsdom n'a ni WebGL ni import() dynamique : le moteur echoue proprement
   (C8 : toast + fermeture propre) et les tests portent sur la coquille —
   creation du DOM, fermeture = hidden, reouverture sans reconstruction,
   zéro appel réseau / zéro ecriture localStorage hors dicebox.sound (R7).
   node --check de dice-tray.js est couvert par la suite 01-syntax
   (racine) ; ici on couvre les fichiers ESM de dice/, non scannes par 01. */

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { JSDOM } = require('jsdom');
const { createReporter } = require('./helpers/assert');
const { ROOT, read, exists, createEnv } = require('./helpers/env');

function dumpLS(win) {
  const out = {};
  for (let i = 0; i < win.localStorage.length; i += 1) {
    const k = win.localStorage.key(i);
    out[k] = win.localStorage.getItem(k);
  }
  return JSON.stringify(out);
}

module.exports = function suite() {
  const r = createReporter('23-dice-tray');
  const html = read('index.html');
  const page = new JSDOM(html).window.document;

  /* --- 1. Bouton « Dés » de la topbar (R2, V2) ----------------------- */
  const btnDes = page.querySelector('#btn-des');
  if (r.ok(!!btnDes, '#btn-des present dans index.html')) {
    r.eq(btnDes.className, 'dice-toggle', '#btn-des : classe .dice-toggle');
    r.ok(!!btnDes.querySelector('svg'), "#btn-des : icone SVG inline (pas d'emoji)");
    const btnCarte = page.querySelector('#btn-carte');
    r.ok(!!btnCarte && !!(btnDes.compareDocumentPosition(btnCarte) & 4),
      '#btn-des place avant #btn-carte dans la topbar');
    r.ok(!btnDes.hasAttribute('hidden') &&
      !/(display|visibility)\s*:\s*hidden|display\s*:\s*none/.test(btnDes.getAttribute('style') || ''),
      '#btn-des visible pour tous, invitus compris (V2)');
  }

  /* --- 2. Menu utilisateur : 2 entrees avant « Changer de theme » ---- */
  const menu = page.querySelector('#user-menu');
  if (r.ok(!!menu, '#user-menu present')) {
    const actions = Array.prototype.map.call(
      menu.querySelectorAll('button[data-action]'),
      function (b) { return b.getAttribute('data-action'); });
    r.eq(actions.slice(0, 3).join(', '), 'class-ref, toggle-theme, change-theme',
      'menu : reference + bascule au-dessus du selecteur de couples (R1, V1)');
    const refBtn = menu.querySelector('button[data-action="class-ref"]');
    const togBtn = menu.querySelector('button[data-action="toggle-theme"]');
    r.ok(!!refBtn && refBtn.textContent === 'Référence',
      'libelle court « Référence » (tenue sur une ligne, mobile)');
    r.ok(!!togBtn && togBtn.textContent === 'Mode Sombre' &&
      togBtn.getAttribute('aria-label') === 'Passer en mode sombre',
      'entree bascule : libelle « Mode Sombre » (theme clair) + aria-label');
    const changeBtn = menu.querySelector('button[data-action="change-theme"]');
    const after = changeBtn && changeBtn.nextElementSibling;
    r.ok(!!after && after.tagName === 'HR', 'separateur <hr> apres « Changer de theme » (A3)');
    r.ok(actions.indexOf('export-all') !== -1 && actions.indexOf('logout') !== -1,
      'entrees existantes conservees');
  }

  /* --- 3. Ressources referencees dans index.html --------------------- */
  r.ok(html.indexOf('src="dice-tray.js"') !== -1, 'dice-tray.js reference dans index.html');
  r.ok(html.indexOf('href="dice/dice.css"') !== -1, 'dice/dice.css reference dans index.html');
  r.ok(html.indexOf('src="dice-tray.js"') < html.indexOf('src="script.js"'),
    'dice-tray.js charge avant script.js');
  r.ok(exists('dice-tray.js') && exists('dice/app.js') && exists('dice/dice.css') &&
    exists('dice/lib/three.module.min.js') && exists('dice/LICENSE'),
    'fichiers du portage presents sur disque');

  /* --- 4. Syntaxe + resolution des imports du portage (ESM, non
         scannes par 01-syntax). Le controle d'existence aurait attrapé
         le 404 du 14/10 : '../lib/' depuis dice/ resolvait a la racine
         (/lib/three.module.min.js) au lieu de dice/lib/. --------------- */
  const diceFiles = ['app.js', 'config.js', 'dice3d.js', 'rng.js', 'solids.js',
    'sound.js', 'textures.js', 'thumbs.js', 'total.js', 'tray.js'];
  diceFiles.forEach(function (f) {
    const p = spawnSync('node', ['--check', 'dice/' + f], {
      cwd: ROOT, encoding: 'utf8', shell: false, windowsHide: true,
    });
    r.ok(p.status === 0, 'node --check dice/' + f + (p.status === 0 ? '' : ' -> ' + p.stderr));
  });
  const importRe = /(?:from\s+|import\s*\(\s*)['"](\.[^'"]+)['"]/g;
  diceFiles.forEach(function (f) {
    const src = read('dice/' + f);
    let m;
    while ((m = importRe.exec(src)) !== null) {
      r.ok(fs.existsSync(path.resolve(ROOT, 'dice', m[1])),
        'dice/' + f + ' : import ' + m[1] + ' resolu sur disque');
    }
  });

  /* --- 5. CSS : coquille scopee (C4) + topbar / menu (R1, V3) -------- */
  const diceCss = read('dice/dice.css');
  let bal = 0;
  for (let i = 0; i < diceCss.length; i += 1) {
    if (diceCss[i] === '{') bal += 1;
    else if (diceCss[i] === '}') bal -= 1;
  }
  r.ok(bal === 0, 'dice/dice.css : accolades equilibrees');
  r.ok(!/^\s*(html|body|\*)\s*[,{]/m.test(diceCss),
    'dice/dice.css : aucune regle globale non scopee sous #dice-module (C4)');
  r.ok(diceCss.indexOf('#dice-module') !== -1, 'dice/dice.css : scope #dice-module present');
  /* #dice-module declare display:flex : sans la regle [hidden] dediee,
     hidden=true ne masquerait rien (l'auteur bat la regle UA) — bug vu le
     14/10 : le tray restait affiche apres echec du moteur. */
  r.ok(/#dice-module\[hidden\]\s*\{[^}]*display\s*:\s*none\s*!important/.test(diceCss),
    'dice/dice.css : #dice-module[hidden] masque reellement la coquille');
  /* Les commentaires sont exclus : les notes de portage mentionnent la
     syntaxe retiree sans l'utiliser. */
  r.ok(!/env\(safe-area/.test(diceCss.replace(/\/\*[\s\S]*?\*\//g, '')),
    'dice/dice.css : aucun env(safe-area) — insets fantomes sous l APK (MAJ 14/10)');

  const styleCss = read('style.css');
  r.ok(/\.dice-toggle\s*\{/.test(styleCss), 'style.css : regle .dice-toggle (topbar)');
  r.ok(/\.theme-toggle,\s*\.ref-toggle\s*\{\s*display:\s*none;/.test(styleCss),
    'style.css : .theme-toggle + .ref-toggle masques en <=600px (V3)');
  r.ok(styleCss.indexOf('button[data-action="class-ref"]::before') !== -1,
    'style.css : icone livre ::before sur « Référence »');
  r.ok(styleCss.indexOf('#user-menu button[data-action="toggle-theme"]::before') !== -1 &&
    styleCss.indexOf('content: "☾"') !== -1,
    'style.css : icone ☾ en ::before sur la bascule (replaces le disque, rev. 4)');
  r.ok(styleCss.indexOf('html[data-theme="dark"] #user-menu button[data-action="toggle-theme"]::before') !== -1 &&
    styleCss.indexOf('content: "☀"') !== -1,
    'style.css : ::before de la bascule passe a ☀ en theme sombre');

  /* --- 6. Cycle de vie de la coquille (R6, C8) ----------------------- */
  const env = createEnv();
  const win = env.window;
  const doc = env.document;

  /* jsdom n'a pas de WebGL : on evite le jsdomError de getContext. */
  win.HTMLCanvasElement.prototype.getContext = function () { return null; };

  const toasts = [];
  win.showToast = function (msg, type) { toasts.push(String(msg) + '|' + (type || '')); };

  const fetches = [];
  win.fetch = function (url) {
    fetches.push(String(url));
    return Promise.reject(new Error('reseau desactive dans les tests'));
  };

  const lsBefore = dumpLS(win);
  const lsWrites = [];
  const origSetItem = win.Storage.prototype.setItem;
  win.Storage.prototype.setItem = function (k, v) {
    lsWrites.push(k);
    return origSetItem.call(this, k, v);
  };

  env.load('dice-tray.js');

  const tray = win.DCCDiceTray;
  if (!r.ok(!!tray && typeof tray.open === 'function' &&
    typeof tray.close === 'function' && typeof tray.isOpen === 'function',
    'window.DCCDiceTray expose (open/close/isOpen)')) {
    return r;
  }

  tray.open();
  const moduleEl = doc.querySelector('#dice-module');
  if (!r.ok(!!moduleEl, 'open() : #dice-module cree et injecte dans le body')) return r;
  r.ok(!!moduleEl.querySelector('#dt-close'), 'coquille : croix #dt-close');
  r.ok(!!moduleEl.querySelector('#dice-picker'), 'coquille : #dice-picker');
  r.ok(!!moduleEl.querySelector('#dice-tray'), 'coquille : #dice-tray');
  r.ok(!!moduleEl.querySelector('#dice-soundBtn'), 'coquille : #dice-soundBtn (bascule muet, § 5)');
  r.ok(!!moduleEl.querySelector('#dice-helpBtn'), 'coquille : #dice-helpBtn');
  r.ok(!!moduleEl.querySelector('#dice-rollBtn'), 'coquille : #dice-rollBtn');
  r.ok(!!moduleEl.querySelector('#dice-rollBtn svg circle'),
    'coquille : icone d6 a pips sur « Lancer » (C13, MAJ 14/10)');
  const clearBtn = moduleEl.querySelector('#dice-clearBtn');
  r.ok(!!clearBtn, 'coquille : #dice-clearBtn');
  /* Le libelle est masque en mobile compact (maquette 03, note 6) :
     l'aria-label garantit le nom quel que soit l'etat visuel. */
  r.ok(!!clearBtn && clearBtn.getAttribute('aria-label') === 'Vider',
    'bouton Vider : aria-label stable (icone seule en <=480px)');
  r.ok(!!moduleEl.querySelector('#dice-total'), 'coquille : #dice-total');
  r.ok(!!moduleEl.querySelector('#dice-hint'), 'coquille : etat « tapis vide » (maquette 03)');
  r.ok(!!moduleEl.querySelector('#dice-helpModal'), "coquille : modale d'aide des gestes");
  r.ok(!!moduleEl.querySelector('#dice-helpModal .dice-row #dice-hClose'),
    'coquille : #dice-hClose dans .dice-row (.row renommee, C4)');
  r.eq(moduleEl.querySelector('#dice-helpModal').hidden, true, "modale d'aide fermee au demarrage");
  r.ok(toasts.some(function (t) { return /indisponibles/.test(t); }),
    'open() : echec WebGL signale par toast puis fermeture propre (C8)');

  /* Fermeture = masquage seul, le nœud est conserve (R6) */
  tray.close();
  r.eq(moduleEl.hidden, true, 'close() : hidden === true');
  r.eq(tray.isOpen(), false, 'close() : isOpen() false');
  r.ok(doc.body.contains(moduleEl), 'close() : nœud conserve dans le body (pas de destruction)');

  tray.open();
  r.ok(doc.querySelector('#dice-module') === moduleEl,
    'reouverture : meme nœud DOM (pas de reconstruction)');
  tray.close();
  r.eq(moduleEl.hidden, true, 'seconde fermeture : hidden === true');

  /* --- 7. Aucune persistance, aucun reseau (R7) ---------------------- */
  r.ok(fetches.length === 0, 'aucun appel api/* au cycle ouverture/fermeture');
  r.ok(dumpLS(win) === lsBefore, 'localStorage inchange apres ouverture/fermeture');
  const odd = lsWrites.filter(function (k) { return k !== 'dicebox.sound'; });
  r.ok(odd.length === 0, 'aucune ecriture localStorage hors dicebox.sound (restees : ' +
    (odd.join(', ') || 'aucune') + ')');

  /* --- 8. Entree Clair/Sombre dynamique : libelle « Mode Sombre » /
         « Mode Clair » (toujours le mode cible) + icone ☾/☀ en ::before
         pilotee par [data-theme] (script.js reel + toggleTheme) -------- */
  const env2 = createEnv();
  env2.document.body.innerHTML =
    '<button class="theme-toggle"></button>' +
    '<div id="user-menu"><button data-action="toggle-theme" title="Passer en mode sombre"' +
    ' aria-label="Passer en mode sombre">Mode Sombre</button></div>';
  /* Stub reseau minimal : init() ne se declenche qu'apres le corps
     synchrone (DOMContentLoaded) ; on pilote via toggleTheme direct. */
  env2.window.fetch = function () {
    return Promise.resolve({ ok: true, json: async function () { return {}; } });
  };
  env2.load('script.js');
  const togBtn2 = env2.document.querySelector('#user-menu button[data-action="toggle-theme"]');
  const topBtn2 = env2.document.querySelector('.theme-toggle');
  env2.window.toggleTheme(); /* -> sombre */
  r.ok(togBtn2.textContent === 'Mode Clair' &&
    togBtn2.getAttribute('aria-label') === 'Passer en mode clair' &&
    topBtn2.textContent === '\u2600',
    'theme sombre : libelle « Mode Clair » (cible) + icone ☀ / pastille ☀');
  env2.window.toggleTheme(); /* -> clair */
  r.ok(togBtn2.textContent === 'Mode Sombre' &&
    togBtn2.getAttribute('aria-label') === 'Passer en mode sombre' &&
    topBtn2.textContent === '\u263E',
    'retour theme clair : libelle « Mode Sombre » (cible) + icone ☾ / pastille ☾');

  return r;
};
