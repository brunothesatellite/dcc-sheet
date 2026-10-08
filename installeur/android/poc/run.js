/* ============================================================
   run.js — pilote automatise du POC Android (etape 1)
   ------------------------------------------------------------
   Demarre le serveur statique, ouvre la webapp dans Edge/Chrome
   systeme (puppeteer-core) et valide les gates decisifs :
     G1  page index.html rendue et stylée (statique)
     G2  api/auth.php execute par le Service Worker (JSON)
     G3  inscription SQLite + session (cookie interne php-wasm)
     G5  import ZIP multipart (ZipArchive + $_FILES CGI) + IDBFS
     G6  gd : conversion PNG -> WebP (imagewebp)
     G7  export ZIP (lecture ZipArchive)
     G8  login.php rendu par PHP (navigation SW)
     G9  session apres rechargement de page
     G10-G13 apres REDÉMARRAGE complet du navigateur :
          session, SQLite, enregistrements, images IDBFS
   Bloque les polices Google (simulation hors-ligne : la webapp
   doit rester utilisable sans Internet).
   ============================================================ */

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import puppeteer from 'puppeteer-core';
import { startServer } from './server.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROFILE = path.join(os.tmpdir(), 'dcc-poc-profile');
const results = [];

function findBrowser() {
  const candidates = [
    process.env.CHROME_PATH,
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ].filter(Boolean);
  const found = candidates.find((p) => fs.existsSync(p));
  if (!found) {
    throw new Error('Aucun Edge/Chrome trouve (definez CHROME_PATH).');
  }
  return found;
}

function check(name, ok, detail = '') {
  results.push({ name, ok: !!ok, detail: String(detail) });
  console.log((ok ? '[OK]   ' : '[FAIL] ') + name + (detail ? ' — ' + detail : ''));
}

async function attempt(name, fn) {
  try {
    const detail = await fn();
    check(name, true, detail || '');
  } catch (err) {
    check(name, false, (err && err.message) || String(err));
  }
}

async function fetchCheck(page) {
  return page.evaluate(async () => {
    const r = await fetch('api/auth.php?action=check', { credentials: 'same-origin' });
    const text = await r.text();
    let json = null;
    try { json = JSON.parse(text); } catch { /* pas de JSON */ }
    return { status: r.status, type: r.headers.get('content-type') || '', json, text };
  });
}

async function openApp(browser, url, logs) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  page.on('console', (m) => logs.push('[page] ' + m.text()));
  page.on('pageerror', (e) => logs.push('[pageerror] ' + e.message));
  page.on('requestfailed', (r) =>
    logs.push('[reqfail] ' + r.url() + ' :: ' + ((r.failure() && r.failure().errorText) || '')));

  await page.goto(url + '/dcc-sheet/boot-poc.html', { waitUntil: 'domcontentloaded', timeout: 90000 });

  const swTarget = await browser
    .waitForTarget((t) => t.type() === 'service_worker' && t.url().includes('cgi-worker.mjs'), { timeout: 60000 })
    .catch(() => null);
  if (swTarget) {
    const worker = await swTarget.worker().catch(() => null);
    if (worker) {
      worker.on('console', (m) => logs.push('[sw] ' + m.text()));
      worker.on('error', (e) => logs.push('[swerror] ' + String(e)));
    }
  }

  await page.waitForFunction(() => location.pathname.startsWith('/dcc-sheet/'), {
    timeout: 90000, polling: 200,
  });
  await page.waitForSelector('.topbar', { timeout: 90000 });
  return page;
}

function dumpLogs(logs) {
  if (results.some((r) => !r.ok) && logs.length) {
    console.log('\n--- dernieres logs (page + SW) ---');
    for (const line of logs.slice(-50)) console.log('  ' + line);
    console.log('--- fin logs ---\n');
  }
}

/* ============================================================ */

const exe = findBrowser();
console.log('Navigateur : ' + exe);
fs.rmSync(PROFILE, { recursive: true, force: true });
console.log('Profil     : ' + PROFILE + ' (supprime pour cette execution)');

const { server, url } = await startServer(0);
console.log('Serveur    : ' + url);

const launchOpts = {
  executablePath: exe,
  headless: true,
  userDataDir: PROFILE,
  protocolTimeout: 300000,
  args: [
    '--no-sandbox',
    '--disable-dev-shm-usage',
    '--disable-gpu',
    /* polices Google mappees sur un port ferme : la webapp doit
       rester stylée sans Internet (cas Android hors-ligne) */
    '--host-resolver-rules=MAP fonts.googleapis.com 127.0.0.1, MAP fonts.gstatic.com 127.0.0.1',
  ],
};

let browser = await puppeteer.launch(launchOpts);
let pseudo = 'poc' + Date.now().toString(36);

