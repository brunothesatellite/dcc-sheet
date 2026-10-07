<?php
$DB_PATH = __DIR__ . '/../data/dcc.db';

function getDB() {
    global $DB_PATH;
    $dir = dirname($DB_PATH);

    if (!is_dir($dir)) {
        @mkdir($dir, 0777, true);
    }

    if (!is_writable($dir)) {
        @chmod($dir, 0777);
    }

    if (!is_writable($dir)) {
        jsonResponse(['error' => 'Le dossier data/ n\'est pas accessible en ecriture. Verifiez les permissions sur votre serveur.'], 500);
    }

    $db = new SQLite3($DB_PATH);
    $db->enableExceptions(true);
    /* ATTENTION a l'ordre : le timeout DOIT etre pos AVANT tout pragma, sinon
       un verrou concurrent fait echouer le setup en Fatal error (D14). */
    $db->busyTimeout(5000);
    try {
        /* journal_mode est persistant dans le fichier : echec = deja en WAL
           ou autre connexion active — jamais bloquant. */
        $db->exec('PRAGMA journal_mode=WAL');
    } catch (Exception $e) {
        // Base deja en WAL ou verrouillee : on continue
    }
    $db->exec('PRAGMA foreign_keys=ON');
    $db->exec('CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        pseudo TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        created_at TEXT DEFAULT (datetime(\'now\')),
        last_activity_at TEXT DEFAULT NULL,
        team_notes TEXT NOT NULL DEFAULT \'\',
        marching_order TEXT NOT NULL DEFAULT \'{}\',
        team_state TEXT NOT NULL DEFAULT \'{}\'
    )');
    try {
        $db->exec('ALTER TABLE users ADD COLUMN team_notes TEXT NOT NULL DEFAULT \'\'');
    } catch (Exception $e) {
        // Colonne deja presente sur une base existante
    }
    try {
        $db->exec('ALTER TABLE users ADD COLUMN marching_order TEXT NOT NULL DEFAULT \'{}\'');
    } catch (Exception $e) {
        // Colonne deja presente sur une base existante
    }
    try {
        $db->exec('ALTER TABLE users ADD COLUMN team_state TEXT NOT NULL DEFAULT \'{}\'');
    } catch (Exception $e) {
        // Colonne deja presente sur une base existante
    }
    try {
        $db->exec('ALTER TABLE users ADD COLUMN map_prefs TEXT NOT NULL DEFAULT \'{}\'');
    } catch (Exception $e) {
        // Colonne deja presente sur une base existante
    }
    $db->exec('CREATE TABLE IF NOT EXISTS characters (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL DEFAULT \'Sans nom\',
        class TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 0,
        data TEXT NOT NULL DEFAULT \'{}\',
        created_at TEXT DEFAULT (datetime(\'now\')),
        updated_at TEXT DEFAULT (datetime(\'now\')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )');
    /* Calques de cartes (module dessin) : data = {v,w,h,ops}, ui = {zoom,left,top},
       bg_uid/bg_name = image de fond (data/maps/[UID].webp). */
    $db->exec('CREATE TABLE IF NOT EXISTS maps (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL DEFAULT \'Carte\',
        data TEXT NOT NULL DEFAULT \'{"v":3,"w":0,"h":0,"ops":[]}\',
        ui TEXT NOT NULL DEFAULT \'{}\',
        bg_uid TEXT NOT NULL DEFAULT \'\',
        bg_name TEXT NOT NULL DEFAULT \'\',
        created_at TEXT DEFAULT (datetime(\'now\')),
        updated_at TEXT DEFAULT (datetime(\'now\')),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )');
    $db->exec('CREATE INDEX IF NOT EXISTS idx_maps_user ON maps(user_id)');
    return $db;
}

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_UNESCAPED_UNICODE);
    exit;
}

function jsonError($message, $code = 400) {
    jsonResponse(['error' => $message], $code);
}

function getUserFromSession($db) {
    if (session_status() === PHP_SESSION_NONE) { session_start(); }
    if (empty($_SESSION['user_id'])) { return null; }
    $stmt = $db->prepare('SELECT id, pseudo FROM users WHERE id = :id');
    $stmt->bindValue(':id', $_SESSION['user_id'], SQLITE3_INTEGER);
    $result = $stmt->execute();
    $user = $result->fetchArray(SQLITE3_ASSOC);
    return $user ?: null;
}

function requireLogin($db) {
    $user = getUserFromSession($db);
    if (!$user) { jsonError('Non connecte', 401); }
    touchLastActivity($db, $user['id']);
    return $user;
}

function touchLastActivity($db, $userId) {
    if (session_status() === PHP_SESSION_NONE) { session_start(); }
    if (isset($_SESSION['last_touch']) && (time() - $_SESSION['last_touch']) < 300) { return; }
    $_SESSION['last_touch'] = time();
    $stmt = $db->prepare('UPDATE users SET last_activity_at = datetime(\'now\') WHERE id = :id');
    $stmt->bindValue(':id', $userId, SQLITE3_INTEGER);
    $stmt->execute();
}
