<?php
/* ============================================================
   tests/php/import-zip.php — test d'integration de l'import ZIP
   ------------------------------------------------------------
   Lance un vrai « php -S » sur une COPIE de api/ avec un data/
   isole, puis pousse un ZIP d'export par HTTP reel :
    - inscription + session (cookie)
    - import_all : l'image du ZIP doit atterrir dans data/maps/
      avec son contenu (regression : getFromName($i) renvoyait
      false -> fichier de 0 octet -> « Image de fond introuvable »)
    - entree image vide du ZIP : aucun fichier cree
    - uid reference mais absent du ZIP : signale dans missing (R11)
    - check_images : fichier deja casse de 0 octet signale missing

   Sortie : lignes [OK] / [FAIL] / [SKIP], code retour 0 si tout est OK.
   Usage : php tests/php/import-zip.php
   ============================================================ */

if (!class_exists('ZipArchive')) {
    echo "[SKIP] extension ZipArchive absente\n";
    exit(0);
}

$repo = dirname(dirname(__DIR__));
$port = 8200 + random_int(0, 90);
$tmp = sys_get_temp_dir() . '/dcc-import-zip-' . getmypid();
$fails = 0;

function ok($cond, $label) {
    global $fails;
    if ($cond) {
        echo "[OK] $label\n";
    } else {
        $fails++;
        echo "[FAIL] $label\n";
    }
}

function rrmdir($d) {
    if (!is_dir($d)) { return; }
    foreach (scandir($d) as $f) {
        if ($f === '.' || $f === '..') { continue; }
        $p = $d . '/' . $f;
        if (is_dir($p) && !is_link($p)) { rrmdir($p); } else { @unlink($p); }
    }
    @rmdir($d);
}

/* Requete HTTP avec gestion du cookie de session */
function req($port, $method, $path, $body, array $headers, &$cookie) {
    if ($cookie !== '') { $headers[] = 'Cookie: ' . $cookie; }
    if ($body !== '' && !preg_grep('/^Content-Length:/i', $headers)) {
        $headers[] = 'Content-Length: ' . strlen($body);
    }
    $ctx = stream_context_create(['http' => [
        'method' => $method,
        'header' => implode("\r\n", $headers),
        'content' => $body,
        'ignore_errors' => true,
        'timeout' => 10,
    ]]);
    $resp = @file_get_contents('http://127.0.0.1:' . $port . $path, false, $ctx);
    $status = 0;
    foreach ($http_response_header ?? [] as $h) {
        if (preg_match('#^HTTP/\S+\s+(\d+)#', $h, $m)) { $status = (int)$m[1]; }
        if (stripos($h, 'Set-Cookie:') === 0) {
            $pair = trim(explode(';', substr($h, strlen('Set-Cookie:')))[0]);
            if ($pair !== '') { $cookie = $pair; }
        }
    }
    return [$status, (string)$resp];
}

/* ---------- preparation : webroot isole (copie de api/ + data/ vierge) ---------- */
@mkdir($tmp . '/webroot/api', 0777, true);
@mkdir($tmp . '/webroot/data/maps', 0777, true);
foreach (glob($repo . '/api/*.php') as $f) {
    copy($f, $tmp . '/webroot/api/' . basename($f));
}
/* Fidelite : l'api embarquee est livree avec son .user.ini (plafonds
   post_max_size/upload_max_filesize, cf. 20-import-limits). */
if (is_file($repo . '/api/.user.ini')) {
    copy($repo . '/api/.user.ini', $tmp . '/webroot/api/.user.ini');
}

$UID_OK = 'a1b2c3d4e5f60718293a4b5c6d7e8f90';   // presente dans le ZIP
$UID_ABSENT = 'ffeeddccbbaa99887766554433221100'; // referencee mais pas dans le ZIP
$UID_VIDE = '0123456789abcdef0123456789abcdef';   // entree image vide dans le ZIP
$UID_CASSE = '11112222333344445555666677778888';  // fichier deja casse sur le serveur
$payload = 'RIFF' . str_repeat('x', 64) . 'WEBPVP8 ';

/* fichier deja casse (0 octet) pour le controle check_images */
file_put_contents($tmp . '/webroot/data/maps/' . $UID_CASSE . '.webp', '');

