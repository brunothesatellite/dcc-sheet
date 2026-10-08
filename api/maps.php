<?php
require_once __DIR__ . '/db.php';
session_start();

/* ============================================================
   api/maps.php — calques de cartes (dessin vectoriel)
   ------------------------------------------------------------
   list / get / create / save / rename / delete
   prefs_get / prefs_save        (outil, couleur... — A2 : par compte)
   export_zip                    (json + images de fond — A3/R9)
   import_all / import_map       (json ou zip — R9/R11)
   check_images                  (uids presents dans data/maps/ ?)
   ============================================================ */

$db = getDB();
$user = requireLogin($db);

$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? ($input['action'] ?? '');

$MAPS_DIR = __DIR__ . '/../data/maps';
$MAX_MAPS = 10;

function mapsDir($dir) {
    if (!is_dir($dir)) { @mkdir($dir, 0777, true); }
    if (!is_writable($dir)) { @chmod($dir, 0777); }
    return is_writable($dir) ? $dir : null;
}

function validUid($uid) {
    return is_string($uid) && preg_match('/^[0-9a-f]{8,64}$/', $uid);
}

function imageFile($dir, $uid) {
    return validUid($uid) ? $dir . '/' . $uid . '.webp' : null;
}

/* Une ligne de table -> modele d'export v:3 (R10 : uid + nom du fond) */
function rowToModel($row) {
    $data = json_decode($row['data'], true);
    if (!is_array($data)) { $data = []; }
    $model = [
        'v' => 3,
        'kind' => 'dcc-map',
        'name' => $row['name'],
        'w' => isset($data['w']) ? (int)$data['w'] : 0,
        'h' => isset($data['h']) ? (int)$data['h'] : 0,
        'ops' => isset($data['ops']) && is_array($data['ops']) ? $data['ops'] : [],
    ];
    if ($row['bg_uid'] !== '') {
        $model['bg'] = ['uid' => $row['bg_uid'], 'name' => $row['bg_name']];
    }
    $ui = json_decode($row['ui'], true);
    if (is_array($ui)) { $model['ui'] = $ui; }
    return $model;
}

function countMaps($db, $userId) {
    $stmt = $db->prepare('SELECT COUNT(*) AS n FROM maps WHERE user_id = :uid');
    $stmt->bindValue(':uid', $userId, SQLITE3_INTEGER);
    $result = $stmt->execute();
    $row = $result->fetchArray(SQLITE3_ASSOC);
    return (int)($row['n'] ?? 0);
}

function getMapRow($db, $userId, $id) {
    $stmt = $db->prepare('SELECT * FROM maps WHERE id = :id AND user_id = :uid');
    $stmt->bindValue(':id', (int)$id, SQLITE3_INTEGER);
    $stmt->bindValue(':uid', $userId, SQLITE3_INTEGER);
    $result = $stmt->execute();
    $row = $result->fetchArray(SQLITE3_ASSOC);
    return $row ?: null;
}

/* Supprime le fichier image si plus aucun calque ne reference cet UID (D9/R12) */
function deleteImageIfOrphan($db, $userId, $uid, $dir) {
    if (!validUid($uid)) { return false; }
    $stmt = $db->prepare('SELECT COUNT(*) AS n FROM maps WHERE bg_uid = :uid AND user_id = :uid_user');
    $stmt->bindValue(':uid', $uid, SQLITE3_TEXT);
    $stmt->bindValue(':uid_user', $userId, SQLITE3_INTEGER);
    $result = $stmt->execute();
    $row = $result->fetchArray(SQLITE3_ASSOC);
    if ((int)($row['n'] ?? 0) > 0) { return false; }

    $file = imageFile($dir, $uid);
    return $file && is_file($file) ? @unlink($file) : false;
}

