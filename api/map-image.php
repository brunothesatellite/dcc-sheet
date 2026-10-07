<?php
require_once __DIR__ . '/db.php';
session_start();

/* ============================================================
   api/map-image.php — images de fond des cartes
   ------------------------------------------------------------
   upload : POST multipart (champ "file") -> data/maps/[UID].webp
   get    : GET ?uid=[UID]                -> flux image/webp
   delete : POST {uid}                    -> suppression du fichier
   L'UID est genere a chaque import (jamais d'ecrasement, D11).
   ============================================================ */

$db = getDB();
$user = requireLogin($db);

$MAPS_DIR = __DIR__ . '/../data/maps';

function mapsDir($dir) {
    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }
    if (!is_writable($dir)) {
        @chmod($dir, 0777);
    }
    if (!is_writable($dir)) {
        jsonError('Le dossier data/maps/ n\'est pas accessible en ecriture.', 500);
    }
    return $dir;
}

/* UID attendu : hexadecimale, 8 a 64 caracteres (anti path-traversal) */
function validUid($uid) {
    return is_string($uid) && preg_match('/^[0-9a-f]{8,64}$/', $uid);
}

/* Chemin reel du fichier image, verifie comme contenu dans data/maps/ */
function imagePath($dir, $uid) {
    if (!validUid($uid)) { jsonError('UID invalide'); }
    $path = $dir . '/' . $uid . '.webp';
    $real = realpath($path);
    if ($real !== false) {
        $base = realpath($dir);
        if ($base === false || strpos($real, $base) !== 0) { jsonError('Chemin refuse'); }
        return $real;
    }
    return $path;
}

function newUid() {
    return bin2hex(random_bytes(16));
}

/* Conversion vers webp : un webp est conserve tel quel, tout le reste passe
   par GD (les metadonnees EXIF, dont le GPS, sont ainsi effacees). */
function toWebp($srcPath, $destPath) {
    $info = @getimagesize($srcPath);
    if ($info === false) { return ['ok' => false, 'error' => 'Image illisible']; }

    if ($info[2] === IMAGETYPE_WEBP) {
        if (!@copy($srcPath, $destPath)) {
            return ['ok' => false, 'error' => 'Ecriture impossible'];
        }
        return ['ok' => true, 'converted' => false];
    }

    if (!function_exists('imagewebp')) {
        return ['ok' => false, 'error' => 'Conversion webp indisponible sur ce serveur (GD manquant)'];
    }

    switch ($info[2]) {
        case IMAGETYPE_JPEG: $img = @imagecreatefromjpeg($srcPath); break;
        case IMAGETYPE_PNG:  $img = @imagecreatefrompng($srcPath);  break;
        case IMAGETYPE_GIF:  $img = @imagecreatefromgif($srcPath);  break;
        default:
            return ['ok' => false, 'error' => 'Format d\'image non pris en charge (png, jpg, jpeg, webp)'];
    }
    if (!$img) { return ['ok' => false, 'error' => 'Image illisible']; }

    if ($info[2] === IMAGETYPE_PNG || $info[2] === IMAGETYPE_GIF) {
        imagealphablending($img, false);
        imagesavealpha($img, true);
    }
    $ok = @imagewebp($img, $destPath, 85);
    imagedestroy($img);
    return $ok ? ['ok' => true, 'converted' => true] : ['ok' => false, 'error' => 'Conversion webp impossible'];
}

$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? ($input['action'] ?? '');

/* Le <img> du module pointe sur api/map-image.php?uid=… SANS parametre
   action : le service de l'image est l'action par defaut. */
if ($action === '' && isset($_GET['uid'])) {
    $action = 'get';
}

/* ---------------- Envoi d'une image ---------------- */
if ($action === 'upload') {
    if (empty($_FILES['file'])) { jsonError('Fichier absent'); }

    $file = $_FILES['file'];
    if (($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_INI_SIZE ||
        ($file['error'] ?? UPLOAD_ERR_NO_FILE) === UPLOAD_ERR_FORM_SIZE) {
        jsonError('Image trop lourde (limite du serveur)', 413);
    }
    if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) { jsonError('Envoi du fichier interrompu'); }
    if (!is_uploaded_file($file['tmp_name'])) { jsonError('Fichier refusé'); }

    $dir = mapsDir($MAPS_DIR);

    /* Converti en webp sous un UID neuf : jamais d'ecrasement d'un UID existant */
    $uid = newUid();
    $dest = $dir . '/' . $uid . '.webp';
    $res = toWebp($file['tmp_name'], $dest);
    if (!$res['ok']) { jsonError($res['error'], 400); }

    /* Nom utilisateur : champ "name" du formulaire (nom d'origine conserve
       meme apres conversion webp, D3), sinon le nom du fichier envoye. */
    $name = trim((string)($_POST['name'] ?? ($file['name'] ?? 'image')));
    if ($name === '') { $name = 'image'; }
    $name = function_exists('mb_substr') ? mb_substr($name, 0, 60) : substr($name, 0, 60);

    jsonResponse(['ok' => true, 'uid' => $uid, 'name' => $name, 'converted' => !empty($res['converted'])]);
}

/* ---------------- Service de l'image ---------------- */
if ($action === 'get') {
    $uid = $_GET['uid'] ?? '';
    $dir = $MAPS_DIR;
    if (!validUid($uid)) { jsonError('UID invalide'); }
    $path = imagePath($dir, $uid);
    if (!is_file($path)) { jsonError('Image introuvable', 404); }

    $etag = '"' . md5_file($path) . '"';
    header('Content-Type: image/webp');
    header('Content-Length: ' . filesize($path));
    header('ETag: ' . $etag);
    header('Cache-Control: private, max-age=3600');
    if (isset($_SERVER['HTTP_IF_NONE_MATCH']) && trim($_SERVER['HTTP_IF_NONE_MATCH']) === $etag) {
        http_response_code(304);
        exit;
    }
    readfile($path);
    exit;
}

/* ---------------- Suppression d'une image ---------------- */
if ($action === 'delete') {
    $uid = $input['uid'] ?? '';
    $dir = mapsDir($MAPS_DIR);
    $path = imagePath($dir, $uid);
    $deleted = is_file($path) ? @unlink($path) : false;
    jsonResponse(['ok' => true, 'deleted' => $deleted]);
}

jsonError('Action inconnue');
