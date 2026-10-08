/* ============================================================
   server.js — serveur statique du POC Android
   ------------------------------------------------------------
   Meme arborescence que l'installation Windows :
     /dcc-sheet/  -> racine du repo (webapp statique + source PHP
                     brute pour le prechargement du Service Worker)
     /poc/        -> assets du POC (boot, worker, harness)
   Garde-fou : toute requete vers dcc-pc-tokens / funnel-tokens
   est refusee (403) — meme regle que le build installeur.
   ============================================================ */

import http from 'node:http';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const REPO = path.resolve(__dirname, '..', '..', '..');
const POC_PUBLIC = path.join(__dirname, 'public');
const NM = path.join(__dirname, 'node_modules');

/* Dossiers/fichiers hors webapp (meme esprit que le zip webapp) */
const BLOCK_DIRS = new Set([
  'node_modules', '.git', '.opencode', '.vscode', 'tests', 'deploy',
  'installeur', 'tools', 'plan0', 'plan1', 'pregens', 'captures',
  'pdf-sheets', 'exemples', 'data', 'vendor', 'dist',
]);
const BLOCK_FILES = [/\.md$/i, /^package(-lock)?\.json$/i, /^test\.bat$/i, /^\.[a-z]/i];

/* Statique autorise (le reste du repo n'est pas servi) */
const STATIC_EXT = new Set([
  '.html', '.css', '.js', '.mjs', '.svg', '.png', '.webp', '.jpg', '.jpeg',
  '.gif', '.ico', '.woff', '.woff2', '.ttf', '.avif',
]);
const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.php': 'text/plain; charset=utf-8', /* source brute : uniquement fetch du SW */
  '.wasm': 'application/wasm',
  '.so': 'application/octet-stream',
};

const FORBIDDEN = /dcc-pc-tokens|funnel-tokens/i;

function send(res, code, body, type = 'text/plain; charset=utf-8', extra = {}) {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store', ...extra });
  res.end(body);
}

async function serveFile(res, file, forcedType) {
  let data;
  try {
    data = await fs.readFile(file);
  } catch {
    return send(res, 404, '404 ' + path.basename(file));
  }
  const type = forcedType || TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream';
  send(res, 200, data, type);
}

/* Dossiers icons/ (hors tokens) pour le bootstrap FS du Service Worker */
async function iconDirs() {
  const base = path.join(REPO, 'icons');
  const out = [];
  let entries = [];
  try {
    entries = await fs.readdir(base, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    if (!e.isDirectory()) continue;
    if (/dcc-pc-tokens|funnel-tokens/i.test(e.name)) continue;
    out.push(e.name);
  }
  return out.sort();
}

export function startServer(port = 0) {
  const server = http.createServer(async (req, res) => {
    try {
      const url = new URL(req.url, 'http://127.0.0.1');
      const p = decodeURIComponent(url.pathname);
      if (process.env.POC_LOG) console.log('[http] ' + req.method + ' ' + p);

      /* Garde-fou tokens non redistribuables */
      if (FORBIDDEN.test(p)) {
        console.error('[ASSERTION TOKENS] requete refusee : ' + p);
        return send(res, 403, 'INTERDICTION DE REDISTRIBUTION : tokens DCC');
      }

      if (p === '/') return send(res, 302, 'redirect', 'text/plain', { Location: '/poc/boot.html' });

      if (p === '/poc/manifest.json') {
        const manifest = { iconDirs: await iconDirs() };
        return send(res, 200, JSON.stringify(manifest), TYPES['.json']);
      }

      if (p.startsWith('/poc/vendor/')) {
        const rel = p.slice('/poc/vendor/'.length);
        const file = path.resolve(NM, rel);
        if (!file.startsWith(NM)) return send(res, 403, 'refuse');
        return serveFile(res, file);
      }

      if (p.startsWith('/poc/php-src/')) {
        /* Source PHP brute pour la page d'amorçage (route hors portee
           du SW : jamais interceptee, meme si le SW est deja actif). */
        const rel = p.slice('/poc/php-src/'.length);
        if (!rel.endsWith('.php')) return send(res, 403, '.php seulement');
        const segs = rel.split('/');
        if (segs.some((s) => BLOCK_DIRS.has(s))) return send(res, 404, 'hors webapp');
        const file = path.resolve(REPO, rel);
        if (!file.startsWith(REPO)) return send(res, 403, 'refuse');
        return serveFile(res, file, TYPES['.php']);
      }

      if (p.startsWith('/poc/')) {
        let rel = p.slice('/poc/'.length);
        if (rel === '' || rel === 'boot.html' || !path.extname(rel)) rel = rel || 'boot.html';
        const file = path.resolve(POC_PUBLIC, rel);
        if (!file.startsWith(POC_PUBLIC)) return send(res, 403, 'refuse');
        return serveFile(res, file);
      }

      if (p.startsWith('/dcc-sheet/') || p === '/dcc-sheet') {
        /* Service worker + page d'amorçage du POC (doivent vivre sous la portee /dcc-sheet/) */
        if (p === '/dcc-sheet/cgi-worker.mjs') {
          return serveFile(res, path.join(POC_PUBLIC, 'cgi-worker.mjs'));
        }
        if (p === '/dcc-sheet/boot-poc.html') {
          return serveFile(res, path.join(POC_PUBLIC, 'boot.html'));
        }
        let rel = p.replace(/^\/dcc-sheet\/?/, '');
        if (rel === '') rel = 'index.html';

        const segs = rel.split('/');
        if (segs.some((s) => BLOCK_DIRS.has(s))) return send(res, 404, 'hors webapp');
        const base = segs[segs.length - 1];
        if (BLOCK_FILES.some((re) => re.test(base))) return send(res, 404, 'hors webapp');

        const file = path.resolve(REPO, rel);
        if (!file.startsWith(REPO)) return send(res, 403, 'refuse');

        const ext = path.extname(file).toLowerCase();
        if (ext === '.php') return serveFile(res, file, TYPES['.php']);
        if (STATIC_EXT.has(ext)) return serveFile(res, file);
        return send(res, 404, '404 ' + rel);
      }

      send(res, 404, '404 ' + p);
    } catch (err) {
      console.error(err);
      send(res, 500, 'erreur serveur');
    }
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      const a = server.address();
      resolve({ server, port: a.port, url: 'http://127.0.0.1:' + a.port });
    });
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  startServer(Number(process.env.PORT) || 8088).then(({ url }) => {
    console.log('POC pret : ' + url + '  (app : ' + url + '/dcc-sheet/)');
  });
}
