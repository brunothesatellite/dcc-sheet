<?php
require_once __DIR__ . '/db.php';
session_start();

$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? ($input['action'] ?? '');

if ($action === 'check') {
    $db = getDB();
    $user = getUserFromSession($db);
    jsonResponse([
        'logged_in' => $user !== null,
        'pseudo' => $user ? $user['pseudo'] : null
    ]);
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
