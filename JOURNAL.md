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

---

## Date : 22 septembre 2026

---

### Catalogues d'icones

- **`dcc-icons.js`** cree : catalogue de 20 PNG tokens officiels DCC, mappes par classe (clerc: 2, elfe: 2, guerrier: 5, halfelin: 2, mage: 4, nain: 2, voleur: 3)
- **`dd-red-box-icons.js`** cree : catalogue de 7 webp illustrations D&D Red Box, 1 par classe
- Fichiers charges dans `index.html` avant `script.js`

### Portrait de classe dans BLOC_COMMUN

- Ajout d'un bloc `portrait-area` dans `bloc_commun.js`, colonne droite sous les champs Attaque/Degats CAC/Distance
- 2 hidden inputs avec `data-key` : `portrait_source` (defaut: "dcc") et `portrait_index` (defaut: "0")
- Checkbox toggle DCC/Red Box avec le composant `.switch` existant
- Affichage du label source ("DCC" / "Red Box")

### Logique portrait dans script.js

- **`initPortraits(cls, charId, container)`** : fonction appelee apres `loadClassModule` dans `openSheet`
- Scope le `querySelector` sur `sheetBody` (pas le document entier) pour eviter les conflits entre onglets
- Retry 100ms si `window.DCCIcons` ou `window.DDRedBoxIcons` pas encore charges
- **Mode DCC** : image depuis `DCCIcons[cls][index]`, clic pour cycle, `cursor: pointer`
- **Mode Red Box** : image unique depuis `DDRedBoxIcons[cls]`, pas de clic
- Mise a jour des hidden inputs a chaque changement → sauvegarde automatique via `scheduleSave`

### Bugs corriges (portrait)

- **SyntaxError `})`** en trop : reste du `forEach` supprime lors du refactoring
- **Specificite CSS** : `.team-table td` (0,1,1) ecrasait `.char-name` (0,1,0) → correction avec `.team-table .char-name` (0,2,0)
- **Portrait non affiche au premier chargement** : retry si les icones ne sont pas encore chargees
- **Portrait casse pour personnages existants** : querySelector scope sur `sheetBody` au lieu du document entier
- **Valeurs vides sauvegardees en base** : hidden inputs avec default values dans le template `v('portrait_source', 'dcc')`

### Onglet Equipe — portraits et mise en page

- Ajout d'un `<img class="team-portrait">` dans la colonne Classe de chaque ligne de personnage
- Portrait charge depuis `DCCIcons` ou `DDRedBoxIcons` selon le `portrait_source` sauvegarde
- **CSS equipe** :
  - `.char-class` : `display: flex; align-items: center` (puis rollback vers inline + `vertical-align: middle`)
  - `.team-portrait` : 50px (desktop), 40px (mobile), `border-radius: 50%`
  - `.team-table` : `table-layout: fixed` pour controler les proportions
  - Colonnes : Nom 20%, Classe 28%, Init 10%, AC 10%, PV 10%, Init.combat 10%, Tour 12%
  - `.team-table tbody tr` : hauteur fixe 50px (desktop), 40px (mobile)
  - `.char-name` : font-size 28px, `var(--font-body)`
  - Portrait 100% de la hauteur de la ligne

### UI — utilisateur et import/export

- **Menu utilisateur** : avatar (premiere lettre du pseudo) + dropdown menu (fichier de reference fabled-lands)
- **Export global** : `exportAllCharacters()` — telecharge JSON avec version, date, tous les personnages
- **Import global** : `importAllCharacters()` — selection fichier, validation, confirmation danger, remplacement total
- **Changement de mot de passe** : modal 3 champs (ancien/nouveau/confirmer), erreurs inline en rouge, validation coté client et serveur
- **Suppression de compte** : `showDeleteAccountModal()` → API `delete_account` → supprime personnages, user, session
- **Console.error supprime** : la fonction `api()` ne log plus en console (erreurs toujours jettees et gerees par les appelants)

### Fichiers modifies (22 septembre)

