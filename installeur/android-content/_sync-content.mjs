#!/usr/bin/env node
/* ============================================================
   _sync-content.mjs — genere app/src/main/assets/ de l'APK
   de CONTENU (compagnon prive de dcc-sheet)
   ------------------------------------------------------------
   Copie dans android-content/app/src/main/assets :
     1. icons/dcc-pc-tokens  (racine du repo, >= 20 fichiers)
     2. icons/funnel-tokens  (racine du repo, >= 75 fichiers)
     3. dcc-spells-reader    (dossier frere du repo) sans les
        repertoires de developpement (.git, captures, tools,
        __pycache__, node_modules)

   ASSERTIONS BLOQUANTES : les trois ensembles doivent etre
   complets — un APK de contenu sans contenu est inutile.

   ATTENTION — USAGE PERSONNEL : cet APK CONTIENT les tokens et le
   lecteur de sorts qui ne doivent JAMAIS etre redistrobues (regle
   du projet, identique aux builds Windows et Android de dcc-sheet,
   voir _sync-assets.mjs). Ne jamais le partager, le publier ni
   l'inclure dans une release.
   ============================================================ */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));  // installeur/android-content
const REPO = path.resolve(HERE, '..', '..');                // dcc-sheet
const SPELLS = path.resolve(REPO, '..', 'dcc-spells-reader'); // dossier frere
const ASSETS = path.join(HERE, 'app', 'src', 'main', 'assets');

const EXCLUDE_DIRS = new Set(['.git', 'captures', 'tools', '__pycache__', 'node_modules']);

function fail(msg) {
  console.error('ECHEC : ' + msg);
  process.exit(1);
}
function rmrf(p) { fs.rmSync(p, { recursive: true, force: true }); }
function mkdirp(p) { fs.mkdirSync(p, { recursive: true }); }

/** Copie recursivement src -> dest en ignorant les noms de EXCLUDE_DIRS. */
function copyTree(src, dest) {
  let n = 0;
  const walk = (s, d) => {
    mkdirp(d);
    for (const e of fs.readdirSync(s, { withFileTypes: true })) {
      if (e.isDirectory()) {
        if (EXCLUDE_DIRS.has(e.name)) continue;
        walk(path.join(s, e.name), path.join(d, e.name));
      } else if (e.isFile()) {
        fs.copyFileSync(path.join(s, e.name), path.join(d, e.name));
        n++;
      }
    }
  };
  walk(src, dest);
  return n;
}

function countFiles(dir, suffix) {
  let n = 0;
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(d, e.name));
      else if (e.name.endsWith(suffix)) n++;
    }
  };
  walk(dir);
  return n;
}

function sizeMo(dir) {
  let sum = 0;
  const walk = (d) => {
    if (!fs.existsSync(d)) return;
    for (const e of fs.readdirSync(d, { withFileTypes: true })) {
      if (e.isDirectory()) walk(path.join(d, e.name));
      else sum += fs.statSync(path.join(d, e.name)).size;
    }
  };
  walk(dir);
  return Math.round((sum / 1048576) * 10) / 10;
}

/* --- preconditions ------------------------------------------------ */
if (!fs.existsSync(path.join(REPO, 'icons', 'dcc-pc-tokens'))) {
  fail('icons/dcc-pc-tokens absent du repo');
}
if (!fs.existsSync(path.join(REPO, 'icons', 'funnel-tokens'))) {
  fail('icons/funnel-tokens absent du repo');
}
if (!fs.existsSync(SPELLS)) {
  fail('dossier frere dcc-spells-reader introuvable : ' + SPELLS);
}

rmrf(ASSETS);
mkdirp(ASSETS);

/* --- 1/2. tokens (repo) ------------------------------------------- */
const pc = copyTree(path.join(REPO, 'icons', 'dcc-pc-tokens'),
    path.join(ASSETS, 'icons', 'dcc-pc-tokens'));
if (pc < 20) fail('dcc-pc-tokens : ' + pc + ' fichiers (20 attendus)');
const fn = copyTree(path.join(REPO, 'icons', 'funnel-tokens'),
    path.join(ASSETS, 'icons', 'funnel-tokens'));
if (fn < 75) fail('funnel-tokens : ' + fn + ' fichiers (75 attendus)');

/* --- 3. lecteur de sorts (dossier frere) -------------------------- */
const sp = copyTree(SPELLS, path.join(ASSETS, 'dcc-spells-reader'));
const spJs = countFiles(path.join(ASSETS, 'dcc-spells-reader', 'content'), '.js');
const spPages = countFiles(path.join(ASSETS, 'dcc-spells-reader', 'pages'), '.webp')
    + countFiles(path.join(ASSETS, 'dcc-spells-reader', 'pages'), '.png');
if (spJs < 100) fail('dcc-spells-reader/content : ' + spJs + ' .js (100 attendus)');
if (spPages < 100) fail('dcc-spells-reader/pages : ' + spPages + ' images (100 attendues)');

/* --- rapport ------------------------------------------------------- */
const total = sizeMo(ASSETS);
console.log('contenu : dcc-pc-tokens=' + pc + 'f, funnel-tokens=' + fn
    + 'f, spells=' + sp + 'f (content=' + spJs + ' js, pages=' + spPages
    + ' img) -> ' + total + ' Mo');
console.log('ATTENTION : APK STRICTEMENT PERSONNEL — ne jamais partager'
    + ' ni publier (regle de redistribution du projet).');
