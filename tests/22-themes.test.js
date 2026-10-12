'use strict';

/* Couples de themes clair + sombre (17 couples) : l'utilisateur choisit
   un couple (apercu clair/sombre), le bouton theme bascule dans le couple,
   choix persiste en base (users.theme_pair, 'defaut' par defaut).
   Couverture : donnees CSS completes et hors-ligne, parite client/serveur
   (17 ids), endpoints et colonne, menu + dialogue + persistance. */

const { createReporter } = require('./helpers/assert');
const { ROOT, read, exists, createEnv } = require('./helpers/env');

const IDS = ['defaut', 'taverne', 'crypte', 'sylve', 'arcanes', 'brasier',
  'grimoire', 'papyrus', 'brume', 'herbier', 'cuir', 'cendre',
  'g-parchemin', 'g-crypte', 'g-enluminure', 'g-guerre', 'g-reliquaire'];
const CORE_VARS = ['--bg', '--paper', '--ink', '--muted', '--line', '--field-bg',
  '--input-border', '--header-bg', '--header-text', '--tab-bg', '--tab-active',
  '--accent', '--inn-bg', '--inn-border', '--green'];

function testCss(r) {
  if (!r.ok(exists('themes.css'), 'themes.css present')) return;
  const css = read('themes.css');

  const opens = (css.match(/\{/g) || []).length;
  const closes = (css.match(/\}/g) || []).length;
  r.eq(opens, closes, 'themes.css : accolades equilibrees (' + opens + '/' + closes + ')');

  IDS.forEach(function (id) {
    ['light', 'dark'].forEach(function (mode) {
      const re = new RegExp('html\\[data-pair="' + id + '"\\]\\[data-theme="' + mode + '"\\] \\{[^}]+\\}');
      const block = css.match(re);
      if (!r.ok(!!block, 'themes.css : bloc ' + id + '/' + mode)) return;
      CORE_VARS.forEach(function (v) {
        r.ok(block[0].indexOf(v + ':') !== -1, 'bloc ' + id + '/' + mode + ' : ' + v);
      });
      const pv = new RegExp('\\.theme-picker \\.pv\\[data-pair="' + id + '"\\]\\[data-mode="' + mode + '"\\] \\{[^}]+\\}');
      r.ok(pv.test(css), 'mini-apercu ' + id + '/' + mode + ' (independant du theme courant)');
    });
  });

  // hors-ligne strict : aucune URL http(s) en dehors des data-URI
  // (le xmlns http://... des SVG inline n'est pas un appel reseau)
  const noData = css.replace(/url\("data:[^"]*"\)/g, 'url(DATA)');
  r.ok(noData.indexOf('http://') === -1 && noData.indexOf('https://') === -1,
    'themes.css : zero URL externe (hors-ligne, APK compris)');
  const pngs = css.match(/textures\/[a-z-]+\.png/g) || [];
  const uniq = Array.from(new Set(pngs));
  r.ok(uniq.length === 5, '5 textures PNG referencees (got ' + uniq.length + ')');
  uniq.forEach(function (p) {
    r.ok(exists(p), 'texture presente sur disque : ' + p);
  });

  // builds : le dossier textures/ doit suivre partout (webapp, Windows, APK)
  ['deploy/_build.ps1', 'installeur/windows/build.ps1'].forEach(function (rel) {
    const m = read(rel).match(/\$excludeDirs\s*=\s*@\(([\s\S]*?)\)/);
    r.ok(!!m, rel + ' : liste excludeDirs lisible');
    if (m) {
      const dirs = m[1].split(',').map(function (s) {
        return s.trim().replace(/^['"]|['"]$/g, '');
      });
      r.ok(dirs.indexOf('textures') === -1, rel + ' : textures/ deploie (non exclu)');
    }
  });
  const syncAssets = read('installeur/android/_sync-assets.mjs');
  r.ok(syncAssets.indexOf("'textures'") === -1, 'sync APK : textures/ non exclu');
  r.ok(syncAssets.indexOf("'.png'") !== -1, 'sync APK : .png embarques');

  // polices : systeme ou familles chargees par index.html, rien d'exotique
  const fonts = css.match(/--font-heading: ([^;]+);/g) || [];
  fonts.forEach(function (decl) {
    r.ok(/Georgia|Cinzel|MedievalSharp|Uncial Antiqua|serif|sans-serif/i.test(decl),
      'police de couple : systeme ou webfont declaree (' + decl.slice(0, 60) + ')');
  });

  r.ok(/body \{[^}]*background-image: var\(--teximg, none\), var\(--vig, none\), var\(--noise, none\)/.test(css),
    'body : texture du couple avec replis (uni sinon)');
  r.ok(/body \{[^}]*background-blend-mode: var\(--tblend, normal\), normal, normal/.test(css),
    'body : --tblend vise la couche texture (meme ordre de couches)');

  // dosage par couple (12/10/2026) : lighten = taches claires sur fond clair,
  // screen = adoucit un motif sombre ou releve un grain sur fond sombre,
  // multiply = motif plus sombre que le fond (creme sur ivoire)
  const tblends = css.match(/--tblend: (lighten|screen|multiply);/g) || [];
  r.eq(tblends.length, 12, '6 couples doses x2 scopes (got ' + tblends.length + ')');
  r.ok(tblends.filter(function (t) { return t === '--tblend: lighten;'; }).length === 4,
    'lighten x4 (parchemin/reliquaire clairs x2 scopes)');
  r.ok(tblends.filter(function (t) { return t === '--tblend: screen;'; }).length === 6,
    'screen x6 (sorcier clair + guerre clair/sombre x2 scopes)');
  r.ok(tblends.filter(function (t) { return t === '--tblend: multiply;'; }).length === 2,
    'multiply x2 (enluminure clair x2 scopes)');
  const texsizes = css.match(/--texsize: \d+px;/g) || [];
  r.eq(texsizes.length, 6, 'tuiles densifiees x6 (parchemin/sorcier/guerre clairs x2 scopes)');
  r.ok(/body \{[^}]*background-size: var\(--texsize, auto\), auto, auto/.test(css),
    'body : --texsize ne vise que la couche texture');

  // pistes 3+4 (contrastes, sans commit) : verts uniformes WCAG + cas
  // crypte-sombre et onglets guerre-clair (fond sans compromis : 2,77 max)
  const greens = css.match(/--green: (#[0-9a-f]{6});/g) || [];
  r.eq(Array.from(new Set(greens)).sort().join(' '),
    '--green: #1e7e34; --green: #218838;',
    'piste 4 : verts uniformes (got ' + Array.from(new Set(greens)).join(' ') + ')');
  r.ok(css.indexOf('html[data-pair="g-crypte"][data-theme="dark"]') !== -1,
    'piste 3 : bloc g-crypte/dark present');
  const sheet = read('style.css');
  r.ok(sheet.indexOf('html[data-pair="g-guerre"][data-theme="light"] .tab') !== -1,
    'piste 3 : onglets inactifs guerre-clair en ivoire clair (5,03:1 mesure, fond sans compromis)');
  r.ok(sheet.indexOf('color: #f7ecd4') !== -1,
    'piste 3 : ivoire #f7ecd4 (le max mesurable sans denaturer le cuir)');
}

function testParity(r) {
  if (!exists('api/auth.php')) { r.fail('api/auth.php manquant'); return; }
  const php = read('api/auth.php');
  const m = php.match(/const THEME_PAIRS = \[([\s\S]*?)\];/);
  if (!r.ok(!!m, 'api/auth.php : allowlist THEME_PAIRS')) return;
  const ids = (m[1].match(/'([^']+)'/g) || []).map(function (s) { return s.slice(1, -1); });
  r.eq(JSON.stringify(ids), JSON.stringify(IDS), 'parite serveur : 17 ids (got ' + ids.length + ')');
  r.ok(php.indexOf("if ($action === 'theme_get')") !== -1, 'api/auth.php : action theme_get');
  r.ok(php.indexOf("if ($action === 'theme_save')") !== -1, 'api/auth.php : action theme_save');
  r.ok(php.indexOf('in_array($pair, THEME_PAIRS, true)') !== -1,
    'api/auth.php : validation stricte (jamais de valeur libre)');

  const db = read('api/db.php');
  r.ok(/ADD COLUMN theme_pair[^;]*DEFAULT/.test(db),
    'api/db.php : colonne users.theme_pair (defaut, migration douce)');
}

function stubFetch(env, handler) {
  env.window.fetch = function (url, opts) {
    return Promise.resolve(handler(String(url), opts));
  };
}

function jsonOk(payload) {
  return { ok: true, status: 200, json: async function () { return payload; } };
}

function testClient(r) {
  const env = createEnv();
  stubFetch(env, function () { return jsonOk({ ok: true, pair: 'defaut' }); });
  env.load('themes.js');
  const T = env.window.DCCThemes;
  if (!r.ok(!!T, 'window.DCCThemes expose')) return;

  r.eq(JSON.stringify(T.pairs.map(function (p) { return p.id; })), JSON.stringify(IDS),
    'client : 17 couples (got ' + T.pairs.length + ')');
  T.pairs.forEach(function (p) {
    r.ok(!!p.name && !!p.desc, 'couple ' + p.id + ' : nom + description');
  });

  // application + repli + persistance locale
  T.apply('crypte', 'dark');
  r.eq(env.document.documentElement.getAttribute('data-pair'), 'crypte', 'apply : data-pair');
  r.eq(env.document.documentElement.getAttribute('data-theme'), 'dark', 'apply : data-theme');
  r.eq(env.window.localStorage.getItem('dcc-theme-pair'), 'crypte', 'apply : localStorage pair');
  r.eq(env.window.localStorage.getItem('dcc-theme'), 'dark', 'apply : localStorage mode');
  T.apply('inexistant', 'nope');
  r.eq(env.document.documentElement.getAttribute('data-pair'), 'defaut', 'id inconnu -> defaut');
  r.eq(env.document.documentElement.getAttribute('data-theme'), 'light', 'mode inconnu -> light');
  var cur = T.current();
  r.eq(cur.pair, 'defaut', 'current() suit le DOM');

  // dialogue : 17 cartes, selection, validation (save serveur), annulation
  T.apply('defaut', 'light');
  T.openPicker();
  let ov = env.document.querySelector('.theme-overlay');
  if (!r.ok(!!ov, 'selecteur ouvert')) return;
  r.eq(ov.querySelectorAll('.theme-card').length, 17, '17 cartes (got ' +
    ov.querySelectorAll('.theme-card').length + ')');

  // cadrage a l'ouverture : scrollIntoView appele une fois, sur la carte
  // selectionnee (ici sylve). Sans scrollIntoView (vieux moteurs),
  // l'ouverture ne plante pas (couvert par les tests precedents).
  (function () {
    const env2 = createEnv();
    stubFetch(env2, function () { return jsonOk({ ok: true, pair: 'defaut' }); });
    env2.load('themes.js');
    const T2 = env2.window.DCCThemes;
    T2.apply('sylve', 'light');
    const seen = [];
    env2.window.Element.prototype.scrollIntoView = function (opts) {
      seen.push({ selected: this.classList.contains('selected'), opts: opts || null });
    };
    T2.openPicker();
    r.eq(seen.length, 1, 'cadrage : 1 appel scrollIntoView (got ' + seen.length + ')');
    if (seen.length === 1) {
      r.ok(seen[0].selected, 'cadrage : sur la carte selectionnee');
      r.eq(seen[0].opts && seen[0].opts.block, 'center', 'cadrage : centre verticalement');
    }
    delete env2.window.Element.prototype.scrollIntoView;
  })();
  r.eq(ov.querySelectorAll('.theme-seg button').length, 2, 'bascule Clair/Sombre');
  r.ok(!!ov.querySelector('.theme-card.selected .theme-check'), 'carte courante cochee');

  const cards = ov.querySelectorAll('.theme-card');
  cards[6].click(); // grimoire
  r.eq(env.document.documentElement.getAttribute('data-pair'), 'grimoire',
    'clic carte : apercu en direct');
  r.ok(ov.querySelectorAll('.theme-card.selected').length === 1, 'une seule carte cochee');

  const segDark = ov.querySelector('.theme-seg button[data-mode="dark"]');
  segDark.click();
  r.eq(env.document.documentElement.getAttribute('data-theme'), 'dark', 'bascule : mode sombre');

  // validation -> POST theme_save + toast + fermeture
  const calls = [];
  stubFetch(env, function (url, opts) {
    calls.push({ url: String(url), body: opts && opts.body });
    return jsonOk({ ok: true, pair: 'grimoire' });
  });
  env.window.showToast = function () {};
  ov.querySelector('.theme-valid').click();
  return new Promise(function (resolve) {
    setTimeout(function () {
      const save = calls.filter(function (c) { return c.url.indexOf('auth.php') !== -1; })[0];
      r.ok(!!save, 'validation : POST theme_save');
      if (save) {
        const body = JSON.parse(save.body);
        r.eq(body.pair, 'grimoire', 'validation : pair sauvegardee');
      }
      r.ok(!env.document.querySelector('.theme-overlay'), 'validation : dialogue ferme');
      r.eq(env.document.documentElement.getAttribute('data-pair'), 'grimoire',
        'validation : theme conserve');

      // annulation : restaure + ferme
      T.openPicker();
      const ov2 = env.document.querySelector('.theme-overlay');
      ov2.querySelectorAll('.theme-card')[3].click(); // sylve
      r.eq(env.document.documentElement.getAttribute('data-pair'), 'sylve', 'clic : apercu');
      ov2.querySelector('.theme-cancel').click();
      r.ok(!env.document.querySelector('.theme-overlay'), 'annulation : dialogue ferme');
      r.eq(env.document.documentElement.getAttribute('data-pair'), 'grimoire',
        'annulation : theme precedent restaure');
      resolve();
    }, 30);
  });
}

function testWiring(r) {
  const html = read('index.html');
  r.ok(html.indexOf('themes.css') !== -1, 'index.html charge themes.css');
  const iCss = html.indexOf('themes.css');
  const iStyle = html.indexOf('style.css');
  r.ok(iCss !== -1 && iStyle !== -1 && iCss > iStyle, 'themes.css APRES style.css (surcharge)');
  const iData = html.indexOf('themes.js');
  const iMain = html.indexOf('script.js');
  r.ok(iData !== -1 && iMain !== -1 && iData < iMain, 'themes.js avant script.js');
  r.ok(html.indexOf('fonts/fonts.css') !== -1,
    'index.html : polices auto-hebergees (fonts/fonts.css, hors-ligne)');
  r.ok(html.indexOf('fonts.googleapis.com') === -1,
    'index.html : zero appel Google Fonts (100 % local)');
  const iMenu = html.indexOf('data-action="change-theme"');
  const iExport = html.indexOf('data-action="export-all"');
  r.ok(iMenu !== -1 && iExport !== -1 && iMenu < iExport,
    'menu : « Changer de thème » au-dessus d\u2019« Exporter tout »');

  const js = read('script.js');
  r.ok(js.indexOf("action === 'change-theme'") !== -1, 'script.js : dispatch change-theme');
  r.ok(js.indexOf('window.DCCThemes.init()') !== -1, 'script.js : init du couple au demarrage');
  r.ok(js.indexOf('theme_pair') !== -1, 'script.js : theme_pair exporte');
  r.ok(js.indexOf('window.DCCThemes.save(') !== -1, 'script.js : theme restaure + sauvegarde a l\u2019import');

  const css = read('style.css');
  ['.theme-overlay', '.theme-picker', '.theme-grid', '.theme-card',
    '.theme-card .pv', '.theme-foot', '@media (max-width: 460px)',
    '#user-menu button[data-action="change-theme"]::before'].forEach(function (sel) {
    r.ok(css.indexOf(sel) !== -1, 'style.css : ' + sel);
  });
  const tocBlock = css.match(/\.theme-grid \{[^}]+\}/);
  r.ok(!!tocBlock, '.theme-grid block found');
  if (tocBlock) {
    r.ok(tocBlock[0].indexOf('grid-auto-rows: max-content') !== -1,
      '.theme-grid : lignes a hauteur de contenu (fix troncature mobile)');
  }

  /* Anti-fuite de texture (11/10/2026) : un apercu non texture heritait
     la texture du couple applique (var(--x, none) ne bloque pas
     l'heritage) — ex. la mosaïque du Sorcier sur tous les autres. */
  const pvBlock = css.match(/\.theme-card \.pv \{[^}]+\}/);
  r.ok(!!pvBlock, '.theme-card .pv block found');
  if (pvBlock) {
    ['--teximg: none', '--vig: none', '--noise: none'].forEach(function (decl) {
      r.ok(pvBlock[0].indexOf(decl) !== -1, '.theme-card .pv : coupe-circuit ' + decl);
    });
    r.ok(pvBlock[0].indexOf('background-blend-mode: var(--tblend, normal), normal, normal') !== -1,
      '.theme-card .pv : --tblend vise la couche texture (meme ordre que body)');
  }

  /* Chrome fige sur Defaut : l'apercu en direct ne doit re-teinter que
     la page, jamais l'entete, les noms ni les boutons du selecteur. */
  const ovBlock = css.match(/\.theme-overlay \{[^}]+\}/);
  r.ok(!!ovBlock, '.theme-overlay block found');
  if (ovBlock) {
    r.ok(ovBlock[0].indexOf('--paper: #fff') !== -1, 'selecteur : fond fige Defaut clair');
    r.ok(ovBlock[0].indexOf('--header-bg: #1a1a2e') !== -1, 'selecteur : bandeau fige Defaut clair');
    r.ok(ovBlock[0].indexOf('--font-heading:') !== -1, 'selecteur : typographie figee');
  }
  r.ok(css.indexOf('html[data-theme="dark"] .theme-overlay') !== -1,
    'selecteur : variante Defaut sombre en mode sombre');
}

async function run() {
  const r = createReporter('22-themes');
  testCss(r);
  testParity(r);
  await testClient(r);
  testWiring(r);
  return r;
}

module.exports = run;