/* ---------------- Liste ---------------- */
if ($action === 'list') {
    $stmt = $db->prepare('SELECT id, name, data, ui, bg_uid, bg_name, created_at, updated_at FROM maps WHERE user_id = :uid ORDER BY updated_at DESC');
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $result = $stmt->execute();
    $maps = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) {
        $ui = json_decode($row['ui'], true);
        $data = json_decode($row['data'], true);
        $maps[] = [
            'id' => (int)$row['id'],
            'name' => $row['name'],
            'bg_uid' => $row['bg_uid'],
            'bg_name' => $row['bg_name'],
            'ops' => is_array($data) && isset($data['ops']) && is_array($data['ops']) ? count($data['ops']) : 0,
            'ui' => is_array($ui) ? $ui : new stdClass(),
            'updated_at' => $row['updated_at'],
        ];
    }
    jsonResponse(['ok' => true, 'maps' => $maps, 'max' => $MAX_MAPS]);
}

/* ---------------- Un calque ---------------- */
if ($action === 'get') {
    $row = getMapRow($db, $user['id'], (int)($_GET['id'] ?? 0));
    if (!$row) { jsonError('Carte introuvable', 404); }
    jsonResponse(['ok' => true, 'map' => [
        'id' => (int)$row['id'],
        'name' => $row['name'],
        'model' => rowToModel($row),
        'bg_uid' => $row['bg_uid'],
        'bg_name' => $row['bg_name'],
    ]]);
}

/* ---------------- Creation (D12 : 10 calques max) ---------------- */
if ($action === 'create') {
    if (countMaps($db, $user['id']) >= $MAX_MAPS) {
        jsonError('Limite de ' . $MAX_MAPS . ' cartes atteinte — supprimez-en une pour en créer une nouvelle.', 409);
    }
    $name = trim((string)($input['name'] ?? ''));
    if ($name === '') {
        $name = 'Carte ' . (countMaps($db, $user['id']) + 1);
    }
    $name = function_exists('mb_substr') ? mb_substr($name, 0, 60) : substr($name, 0, 60);

    $stmt = $db->prepare('INSERT INTO maps (user_id, name, data, ui) VALUES (:uid, :name, :data, :ui)');
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $stmt->bindValue(':name', $name, SQLITE3_TEXT);
    $stmt->bindValue(':data', json_encode(['v' => 3, 'w' => 0, 'h' => 0, 'ops' => []], JSON_UNESCAPED_UNICODE), SQLITE3_TEXT);
    $stmt->bindValue(':ui', '{}', SQLITE3_TEXT);
    $stmt->execute();
    $row = getMapRow($db, $user['id'], $db->lastInsertRowID());
    jsonResponse(['ok' => true, 'map' => [
        'id' => (int)$row['id'],
        'name' => $row['name'],
        'model' => rowToModel($row),
        'bg_uid' => $row['bg_uid'],
        'bg_name' => $row['bg_name'],
    ]]);
}

