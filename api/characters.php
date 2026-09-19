<?php
require_once __DIR__ . '/db.php';
session_start();

$action = $_GET['action'] ?? '';
$db = getDB();
$user = requireLogin($db);

if ($action === 'list') {
    $class = $_GET['class'] ?? null;
    $isActive = isset($_GET['is_active']) ? (int)$_GET['is_active'] : null;
    $sql = 'SELECT id, name, class, is_active, created_at, updated_at FROM characters WHERE user_id = :uid';
    $params = [':uid' => $user['id']];
    if ($class) { $sql .= ' AND class = :class'; $params[':class'] = $class; }
    if ($isActive !== null) { $sql .= ' AND is_active = :active'; $params[':active'] = $isActive; }
    $sql .= ' ORDER BY updated_at DESC';
    $stmt = $db->prepare($sql);
    foreach ($params as $k => $v) { $stmt->bindValue($k, $v, SQLITE3_TEXT); }
    $result = $stmt->execute();
    $chars = [];
    while ($row = $result->fetchArray(SQLITE3_ASSOC)) { $chars[] = $row; }
    jsonResponse(['ok' => true, 'characters' => $chars]);
}

if ($action === 'get') {
    $id = (int)($_GET['id'] ?? 0);
    if (!$id) { jsonError('ID requis'); }
    $stmt = $db->prepare('SELECT * FROM characters WHERE id = :id AND user_id = :uid');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $result = $stmt->execute();
    $char = $result->fetchArray(SQLITE3_ASSOC);
    if (!$char) { jsonError('Personnage non trouve', 404); }
    jsonResponse(['ok' => true, 'character' => $char]);
}

if ($action === 'create') {
    $input = json_decode(file_get_contents('php://input'), true);
    $class = $input['class'] ?? '';
    $name = trim($input['name'] ?? 'Sans nom');
    $validClasses = ['clerc','elfe','guerrier','halfelin','mage','nain','voleur'];
    if (!in_array($class, $validClasses)) { jsonError('Classe invalide'); }
    $stmt = $db->prepare('INSERT INTO characters (user_id, name, class, is_active, data) VALUES (:uid, :name, :class, 1, \'{}\')');
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $stmt->bindValue(':name', $name, SQLITE3_TEXT);
    $stmt->bindValue(':class', $class, SQLITE3_TEXT);
    $stmt->execute();
    $id = $db->lastInsertRowID();
    $stmt = $db->prepare('SELECT * FROM characters WHERE id = :id');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $result = $stmt->execute();
    $char = $result->fetchArray(SQLITE3_ASSOC);
    jsonResponse(['ok' => true, 'character' => $char]);
}

if ($action === 'save') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);
    $data = $input['data'] ?? null;
    $name = $input['name'] ?? null;
    if (!$id) { jsonError('ID requis'); }
    if ($data === null && $name === null) { jsonError('Donnees requises'); }
    $stmt = $db->prepare('SELECT id FROM characters WHERE id = :id AND user_id = :uid');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $result = $stmt->execute();
    if (!$result->fetchArray()) { jsonError('Personnage non trouve', 404); }
    $sets = ['updated_at = datetime(\'now\')'];
    $params = [':id' => $id];
    if ($data !== null) { $sets[] = 'data = :data'; $params[':data'] = json_encode($data, JSON_UNESCAPED_UNICODE); }
    if ($name !== null) { $sets[] = 'name = :name'; $params[':name'] = $name; }
    $sql = 'UPDATE characters SET ' . implode(', ', $sets) . ' WHERE id = :id';
    $stmt = $db->prepare($sql);
    foreach ($params as $k => $v) { $stmt->bindValue($k, $v, is_int($v) ? SQLITE3_INTEGER : SQLITE3_TEXT); }
    $stmt->execute();
    jsonResponse(['ok' => true]);
}

if ($action === 'set_active') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);
    $isActive = (int)($input['is_active'] ?? 0);
    if (!$id) { jsonError('ID requis'); }
    $stmt = $db->prepare('UPDATE characters SET is_active = :active, updated_at = datetime(\'now\') WHERE id = :id AND user_id = :uid');
    $stmt->bindValue(':active', $isActive, SQLITE3_INTEGER);
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $stmt->execute();
    jsonResponse(['ok' => true]);
}

if ($action === 'delete') {
    $input = json_decode(file_get_contents('php://input'), true);
    $id = (int)($input['id'] ?? 0);
    if (!$id) { jsonError('ID requis'); }
    $stmt = $db->prepare('DELETE FROM characters WHERE id = :id AND user_id = :uid');
    $stmt->bindValue(':id', $id, SQLITE3_INTEGER);
    $stmt->bindValue(':uid', $user['id'], SQLITE3_INTEGER);
    $stmt->execute();
    jsonResponse(['ok' => true]);
}

jsonError('Action inconnue');