/* ---------- ZIP d'export a la main ---------- */
$zipPath = $tmp . '/export.zip';
$zip = new ZipArchive();
$zip->open($zipPath, ZipArchive::OVERWRITE | ZipArchive::CREATE);
$json = [
    'maps' => [
        ['v' => 3, 'kind' => 'dcc-map', 'name' => 'Carte fond', 'w' => 10, 'h' => 10,
         'ops' => [], 'ui' => [], 'bg' => ['uid' => $UID_OK, 'name' => 'fond1.webp']],
        ['v' => 3, 'kind' => 'dcc-map', 'name' => 'Carte absente', 'w' => 10, 'h' => 10,
         'ops' => [], 'ui' => [], 'bg' => ['uid' => $UID_ABSENT, 'name' => 'absent.webp']],
        ['v' => 3, 'kind' => 'dcc-map', 'name' => 'Carte vide', 'w' => 10, 'h' => 10,
         'ops' => [], 'ui' => [], 'bg' => ['uid' => $UID_VIDE, 'name' => 'vide.webp']],
    ],
];
$zip->addFromString('export.json', json_encode($json));
$zip->addFromString('images/' . $UID_OK . '.webp', $payload);
$zip->addFromString('images/' . $UID_VIDE . '.webp', '');
$zip->close();

/* ---------- serveur de test ---------- */
$descriptors = [1 => ['pipe', 'w'], 2 => ['pipe', 'w']];
$server = proc_open(
    // Fidelite : memes plafonds que les lanceurs dev (start.bat/startup.bat),
    // php -S ignorant .user.ini (SAPI cli-server).
    [PHP_BINARY, '-d', 'post_max_size=70M', '-d', 'upload_max_filesize=64M',
     '-S', '127.0.0.1:' . $port, '-t', $tmp . '/webroot'],
    $descriptors, $pipes, $tmp
);
$ready = false;
if (is_resource($server)) {
    for ($i = 0; $i < 50; $i++) {
        $s = @fsockopen('127.0.0.1', $port, $errno, $errstr, 0.2);
        if ($s) { fclose($s); $ready = true; break; }
        usleep(100000);
    }
}
ok($ready, 'serveur php -S de test pret (port ' . $port . ')');