/* ---------------- Sauvegarde (partielle : dessin / vue / fond) ---------------- */
if ($action === 'save') {
    $id = (int)($input['id'] ?? 0);
    $row = getMapRow($db, $user['id'], $id);
    if (!$row) { jsonError('Carte introuvable', 404); }

    $sets = ['updated_at = datetime(\'now\')'];
    $params = [':id' => $id];

    if (isset($input['data']) && is_array($input['data'])) {
        $data = [
            'v' => 3,
            'w' => isset($input['data']['w']) ? (int)$input['data']['w'] : 0,
            'h' => isset($input['data']['h']) ? (int)$input['data']['h'] : 0,
            'ops' => isset($input['data']['ops']) && is_array($input['data']['ops']) ? $input['data']['ops'] : [],
        ];
        $sets[] = 'data = :data';
        $params[':data'] = json_encode($data, JSON_UNESCAPED_UNICODE);
    }
    if (isset($input['ui']) && is_array($input['ui'])) {
        $ui = [];
        foreach (['zoom', 'left', 'top'] as $k) {
            if (isset($input['ui'][$k]) && is_numeric($input['ui'][$k])) { $ui[$k] = (float)$input['ui'][$k]; }
        }
        $sets[] = 'ui = :ui';
        $params[':ui'] = json_encode($ui);
    }
    if (array_key_exists('bg_uid', $input)) {
        $bgUid = (string)$input['bg_uid'];
        if ($bgUid !== '' && !validUid($bgUid)) { jsonError('UID invalide'); }
        $sets[] = 'bg_uid = :bg_uid';
        $params[':bg_uid'] = $bgUid;
    }
    if (array_key_exists('bg_name', $input)) {
        $bgName = (string)$input['bg_name'];
        $bgName = function_exists('mb_substr') ? mb_substr($bgName, 0, 60) : substr($bgName, 0, 60);
        $sets[] = 'bg_name = :bg_name';
        $params[':bg_name'] = $bgName;
    }

    $stmt = $db->prepare('UPDATE maps SET ' . implode(', ', $sets) . ' WHERE id = :id');
    foreach ($params as $k => $v) {
        $stmt->bindValue($k, $v, is_int($v) ? SQLITE3_INTEGER : SQLITE3_TEXT);
    }
    $stmt->execute();
    jsonResponse(['ok' => true]);
}

/* ---------------- Renommage ---------------- */
if ($action === 'rename') {
    $id = (int)($input['id'] ?? 0);
    $name = trim((string)($input['name'] ?? ''));
    if ($name === '') { jsonError('Nom requis'); }
    $name = function_exists('mb_substr') ? mb_substr($name, 0, 60) : substr($name, 0, 60);
    $row = getMapRow($db, $user['id'], $id);
    if (!$row) { jsonError('Carte introuvable', 404); }
    $stmt = $db->prepare('UPDATE maps SET name = :name, updated_at = datetime(\'now\') WHERE id = :id');
    $stmt->bindValue(':name', $name, SQLITE3_TEXT);
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $stmt->execute();
    jsonResponse(['ok' => true]);
}

