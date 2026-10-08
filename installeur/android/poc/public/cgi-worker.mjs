/* ============================================================
   cgi-worker.mjs — Service Worker du POC Android
   ------------------------------------------------------------
   Execute la webapp dcc-sheet via php-cgi-wasm :
     - seuls les URL *.php de /dcc-sheet/ passent par PHP ;
       tout le statique (html, css, js, images) tombe dans le
       reseau normal (serveur de dev / asset handler Android).
     - docroot /persist/www en IDBFS (persiste par defaut :
       /persist et /config sont montes en base IndexedDB).
     - pages PHP racine + api/ precharges dans le FS via `files`
       (source brute servie par le serveur statique).
     - cookie de session gere par le pot de cookies interne
       persistant /config/.cookies (les reponses SW ne peuvent
       pas poser de cookie navigateur).
   ============================================================ */

import { PhpCgiWorker } from '/poc/vendor/php-cgi-wasm/PhpCgiWorker.mjs';
import { LIB_DIR, SHARED_LIBS } from '/poc/lib-manifest.mjs';

const PREFIX = '/dcc-sheet/';
const DOCROOT = '/persist/www';

/* Les sources PHP et les .so sont ecrits dans le FS par la page
   d'amorçage via le pont quickbus (chaque operation = transaction
   IDBFS : hydrate -> operation -> flush). L'option `files` de
   php-cgi-wasm est évitée : son createPreloadedFile ne retourne pas
   de promesse dans ce build, l'hydrate tournait pendant l'ecriture
   et les fichiers precharges n'etaient jamais flushes en IndexedDB
   (rmdir ENOTEMPTY / perte). */
const php = new PhpCgiWorker({
  prefix: PREFIX,
  docroot: DOCROOT,
  /* Extensions dynamiques placees dans LIB_DIR par boot.html :
     - chemin absolu pour l'extension -> dlopen sur FS.lookupPath ;
     - LD_LIBRARY_PATH pour les dependances (libsqlite3.so,
       libpng.so, ...) resolues par findLibraryFS. Env applique a
       CHAQUE requete avant le startup PHP (voir PhpCgiBase). */
  sharedLibs: SHARED_LIBS.map((lib) => ({
    name: lib.ini ? LIB_DIR + '/' + lib.file : lib.file,
    url: new URL('/poc/vendor/' + lib.pkg + '/' + lib.file, self.location.origin).href,
    ini: !!lib.ini,
  })),
  env: { LD_LIBRARY_PATH: LIB_DIR },
  /* Diagnostic POC : lister l'IDB et l'arbre /persist depuis la page */
  actions: {
    dumpIdb: () => new Promise((resolve, reject) => {
      try {
        const req = indexedDB.open('/persist');
        req.onerror = () => reject(new Error('open IDB : ' + req.error));
        req.onsuccess = () => {
          const db = req.result;
          try {
            const g = db.transaction(['FILE_DATA'], 'readonly')
              .objectStore('FILE_DATA').getAllKeys();
            g.onsuccess = () => { const k = g.result || []; try { db.close(); } catch { /* ignore */ } resolve(k.slice(0, 200).join('\n') || '(vide)'); };
            g.onerror = () => reject(new Error('getAll : ' + g.error));
          } catch (e) { reject(e); }
        };
      } catch (e) { reject(e); }
    }),
    dumpFs: async (root) => {
      const rt = await php.binary; /* runtime courant (changer apres refresh) */
      /* quickbus peut transmettre les params d'action comme objet :
         accepter string ou {path}. */
      const start = typeof root === 'string' ? root
        : (root && typeof root.path === 'string') ? root.path : '/persist';
      const out = [];
      const walk = (dir, depth) => {
        if (depth > 6) return;
        let names = [];
        try { names = rt.FS.readdir(dir); } catch { return; }
        for (const n of names) {
          if (n === '.' || n === '..') continue;
          const p = dir.replace(/\/$/, '') + '/' + n;
          let isDir = false;
          try { isDir = rt.FS.isDir(rt.FS.stat(p).mode); } catch { /* ignore */ }
          out.push((isDir ? 'D ' : 'F ') + p + (isDir ? '' : ' (' + (() => { try { return rt.FS.stat(p).size; } catch { return '?'; } })() + 'o)'));
          if (isDir) walk(p, depth + 1);
        }
      };
      walk(start, 0);
      return out.join('\n') || '(vide)';
    },
  },
  ini: [
    'session.save_path = /persist/sessions',
    'upload_tmp_dir = /persist/tmp',
    'post_max_size = 64M',
    'upload_max_filesize = 64M',
    'memory_limit = 128M',
    'date.timezone = Europe/Paris',
    'error_log = /persist/php-error.log',
  ].join('\n'),
  types: {
    webp: 'image/webp',
    png: 'image/png',
    jpg: 'image/jpeg',
    woff2: 'font/woff2',
  },
});

self.addEventListener('install', (event) => php.handleInstallEvent(event));
self.addEventListener('activate', (event) => php.handleActivateEvent(event));
self.addEventListener('message', (event) => php.handleMessageEvent(event));

/* --- diagnostic POC : etat du runtime / persistance --- */
php.binary.then(
  (rt) => {
    let mounts = 'n/a';
    try {
      mounts = rt.FS.getMounts(rt.FS.root.mount)
        .map((m) => m.mountpoint + ':' + ((m.type && m.type.name) || '?'))
        .join(', ');
    } catch (e) { mounts = 'ERR ' + e; }
    console.log('[probe] boot OK persist=' + rt.persist
      + ' /persist=' + rt.FS.analyzePath('/persist').exists
      + ' www=' + rt.FS.analyzePath('/persist/www').exists
      + ' db.php=' + rt.FS.analyzePath('/persist/www/api/db.php').exists
      + ' mounts=[' + mounts + ']');
    rt.FS.syncfs(true, (e) => console.log('[probe] syncfs(true) => '
      + (e ? 'ERR errno=' + e.errno + ' path=' + e.path + ' msg=' + e.message : 'OK')));
  },
  (err) => console.log('[probe] boot REJECT name=' + (err && err.name)
    + ' errno=' + (err && err.errno) + ' path=' + (err && err.path)
    + ' msg=' + (err && err.message) + ' stack=' + String((err && err.stack) || '').slice(0, 300)),
);

/* Route : uniquement les scripts PHP sous /dcc-sheet/ sont
   interceptes ; le reste (statique, vendor POC, .wasm, .so)
   sort du SW sans reponse (reseau normal). */
self.addEventListener('fetch', (event) => {
  let pathname;
  try {
    pathname = new URL(event.request.url).pathname;
  } catch {
    return;
  }
  if (pathname.startsWith(PREFIX) && pathname.endsWith('.php')) {
    php.handleFetchEvent(event);
  }
});
