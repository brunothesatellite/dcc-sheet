# Journal de suivi des bugs majeurs

---

## Bug 1 : Bouton Déconnexion

**Status : CORRIGE**

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
**Fichier `api/auth.php`** — `$input` lu depuis `php://input` au top, `$action` extrait en fallback de `$_GET`. Les blocs `register`, `login`, `change_password` réutilisent `$input` déjà décodé.

---

## Bug 2 : Bouton "Nouveau" (aucune action)

**Status : CORRIGE**

### Traçage
1. `createCharacter(cls)` appelle `api('characters.php', { method: 'POST', body: { action: 'create', ... } })`
2. `api()` envoie POST vers `api/characters.php` (pas de query string)
3. `characters.php` lit `$action = $_GET['action'] ?? ''` → `$action = ''`
4. Le bloc `if ($action === 'create')` ne s'exécute jamais
5. `jsonError('Action inconnue')` → HTTP 400
6. `api()` throw → catch dans `createCharacter()` log l'erreur
7. **Résultat** : rien ne se passe visuellement (le message d'erreur console peut passer inaperçu)

### Correction
**Fichier `api/characters.php`** — `$input` lu depuis `php://input` au top, `$action` extrait en fallback de `$_GET`. Les blocs `create`, `save`, `set_active`, `delete` réutilisent `$input` déjà décodé.

---

## Bug 3 : Bouton Import

**Status : CORRIGE (depend de Bug 2)**

### Traçage
1. Clic sur "Import" → `importCharacter(cls)` → crée un `<input type="file">` temporaire → `input.click()`
2. L'utilisateur sélectionne un fichier → handler `change` s'exécute
3. Le handler appelle `api('characters.php', { method: 'POST', body: { action: 'create', ... } })`
4. **Même bug que Bug 2** : `$_GET['action']` vide → "Action inconnue"
5. Le `catch` affiche un `alert()` avec le message d'erreur

### Correction
Corrigé automatiquement par la correction de Bug 2 (même fichier `characters.php`).

---

## Cause racine commune

**`auth.php` et `characters.php` lisaient `$action` depuis `$_GET['action']` (ligne 5), mais la fonction JS `api()` envoie l'`action` dans le body JSON pour les requêtes POST, pas dans l'URL query string.**

Conséquence : pour toute requête POST, `$_GET['action']` était vide, aucun bloc PHP ne s'exécutait, `jsonError('Action inconnue')` était retourné.

### Correction appliquée

| Fichier | Modification |
|---------|--------------|
| `api/auth.php` | `$input` lu une seule fois au top ; `$action = $_GET['action'] ?? ($input['action'] ?? '')` |
| `api/characters.php` | `$input` lu une seule fois au top ; `$action = $_GET['action'] ?? ($input['action'] ?? '')` |

---

## Verification

1. Connexion → onglet Clerc → "+ Nouveau" → fiche s'ouvre
2. Dans la fiche → bouton "Déconnexion" → redirige vers login.php, session détruite
3. Onglet → "+ Import" → sélecteur de fichier s'ouvre → sélectionner un JSON → fiche créée
4. Tous les autres POST (save, set_active, delete) fonctionnent toujours

---

## Bug 4 : Tous les boutons dynamiques ne réagissent pas au clic

**Status : CORRIGE**

### Symptômes
- Bouton "Nouveau" : aucun effet, aucune erreur console
- Impacte potentiellement tous les boutons créés via `el()` avec `onClick` (Ouvrir, Supprimer, Export, Import, Retour, toggle auberge)

### Cause
Le helper `el()` (ligne 55 de `script.js`) utilisait :
```javascript
node.addEventListener(k.slice(2), attrs[k]);
```
Pour `onClick`, `k.slice(2)` donne `'Click'` (majuscule). Or `addEventListener` est **sensible à la casse** : l'événement souris s'appelle `'click'` (minuscule). Résultat : l'écouteur est enregistré sur un type d'événement inexistant, le clic ne déclenche jamais le handler.

### Correction
**Fichier `script.js`** — ligne 55 :
```javascript
// Avant
node.addEventListener(k.slice(2), attrs[k]);
// Apres
node.addEventListener(k.slice(2).toLowerCase(), attrs[k]);
```

---
