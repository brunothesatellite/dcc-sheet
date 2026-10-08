/* ============================================================
   lib-manifest.mjs — shared libs php-wasm du POC Android
   ------------------------------------------------------------
   Utilise par DEUX consommateurs :
     - cgi-worker.mjs : construit l'option sharedLibs
       (lignes `extension=<chemin absolu>` + urlLibs de secours) ;
     - boot.html      : place les fichiers .so dans LIB_DIR (IDBFS).

   Les .so DOIVENT exister dans le FS avant la premiere requete PHP :
   en Service Worker il n'y a pas de XHR synchrone, donc le fallback
   locateFile d'emscripten (lecture synchrone de l'URL) est
   indisponible et dlopen echouerait. /persist etant IDBFS, les .so
   sont ecrits UNE FOIS et rehydrates a chaque cold start du SW.

   ini: true  -> dependance directement chargee par PHP
                 (chemin ABSOLU : dlopen -> FS.lookupPath, pas de
                 recherche) ;
   ini: false -> dependance resolue par findLibraryFS via
                 LD_LIBRARY_PATH=LIB_DIR (pose par cgi-worker dans
                 env, applique a chaque requete avant startup PHP).

   pdo-sqlite exclu : l'application n'utilise pas PDO (api/db.php
   instancie SQLite3 directement).
   ============================================================ */

export const LIB_DIR = '/persist/lib';

export const SHARED_LIBS = [
  /* SQLite — api/db.php : new SQLite3(...) */
  { pkg: 'php-wasm-sqlite', file: 'php8.4-sqlite.so', ini: true },
  { pkg: 'php-wasm-sqlite', file: 'libsqlite3.so' },

  /* GD — api/map-image.php : imagecreatefrompng + imagewebp */
  { pkg: 'php-wasm-gd', file: 'php8.4-gd.so', ini: true },
  { pkg: 'php-wasm-gd', file: 'libfreetype.so' },
  { pkg: 'php-wasm-gd', file: 'libjpeg.so' },
  { pkg: 'php-wasm-gd', file: 'libpng.so' },
  { pkg: 'php-wasm-gd', file: 'libwebp.so' },

  /* zlib — ext PHP (gzencode) + libz.so exigee par libpng */
  { pkg: 'php-wasm-zlib', file: 'php8.4-zlib.so', ini: true },
  { pkg: 'php-wasm-zlib', file: 'libz.so' },

  /* Zip — api/maps.php : ZipArchive */
  { pkg: 'php-wasm-libzip', file: 'php8.4-zip.so', ini: true },
  { pkg: 'php-wasm-libzip', file: 'libzip.so' },

  /* Mbstring — troncature UTF-8 des noms de cartes (la ou l'app
     garde un fallback substr, mbstring evite de couper un
     caractere multioctet en deux) */
  { pkg: 'php-wasm-mbstring', file: 'php8.4-mbstring.so', ini: true },
  { pkg: 'php-wasm-mbstring', file: 'libonig.so' },
];
