<?php
require_once __DIR__ . '/db.php';
session_start();

$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? ($input['action'] ?? '');
$db = getDB();
requireLogin($db);

if ($action === 'list') {
    $base = __DIR__ . '/../icons';
    $dirs = [];
    if (is_dir($base)) {
        foreach (scandir($base) as $name) {
            if ($name[0] === '.') continue;
            if (is_dir($base . DIRECTORY_SEPARATOR . $name)) $dirs[] = $name;
        }
    }
    sort($dirs);
    jsonResponse(['ok' => true, 'dirs' => $dirs]);
}

jsonError('Action inconnue');