let logsA = [];
try {
  /* ---------------- PHASE A : session froide ---------------- */
  console.log('\n=== PHASE A : premiere execution ===');
  logsA = [];
  const page = await openApp(browser, url, logsA);

  await attempt('G1 page index.html stylée (.topbar + style.css, hors-ligne)', async () => {
    const styled = await page.evaluate(() => {
      const sheet = [...document.styleSheets].find((s) => (s.href || '').includes('style.css'));
      let rules = -1;
      try { rules = sheet ? sheet.cssRules.length : -1; } catch { rules = -3; }
      const topbar = document.querySelector('.topbar');
      const bg = topbar ? getComputedStyle(topbar).backgroundColor : '';
      return { rules, hasTopbar: !!topbar, bg, title: document.title };
    });
    const ok = styled.hasTopbar && styled.rules > 50 && styled.bg && styled.bg !== 'rgba(0, 0, 0, 0)';
    if (!ok) throw new Error(JSON.stringify(styled));
    return `regles=${styled.rules} bg=${styled.bg}`;
  });

  await attempt('G2 api/auth.php execute par le SW (JSON, logged_in=false)', async () => {
    const res = await fetchCheck(page);
    if (!res.json || !res.type.includes('json') || res.json.logged_in !== false) {
      throw new Error(`status=${res.status} type=${res.type} body=${res.text.slice(0, 150)}`);
    }
    return `status=${res.status}`;
  });

  await attempt('G3 inscription (SQLite + reponse ok)', async () => {
    const res = await page.evaluate(async (p) => {
      const r = await fetch('api/auth.php?action=register', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo: p, password: 'secret123' }),
      });
      return { status: r.status, text: await r.text() };
    }, pseudo);
    let json = null;
    try { json = JSON.parse(res.text); } catch { /* pas de JSON */ }
    if (res.status !== 200 || !json || json.ok !== true) {
      throw new Error(`status=${res.status} body=${res.text.slice(0, 150)}`);
    }
    return `pseudo=${pseudo}`;
  });

  await attempt('G3b session active (pot de cookies interne php-wasm)', async () => {
    const res = await fetchCheck(page);
    if (!res.json || res.json.logged_in !== true || res.json.pseudo !== pseudo) {
      throw new Error(JSON.stringify(res.json || res.text.slice(0, 150)));
    }
    return 'logged_in=true';
  });

  const imp = await page.evaluate(async () => {
    const { buildZip } = await import('/poc/zip.mjs');
    const { Client } = await import('/poc/vendor/quickbus/index.mjs');
    const enc = new TextEncoder();
    const UID_OK = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';
    const UID_ABSENT = 'ffeeddccbbaa99887766554433221100';
    const UID_VIDE = '0123456789abcdef0123456789abcdef';
    const UID_CASSE = '11112222333344445555666677778888';
    const payload = enc.encode('RIFF' + 'x'.repeat(64) + 'WEBPVP8 ');
    const json = {
      maps: [
        { v: 3, kind: 'dcc-map', name: 'Carte fond', w: 10, h: 10, ops: [], ui: [],
          bg: { uid: UID_OK, name: 'fond1.webp' } },
        { v: 3, kind: 'dcc-map', name: 'Carte absente', w: 10, h: 10, ops: [], ui: [],
          bg: { uid: UID_ABSENT, name: 'absent.webp' } },
        { v: 3, kind: 'dcc-map', name: 'Carte vide', w: 10, h: 10, ops: [], ui: [],
          bg: { uid: UID_VIDE, name: 'vide.webp' } },
      ],
    };
    const zipBlob = buildZip([
      { name: 'export.json', data: enc.encode(JSON.stringify(json)) },
      { name: 'images/' + UID_OK + '.webp', data: payload },
      { name: 'images/' + UID_VIDE + '.webp', data: new Uint8Array(0) },
    ]);

    const reg = await navigator.serviceWorker.ready;
    const bus = Client.forServiceWorkerRegistration(reg);
    try { await bus.mkdir('/persist/www/data/maps', 0o777); } catch { /* deja cree */ }
    await bus.writeFile('/persist/www/data/maps/' + UID_CASSE + '.webp', new Uint8Array(0));

    const form = new FormData();
    form.append('file', new File([zipBlob], 'export.zip', { type: 'application/zip' }));
    const r = await fetch('api/maps.php?action=import_all', {
      method: 'POST', credentials: 'same-origin', body: form,
    });
    const j = await r.json().catch(() => null);

    const bytes = await bus.readFile('/persist/www/data/maps/' + UID_OK + '.webp');
    let same = !!bytes && bytes.length === payload.length;
    if (same) {
      for (let i = 0; i < payload.length; i++) {
        if (bytes[i] !== payload[i]) { same = false; break; }
      }
    }

    const r2 = await fetch('api/maps.php', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'check_images', uids: [UID_OK, UID_CASSE, UID_ABSENT] }),
    });
    const j2 = await r2.json().catch(() => null);

    return {
      ok: j && j.ok, images: j && j.images, missing: j && j.missing, err: j && j.error,
      same,
      casseMissing: j2 && j2.missing, casseErr: j2 && j2.error,
      UIDS: { UID_OK, UID_ABSENT, UID_VIDE, UID_CASSE },
    };
  });

  await attempt('G5 import ZIP multipart (ZipArchive + $_FILES CGI)', () => {
    if (imp.ok !== true || imp.images !== 1) {
      throw new Error(`ok=${imp.ok} images=${imp.images} err=${imp.err || '?'}`);
    }
    return 'images=1';
  });
  await attempt('G5b image ecrite en IDBFS, contenu identique au ZIP', () => {
    if (imp.same !== true) throw new Error('octets differs ou fichier absent');
    return 'payload integre';
  });
  await attempt('G5c missing = uid absent + uid vide (pas uid valide)', () => {
    const m = imp.missing;
    const ok = Array.isArray(m)
      && m.includes(imp.UIDS.UID_ABSENT)
      && m.includes(imp.UIDS.UID_VIDE)
      && !m.includes(imp.UIDS.UID_OK);
    if (!ok) throw new Error(JSON.stringify(m));
    return JSON.stringify(m);
  });
  await attempt('G5d check_images signale le fichier 0 octet', () => {
    const m = imp.casseMissing;
    const ok = Array.isArray(m)
      && m.includes(imp.UIDS.UID_CASSE)
      && m.includes(imp.UIDS.UID_ABSENT)
      && !m.includes(imp.UIDS.UID_OK);
    if (!ok) throw new Error(JSON.stringify(m || imp.casseErr));
    return JSON.stringify(m);
  });

  await attempt('G6 gd : PNG -> WebP (upload imagewebp + GET image)', async () => {
    const gd = await page.evaluate(async () => {
      const pngB64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
      const bytes = Uint8Array.from(atob(pngB64), (c) => c.charCodeAt(0));
      const form = new FormData();
      form.append('file', new File([bytes], 'fond-poc.png', { type: 'image/png' }));
      const r = await fetch('api/map-image.php?action=upload', {
        method: 'POST', credentials: 'same-origin', body: form,
      });
      const j = await r.json().catch(() => null);
      let webp = null;
      if (j && j.ok && j.uid) {
        const g = await fetch('api/map-image.php?uid=' + encodeURIComponent(j.uid), {
          credentials: 'same-origin',
        });
        const buf = new Uint8Array(await g.arrayBuffer());
        webp = buf.length > 12
          && String.fromCharCode(...buf.slice(0, 4)) === 'RIFF'
          && String.fromCharCode(...buf.slice(8, 12)) === 'WEBP';
        webp = { ok: webp, len: buf.length, status: g.status };
      }
      return { status: r.status, j, webp };
    });
    if (!gd.j || gd.j.ok !== true || gd.j.converted !== true || !gd.webp || !gd.webp.ok) {
      throw new Error(JSON.stringify(gd).slice(0, 300));
    }
    return `uid=${gd.j.uid} webp=${gd.webp.len}o`;
  });

  await attempt('G7 export ZIP des cartes (lecture ZipArchive)', async () => {
    const exp = await page.evaluate(async () => {
      /* Contrat api/maps.php : POST brut JSON {file, json, images}
         (GET -> jsonError('JSON absent')). */
      const r = await fetch('api/maps.php?action=export_zip', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          file: 'poc-export.json',
          json: { cartes: [{ nom: 'Carte POC', x: 1, y: 2 }] },
          images: [],
        }),
      });
      const buf = new Uint8Array(await r.arrayBuffer());
      return {
        status: r.status, len: buf.length,
        magic: String.fromCharCode(buf[0] || 0, buf[1] || 0),
        type: r.headers.get('content-type') || '',
      };
    });
    if (exp.status !== 200 || exp.magic !== 'PK' || exp.len < 100) {
      throw new Error(JSON.stringify(exp));
    }
    return `${exp.len}o (${exp.type})`;
  });

  await attempt('G8 login.php rendu par PHP (navigation via SW)', async () => {
    /* login.php redirige vers index.html si la session est active
       (ligne 6 du source) : deconnecter d'abord pour observer le
       formulaire, puis reconnecter pour les gates suivants. */
    const lo = await page.evaluate(async () => {
      const r = await fetch('api/auth.php?action=logout', { credentials: 'same-origin' });
      try { return await r.json(); } catch { return { status: r.status }; }
    });
    if (!lo || lo.ok !== true) throw new Error('logout impossible : ' + JSON.stringify(lo));

    await page.goto(url + '/dcc-sheet/login.php', { waitUntil: 'domcontentloaded', timeout: 60000 });
    const login = await page.evaluate(() => ({
      pwd: !!document.getElementById('password'),
      form: !!document.getElementById('form'),
      raw: (document.body.textContent || '').slice(0, 30).replace(/\s+/g, ' '),
    }));
    if (!login.pwd || !login.form || login.raw.startsWith('<?php')) {
      throw new Error(JSON.stringify(login));
    }

    const li = await page.evaluate(async (p) => {
      const r = await fetch('api/auth.php?action=login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ pseudo: p, password: 'secret123' }),
      });
      try { return await r.json(); } catch { return { status: r.status }; }
    }, pseudo);
    if (!li || li.ok !== true) throw new Error('re-login impossible : ' + JSON.stringify(li));
    return 'formulaire connexion rendu + reconnexion';
  });

  await attempt('G9 session apres rechargement de la page', async () => {
    await page.goto(url + '/dcc-sheet/', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForSelector('.topbar', { timeout: 60000 });
    const res = await fetchCheck(page);
    if (!res.json || res.json.logged_in !== true || res.json.pseudo !== pseudo) {
      throw new Error(JSON.stringify(res.json || res.text.slice(0, 150)));
    }
    return 'toujours connecte';
  });

  await new Promise((r) => setTimeout(r, 1500)); // laisse le temps aux syncs IDBFS
  await page.close();
} catch (err) {
  check('Phase A (execution globale)', false, (err && err.stack) || String(err));
} finally {
  dumpLogs(logsA);
  await browser.close().catch(() => {});
}

