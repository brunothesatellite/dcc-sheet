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

- Verification que script.js et les modules fonctionnent ensemble en frontend
- Ajustements CSS si necessaire
- Gestion des erreurs reseau en frontend
- Import/Export de personnages
- Gestion du mot de passe oublie

---

## Date : 20 septembre 2026

---

### Refonte layout Clerc (style maquette PDF)

- Suppression du rectangle vide entre Force et Attaque CAC
- Suppression de la zone portrait
- Les 3 cercles JdS (JS Ref, JS Vig, JS Vol) alignes sur une colonne fixe
- Grille 2x2 combat etendu (Attaque CAC, Degats CAC, Att. a distance, Degats distance) placee a droite des stats
- Les 6 attributs en **stat-block** (layout 2 lignes : valeur + cercle en haut, Modif. en bas)
- Chance et Intelligence avec Jet chanceux / Langues en face (pleine largeur)
- Polices augmentees : stat-name 13px, stat-value 16px, cercles JdS 50px diametre
- Suppression des titres "Fiche de Clerc - Partie 1/2"

### Correction bugs responsive Android

- Retiré `flex-direction: column` sur `.sheet-page .row` pour garder le layout compact sur mobile
- `stat-row` passe de `nowrap` a `wrap` sur mobile (plus de scroll horizontal)
- `.stats-and-combat` garde le layout 2 colonnes sur mobile (pas d'empilement)
- Ajustements compacts mobile : stat-name 60px, cercles 42px, inputs reduits
- `min-width: 0` ajoute sur `.stat-extra .field` pour permettre l'expansion des inputs Jet chanceux/Langues sur Android
- Cercles JdS augmentes a 48px sur mobile

### Boutons action cartes

- Bouton "Ouvrir" remplace par icone ✎ (stylo) + tooltip
- Bouton "Supprimer" deja en icone ✖ + tooltip
- Hover : fond noir pour ouvrir, fond rouge pour supprimer

### Police combat etendu

- Labels augmentes a 12px (desktop) / 9px (mobile)
- Inputs augmentes a 14px (desktop) / 12px (mobile), gras

### Architecture BLOC_COMMUN

- **`classes/bloc_commun.js`** cree : module unique exposant `render(container, charId, cls, data)` avec tout le layout commun :
  - Identite (Nom, Titre, Metier, Alignement, Mouvement, Niveau, PX)
  - Defense (Classe d'armure, Points de vie)
  - Combat (Initiative, Des d'action, Attaque, Des critique, Table critique)
  - 6 stat-blocks (Force → Intelligence avec cercles JdS et Jet chanceux/Langues)
  - Grille 2x2 combat etendu
  - Armes, Equipement, Tresor, Armures
- **7 modules de classe** réécrits : chacun appelle `blocCommun.render()` puis n'ajoute que ses sections specifiques
- **Chargement automatique** : `ensureBlocCommun()` dans `script.js` charge `bloc_commun.js` avant tout module de classe
- **Avantage** : modifier `bloc_commun.js` modifie automatiquement les 7 classes

### Fichiers modifies

| Fichier | Action |
|---------|--------|
| `classes/bloc_commun.js` | Cree |
| `classes/clerc.js` | Réécrit (utilise bloc_commun) |
| `classes/elfe.js` | Réécrit (utilise bloc_commun) |
| `classes/guerrier.js` | Réécrit (utilise bloc_commun) |
| `classes/halfelin.js` | Réécrit (utilise bloc_commun) |
| `classes/mage.js` | Réécrit (utilise bloc_commun) |
| `classes/nain.js` | Réécrit (utilise bloc_commun) |
| `classes/voleur.js` | Réécrit (utilise bloc_commun) |
| `script.js` | Ajout ensureBlocCommun() |
| `style.css` | Ajouts : stat-block, stat-extra, responsive, combat-ext |

---

## Date : 21 septembre 2026

---

### Toast de sauvegarde (PLAN_DB)

- Ajout de `showToast()` avec container fixe bottom-right, animations fade-in/out
- `showToastSave()` avec debounce 600ms pour eviter les toasts en rafale
- Appele dans `flushSave()` apres chaque sauvegarde reussie
- Appele dans `syncPVFromEquipe()` apres modification des PV depuis l'equipe
- Appele dans `createCharacter()`, `importCharacter()`, `setCharacterActive()`
- Appele dans `equipe.js` pour les notes (localStorage)

### Audit et correction du champ `data` manquant

- **Bug** : apres refresh, les champs du formulaire etaient vides alors que le nom s'affichait
- **Cause** : la requete SQL de l'action `list` dans `characters.php` ne selectionnait pas la colonne `data`
- **Fix** : ajout de `data` au SELECT dans `api/characters.php`
- **Bug secondaire** : `bloc_commun.js` — 2eme `<div class="sheet-page">` (Equipment) non ferme → Correction avec `</div>` manquant

### Refonte des fiches de classe

Chaque fiche reecrite pour etre fidele aux PDF/screencaps :

| Classe | Changements |
|--------|-------------|
| **Elfe** | Capacites elfiques (incantation, familier, patron, corruption, traits text) + Sorts table 20 lignes (sort_nom/niveau/test/effet) + Notes |
| **Guerrier** | Label-on-line (coup_critique, arme_chance, hfa) + Notes |
| **Halfelin** | Layout 2 colonnes (capacites-left: infravision, discretion, porte-bonheur, petite taille; capacites-right: combat-info box) + Notes |
| **Mage** | Label-on-line (incantation, familier, patron, corruption, mod-text) + Sorts table 20 lignes + Notes |
| **Nain** | Labels (infravision, comp souterraines, arme_chance, hfa, coup de bouclier) + Notes |
| **Voleur** | Skills-grid 2 colonnes, 15 competences avec prefix d/+, Argot label-only + Notes |
| **Clerc** | Ajout section Notes |

### Equipe (nouvel onglet)

- Onglet "Equipe" ajoute a la barre d'onglets (fond rouge, premier onglet)
- Bouton Equipe mobile dans le topbar (visible < 600px)
- Tableau des personnages actifs : Nom (cliquable → ouvre la fiche), Classe, Init, AC, PV (input synchronisé), Init combat, Compteur de tour
- Tableau des ennemis : 3 lignes vides par defaut, boutons +/-/RAZ
- Compteur de tour : clic = +1, clic droit / appui long = reset
- Notes d'equipe : textarea sauvegardee en localStorage (`dcc-equipe-notes-{userId}`)
- CSS : `.tab-equipe`, `.btn-equipe-mobile`, `.team-table`, `.turn-counter`, `.char-name`, `.char-class`, `.btn-group`, `.btn-sm`, `.btn-add`, `.btn-remove`, `.btn-raz`

### Navigation et flux de travail

- `switchTab()` est maintenant `async` et attend `loadClassCharacters`/`loadEquipe`
- **Bouton retour (◀)** : `showList(cls)` avec `autoOpen=false` → toujours retourne a la liste
- **INTER dans la liste** : change le statut sans ouvrir la fiche (`autoOpen=false`)
- **INTER dans la fiche** : change le statut sans quitter la fiche (skip si `activeSheets[activeTab]` actif)
- **Ouverture auto** : uniquement si 1 personnage actif au chargement de l'onglet
- `loadClassCharacters(cls, autoOpen)` avec parametre `autoOpen` (defaut `true`)
- Bouton retour correction : `stopPropagation` sur `click` et `change` du toggle + wrapper

### Fiches de classe - mises a jour

- **Carte personnage** : nom et toggle sur la meme ligne (`.char-card-top` flex), niveau affiche a cote du nom ("TANIA — Niv.3"), suppression de "Nouveau personnage"
- **Mage sorts dynamiques** : ajout/suppression de lignes de sorts, re-numérotation auto, confirmation modal avant suppression, re-bind auto-save apres modification, toujours 1 ligne vide a la fin
- **Jet chanceux / Langues** : transformes en `textarea` (rows=1, resize=vertical, 2 lignes sur mobile via `min-height:3em`)

### Popups custom

- `showModal(opts)` : Promise-based, remplace les `alert()` et `confirm()` natifs
- Types : `alert` (OK seul), `confirm` (OK + Annuler)
- Options : `title`, `message`, `type`, `okText`, `danger` (bouton rouge)
- Fermeture : clic overlay ou touche Échap
- Animation : fade-in + scale-up
- 3 natifs remplaces : confirmation suppression personnage, erreurs d'import JSON

### Spinner de chargement

- Overlay plein écran avec cercle anime, affiche apres 500ms si chargement lent
- Masque automatiquement une fois le chargement termine
- Toast "Donnees restaurees" apres le chargement initial

### Divers

- **Favicon SVG** : epees croisees + de DCC sur fond dark
- **Build script** : `deploy/build.bat` + `_build.ps1` → copie les fichiers dans `deploy/dcc-sheet/` (auto-detecte les fichiers, exclut .git/captures/deploy/data/docs)
- **README.md** : mis a jour avec toutes les fonctionnalites, structure complete, API documentee
- **localStorage** : dernier onglet ouvert sauvegarge (`dcc-active-tab`)
- **Expose globals** : `showToastSave`, `openSheet`, `bindAutoSave`, `scheduleSave`, `showModal` sur `window` pour les modules

### Fichiers modifies (21 septembre)

| Fichier | Actions |
|---------|---------|
| `index.html` | Ajout spinner, modal, onglet Equipe, bouton Equipe mobile, favicon |
| `script.js` | Toast, modal, spinner, async switchTab, autoOpen param, navigation fixes, expose globals |
| `style.css` | Toast, spinner, modal, equipe, cartes, textarea sorts, responsive mobile |
| `style-auth.css` | — |
| `favicon.svg` | Cree |
| `api/characters.php` | Fix: ajout `data` au SELECT de l'action list |
| `classes/bloc_commun.js` | Fix: fermeture `</div>` manquant (2eme sheet-page) |
| `classes/bloc_commun.js` | Textarea Jet chanceux / Langues (rows=1) |
| `classes/clerc.js` | Ajout section Notes |
| `classes/elfe.js` | Refonte complete (capacites + sorts 20 lignes + notes) |
| `classes/guerrier.js` | Refonte complete (label-on-line + notes) |
| `classes/halfelin.js` | Refonte complete (2 colonnes + combat-info + notes) |
| `classes/mage.js` | Refonte complete (label-on-line + sorts dynamiques + notes) |
| `classes/nain.js` | Refonte complete (labels + notes) |
| `classes/voleur.js` | Refonte complete (skills-grid + notes) |
| `classes/equipe.js` | Cree (tableau persos + ennemis + compteurs + notes) |
| `deploy/build.bat` | Reecri (copie dossier au lieu de zip) |
| `deploy/_build.ps1` | Reecri (auto-detecte fichiers, copie avec structure) |
| `.gitignore` | Ajout `deploy/dcc-sheet/` |
| `README.md` | Mis a jour (fonctionnalites, structure, API) |
