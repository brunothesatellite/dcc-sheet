<?php
require_once __DIR__ . '/db.php';
session_set_cookie_params([
    'lifetime' => 30 * 24 * 3600,
    'path'     => '/',
    'httponly'  => true,
    'samesite'  => 'Lax'
]);
session_start();

$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? ($input['action'] ?? '');

if ($action === 'check') {
    $db = getDB();
    $user = getUserFromSession($db);
    jsonResponse([
        'logged_in' => $user !== null,
        'pseudo' => $user ? $user['pseudo'] : null,
        'id' => $user ? (int)$user['id'] : null
    ]);
}

if ($action === 'get_team_notes') {
    $db = getDB();
    $user = requireLogin($db);
    $stmt = $db->prepare('SELECT team_notes FROM users WHERE id = :id');
    $stmt->bindValue(':id', $user['id'], SQLITE3_INTEGER);
    $result = $stmt->execute();
    $row = $result->fetchArray(SQLITE3_ASSOC);
    jsonResponse(['ok' => true, 'notes' => ($row && $row['team_notes'] !== null) ? $row['team_notes'] : '']);
}

if ($action === 'save_team_notes') {
    $notes = $input['notes'] ?? '';
    if (!is_string($notes)) { jsonError('Notes invalides'); }
    if (strlen($notes) > 100000) { jsonError('Notes trop volumineuses (100 Ko maximum)'); }
    $db = getDB();
    $user = requireLogin($db);
    $stmt = $db->prepare('UPDATE users SET team_notes = :notes WHERE id = :id');
    $stmt->bindValue(':notes', $notes, SQLITE3_TEXT);
    $stmt->bindValue(':id', $user['id'], SQLITE3_INTEGER);
    $stmt->execute();
    jsonResponse(['ok' => true]);
}

if ($action === 'get_marching_order') {
    $db = getDB();
    $user = requireLogin($db);
    $stmt = $db->prepare('SELECT marching_order FROM users WHERE id = :id');
    $stmt->bindValue(':id', $user['id'], SQLITE3_INTEGER);
    $result = $stmt->execute();
    $row = $result->fetchArray(SQLITE3_ASSOC);
    $order = ($row && $row['marching_order'] !== null && $row['marching_order'] !== '') ? $row['marching_order'] : '{}';
    jsonResponse(['ok' => true, 'order' => $order]);
}

if ($action === 'save_marching_order') {
    $order = $input['order'] ?? null;
    if ($order === null || !is_array($order)) { jsonError('Positions invalides'); }
    if (strlen(json_encode($order)) > 2048) { jsonError('Ordre de marche trop volumineux (2 Ko maximum)'); }
    $seen = [];
    foreach ($order as $key => $value) {
        if (!is_int($key) || $key < 1) { jsonError('Positions invalides'); }
        if (!is_int($value) || $value < 0 || $value > 8) { jsonError('Positions invalides'); }
        if (isset($seen[$value])) { jsonError('Positions invalides'); }
        $seen[$value] = true;
    }
    $encoded = empty($order) ? '{}' : json_encode($order);
    $db = getDB();
    $user = requireLogin($db);
    $stmt = $db->prepare('UPDATE users SET marching_order = :order WHERE id = :id');
    $stmt->bindValue(':order', $encoded, SQLITE3_TEXT);
    $stmt->bindValue(':id', $user['id'], SQLITE3_INTEGER);
    $stmt->execute();
    jsonResponse(['ok' => true]);
}

/* Etat combat de l'equipe (onglet Equipe) : Init. combat + Tours des persos
   en expedition et les ennemis declares. Colonne users.team_state (JSON). */
if ($action === 'get_team_state') {
    $db = getDB();
    $user = requireLogin($db);
    $stmt = $db->prepare('SELECT team_state FROM users WHERE id = :id');
    $stmt->bindValue(':id', $user['id'], SQLITE3_INTEGER);
    $result = $stmt->execute();
    $row = $result->fetchArray(SQLITE3_ASSOC);
    $raw = ($row && $row['team_state'] !== null && $row['team_state'] !== '') ? $row['team_state'] : '{}';
    $state = json_decode($raw, true);
    if (!is_array($state)) { $state = []; }
    jsonResponse(['ok' => true, 'state' => $state]);
}

