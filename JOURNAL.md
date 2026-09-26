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

---

## Date : 22 septembre 2026 (suite)

---

### Elfe — table de sorts dynamique, présentation identique au Mage

- **Objectif** : même présentation et même moteur que `mage.js` — 2 lignes par sort (haut : `#` rowspan 2 / Nom en gras / Niveau / Test / ✕ ; bas : effet & notes en `colspan 3`), ajout/suppression/re-numérotation dynamiques.
- **En-tête** : calqué sur le Mage (`# | Nom du sort | Niveau | Test | col. ✕ vide`) — le libellé de colonne « Effet mercuriel & Notes » disparaît (comme sur le Mage).
- **2 paires fixes** en format 2 lignes (sans `data-spell`, sans ✕ → doublement intouchables) :
  - `Lier un patron` (ligne d'effet vide figée) ;
  - `Invoquer un Patron` (ligne d'effet = `( <input patron_invoc_nb> /jour)`, seul champ éditable des fixes).
- **Paires libres dynamiques** (copie de la logique Mage, offset `FIXED = 2`) :
  - clés `sort_nom|niveau|test|effet_{n}` conservées → auto-save → DB + export JSON inchangés ;
  - détection des indices existants : regex `sort_(nom|niveau|test|effet)_(\d+)` avec **n ≥ 3** et valeur non vide (données legacy lignes 1-2 ignorées, pas de croissance à chaque rechargement) ;
  - état initial : paires **3** et **4** si aucune donnée ; toujours 1 paire vide en fin ;
  - `getNextIndex()` = `max(indices, 2) + 1` ; `renumber()` = position + 2, ciblé `tr[data-spell] .row-num` (les fixes ne bougent pas) ;
  - `removeEmptyTrailing()` : purge les paires vides de fin en gardant **≥ 1** paire libre (compteur live) ;
  - `deleteSpell()` : confirmation `window.showModal` si remplie, direct si vide, purge + garde-fou ≥ 1 paire, `renumber`, re-bind auto-save + `scheduleSave` ;
  - `addSpell()` + délégation `tbody` sur `.btn-spell-del` + bouton **+ Ajouter un sort** ;
  - IDs scopés par perso : `#elfe-spells-{id}`, `#btn-spell-add-{id}` (pas de conflit multi-onglets) ;
  - non porté : `getFilledIndices()` de mage.js (code mort).
- **CSS** : réutilisation pure (`.row-del`, `.btn-spell-del`, `.btn-spell-add`, `.sort-name`, `.sort-notes`) + `.sort-fixed` / `.patron-effet` /`.patron-jours` existants.
- **Docs** : `MANUAL.md` § 6.2 (ligne Elfe) + § 6.3 rebaptisé « Mage **et Elfe** » avec encadré « Côté Elfe » et note Clerc seule en nombre fixe ; `README.md` ligne Elfe ; `TODO.md` demande « Elfe : sorts dynamique » passée à fait.

### Fichiers modifies (22 septembre suite)

| Fichier | Actions |
|---------|---------|
| `classes/elfe.js` | Table dynamique format Mage (2 lignes/sort, fixes en 2 lignes, moteur add/delete/renumber) |
| `classes/mage.js` | ✕ de suppression en `rowspan="2"` (colonne 2e ligne retirée) + `sort-name` sur `_spellRowHTML` (sorts ajoutés en gras) |
| `style.css` | `.dtable td.row-del` : `vertical-align: middle` (✕ centre sur les 2 lignes) |
| `MANUAL.md` | § 6.2 ligne Elfe, § 6.3 Mage et Elfe, note classes à grille fixe |
| `README.md` | Ligne Elfe (liste dynamique) |
| `TODO.md` | Demande Elfe marquée faite |
| `JOURNAL.md` | Cette entree |

Verifs : `node --check classes/elfe.js` OK ; styles `.btn-spell-add` / `.btn-spell-del` / `.row-del` presents dans `style.css`.

### Correction — ✕ de suppression sur 2 lignes (Mage + Elfe)

- La cellule de suppression passe en `rowspan="2"` : la croix couvre les 2 lignes du sort et reste **centre verticalement**, comme le numero (`.row-num`).
- 2e ligne : suppression du `<td class="row-del">` decompense (colonne couverte par la cellule en rowspan).
- **Lignes fixes Elfe** : meme structure (`row-del rowspan=2` vide, sans bouton) pour rester alignees avec les paires libres.
- **CSS** : `vertical-align: middle` explicite sur `.dtable td.row-del`.
- Bonus mage : `_spellRowHTML` (sorts ajoutes dynamiquement) gagne la classe `sort-name` → nom en gras comme les lignes initiales.

---

## Date : 22 septembre 2026 (suite 2)

---

### Clerc — liste des sorts dynamique sur 2 colonnes

- **Objectif** : remplacer la grille fixe **3 colonnes × 7 lignes** (21 champs `sort_{col}_{row}`) par une liste **2 colonnes**, lignes visuellement distinctes, dynamique comme le Mage (ajout/suppression/renuméro/auto-save DB + JSON).
- **Validation utilisateur** : champ unique « Nom n° page » par sort ; +/✕ agissent sur **1 sort (cellule)**.
- **Structure** (`classes/clerc.js`) :
  - cellule `.sort-cell` = `n° + input + ✕`, id `#clerc-spells-{id}`, bouton `#btn-spell-add-{id}` ;
  - **clés nouvelles** `sort_{n}` (n ≥ 1) → auto-save générique → colonne `data` + exports, aucun changement BDD/API ;
  - **migration au rendu** : si clés `sort_{n}` existent (valeurs non vides compactées) → elles priment ; sinon replat legacy col1(1-7) → col2 → col3 (ordre de lecture conservé, trous compactés) ; clés legacy purgées au 1er save ; imports d'anciens JSON rétrocompatibles ;
  - état initial : **2 cellules vides** (1 ligne) ; `ensureTrailingEmpty()` garantit **≥ 1 cellule vide en fin** après chaque mutation.
- **Moteur Mage copié** : `renumber()` (affichage 1..n, clés/data-spell figés à la création comme le Mage), `getNextIndex()` = max+1, `removeEmptyTrailing()` (≥ 1), `deleteSpell()` (confirm `showModal` si rempli, direct si vide, purge + garde-fou + renuméro + re-bind auto-save), `addSpell()`, délégation `grid` sur `.btn-spell-del`.
- **CSS** (`style.css`) :
  - `.sorts-grid` : `1fr 1fr`, `gap: 1.5px` + fond `--ink` + bordure `1.5px` → **traites de grille nettes** ;
  - `.sort-cell` (flex, fond `--field-bg`) + **zébrage** `:nth-child(4n), :nth-child(4n+3)` → lignes paires en `--paper` (distinction visuelle des lignes) ;
  - `.sort-num` discret, input sans bordure (focus translucide), `.btn-spell-del` réutilisé à droite ;
  - suppression des règles legacy `.sort-col` (bloc orphelin ~l. 2320 inclus).
- **Table *Imposition des mains* et reste de la fiche inchangés.**
- **Docs** : `MANUAL.md` § 6.2 ligne Clerc + § 6.3 rebaptisé « Mage, Elfe **et Clerc** » avec encadré « Côté Clerc » ; `README.md` ligne Clerc ; `TODO.md` « Clerc : sorts dynamique » → faite.

### Fichiers modifies (22 septembre suite 2)

| Fichier | Actions |
|---------|---------|
| `classes/clerc.js` | Grille dynamique 2 colonnes (migration legacy + moteur Mage) |
| `style.css` | `.sorts-grid`/`.sort-cell`/`.sort-num` + zébrage, suppression `.sort-col` legacy |
| `MANUAL.md` | § 6.2 ligne Clerc, § 6.3 Mage/Elfe/Clerc + « Côté Clerc » |
| `README.md` | Ligne Clerc (liste dynamique) |
| `TODO.md` | Demande Clerc marquée faite |
| `JOURNAL.md` | Cette entree |

Verifs : `node --check classes/clerc.js` OK ; tests manuels (migration 8 sorts → 5 lignes, ajout/suppression + confirmation, ≥ 1 vide, renuméro, persistance DB/JSON).

---

## Date : 23 septembre 2026

---

### Système de portraits générique (7 sources)

- **Registre** `portrait-icons.js` : `window.PortraitSources` + `window.getPortraitSrc(source, cls, index)` ; sources : `dcc` (20 tokens), `redbox` (7), `shadow` Leremy Gan (7 silhouettes), `shadowdark` (12), `comics` Jeff Stevens (8 planches), `gonzo` (30), `osr` Old School (17).
- **Catalogues** : `dcc-icons.js`, `dd-red-box-icons.js`, `shadow-icons.js`, `shadowdark-icons.js`, `comics-icons.js`, `gonzo-icons.js`, `osr-icons.js` — chacun avec `meta.key` / `meta.label` ; chargés dans `index.html` avant le registre.
- **Fichiers images** : `icons/shadow/` (PNG), `icons/shadowdark/` (12 PNG, **compressés ~200 Ko** au lieu de ~2,4 Mo), `icons/jeff-stevens/` (8 planches), `icons/gonzo/` (30 PNG couleur + `_nb`), `icons/osr/` (17 PNG).
- **Clés persistance** : `portrait_source` (ASCII uniquement) + `portrait_index` (wrap modulo longueur tableau) ; inputs hidden dans `bloc_commun.js`, lus par `collectData`.
- **Popup « Choisir un portrait »** : grille **continue** 3 colonnes (2 sur mobile), libellé de source **au-dessus du premier portrait** de chaque section (cellules dédiées aux images, cases vides comblées par la suite), portrait courant surligné + auto-scroll, fermeture X / FERMER / clic extérieur / Échap ; capture `captures/choix-portrait.png` intégrée au MANUAL § 7.
- **Affichage** : portrait sur les **cartes de la liste** (`.char-card-portrait`, 50 px / 40 px mobile), l'**onglet Equipe** (colonne Classe), et la fiche.
- **Header popup en thème sombre** : `--header-bg` / `--header-text` au lieu de `--accent` + `#fff` (le crème `#e8e4dc` du dark rendait la barre illisible).
- **Nav mobile** : onglet Equipe masqué ≤ 600px, remplacé par l'icône ⚔ `#btn-equipe-mobile` dans le topbar.

### Fiches — corrections

- **Clerc** : table *Imposition des mains (décalage d'alignement)* passée en **statique** — 12 `<input data-key>` remplacés par du texte en dur (`.impos-val` centré) ; plus ramassé par `collectData`, plus sauvegardé ; coquille `1 dés` → `1 dé` ; clés orphelines `impos_*` en base ignorées sans migration.
- **Halfelin** : bloc `.combat-info` « Combat à deux armes » en fond `--inn-bg` + bordure `--inn-border` pointillée ( distinction visuelle inputs / contenu de référence ) ; libellé `field-label` → `cap-label`.
- **Accents** : corrections de typos et accents sur 5 fichiers (libellés/textes uniquement, clés `k()` ASCII inchangées).

### Divers

- Exemple d'équipe ajouté au dépôt (`exemples/dcc-persos-2026-09-22.json`).
- Correction du bloc `@media` orphelin de `style.css` (accolades 371/371).
- **Gonzo** : suppression des 2 doublons guerrier homme variante (`09_guerrier_homme_variante.png` + `_nb`) — 32 → **30 images** ; `gonzo-icons.js`, MANUAL (§ 7 + annexe B : guerrier 4 → 2), README et JOURNAL alignés.

### Popup portraits — grille continue (mise à jour du layout)

- **`showPortraitPicker`** réécrit : une **seule** `.portrait-picker-grid` ; chaque image dans une `.portrait-picker-cell` ; le **libellé de source** n'apparaît que sur la cellule du **premier portrait** de la section (empilé au-dessus), les autres cellules réservent la même hauteur (`min-height: 24px`) pour garder l'alignement des rangées.
- **Gain** : plus de cases vides en fin de section (les portraits de la source suivante comblent la suite), plus de case occupée par un titre seul.
- **Capture** `captures/choix-portrait.png` régénérée (nouveau layout) ; **MANUAL § 7.1**, **README** et **JOURNAL** alignés sur la description « grille continue, libellé au-dessus du premier portrait ».

### Fichiers modifies (23 septembre)

| Fichier | Actions |
|---------|---------|
| `portrait-icons.js` + 7 catalogues + `icons/*` | Registre des 7 sources + images (dont `gonzo-icons.js`, `osr-icons.js`) |
| `script.js` | `initPortraits`, `showPortraitPicker` (grille continue + cells), `createCharCard`, bouton équipe mobile |
| `index.html` | Chargement des catalogues, bouton ⚔ |
| `classes/bloc_commun.js` | Portrait-area + inputs hidden source/index |
| `classes/equipe.js` | Portrait dans le tableau |
| `classes/clerc.js` | Table Imposition des mains statique |
| `classes/halfelin.js` | `cap-label` |
| `style.css` | Fix media query, portrait picker (`.portrait-picker-cell`, titre section), cartes, `.impos-val`, `.combat-info`, header popup dark |
| `captures/choix-portrait.png` | Capture régénérée (layout grille continue) |
| `MANUAL.md` / `README.md` | Portraits 7 sources, popup grille continue, nav, table statique |
| `JOURNAL.md` | Cette entrée |

---

## Date : 24 septembre 2026

---

### Equipe — détail combat dépliable sous la ligne personnage

- **Demande** (`TODO.md`) : consulter Attaque/Dégâts CàC et Distance sans popup, sans colonne nouvelle, sans navigation, compact par défaut.
- **Mockup** `mockup-equipe-detail.html` (validation puis retrait) : layout calqué webapp (portrait + libellé sur **une ligne**, chevron sous le libellé via `.char-class-labels`).
- **`classes/equipe.js`** :
  - `expandedCharacterId` (closure module) — un seul perso ouvert ;
  - colonne **Classe** cliquable (`role=button`, `tabindex`, `aria-expanded`/`aria-controls`, Entrée/Espace) ;
  - `toggleDetail` / `closeExpanded` — insertion/suppression de `tr.team-detail` (colspan 7) **sans re-render global** (compteurs, notes, PV préservés) ;
  - collapse animé 250 ms puis retrait ; switch instantané ;
  - `statCellHtml` : lit `attaque_cac` / `degats_cac` / `att_distance` / `degats_distance` ; **vide → `-`** (plus de faux `+0` / `1d6` placeholder) ;
  - le **Nom** ouvre toujours la fiche (`switchTab` + `openSheet`).
- **`style.css`** (ajouts seuls, règles existantes intactes) :
  - `.char-class-labels`, `.chevron`, focus `aria-expanded`, `.team-detail*` (`grid-template-rows` 0fr→1fr, 250 ms), `.team-stat-*` ;
  - mobile ≤ 600 px : gaps/paddings/tailles réduits.
- **Tests** : mini-DOM stub (`test-equipe-detail.js`) — open/switch/close, clavier, stats remplies/vides, nom→fiche, collapse async — **26/26**.

### Equipe — colonnes ennemis réorganisées

- Classe `.team-table-enemies` sur le tableau ennemis uniquement.
- Ordre : **Ennemi, AC, ATT, PV, Init., Tour** (was : Ennemi, Init., AC, ATT, PV, Tour).
- Largeurs : AC **9 %**, Init. **9 %** (2 chiffres), ATT **30 %** (espace gagné) ; Ennemi/PV/Tour inchangés.
- `createEnemyRow` : types d'inputs réalignés (AC number, ATT text, PV number, Init number).

### Clerc & session (depuis v1.6)

- **Sorts du Clerc** : nouveau style grille (`b9848aa`) + **fix numération** (`d960998`).
- **Session** : durée d'inactivité augmentée (`bf0c37c`, `api/auth.php`).
- **Bugfix** colonne CLASSE du tableau équipe (`b6a62e2`) + corrections diverses onglet (`2a98353`, `ecb8e58`).
- **PDF** éditables déplacés à la racine → `pdf-sheets/`.
- **Capture** `captures/equipe.png` régénérée avec une ligne détail ouverte.

### Fichiers modifies (24 septembre)

| Fichier | Actions |
|---------|---------|
| `classes/equipe.js` | Détail combat dépliable, ordre colonnes ennemis, `-` sur champs vides |
| `style.css` | Chevron, `.team-detail*`, `.team-stat-*`, `.team-table-enemies` |
| `captures/equipe.png` | Capture à jour (détail ouvert) |
| `README.md` | Onglet Equipe (détail + colonnes ennemis) |
| `MANUAL.md` | § 8.1b détail, § 8.1 Classe cliquable, § 8.3 ordre, alt capture |
| `JOURNAL.md` | Cette entrée |

## Date : 24 septembre 2026 11:24

### Suite de tests de non-régression

- **Objectif** : suite automatisée lancable par l'utilisateur ou l'agent après chaque grosse évolution, avec rapport final.
- **Stack** : Node.js + **jsdom** (seule devDependency) ; zéro framework de test.
- **Lancement** : `npm test` / `node tests/run.js` / **`test.bat`** (Windows : vérifie Node, installe les deps si besoin, pause en fin).
- **Rapport** : console + `tests/report.md` (gitignoré) ; exit 0 = OK, 1 = échec.

### Suites

| Suite | Couverture |
|-------|------------|
| `01-syntax` | `node --check` (18 JS) + `php -l` (SKIP si PHP absent du PATH) + scripts `index.html` + modules classes |
| `02-css` | Accolades équilibrées, sélecteurs critiques (détail Équipe, portraits, sorts, mobile 600px), `.char-class-content` flex row |
| `03-modules` | 7 classes : `render` + clés `data-key` prefixées + roundtrip `collectSheetData` (auto-save) + `collectData` |
| `04-equipe` | Port des 26 tests stub → jsdom : toggle détail, aria, clavier, stats `-`, ordre colonnes ennemis, boutons +/−/RAZ, collapse async |
| `05-export` | Les 2 JSON `exemples/` : shape, classes valides, ≥ 3 classes distinctes |

### Verif release

- Dernier run : **216/216 OK**, 6 skip (`php -l`), ~4 s.
- Skill release : étape **2.5** ajoutée (tests AVANT commit/push).
- Build déploiement : exclut `tests/`, `node_modules/`, `package.json`, `package-lock.json`, `test.bat`, `.opencode/`.

### Fichiers modifies (24 septembre — tests)

| Fichier | Actions |
|---------|---------|
| `package.json` | Créé (script `test` + devDep jsdom) |
| `test.bat` | Créé (lanceur Windows) |
| `tests/**` | Créé (run.js, 5 suites, helpers) |
| `.gitignore` | + `node_modules/`, `tests/report.md`, `package-lock.json` |
| `.opencode/skills/release/SKILL.md` | Étape 2.5 tests non-régression |
| `README.md` | Structure `tests/` + `test.bat`, § Tests, dépendances |
| `deploy/_build.ps1` | Exclusions build (tests, node_modules, package*, test.bat, .opencode) |
| `JOURNAL.md` | Cette entrée |
| `exemples/dcc-persos-2026-09-24.json` | Exemple d'export (commit `719e82a`) |

## Date : 24 septembre 2026 — après-midi

---

### Equipe — section Statistiques (option A)

- **Plan** `PLAN-stats-equipe.md` + **maquette** `mockup-equipe-stats.html` (options A/B comparées ; **A validée** : zone AGI–END–PRE cliquable + un seul chevron sous END ; B écartée).
- **`classes/equipe.js`** :
  - `buildStatsSection()` inséré entre Ennemis et Notes (fragment : section-bar + table) ;
  - helpers `parseStatNum`, `computeColExtremes` (≥ 2 valeurs valides et min ≠ max sinon pas de highlight), `statDisplay` (`-` si vide) ;
  - colonnes FOR AGI END PRE CHA INT ; min/max en **classe** (`stat-max` / `stat-min`) ;
  - zone groupe `.stat-group` (+ `-start` / `-end`), chevron **uniquement sous END** (`.stat-chevron-cell`) ;
  - `toggleStatsDetail` / `closeStatsExpanded` : état `expandedStatsId` **séparé** de `expandedCharacterId` ;
  - `tr.team-stats-detail` (colspan 7) insérée **juste après la ligne du perso** ; collapse 250 ms (même wrap que le détail combat) ;
  - détail = `statCellHtml` JdS REF / VIG / VOL (`js_reflexe`, `js_vigueur`, `js_volonte`) ;
  - section masquée si 0 PJ en expédition.
- **`style.css`** (ajouts seuls) : `.team-table-stats`, `.stat-max/min` (**texte seul**, pas de fond), `.stat-group*`, `.stat-chevron-cell`, `tr.team-stats-detail`, media mobile.
  - Ajustements UX demandés : `.char-name` sur les noms stats, headers groupe en `--field-bg`/`--ink`, pas de gras forcé sur `.val`, `font: inherit`, **rouge forcé à l'ouverture supprimé**.
- **Tests** : `04-equipe` + section/min-max/collapse/clavier/ordre ; `02-css` + sélecteurs stats (pas de fond min/max, pas de rouge aria-expanded).

### Equipe — bugfix : perte des brouillons au changement d'onglet

- **Cause** : `switchTab('equipe')` rappelait `loadEquipe()` → `render()` → `innerHTML = ''` → ennemis / compteurs / notes en debounce effacés.
- **Fix `script.js`** : panneau marqué `data-equipe-loaded` après le 1er chargement ; rechargement **uniquement** si invalide.
- **Invalidation** (`invalidateEquipePanel`) sur create / delete / set_active / import (persos ou notes globales).

### Equipe — bouton RAZ Init. combat + Tours

- `tfoot` sous le tableau expédition : `td[colspan=5]` + `td[colspan=2]` contenant le bouton **RAZ**.
- Confirmation via `window.showModal` (fallback `confirm`) puis :
  - vide tous les `.init-combat-input` de la table expédition ;
  - `counter.resetTurn()` sur chaque `.turn-counter` (méthode exposée par `createTurnCounter`).
- Ennemis non touchés (pas de classe `init-combat-input` hors table PJ).

### Fichiers modifies (24 septembre — stats / bugfix / RAZ)

| Fichier | Actions |
|---------|---------|
| `classes/equipe.js` | Section Statistiques, `.init-combat-input`, tfoot RAZ, `resetTurn` |
| `style.css` | Bloc stats, tfoot RAZ, media stats mobile |
| `script.js` | `data-equipe-loaded`, `invalidateEquipePanel` |
| `tests/04-equipe.test.js` | + tests stats + RAZ (confirm true/false) |
| `tests/02-css.test.js` | + sélecteurs stats |
| `README.md` / `MANUAL.md` | Stats, RAZ, conservation brouillons onglet |
| `JOURNAL.md` | Cette entrée |
| `PLAN-stats-equipe.md` / `mockup-equipe-stats.html` | Créés puis retirés après validation |

## Date : 24 septembre 2026 — confirmation RAZ ennemis

---

- **Demande** : le bouton **RAZ** de la section **Ennemis** doit demander confirmation, comme le RAZ Init. combat + Tours sous le tableau expédition.
- **`classes/equipe.js`** : `btnRaz` (ennemis) → handler `async` ; `window.showModal` (fallback `window.confirm`) avec message « Vider le tableau des ennemis et réinitialiser à 3 lignes vides ? », `danger: true` ; si annulé, aucune modification de `tbodyE`.
- **Tests** `04-equipe.test.js` : ajout d'une ligne + nom avant RAZ ; `modalResult = false` → annulation conserve les lignes/valeurs ; `modalResult = true` → 3 lignes vides. **324/324 OK** (6 skip).
- **Docs** : MANUAL § 8.3 (« demande confirmation »), README (ennemis RAZ avec confirmation).

### Fichiers modifies (24 septembre — RAZ ennemis)

| Fichier | Actions |
|---------|---------|
| `classes/equipe.js` | Confirmation RAZ ennemis |
| `tests/04-equipe.test.js` | + cancel/confirm RAZ ennemis |
| `README.md` / `MANUAL.md` | Confirmation RAZ ennemis |
| `JOURNAL.md` | Cette entrée |

## Date : 24 septembre 2026 — resync onglet Équipe (valeurs persos)

---

- **Demande** : l'onglet Équipe, mis en cache pour préserver les brouillons (Init. combat, compteurs, ennemis), n'affichait plus les valeurs modifiées dans les fiches (PV, initiative, AC…) tant qu'on ne rechargeait pas la page.
- **Comportement retenu** :
  - retour sur l'onglet Équipe → **resync sur place** des valeurs perso (nom, classe, portrait, initiative, AC, PV, détail combat déplié, statistiques agrégées) **sans re-render** → brouillons préservés ;
  - **composition modifiée** (create / delete / toggle / import) → **rechargement complet de la page** (brouillons effacés, comme en F5) ;
  - **PV bidirectionnels** : Équipe → fiche (champ PV + cache `activeSheets` mis à jour aussitôt si la fiche est ouverte) ; fiche → Équipe (resync au retour sur l'onglet) ;
  - `openSheet` **relit toujours la fiche en base** (les appelants peuvent fournir des données en cache) ;
  - échec réseau pendant le resync → affichage actuel conservé.
- **`classes/equipe.js`** : `tr.dataset.charId` + `tr._charData` (listeners de nom/détail sur données fraîches), helper `parsedDataOf()`, nouveau **`DCCModules.equipe.resync(freshChars)`** → `false` si la composition change (appelant → `location.reload()`) ; met à jour nom / classe / portrait / initiative / AC / PV, remplace la ligne de détail combat dépliée, reconstruit la section Statistiques (min/max recalculés, dépliés conservés).
- **`script.js`** : helpers `fetchExpeditionChars()`, `expeditionIdsAttr()`, `resyncEquipe()` ; `switchTab('equipe')` → resync si déjà rendu ; `loadEquipe` compare `data-expedition-ids` (ids différents → `location.reload()`, ids identiques → resync au lieu de re-render) ; `openSheet` GET `get` avant rendu ; `syncPVFromEquipe` patche la fiche ouverte (`input[data-key$="-points_de_vie"]` + `activeSheets[cls].data`).
- **Tests** `04-equipe.test.js` : +17 assertions resync (valeurs mises à jour ; Init. combat / compteurs / ennemis préservés ; détail déplié rafraîchi ; stats reconstruites ; composition changée → `false` sans mutation). **348/348 OK**.
- **Docs** : MANUAL § 8.1 (sync auto + reload composition + PV bidirectionnels), README (onglet Équipe), TODO (bug corrigé), JOURNAL (cette entrée).

### Fichiers modifies (24 septembre — resync onglet Équipe)

| Fichier | Actions |
|---------|---------|
| `classes/equipe.js` | `resync()`, `data-char-id`, listeners `_charData`, helper `parsedDataOf` |
| `script.js` | `resyncEquipe` / `fetchExpeditionChars`, reload si composition, `openSheet` frais, synchro PV fiche ouverte |
| `tests/04-equipe.test.js` | + 17 assertions resync |
| `README.md` / `MANUAL.md` / `TODO.md` | Comportement resync + synchro PV |
| `JOURNAL.md` | Cette entrée |

## Date : 24 septembre 2026 — Ordre de marche (grille 3×3)

---

- **Demande** : implémenter la fonctionnalité « Ordre de marche » de l'onglet Équipe selon `PLAN-MARCHING.md` (validé), sans commit.
- **Comportement livré** :
  - section **repliable** « Ordre de marche » en haut de l'onglet Équipe (bouton `section-bar.collapse-toggle` + chevron SVG animé, ouverte par défaut, `aria-expanded/controls`, repli animé `grid-template-rows: 1fr→0fr`) — affichée seulement si ≥ 1 PJ en expédition ;
  - **grille 3×3** : 9 cases (portrait réel via `getPortraitSrc` + nom sur 1 ligne avec `title`), cases vides non déplaçables, flèche ⬆ direction du groupe, méta « n persos · k/9 affichés · X hors grille » ;
  - **drag & drop unifié Pointer Events** : souris = déplacement dès 4 px ; tactile = **appui long 400 ms** (SLOP 8 px annule le timer → défilement normal, `touch-action: pan-y`, `touchmove` non-passif bloqué pendant le drag) ; ghost centré pointeur avec **nom superposé** + `scale(1.06)`, cibles surlignées (outline vert + badge ⇄ sur occupée), **swap instantané** sur case occupée, largué hors grille = annulation ; drop → sauvegarde serveur + re-rendu de la seule grille ;
  - **persistance** : `users.marching_order TEXT NOT NULL DEFAULT '{}'` (CREATE + ALTER protégé), API `get_marching_order` / `save_marching_order` (`requireLogin`, validation stricte : clés ≥ 1, valeurs entières 0..8 uniques, plafond 2 Ko → 400 « Positions invalides ») ;
  - **auto-réparation** : `DCCMarching.normalize()` à chaque `loadEquipe` — invariant `k = min(n,9)` entrées, ids ⊆ expédition, positions bijectives sur {0..k‑1} ; **toute anomalie → reconstruction** (gauche→droite, haut→bas) + resauvegarde ; idempotente ;
  - **export/import** : champ top-level optionnel `marching_order: {"<index dans characters[]>": pos}` (persos `is_active=1` uniquement, **pas de bump `version`**) ; import : `createdIds[i]` → `remapImport` → `validateImported` → sinon reconstruction complète ; rétrocompatible (anciens fichiers sans champ = ordre reconstruit) ;
  - **bug critique TODO corrigé** : `resync()` rafraîchit désormais la grille (noms/portraits modifiés dans les fiches → visibles dans l'ordre de marche sans rechargement).
- **`marching-order.js` (nouveau)** : module pur `window.DCCMarching` — `normalize`, `isValid`, `rebuild`, `validateImported`, `buildExportMap`, `remapImport`.
- **`classes/equipe.js`** : signature `render(..., marchingOrder, onSaveMarching)` (params 6‑7 optionnels), `initMarchingMap`, section + grille + drag (cleanup inter-renders via `_cleanupMarchDrag`, listeners `document` retirés proprement).
- **`script.js`** : helpers `getMarchingOrder` / `saveMarchingOrder`, `onSaveMarchingOrder` (save + `showToastSave`, erreur → toast), `loadEquipe` fetch → normalize → save si `changed`, export `marching_order` pendant la boucle, import `createdIds` + remap/validation/reconstruction.
- **Tests** : nouvelle suite `06-marching-order` (50 assertions : normalize valable/anomalies/k=min(n,9)/idempotence, `buildExportMap` index keys + actifs seuls, `remapImport` bornes, `validateImported`, round-trip) + extension `04-equipe` (section, 9 slots, ordre fourni respecté, toggle aria/classe, portraits, méta, 0 PJ → pas de grille). **428/428 OK** (contre 348 avant).
- **Docs** : MANUAL (§ 4.6 item 7 + bouton export, § 8.1c nouveau, annexe A `marching_order`, table « ce que le navigateur mémorise », présentation), README (bullet Onglet Équipe, arborescence, 2 endpoints), TODO (marching order livré, bug critique corrigé), JOURNAL (cette entrée).

### Fichiers modifies (24 septembre — ordre de marche)

| Fichier | Actions |
|---------|---------|
| `marching-order.js` | **Nouveau** — module pur `DCCMarching` |
| `index.html` | `<script src="marching-order.js">` avant `script.js` |
| `api/db.php` | Colonne `users.marching_order` + ALTER protégé |
| `api/auth.php` | Actions `get_marching_order` / `save_marching_order` |
| `script.js` | Helpers ordre, export/import `marching_order`, `loadEquipe`, `onSaveMarchingOrder` |
| `classes/equipe.js` | Section repliable, grille 3×3, drag Pointer Events, refresh grille au `resync` |
| `style.css` | Styles repliable (toggle/chevron/collapsible) + grille/ghost/drag + mobile 600px |
| `tests/06-marching-order.test.js` | **Nouvelle** suite (50 assertions) |
| `tests/04-equipe.test.js` | + assertions section Ordre de marche |
| `tests/run.js` | Enregistrement suite 06 |
| `README.md` / `MANUAL.md` / `TODO.md` | Docs fonctionnelles + API |
| `JOURNAL.md` | Cette entrée |


## Date : 24 septembre 2026 — Bug : ordre de marche non restauré au reload (+ import JSON)

---

- **Demande** : « le marching order semble bien sauvé en base et exporté en json mais il n'est pas restauré quand je recharge la page, et vérifie aussi le cas de l'import json ».
- **Diagnostic instrumenté** :
  - aller-retour serveur réel (`php -S` + API `save_marching_order` → `get_marching_order`) : identique octet à octet, la chaîne serveur est bonne ;
  - **harnais d'intégration `07-restore`** (vrai `script.js` démarré dans jsdom sur le `index.html` réel, `fetch` moké, onglet actif = Équipe) : le rechargement simple restituait déjà l'ordre → le bug exigeait une donnée particulière ;
  - **inspection de la base du joueur** : `{"44":1,"45":2,"46":0,"47":5,"48":7,"49":3}` — position **7** alors que la case 4 est vide ; entre deux instantanés la valeur a changé (`48:4` → `48:7`) : drag réel en cours, preuve que la sauvegarde marche ;
  - **racine** : le drag & drop dépose explicitement sur **case vide** (grille 3×3, 6 PJs → 3 cases vides), le **serveur** n'exige que l'unicité des positions (0..8, plan §2) et l'**export** propage les trous — mais `isValid()` client imposait **{0..k‑1} contigu** (plan §1 « aucun trou ») : ordre sauvegardé ✓ exporté ✓ puis **rejeté au `loadEquipe` → reconstruction par défaut + resauvegarde = écrasement silencieux de l'ordre** au prochain affichage.
- **Correctifs** :
  - `marching-order.js` : `isValid()` n'exige plus la contiguïté — invariant = k = min(n,9) entrées, ids ⊆ expédition, positions **entières uniques 0..8** (trous = cases vides autorisés) ; entrée manquante, doublon, id hors expédition, valeur hors plage restent des anomalies → reconstruction ;
  - `script.js` : `invalidateEquipePanel()` retire aussi `data-expedition-ids` → après import, re-rendu sur place au lieu du `location.reload()` constaté par le harnais ;
  - `PLAN-MARCHING.md` §1 et §3 : amendement de spécification (le §1 contredisait §2 et le code de drag).
- **Tests** : `06` — l'ordre troué est désormais **valide** (assertion « trou de position → false » inversée + cas réel `48:7` conservé sans écrasement) ; **nouvelle suite `07-restore`** (29 assertions) — (a) rechargement sur les **vraies données du joueur** (6 PJs, cases 0/1/2/3/5/7 occupées, case 4 vide, **0 réécriture**), (b) parcours **import JSON** complet (bouton menu, fichier, modale de confirmation, 6 suppressions, remap index → nouveaux ids `{"60":1,"61":0}`, notes d'équipe, re-rendu). Preuve A/R : bug réintroduit → `06` (‑5) et `07` (‑6) échouent ; correctif en place → **467/467 OK** (contre 434).
- **Nettoyage** : personnages/utilisateur de test (`tmptest1`, Alpha, Beta) retirés de la base.

### Fichiers modifies (24 septembre — restauration ordre de marche)

| Fichier | Actions |
|---------|---------|
| `marching-order.js` | `isValid()` : contiguïté retirée (trous autorisés) + commentaire d'en-tête |
| `script.js` | `invalidateEquipePanel()` : retrait aussi de `data-expedition-ids` |
| `tests/06-marching-order.test.js` | Assertion trou inversée + 4 assertions ordre troué |
| `tests/07-restore.test.js` | **Nouvelle** suite d'intégration (29 assertions) |
| `tests/run.js` | Enregistrement suite 07 |
| `PLAN-MARCHING.md` | Amendement invariant §1 + §3 |
| `README.md` | Liste des suites de tests |
| `TODO.md` / `JOURNAL.md` | Cette entrée |

## Date : 24 septembre 2026 — Bug : persos inactifs réactivés par l'import JSON

---

- **Demande** : « les personnages non actifs sont bien sauvés en base et en export json, mais si je fais un export / import json, ils sont de nouveau actifs » (bug suivant de la liste TODO).
- **Racine** : `importAllCharacters()` recréait chaque perso via `action=create` **sans** le champ `is_active`, et `api/characters.php` imposait `is_active = 1` en dur dans l'INSERT — donc tous les persos repartaient **en expédition** (y compris ceux à l'auberge), ce qui faussait aussi la composition de l'expédition pour l'ordre de marche.
- **Correctifs** :
  - `api/characters.php` : `create` accepte un **`is_active` optionnel** (coercé puis validé strictement 0/1 → sinon 400 « is_active invalide »), défaut 1 pour rétrocompatibilité ;
  - `script.js` (import) : transmet `is_active: 0/1` déduit du fichier (anciens exports sans champ → actif, comportement inchangé) ;
  - `script.js` (import, ordre de marche) : `realIds` → **`activeIds`** (ids des persos actifs seuls) pour `validateImported` / `rebuild` / la garde de sauvegarde — l'expédition = actifs, le remap reste indexés sur `createdIds` complet (les clés d'export sont des index de fichier, inactifs compris).
- **Tests** : suite `07-restore` étendue au cas **3 persos dont 1 à l'auberge** : statut conservé à la création (`creates[1].is_active === 0`), ordre remappé sur les ids actifs (`{"60":1,"62":0}`), grille = actifs seuls (Bobby absent), méta « 2 persos ». **473/473 OK** (contre 467).
- **Vérification serveur réelle** (php -S + API) : `is_active:0` → 0, `is_active:1` → 1, absent → 1 (défaut), `is_active:5` → **400** ; comptes/utilisateurs de test nettoyés de la base.
- **Docs** : MANUAL § 4.6 (nouvel item « statut conservé », ordre de marche limité aux expéditions), README (table API `create`), TODO (bug corrigé), JOURNAL (cette entrée).

### Fichiers modifies (24 septembre — statut auberge à l'import)

| Fichier | Actions |
|---------|---------|
| `api/characters.php` | `create` : `is_active` optionnel validé 0/1 |
| `script.js` | Import : transmet `is_active`, `activeIds` pour l'ordre |
| `tests/07-restore.test.js` | Import avec perso inactif (+6 assertions) |
| `README.md` / `MANUAL.md` / `TODO.md` | Docs |
| `JOURNAL.md` | Cette entrée |

## Date : 24 septembre 2026 — Release v1.10 (captures Manuel + purge des plans)

---

- **Captures Manuel** : `equipe.png` mise à jour par l'utilisateur (intégralité de l'onglet) ; deux nouvelles captures intégrées au **§ 8.1c** : `equipe-nomarching.png` (section Ordre de marche repliée, dans son contexte d'onglet) et `marching-order.png` (zoom sur la section avec un portrait en cours de glisser-déposer).
- **Purge** : `PLAN-MARCHING.md` et `MARCHING-ORDER.md` **supprimés** — la spécification est désormais absorbée par le code, le Manuel § 8.1c et les amendements consignés dans ce JOURNAL ; références nettoyées (`TODO.md`, maquette `maquettes/marching-order.html`).
- **Contenu de la release v1.9.1 → v1.10** : fonctionnalité complète **Ordre de marche** (section repliable, grille 3×3, drag & drop unifié souris/tactile, persistance `users.marching_order`, export/import `marching_order`) + correctifs — grille non resynchronisée au `resync`, taille des cases 360→300 px, **ordre troué écrasé au rechargement** (invariant amendé : trous = cases vides autorisés), **persos inactifs réactivés par l'import** (`create`/import avec `is_active` conservé), import re-rendu sur place sans `location.reload()` ; suites de tests `06-marching-order` et `07-restore` (intégration jsdom + vraies données joueur) — **473/473 OK**.

---

## Date : 25 septembre 2026 — Release v2.1 (filtrage des dossiers de portraits + build différentiel)

- **Filtrage des dossiers de portraits absents** (`2ed7922`) : nouvelle endpoint `api/icons.php` (`action=list`, protégée `requireLogin`) qui liste les sous-dossiers de `icons/` via `scandir` (triés, sûrs vis-à-vis de `.gitignore`) ; côté client `getAvailableIconDirs()` (cache promesse par session, échec réseau → `null`) + `getPortraitFolder(ps)` (1er chemin image, ignore `meta`) ; `showPortraitPicker` filtre les **dossiers entiers** avant construction du DOM (1 requête lazy à la 1ʳᵉ ouverture de la popup). **Option B assumée** : les persos d'un dossier absent **ne sont pas renumérotés** (`getPortraitSrc` / `initPortraits` intacts) — image brisée, comportement voulu ; la popup échoue ouverte complète si l'endpoint tombe (tolérance).
- **Exclusion des maquettes du build** (`efe7ad4`) : `maquettes/` retiré de la copie de déploiement.
- **Capture équipe** (`e787efb`) : `captures/equipe.png` corrigée par l'utilisateur.
- **Build différentiel** (non commis au moment des faits) : `deploy/_build.ps1` réécrit avec `param([switch]$Diff)` + helper `Test-Excluded` partagé — mode normal **inchangé** (build complet vérifié, 153 fichiers), mode `-Diff` : tag source via `git describe --tags --abbrev=0`, `git diff --name-status <tag>` (tag → working tree, inclut staged et WIP) + `git ls-files --others` pour les untracked, copie A/M hors exclusions vers `deploy/dcc-sheet-diff/`, D listés « à supprimer manuellement sur le serveur », rapport `CHANGES.txt` généré ; nouvelle entrée `deploy/build-diff.bat` ; `.gitignore` + `deploy/dcc-sheet-diff/`.
- **Skill release enrichie** : étape 4 — le changelog GitHub inclut la **liste des fichiers Modified/Added/Deleted** depuis l'ancien tag ; étape 5 — lancer `deploy\build-diff.bat` après le tag et annoncer le dossier diff.
- **Tests** : suite `08-portrait-picker` (30 tests : dossier absent filtré, échec endpoint → popup complète, clic sélection attend `srcInput.value === 'gonzo'` via chaîne de promesses) + `tests/helpers/env.js` stubbe `window.getPortraitSrc`, harnais 08 patche `head.appendChild` (jsdom ne charge pas les `<script src>` dynamiques). **504/504 OK** avec `PHP_BIN` (php -l couvre `api/icons.php`).

### Fichiers modifiés (25 septembre — filtrage portraits + build différentiel)

| Fichier | Action |
|---------|--------|
| `api/icons.php` | Nouveau — liste des dossiers `icons/` présents |
| `script.js` | `getAvailableIconDirs`, `getPortraitFolder`, filtre dans `showPortraitPicker` |
| `tests/08-portrait-picker.test.js` | Nouveau — 30 tests |
| `tests/run.js`, `tests/helpers/env.js` | Enregistrement + stub portrait |
| `deploy/_build.ps1`, `deploy/build-diff.bat` | Mode `-Diff` + entrée batch |
| `.gitignore`, `README.md`, `MANUAL.md`, `.opencode/skills/release/SKILL.md` | Docs / filtre / exclusion |
| `captures/equipe.png` | Capture corrigée (utilisateur) |

---

## Date : 26 septembre 2026 — Release v2.2 (noms tronqués dans l'onglet Équipe + nom des stats cliquable + pre-gens)

- **Noms tronqués (ellipsis)** : la colonne **Nom** des tableaux de l'onglet Équipe (PJ en expédition **et** Statistiques) débordait dans la colonne voisine — `white-space: nowrap` dans un `table-layout: fixed` à 20 % / 22 % sans `overflow`. Correctif sur `.team-table .char-name` (`style.css`) : `overflow: hidden; text-overflow: ellipsis; max-width: 100%`, avec **`title` = nom complet** posé sur la cellule (également mis à jour par le `resync`) pour lire le nom entier au survol.
- **Nom cliquable dans « Statistiques »** : le nom de la colonne 1 ouvre désormais la fiche du PJ, **identiquement au tableau des PJ en expédition** (`switchTab(classe)` puis `openSheet` après 100 ms, données fraîches via `tr._charData`) ; suppression de l'override `.team-table-stats .char-name { cursor: default }` et de son `:hover` neutralisé. Le clic n'affecte pas le détail JdS (collapse indépendant conservé).
- **`exemples/Travok.json` supprimé** : fichier d'**import** (format `{version, class, name, data}`) laissé dans le dossier d'exemples d'**export** → `05-export` plantait sur `obj.characters.length` (`Cannot read properties of undefined`).
- **Pre-gens du module *Jungle Tomb of the Mummy Bride*** : ajout des dossiers `pregens/` (**10 fiches au format import individuel**, en anglais, fidèles au PDF) et `tools/` (`pregens_to_json.py` + `pregens_overrides.json`) — extraction par pages textuelles impaires, champs par classe issus de `classes/*.js`, `--check` valide le schéma (0 problème ; 3 alertes assumées : mods `18 → +3` des pre-gens conservés tels qu'imprimés). PDF d'entrée et `Travok2.json` ajoutés à `.gitignore`.
- **Tests** : `02-css` +4 (bloc `.char-name` : ellipsis / overflow / nowrap), `04-equipe` +4 (clic sur le nom stats → `switchTab` + `openSheet` après timeout, `title`, pas d'ouverture du détail JdS). **505/505 OK** (`php -l` SKIP : PHP absent du PATH).

### Fichiers modifiés (26 septembre — onglet Équipe + pre-gens)

| Fichier | Action |
|---------|--------|
| `style.css` | `.char-name` : `overflow: hidden` + `text-overflow: ellipsis` ; override `cursor: default` des stats supprimé |
| `classes/equipe.js` | Nom stats cliquable (ouvre la fiche) ; `title` = nom complet (stats + expédition + resync) |
| `tests/02-css.test.js`, `tests/04-equipe.test.js` | +8 assertions |
| `pregens/` | Nouveau — 10 fiches pre-générées (JSON import) |
| `tools/` | Nouveau — `pregens_to_json.py`, `pregens_overrides.json` |
| `.gitignore` | Exclut le PDF source et `Travok2.json` |
| `README.md`, `MANUAL.md` | Onglet Équipe (§ 8.1 / § 8.3b), structure, pre-gens |