$cookie = '';
if ($ready) {
    /* ---------- inscription = session ---------- */
    $pseudo = 't' . bin2hex(random_bytes(6));
    $body = json_encode(['pseudo' => $pseudo, 'password' => 'secret123']);
    [$st, $resp] = req($port, 'POST', '/api/auth.php?action=register', $body,
        ['Content-Type: application/json'], $cookie);
    $j = json_decode($resp, true);
    ok($st === 200 && !empty($j['ok']) && $cookie !== '', 'inscription + cookie de session');

    /* ---------- import_all du ZIP ---------- */
    $boundary = '----DccTest' . bin2hex(random_bytes(10));
    $zipBytes = file_get_contents($zipPath);
    $mp = '--' . $boundary . "\r\n"
        . "Content-Disposition: form-data; name=\"file\"; filename=\"export.zip\"\r\n"
        . "Content-Type: application/zip\r\n\r\n"
        . $zipBytes . "\r\n"
        . '--' . $boundary . "--\r\n";
    [$st, $resp] = req($port, 'POST', '/api/maps.php?action=import_all', $mp,
        ['Content-Type: multipart/form-data; boundary=' . $boundary], $cookie);
    $j = json_decode($resp, true);
    ok($st === 200 && !empty($j['ok']), 'import_all : reponse ok (status ' . $st . ')');
    ok(isset($j['images']) && (int)$j['images'] === 1,
        'images extraites = 1 (uid valide seule) — got ' . json_encode($j['images'] ?? null));

    $f = $tmp . '/webroot/data/maps/' . $UID_OK . '.webp';
    ok(is_file($f) && filesize($f) > 0, 'image uid valide : fichier present et non vide');
    ok(is_file($f) && file_get_contents($f) === $payload,
        'image uid valide : contenu identique au ZIP (regression getFromIndex)');
    ok(!is_file($tmp . '/webroot/data/maps/' . $UID_VIDE . '.webp'),
        'entree image vide : aucun fichier cree');

    $missing = isset($j['missing']) && is_array($j['missing']) ? $j['missing'] : null;
    ok($missing !== null
        && in_array($UID_ABSENT, $missing, true)
        && in_array($UID_VIDE, $missing, true)
        && !in_array($UID_OK, $missing, true),
        'missing = uid absent + uid vide, pas uid valide — got ' . json_encode($missing));

    /* ---------- check_images : 0 octet = introuvable ---------- */
    $body = json_encode(['action' => 'check_images',
        'uids' => [$UID_OK, $UID_CASSE, $UID_ABSENT]]);
    [$st, $resp] = req($port, 'POST', '/api/maps.php', $body,
        ['Content-Type: application/json'], $cookie);
    $j = json_decode($resp, true);
    $missing = isset($j['missing']) && is_array($j['missing']) ? $j['missing'] : null;
    ok($missing !== null
        && in_array($UID_CASSE, $missing, true)
        && in_array($UID_ABSENT, $missing, true)
        && !in_array($UID_OK, $missing, true),
        'check_images : fichier casse (0 octet) signale missing — got ' . json_encode($missing));

    /* ---------- flux complet d'import : le remplacement des calques ne
       doit PAS effacer les images que import_all vient d'extraire
       (regression 11/10/2026 sur l'APK : deleteAllMaps rendait chaque UID
       orphelin -> toutes les cartes importees sans fond). ---------- */
    $body = json_encode(['action' => 'create', 'name' => 'Carte importee']);
    [$st, $resp] = req($port, 'POST', '/api/maps.php', $body,
        ['Content-Type: application/json'], $cookie);
    $j = json_decode($resp, true);
    $mapId = isset($j['map']['id']) ? (int)$j['map']['id'] : 0;
    ok($st === 200 && $mapId > 0, 'create : calque cree pour le flux complet');

    $body = json_encode(['action' => 'save', 'id' => $mapId,
        'bg_uid' => $UID_OK, 'bg_name' => 'fond1.webp']);
    [$st, $resp] = req($port, 'POST', '/api/maps.php', $body,
        ['Content-Type: application/json'], $cookie);
    ok($st === 200, 'save : calque reference le fond extrait (R10)');

    // remplacement type import (« Importer tout ») : delete avec keep_images
    $body = json_encode(['action' => 'delete', 'id' => $mapId, 'keep_images' => true]);
    [$st, $resp] = req($port, 'POST', '/api/maps.php', $body,
        ['Content-Type: application/json'], $cookie);
    $j = json_decode($resp, true);
    ok($st === 200 && !empty($j['ok']) && empty($j['image_deleted']),
        'delete keep_images : reponse ok sans suppression');
    ok(is_file($f) && file_get_contents($f) === $payload,
        'delete keep_images : le fond extrait est conserve');

    // suppression manuelle (module dessin) : R12 inchange, l'image part
    $body = json_encode(['action' => 'create', 'name' => 'Carte ephemere']);
    [$st, $resp] = req($port, 'POST', '/api/maps.php', $body,
        ['Content-Type: application/json'], $cookie);
    $j = json_decode($resp, true);
    $mapId2 = isset($j['map']['id']) ? (int)$j['map']['id'] : 0;
    $body = json_encode(['action' => 'save', 'id' => $mapId2,
        'bg_uid' => $UID_OK, 'bg_name' => 'fond1.webp']);
    req($port, 'POST', '/api/maps.php', $body,
        ['Content-Type: application/json'], $cookie);
    $body = json_encode(['action' => 'delete', 'id' => $mapId2]);
    [$st, $resp] = req($port, 'POST', '/api/maps.php', $body,
        ['Content-Type: application/json'], $cookie);
    $j = json_decode($resp, true);
    ok($st === 200 && !empty($j['image_deleted']), 'delete sans drapeau : image supprimee (R12)');
    // Le serveur (autre processus) vient de supprimer le fichier, mais CE
    // processus a mis is_file($f) en cache a l'entree du test (cache de
    // statuts PHP) : clearstatcache force la re-verification reelle.
    clearstatcache(true, $f);
    ok(!is_file($f), 'delete sans drapeau : fichier parti');
}

if (is_resource($server)) {
    @proc_terminate($server);
    @fclose($pipes[1]);
    @fclose($pipes[2]);
    @proc_close($server);
}
rrmdir($tmp);

exit($fails === 0 ? 0 : 1);
