# Journal de developpement - DCC Fiches de Personnage

## Date : 19 septembre 2026

---

## Objectif

Application web SPA responsive pour gerer une equipe complete de personnages DCC (Dungeon Crawl Classics). 7 classes, 0 a plusieurs persos par classe, fiches fideles aux PDF, toggle actif/auberge, sauvegarde en base.

---

## Etape 1 : Analyse et planification

- Exploitation des 7 PDF de fiches de classe via task agents
- Extraction de tous les champs specifiques a chaque classe
- Analyse du projet de reference `fabled-lands-sheet` (auth, BDD, persistance)
- Creation de `PLAN.md` avec architecture complete

---

## Etape 2 : Maquettes HTML

### maquette_clerc.html
- Fiche Clerc en 2 pages A5 empilees verticalement
- Tous les champs edites avec `data-key` pour persistance
- Page 1 : Identite, Combat, 6 Caracteristiques, Jets de sauvegarde, Portrait
- Page 2 : Armes, Equipement, Tresor, Armure, Sorts de clerc, Sorts

### maquette_site.html (v2)
- Structure complete : top bar, 7 onglets, navigation
- Toggle auberge sur chaque carte et dans l'en-tete de fiche
- Vue liste vs vue fiche selon le nombre de persos actifs
- Exemple avec 2 clercs (1 actif, 1 inactif)

---

## Etape 3 : Backend PHP/SQLite3

### api/db.php
- SQLite3 avec WAL + foreign keys
- Table `users` (id, pseudo, password_hash, created_at, last_activity_at)
- Table `characters` (id, user_id, name, class, is_active, data JSON, timestamps)
- Helpers : jsonResponse, jsonError, getUserFromSession, requireLogin, touchLastActivity

### api/auth.php
- check, register, login, logout, change_password
- Bcrypt cost 12, session_regenerate_id

### api/characters.php
- list (filtres class/is_active), get, create, save (JSON data), set_active, delete

---

## Etape 4 : Pages d'authentification

- register.php : inscription avec validation
- login.php : connexion avec gestion erreurs
- change-password.php : changement MDP

---

## Etape 5 : Frontend

- **style.css** (724 lignes) : design tokens light/dark, topbar, tab bar, cartes, toggle auberge, fiches, responsive 600px
- **script.js** (594 lignes) : theme, auth, onglets, CRUD persos, auto-save debounced, chargement dynamique modules, heartbeat session
- **index.html** : SPA avec anti-flash theme, 7 onglets, conteneur dynamique

---

## Etape 6 : Modules de classe (classes/*.js)

Chaque module : `window.DCCModules.{classe}.render()` + `.collectData()`

| Module | Champs specifiques |
|--------|-------------------|
| clerc.js | Dieu, Test incant, Risque defaire, Imposition des mains, Sorts |
| elfe.js | Incantation, Familier, Patron, Corruption, Sorts elfiques (table), Traits elfiques |
| guerrier.js | Crit sur, Arme Chance, HFA, Table de guerison, Manoeuvres de combat |
| halfelin.js | Arbaletes, Camouflage, Coup chanceux, Porte-bonheur, Taille, Infravision |
| mage.js | Incantation, Familier, Patron, Corruption, Risque defaire, Grimoire, Formules magiques, Sorts |
| nain.js | "Classe" (pas Metier), Infravision, Competences souterraines, Arme Chance, HFA, Coup bouclier, Detection, Rage naine, Souffle |
| voleur.js | 13 competences de voleur, Argot des voleurs, Notes |

---

## Etape 7 : Tests et deploiement

### Tests API valides
| Test | Resultat |
|------|----------|
| check (non connecte) | logged_in: false |
| register (joueur1) | ok: true |
| create Clerc | id:1, is_active:1 |
| create Guerrier | id:2, is_active:1 |
| create Voleur | id:3, is_active:1 |
| set_active Voleur -> 0 | ok: true |
| list | 3 persos, Voleur inactif en premier |

### Deploiement
- PHP trouve a `D:\VS_Code_Workspaces\php\php.exe`
- Serveur deploye sur `W:\dcc-sheet`
- Serveur PHP tourne sur `http://localhost:8000`

---

## Fichiers du projet (hors PDF)

```
dcc-sheet/
├── PLAN.md
├── JOURNAL.md
├── index.html
├── script.js
├── style.css
├── api/db.php
├── api/auth.php
├── api/characters.php
├── classes/clerc.js
├── classes/elfe.js
├── classes/guerrier.js
├── classes/halfelin.js
├── classes/mage.js
├── classes/nain.js
├── classes/voleur.js
├── login.php
├── register.php
├── change-password.php
├── deploy/start.bat
└── .gitignore
```

---

## A faire / Ameliorations possibles

- Verification que script.js et les modules fonctionnent ensemble en前端
- Ajustements CSS si necessaire
- Gestion des erreurs reseau en前端
- Import/Export de personnages
- Gestion du mot de passe oublie