if ($action === 'save_team_state') {
    $state = $input['state'] ?? null;
    if (!is_array($state)) { jsonError('Etat equipe invalide'); }
    if (strlen(json_encode($state)) > 32768) { jsonError('Etat equipe trop volumineux (32 Ko maximum)'); }

    /* Nettoyage serveur : seules les valeurs exploitables sont ecrites, les
       entrees invalides sont ignorees (un etat sale ne doit pas bloquer). */
    $clean = ['init_combat' => [], 'tours' => [], 'ennemis' => []];

    $init = $state['init_combat'] ?? [];
    if (is_array($init)) {
        foreach ($init as $id => $value) {
            if (!is_int($id) || $id < 1) { continue; }
            if (!is_string($value) && !is_numeric($value)) { continue; }
            $value = trim((string)$value);
            if ($value === '' || strlen($value) > 20) { continue; }
            $clean['init_combat'][(string)$id] = $value;
        }
    }

    $tours = $state['tours'] ?? [];
    if (is_array($tours)) {
        foreach ($tours as $id => $value) {
            if (!is_int($id) || $id < 1) { continue; }
            if (!is_int($value)) { $value = is_numeric($value) ? (int)$value : -1; }
            if ($value <= 0 || $value > 9999) { continue; }
            $clean['tours'][(string)$id] = $value;
        }
    }

    $enemies = $state['ennemis'] ?? [];
    if (is_array($enemies)) {
        $count = 0;
        foreach ($enemies as $row) {
            if (!is_array($row)) { continue; }
            $count++;
            if ($count > 50) { break; }
            $out = [];
            foreach (['nom', 'ac', 'att', 'pv', 'init'] as $field) {
                $v = $row[$field] ?? '';
                if (!is_string($v) && !is_numeric($v)) { $v = ''; }
                $v = trim((string)$v);
                if (strlen($v) > 120) { $v = substr($v, 0, 120); }
                $out[$field] = $v;
            }
            $tour = $row['tour'] ?? 0;
            if (!is_int($tour)) { $tour = is_numeric($tour) ? (int)$tour : 0; }
            if ($tour < 0 || $tour > 9999) { $tour = 0; }
            $out['tour'] = $tour;
            /* Lignes entierement vides : non persistees (choix produit) */
            if ($out['nom'] === '' && $out['ac'] === '' && $out['att'] === '' &&
                $out['pv'] === '' && $out['init'] === '' && $tour === 0) { continue; }
            $clean['ennemis'][] = $out;
        }
    }

    $encoded = json_encode($clean);
    $db = getDB();
    $user = requireLogin($db);
    $stmt = $db->prepare('UPDATE users SET team_state = :state WHERE id = :id');
    $stmt->bindValue(':state', $encoded, SQLITE3_TEXT);
    $stmt->bindValue(':id', $user['id'], SQLITE3_INTEGER);
    $stmt->execute();
    jsonResponse(['ok' => true]);
}

if ($action === 'register') {
    $pseudo = trim($input['pseudo'] ?? '');
    $password = $input['password'] ?? '';
    if (strlen($pseudo) < 3 || strlen($pseudo) > 20) { jsonError('Pseudo: 3 a 20 caracteres'); }
    if (!preg_match('/^[a-zA-Z0-9_-]+$/', $pseudo)) { jsonError('Pseudo: lettres, chiffres, _ ou - seulement'); }
    if (strlen($password) < 6) { jsonError('Mot de passe: 6 caracteres minimum'); }
    $db = getDB();
    $stmt = $db->prepare('SELECT id FROM users WHERE pseudo = :pseudo');
    $stmt->bindValue(':pseudo', $pseudo, SQLITE3_TEXT);
    $result = $stmt->execute();
    if ($result->fetchArray()) { jsonError('Pseudo deja utilise'); }
    $hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmt = $db->prepare('INSERT INTO users (pseudo, password_hash) VALUES (:pseudo, :hash)');
    $stmt->bindValue(':pseudo', $pseudo, SQLITE3_TEXT);
    $stmt->bindValue(':hash', $hash, SQLITE3_TEXT);
    $stmt->execute();
    $userId = $db->lastInsertRowID();
    $_SESSION['user_id'] = $userId;
    session_regenerate_id(true);
    jsonResponse(['ok' => true, 'pseudo' => $pseudo]);
}

if ($action === 'login') {
    $pseudo = trim($input['pseudo'] ?? '');
    $password = $input['password'] ?? '';
    if (!$pseudo || !$password) { jsonError('Champs requis'); }
    $db = getDB();
    $stmt = $db->prepare('SELECT id, password_hash FROM users WHERE pseudo = :pseudo');
    $stmt->bindValue(':pseudo', $pseudo, SQLITE3_TEXT);
    $result = $stmt->execute();
    $user = $result->fetchArray(SQLITE3_ASSOC);
    if (!$user || !password_verify($password, $user['password_hash'])) {
        jsonError('Pseudo ou mot de passe incorrect');
    }
    $_SESSION['user_id'] = $user['id'];
    session_regenerate_id(true);
    jsonResponse(['ok' => true, 'pseudo' => $pseudo]);
}

if ($action === 'logout') {
    $db = getDB();
    requireLogin($db);
    session_destroy();
    jsonResponse(['ok' => true]);
}

if ($action === 'change_password') {
    $oldPassword = $input['old_password'] ?? '';
    $newPassword = $input['new_password'] ?? '';
    if (strlen($newPassword) < 6) { jsonError('Nouveau MDP: 6 caracteres minimum'); }
    $db = getDB();
    $user = requireLogin($db);
    $stmt = $db->prepare('SELECT password_hash FROM users WHERE id = :id');
    $stmt->bindValue(':id', $user['id'], SQLITE3_INTEGER);
    $result = $stmt->execute();
    $row = $result->fetchArray(SQLITE3_ASSOC);
    if (!password_verify($oldPassword, $row['password_hash'])) { jsonError('Mot de passe actuel incorrect'); }
    $hash = password_hash($newPassword, PASSWORD_BCRYPT, ['cost' => 12]);
    $stmt = $db->prepare('UPDATE users SET password_hash = :hash WHERE id = :id');
    $stmt->bindValue(':hash', $hash, SQLITE3_TEXT);
    $stmt->bindValue(':id', $user['id'], SQLITE3_INTEGER);
    $stmt->execute();
    jsonResponse(['ok' => true]);
}

if ($action === 'delete_account') {
    $db = getDB();
    $user = requireLogin($db);
    $stmt = $db->prepare('DELETE FROM characters WHERE user_id = :uid');
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $stmt->execute();
    $stmt = $db->prepare('DELETE FROM users WHERE id = :id');
    $stmt->bindValue(':id', $user['id'], SQLITE3_INTEGER);
    $stmt->execute();
    session_destroy();
    jsonResponse(['ok' => true]);
}

jsonError('Action inconnue');