| Fichier | Actions |
|---------|---------|
| `index.html` | Ajout scripts `dcc-icons.js` et `dd-red-box-icons.js`, menu utilisateur dropdown |
| `script.js` | `initPortraits()`, export/import global, delete account, password change modal, console.error retire |
| `style.css` | Portrait (area, img, switch), equipe (portraits, colonnes, hauteur lignes, char-name 28px), user-menu dropdown |
| `classes/bloc_commun.js` | Ajout portrait-area (hidden inputs + img + switch) |
| `classes/equipe.js` | Ajout icone portrait dans colonne Classe |
| `dcc-icons.js` | Cree (20 tokens DCC) |
| `dd-red-box-icons.js` | Cree (7 icons Red Box) |
| `api/auth.php` | Ajout `delete_account`, `change_password` verifie ancien MDP |
| `README.md` | Mis a jour (portraits, icones, auth, structure, API) |

---

## Date : 22 septembre 2026 (apres-midi)

---

### Des de vie dans BLOC_COMMUN

- Ajout du champ "Des de vie" sous "Points de vie" dans le casque (helmet)
- Valeur determinee par la classe : d12 (guerrier), d10 (nain), d8 (clerc), d6 (elfe/voleur/halfelin), d4 (mage)
- Style : meme fonte que les labels de la fiche

### Bouclier et casque agrandis

- Bouclier : 80x90 → 90x100px (input 50x44), radius 45px
- Casque : 80x90 → 90x105px (input width 60)
- Mobile : bouclier 80x90, casque 80x95

### Sorts Mage — ameliorations visuelles

- Nom du sort : `font-weight: 700` (gras)
- Note/effet : `font-weight: normal` (pas de gras, heritait du numero via `:first-child`)
- Numero de sort : centre (`text-align: center`) + `font-size: 13px`
- Tous les champs de sorts (nom, effet, niveau, test) : style editable (bordure + fond) comme les autres inputs

### Style des notes — uniformisation

- Notes BLOC_COMMUN (2e page) : `font-size: 11px`
- Notes classe (3e page) : `font-size: 11px`
- Notes equipe : `font-size: 11px`
- Clerc : ajout de `<div class="sheet-page">` pour que les notes soient dans un `.sheet-page` (correction CSS nth-child)

### Header sticky — correction decalage

- Wrapper `div.sticky-header` autour du topbar + tab-bar
- Un seul `position: sticky; top: 0` sur le wrapper
- Suppression du sticky individuel sur `.topbar` et `.tab-bar`
- Fin du leger mouvement vers le haut au scroll

### Equipe — compteur de tour visuel

- Remplissage circulaire par paliers de 20% via `conic-gradient` + variable CSS `--fill`
- Cycle modulo 5 : 0=vide, 1=20%, 2=40%, 3=60%, 4=80%, 5=100%, 6=20%, etc.
- Clic droit / appui long : reset a 0

### Equipe — colonnes ajustees

- INIT : 10% → 15% (pour valeurs comme "1d20+8")
- Classe : 28% → 23% (recuperation de place)

### Skill release

- Creation de `.opencode/skills/release/SKILL.md` avec les instructions de processus de release

### Fichiers modifies (22 septembre apres-midi)

| Fichier | Actions |
|---------|---------|
| `classes/bloc_commun.js` | Ajout des de vie, wrapper sheet-page Clerc |
| `classes/clerc.js` | Ajout `<div class="sheet-page">` |
| `classes/equipe.js` | Compteur de tour visuel (conic-gradient), fontSize notes 11px |
| `style.css` | Bouclier/casque agrandis, sorts editable, notes 11px, sticky wrapper, colonnes equipe, turn-counter visuel |
| `index.html` | Wrapper `sticky-header` |
| `.opencode/skills/release/SKILL.md` | Cree |
| `README.md` | Mis a jour |

---

## Date : 22 septembre 2026 (soir)

---

### Notes d'équipe en base + export/import global

- **Objectif** : les notes de l'onglet Équipe sortent du `localStorage` pour être stockées en base et gérées par l'export/import global JSON.
- **Base** (`api/db.php`) : colonne `users.team_notes TEXT NOT NULL DEFAULT ''` ajoutée au CREATE TABLE + `ALTER TABLE` protégé (try/catch) pour les bases existantes.
- **API** (`api/auth.php`) :
  - action `get_team_notes` (GET) → `{ok, notes}` ;
  - action `save_team_notes` (POST `{notes}`) → `{ok}`, `requireLogin`, plafond 100 Ko ;
  - action `check` enrichie avec `id` (nécessaire à la migration localStorage).