/* ------- PHASE B : redemarrage complet du navigateur ------- */
let logsB = [];
try {
  console.log('\n=== PHASE B : apres redemarrage du navigateur (persistance IDBFS) ===');
  browser = await puppeteer.launch(launchOpts);
  logsB = [];
  const page = await openApp(browser, url, logsB);

  await attempt('G10 session toujours active apres restart complet', async () => {
    const res = await fetchCheck(page);
    if (!res.json || res.json.logged_in !== true || res.json.pseudo !== pseudo) {
      throw new Error(JSON.stringify(res.json || res.text.slice(0, 150)));
    }
    return `pseudo=${pseudo}`;
  });

  const pseudo2 = 'poc' + (Date.now() + 1).toString(36);
  await attempt('G11 nouveau compte enregistre apres restart (SQLite vivant)', async () => {
    const res = await page.evaluate(async (p) => {
      const r = await fetch('api/auth.php?action=register', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo: p, password: 'secret123' }),
      });
      return { status: r.status, text: await r.text() };
    }, pseudo2);
    let json = null;
    try { json = JSON.parse(res.text); } catch { /* pas de JSON */ }
    if (res.status !== 200 || !json || json.ok !== true) {
      throw new Error(`status=${res.status} body=${res.text.slice(0, 150)}`);
    }
    return `pseudo=${pseudo2}`;
  });

  await attempt('G12 double inscription du compte phase A refusee (table users persistee)', async () => {
    const res = await page.evaluate(async (p) => {
      const r = await fetch('api/auth.php?action=register', {
        method: 'POST', credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pseudo: p, password: 'secret123' }),
      });
      return { status: r.status, text: await r.text() };
    }, pseudo);
    let json = null;
    try { json = JSON.parse(res.text); } catch { /* pas de JSON */ }
    const accepted = res.status === 200 && json && json.ok === true;
    if (accepted) throw new Error('double inscription ACCEPTEE : DB perdue !');
    return `status=${res.status} ${(res.text || '').slice(0, 80)}`;
  });

  await attempt('G13 image importee toujours presente dans IDBFS apres restart', async () => {
    const len = await page.evaluate(async () => {
      const { Client } = await import('/poc/vendor/quickbus/index.mjs');
      const reg = await navigator.serviceWorker.ready;
      const bus = Client.forServiceWorkerRegistration(reg);
      const bytes = await bus.readFile(
        '/persist/www/data/maps/a1b2c3d4e5f60718293a4b5c6d7e8f90.webp');
      return bytes ? bytes.length : 0;
    });
    if (len <= 0) throw new Error('fichier absent ou vide (len=' + len + ')');
    return len + 'o';
  });

  await page.close();
} catch (err) {
  check('Phase B (execution globale)', false, (err && err.stack) || String(err));
} finally {
  dumpLogs(logsB);
  await browser.close().catch(() => {});
  server.close();
}

/* ------------------------- bilan ------------------------- */
const fails = results.filter((r) => !r.ok);
console.log('\n=====================================');
console.log(`POC : ${results.length - fails.length}/${results.length} gates OK`);
console.log('=====================================');
process.exit(fails.length ? 1 : 0);
