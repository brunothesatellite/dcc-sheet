/* debug.js — diagnostic : pourquoi boot.html ne redirige pas ? */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import puppeteer from 'puppeteer-core';
import { startServer } from './server.js';

const PROFILE = path.join(os.tmpdir(), 'dcc-poc-debug-profile');
const exe = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
].find((p) => fs.existsSync(p));

fs.rmSync(PROFILE, { recursive: true, force: true });
const { server, url } = await startServer(0);
console.log('serveur: ' + url);

const browser = await puppeteer.launch({
  executablePath: exe,
  headless: true,
  userDataDir: PROFILE,
  protocolTimeout: 120000,
  args: ['--no-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
});

const page = await browser.newPage();
page.on('console', (m) => console.log('[page:' + m.type() + '] ' + m.text()));
page.on('pageerror', (e) => console.log('[pageerror] ' + e.message));
page.on('requestfailed', (r) =>
  console.log('[reqfail] ' + r.url() + ' :: ' + ((r.failure() && r.failure().errorText) || '')));
page.on('request', (r) => console.log('[req] ' + r.method() + ' ' + r.url()));

await page.goto(url + '/dcc-sheet/boot-poc.html', { waitUntil: 'domcontentloaded', timeout: 60000 });

const swTarget = await browser
  .waitForTarget((t) => t.type() === 'service_worker', { timeout: 30000 })
  .catch(() => null);
if (swTarget) {
  console.log('[sw-target] ' + swTarget.url());
  const worker = await swTarget.worker().catch(() => null);
  if (worker) {
    worker.on('console', (m) => console.log('[sw:' + m.type() + '] ' + m.text()));
    worker.on('error', (e) => console.log('[swerror] ' + String(e)));
  }
} else {
  console.log('[sw-target] AUCUN Service Worker cree');
}

console.log('--- boot charge, attente 30s ---');
await new Promise((r) => setTimeout(r, 30000));

const state = await page.evaluate(async () => {
  const regs = await navigator.serviceWorker.getRegistrations();
  return {
    href: location.href,
    log: (document.getElementById('log') || {}).textContent || '(pas de #log)',
    controlled: !!navigator.serviceWorker.controller,
    regs: regs.map((r) => ({
      scope: r.scope,
      active: r.active ? r.active.state : null,
      installing: r.installing ? r.installing.state : null,
      waiting: r.waiting ? r.waiting.state : null,
    })),
  };
}).catch((e) => ({ err: String(e) }));

console.log('--- etat page ---');
console.log(JSON.stringify(state, null, 2));

/* Tenter une requete API (phase PHP) puis dumper FS + IDB */
if (state && String(state.href || '').includes('/dcc-sheet/')) {
  console.log('--- tentative api/auth.php?action=check ---');
  const api = await page.evaluate(async () => {
    try {
      const r = await fetch('api/auth.php?action=check', { credentials: 'same-origin' });
      return { status: r.status, type: r.headers.get('content-type'), body: (await r.text()).slice(0, 500) };
    } catch (e) { return { err: String(e) }; }
  });
  console.log(JSON.stringify(api, null, 2));

  console.log('--- tentative _diag.php (extensions) ---');
  const diag = await page.evaluate(async () => {
    try {
      const r = await fetch('_diag.php', { credentials: 'same-origin' });
      return { status: r.status, body: (await r.text()).slice(0, 2500) };
    } catch (e) { return { err: String(e) }; }
  });
  console.log(JSON.stringify(diag, null, 2));

  console.log('--- dump FS /persist (memfs, apres tentative) ---');
  const fsDump = await page.evaluate(async () => {
    const { Client } = await import('/poc/vendor/quickbus/index.mjs');
    const reg = await navigator.serviceWorker.ready;
    const bus = Client.forServiceWorkerRegistration(reg);
    try { return await bus.dumpFs('/persist'); } catch (e) { return 'ERR ' + (e && e.message || e); }
  });
  console.log(fsDump);

  console.log('--- dump IDB /persist (FILE_DATA keys) ---');
  const idbDump = await page.evaluate(async () => {
    const { Client } = await import('/poc/vendor/quickbus/index.mjs');
    const reg = await navigator.serviceWorker.ready;
    const bus = Client.forServiceWorkerRegistration(reg);
    try { return await bus.dumpIdb(); } catch (e) { return 'ERR ' + (e && e.message || e); }
  });
  console.log(idbDump);
} else {
  console.log('--- page pas encore sur /dcc-sheet/ : pas de dump API ---');
}

await browser.close();
server.close();
process.exit(0);
