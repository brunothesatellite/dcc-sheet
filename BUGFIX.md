# Plan de correction des bugs

## Cause racine unique

**`auth.php` et `characters.php` lisent `$action` depuis `$_GET['action']` (ligne 5 des deux fichiers), mais la fonction JS `api()` envoie l'`action` dans le body JSON pour les requêtes POST, pas dans l'URL query string.**

Conséquence : pour toute requête POST, `$_GET['action']` est vide (`''`), aucun bloc `if ($action === '...')` ne s'exécute, et le script tombe sur `jsonError('Action inconnue')` (HTTP 400).

---

## Bug 1 : Bouton Déconnexion

### Traçage
1. `logout()` appelle `api('auth.php', { method: 'POST', body: { action: 'logout' } })`
2. `api()` envoie POST vers `api/auth.php` (pas de query string)
3. `auth.php` lit `$action = $_GET['action'] ?? ''` → `$action = ''`
4. Le bloc `if ($action === 'logout')` ne s'exécute jamais
5. `jsonError('Action inconnue')` → HTTP 400
6. `api()` throw → catch silencieux dans `logout()`
7. `window.location.href = 'login.php'` s'exécute quand même
8. `login.php` vérifie la session → session toujours active → redirige vers `index.html`
9. **Résultat** : l'utilisateur revient sur index.html toujours connecté

### Correction
**Fichier `api/auth.php`** — Modifier la ligne 5 pour lire l'action depuis le body POST en fallback :

```php
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? ($input['action'] ?? '');
```

Ensuite, réutiliser `$input` dans les blocs `register`, `login`, `change_password` au lieu de relire `php://input`.

---

## Bug 2 : Bouton "Nouveau" (aucune action)

### Traçage
1. `createCharacter(cls)` appelle `api('characters.php', { method: 'POST', body: { action: 'create', ... } })`
2. `api()` envoie POST vers `api/characters.php` (pas de query string)
3. `characters.php` lit `$action = $_GET['action'] ?? ''` → `$action = ''`
4. Le bloc `if ($action === 'create')` ne s'exécute jamais
5. `jsonError('Action inconnue')` → HTTP 400
6. `api()` throw → catch dans `createCharacter()` log l'erreur
7. **Résultat** : rien ne se passe visuellement (le message d'erreur console peut passer inaperçu)

### Correction
**Fichier `api/characters.php`** — Même principe, ligne 5 :

```php
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? ($input['action'] ?? '');
```

Ensuite, réutiliser `$input` dans les blocs `create`, `save`, `set_active`, `delete`.

---

## Bug 3 : Bouton Import

### Traçage
1. Clic sur "Import" → `importCharacter(cls)` → crée un `<input type="file">` temporaire → `input.click()`
2. L'utilisateur sélectionne un fichier → handler `change` s'exécute
3. Le handler appelle `api('characters.php', { method: 'POST', body: { action: 'create', ... } })`
4. **Même bug que Bug 2** : `$_GET['action']` vide → "Action inconnue"
5. Le `catch` affiche un `alert()` avec le message d'erreur

### Correction
Corrigé automatiquement par la correction de Bug 2 (même fichier `characters.php`).

---

## Fichiers à modifier

| Fichier | Ligne(s) | Modification |
|---------|----------|--------------|
| `api/auth.php` | 5 | Lire `$input` depuis `php://input`, extraire `$action` en fallback de `$_GET` |
| `api/auth.php` | 17, 40, 65 | Réutiliser `$input` déjà décodé au lieu de relire `php://input` |
| `api/characters.php` | 5 | Lire `$input` depuis `php://input`, extraire `$action` en fallback de `$_GET` |
| `api/characters.php` | 38, 57, 80, 93 | Réutiliser `$input` déjà décodé au lieu de relire `php://input` |

## Vérification

Après correction, tester :
1. Connexion → onglet Clerc → "+ Nouveau" → fiche s'ouvre ✅
2. Dans la fiche → bouton "Déconnexion" → redirige vers login.php, session détruite ✅
3. Onglet → "+ Import" → sélecteur de fichier s'ouvre → sélectionner un JSON → fiche créée ✅
4. Tous les autres POST (save, set_active, delete) fonctionnent toujours ✅