- **Front** (`script.js`) :
  - helpers `getTeamNotes()` / `saveTeamNotes()` ;
  - `loadTeamNotesWithMigration()` : si notes serveur vides et clés locales non vides → poussée unique vers l'API puis purge des clés `dcc-equipe-notes-{id}` et `dcc-equipe-notes-undefined` (clé réellement utilisée avant cette évolution, `id` n'étant pas renseigné) ;
  - export global : champ optionnel `team_notes` ajouté (pas de bump de `version`) ;
  - import global : `team_notes` présent → remplacement ; absent → notes préservées (rétrocompatibilité) ;
  - `loadEquipe()` charge les notes et les passe au module avec un callback de sauvegarde ;
  - `showToast` exposé sur `window` (affichage d'erreur de sauvegarde des notes).
- **Module** (`classes/equipe.js`) : signature `render(container, characters, onSavePV, initialNotes, onSaveNotes)` ; plus aucun accès `localStorage` ; debounce 600 ms et toast disquette conservés ; toast d'erreur si l'enregistrement échoue.
- **Docs** : `MANUAL.md` (§ 2.3, § 4.6, § 8.4, § 9, § 10, annexe A), `README.md` (fonctionnalités + table API), cette entrée de journal.
- **Tests** (serveur PHP éphémère, compte de test créé puis supprimé) :

| Test | Résultat |
|------|----------|
| register + get_team_notes initial | `notes: ""` |
| save_team_notes puis get | notes correctement renvoyées |
| check | `logged_in: true`, `id` présent |
| delete_account (avec la nouvelle colonne) | `ok: true` |
| Syntaxe | `php -l` sur db.php/auth.php, `node --check` sur script.js/equipe.js : OK |

### Fichiers modifies (22 septembre soir)

| Fichier | Actions |
|---------|---------|
| `api/db.php` | Colonne `users.team_notes` + ALTER protege |
| `api/auth.php` | Actions `get_team_notes` / `save_team_notes`, `check` + `id` |
| `script.js` | Helpers notes, migration localStorage, export/import `team_notes`, loadEquipe, expose `showToast` |
| `classes/equipe.js` | Notes via callback serveur (fin du localStorage) |
| `MANUAL.md` | Notes serveur, export/import global, tableau local/serveur, depannage, annexe A |
| `README.md` | Fonctionnalites Equipe + table API auth |

---

## Date : 22 septembre 2026 (nuit)

---

### Elfe — 2 sorts de patron figés en tête de table

- **Ligne 1 — Lier un patron** (Niveau 1, test/effet vides) : cellules en texte brut, **aucun `data-key`** → non modifiable, non supprimable (la table Elfe n'a pas de bouton de suppression).
- **Ligne 2 — Invoquer un Patron** (Niveau 1, test vide) : effet `(___/jour)` avec **seul le `___` éditable** :
  - `<input class="patron-jours" data-key="elfe-{id}-patron_invoc_nb" placeholder="___">` ;
  - clé dédiée `patron_invoc_nb` (pas de collision avec `sort_effet_*`) ; stocke **le seul contenu du blanc** (ex. `3` → rendu `(3/jour)`) ;
  - capté par l'auto-save générique → colonne `data` (DB) + exports individuel/global, sans changement BDD/API.
- **Lignes libres** : `SORTS_FREE_ROWS = [3..7]` — 5 lignes conservant les clés `sort_nom_3..7` / `sort_effet_3..7` (les sorts déjà saisis aux lignes 3-7 restent alignés ; les données éventuelles des anciennes lignes 1-2 ne sont plus affichées, remplacées par les sorts figés).
- **CSS** (`style.css`) : `.dtable td.sort-fixed` (nom en gras, aligné gauche), `.dtable td.patron-effet` (aligné gauche), `.dtable input.patron-jours` (largeur 48 px).
- **Docs** : `MANUAL.md` § 6.2 (ligne Elfe), `README.md` (fonctionnalités Elfe).

### Fichiers modifies (22 septembre nuit)

| Fichier | Actions |
|---------|---------|
| `classes/elfe.js` | 2 lignes fixes + lignes libres 3-7 |
| `style.css` | Styles `.sort-fixed`, `.patron-effet`, `.patron-jours` |
| `MANUAL.md` | Ligne Elfe du tableau § 6.2 |
| `README.md` | Ligne Elfe des fonctionnalites |
| `JOURNAL.md` | Cette entree |