/* ---------------- Suppression (R12 : l'image part avec la carte) ---------------- */
if ($action === 'delete') {
    $id = (int)($input['id'] ?? 0);
    $row = getMapRow($db, $user['id'], $id);
    if (!$row) { jsonError('Carte introuvable', 404); }

    $stmt = $db->prepare('DELETE FROM maps WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $stmt->execute();

    $dir = mapsDir($MAPS_DIR);
    $imageDeleted = $dir ? deleteImageIfOrphan($db, $user['id'], $row['bg_uid'], $dir) : false;
    jsonResponse(['ok' => true, 'image_deleted' => $imageDeleted]);
}

/* ---------------- Preferences d'interface (A2 : par compte) ---------------- */
if ($action === 'prefs_get') {
    $stmt = $db->prepare('SELECT map_prefs FROM users WHERE id = :uid');
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $result = $stmt->execute();
    $row = $result->fetchArray(SQLITE3_ASSOC);
    $prefs = json_decode($row['map_prefs'] ?? '{}', true);
    jsonResponse(['ok' => true, 'prefs' => is_array($prefs) ? $prefs : new stdClass()]);
}

if ($action === 'prefs_save') {
    $prefs = isset($input['prefs']) && is_array($input['prefs']) ? $input['prefs'] : [];
    $clean = [];
    if (isset($prefs['tool']) && in_array($prefs['tool'], ['pen', 'text', 'eraser', 'move'], true)) { $clean['tool'] = $prefs['tool']; }
    if (isset($prefs['color']) && is_string($prefs['color']) && preg_match('/^#[0-9a-fA-F]{3,8}$/', $prefs['color'])) { $clean['color'] = $prefs['color']; }
    if (isset($prefs['size']) && is_numeric($prefs['size'])) { $clean['size'] = (float)$prefs['size']; }
    if (isset($prefs['bold'])) { $clean['bold'] = (bool)$prefs['bold']; }
    if (isset($prefs['drawMode'])) { $clean['drawMode'] = (bool)$prefs['drawMode']; }
    if (isset($prefs['active_map'])) { $clean['active_map'] = (int)$prefs['active_map']; }

    $stmt = $db->prepare('UPDATE users SET map_prefs = :prefs WHERE id = :uid');
    $stmt->bindValue(':prefs', json_encode($clean), SQLITE3_TEXT);
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $stmt->execute();
    jsonResponse(['ok' => true, 'prefs' => $clean]);
}

/* ---------------- Images referencees presentes ? (R11) ---------------- */
if ($action === 'check_images') {
    $uids = isset($input['uids']) && is_array($input['uids']) ? $input['uids'] : [];
    $dir = $MAPS_DIR;
    $missing = [];
    foreach ($uids as $uid) {
        $uid = (string)$uid;
        if (!validUid($uid)) { $missing[] = $uid; continue; }
        $file = imageFile($dir, $uid);
        /* 0 octet = fichier casse = introuvable (R11) */
        if (!is_file($file) || filesize($file) === 0) { $missing[] = $uid; }
    }
    jsonResponse(['ok' => true, 'missing' => $missing]);
}

/* ---------------- Export ZIP (A3 : json + images) ---------------- */
if ($action === 'export_zip') {
    if (!class_exists('ZipArchive')) {
        jsonError('Extension ZipArchive indisponible sur ce serveur', 500);
    }
    $file = basename((string)($input['file'] ?? 'dcc-export.json'));
    if (!preg_match('/^[A-Za-z0-9._-]+\.json$/', $file)) { $file = 'dcc-export.json'; }
    $json = isset($input['json']) ? $input['json'] : null;
    if ($json === null) { jsonError('JSON absent'); }
    $uids = isset($input['images']) && is_array($input['images']) ? $input['images'] : [];

    $dir = mapsDir($MAPS_DIR);
    $zipPath = tempnam(sys_get_temp_dir(), 'dcczip');
    $zip = new ZipArchive();
    if ($zip->open($zipPath, ZipArchive::OVERWRITE) !== true) { jsonError('Creation du ZIP impossible', 500); }

    $zip->addFromString($file, json_encode($json, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    $missing = [];
    $added = 0;
    foreach ($uids as $uid) {
        $uid = (string)$uid;
        $src = imageFile($dir, $uid);
        if (!$src || !is_file($src)) { $missing[] = $uid; continue; }
        $zip->addFile($src, 'images/' . $uid . '.webp');
        $added++;
    }
    if ($missing) {
        $zip->addFromString('rapport.txt', "Images introuvables sur le serveur au moment de l'export :\n- " . implode("\n- ", $missing) . "\n");
    }
    $zip->close();

    header('Content-Type: application/zip');
    header('Content-Disposition: attachment; filename="' . basename($file, '.json') . '.zip"');
    header('Content-Length: ' . filesize($zipPath));
    readfile($zipPath);
    @unlink($zipPath);
    exit;
}

/* ------------------------------------------------------------
   Lecture d'un fichier d'import (.json ou .zip) -> [json, images]
   Les membres images/ doivent s'appeler [UID].webp (R10) et sont
   ranges dans data/maps/ ; les autres sont ignores.
   ------------------------------------------------------------ */
function readImportFile($file, $dir, &$imageCount) {
    $imageCount = 0;
    $name = (string)($file['name'] ?? '');
    $tmp = $file['tmp_name'] ?? '';
    if (!is_uploaded_file($tmp)) { jsonError('Fichier refusé'); }
    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) { jsonError('Envoi du fichier interrompu'); }

    $isZip = (bool)preg_match('/\.zip$/i', $name);
    $content = file_get_contents($tmp);

    if ($isZip || substr($content, 0, 2) === 'PK') {
        if (!class_exists('ZipArchive')) {
            jsonError('Extension ZipArchive indisponible sur ce serveur', 500);
        }
        $zip = new ZipArchive();
        if ($zip->open($tmp) !== true) { jsonError('ZIP illisible'); }

        $jsonEntry = null;
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $entry = $zip->getNameIndex($i);
            if (preg_match('/^[^\/]+\.json$/', $entry)) { $jsonEntry = $entry; break; }
        }
        if ($jsonEntry === null) { $zip->close(); jsonError('Aucun JSON dans le ZIP'); }

        $json = json_decode($zip->getFromName($jsonEntry), true);
        if (!is_array($json)) { $zip->close(); jsonError('JSON illisible'); }

        /* Images : images/[UID].webp -> data/maps/ (jamais d'ecrasement d'une
           image valide ; un fichier casse de 0 octet est refait) */
        for ($i = 0; $i < $zip->numFiles; $i++) {
            $entry = $zip->getNameIndex($i);
            if (!preg_match('#^images/([0-9a-f]{8,64})\.webp$#', $entry, $m)) { continue; }
            $dest = imageFile($dir, $m[1]);
            if (!$dest || (is_file($dest) && filesize($dest) > 0)) { continue; }
            /* getFromIndex($i) : getFromName attend un NOM d'entree, pas un
               index — il renvoyait false et file_put_contents ecrivait un
               fichier de 0 octet (image de fond « introuvable » a l'affichage) */
            $data = $zip->getFromIndex($i);
            if ($data === false || $data === '') { continue; }
            if (file_put_contents($dest, $data) !== false) { $imageCount++; }
        }
        $zip->close();
        return $json;
    }

    $json = json_decode($content, true);
    if (!is_array($json)) { jsonError('JSON illisible'); }
    return $json;
}

/* UIDs de fond references mais absents de data/maps/ (R11) */
function missingImages($models, $dir) {
    $missing = [];
    foreach ($models as $model) {
        $uid = is_array($model) && isset($model['bg']['uid']) ? (string)$model['bg']['uid'] : '';
        if ($uid === '') { continue; }
        if (!validUid($uid)) { $missing[] = $uid; continue; }
        $file = imageFile($dir, $uid);
        /* 0 octet = fichier casse = introuvable (R11) */
        if (!is_file($file) || filesize($file) === 0) { $missing[] = $uid; }
    }
    return $missing;
}

/* ---------------- Import global (« Importer tout ») ---------------- */
if ($action === 'import_all') {
    if (empty($_FILES['file'])) { jsonError('Fichier absent'); }
    $dir = mapsDir($MAPS_DIR) ?: jsonError('data/maps/ inaccessible', 500);
    $imageCount = 0;
    $json = readImportFile($_FILES['file'], $dir, $imageCount);

    $models = isset($json['maps']) && is_array($json['maps']) ? $json['maps'] : [];
    jsonResponse([
        'ok' => true,
        'json' => $json,
        'images' => $imageCount,
        'missing' => missingImages($models, $dir),
        'maps_total' => count($models),
        'max' => $MAX_MAPS,
    ]);
}

/* ---------------- Import d'un calque (feuille « Importer ») ---------------- */
if ($action === 'import_map') {
    if (empty($_FILES['file'])) { jsonError('Fichier absent'); }
    $dir = mapsDir($MAPS_DIR) ?: jsonError('data/maps/ inaccessible', 500);
    $imageCount = 0;
    $json = readImportFile($_FILES['file'], $dir, $imageCount);

    /* Un .zip d'export global peut etre propose : on prend alors le premier calque */
    $model = isset($json['ops']) ? $json : (isset($json['maps'][0]) ? $json['maps'][0] : null);
    if (!is_array($model)) { jsonError('Aucun calque exploitable dans le fichier'); }

    jsonResponse([
        'ok' => true,
        'map' => $model,
        'images' => $imageCount,
        'missing' => missingImages([$model], $dir),
    ]);
}

jsonError('Action inconnue');
