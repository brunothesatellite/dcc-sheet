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

---

## Date : 28 septembre 2026 - Définition des sorts intégrée à la fiche (branche `evol-spell-detail`)

### Objectif

Depuis une fiche (Mage, Elfe, Clerc), cliquer une icône à gauche d'un nom de sort renseigné pour lire sa définition complète dans le lecteur de sorts **`dcc-spells-reader`** (déjà déployé comme **dossier frère** à la racine du serveur), sans quitter la fiche — en tenant compte de l'absence possible de ce dossier sur d'autres installations.

### Décisions

| Sujet | Décision |
|-------|----------|
| Détection | **Un seul `fetch`** : `../dcc-spells-reader/content/anchors.js` apporte à la fois la présence du dossier et l'index des ancres (176 `slug\|page`) ; échec → tout reste masqué, **jamais d'erreur console bruyante** |
| Portée des icônes | Tout, **y compris les 2 lignes fixes de l'elfe** ; « Invoquer un Patron » = **2 recherches** (sort générique + sorts du patron choisi dans le champ `patron`, lu au clic) |
| Bouton « page scannée » | **Masqué** (`.spell-viewer .page-img-btn { display: none }`) |
| Typographie popup | **Thème dcc-sheet** (Inter/Barlow, `--font-*`), aucune police ajoutée |
| Numéro de page dans le champ | **Ignoré** par la résolution (`cleanName` retire `203`, `p. 203`, `(page 203)`) |
| Nom inconnu | Modale **« Sort introuvable »** → vérifier le nom du sort |

### Implémentation

- **`spell-reader.js`** (nouveau) : `loadScript` → `buildIndex`/`enable` (classe `html.has-spell-reader`) ; `cleanName` + `slugify` (identique au reader) ; cascade de résolution **exact → singulier/pluriel → préfixe/contenance → tokens → distance d'édition ≤ 2** (Levenshtein, dernier filet) ; `openSpell` / `openPatron` (variants : nom, nom entre parenthèses, nom avant parenthèse) ; popup `.spell-viewer-overlay` (z-index **3000**) avec `IntersectionObserver` (repli listener `scroll` sans IO) et sentinelles haut/bas, chargement lazy `content/N.js` avec cache, **compensation `scrollTop`** lors d'un ajout au-dessus, ancrage `scrollIntoView` sur l'id du sort, verrou `body.style.overflow = 'hidden'` restauré à la fermeture ; événements **délégués au `document`** : `input` (toggle `[hidden]` selon `data-key` ~ `/sort_(?:nom_)?\d+$/`) et `click` (`[data-lookup]`) ; API `window.DCCSpellReader = {slugify, cleanName, resolve, ensureReady, isAvailable, openSpell, openPatron, setAnchors}`.
- **`classes/bloc_commun.js`** : `spellLookup(kind, hidden, name)` génère le bouton SVG (loupe / étoile pour le patron) — helper unique partagé par les 3 classes.
- **`classes/mage.js`** (`spellRow` + `_spellRowHTML`), **`classes/elfe.js`** (lignes fixes : *Lier un patron* → 1 icône ; *Invoquer un Patron* → icône sort **+** icône patron), **`classes/clerc.js`** (`spellCell`, bouton avant l'input dans `.sort-cell`).
- **`index.html`** : `<script src="spell-reader.js">` après `script.js`.
- **`style.css`** (bloc 13 « Consultation des sorts ») : cachette `html:not(.has-spell-reader) .spell-lookup, .spell-lookup[hidden]`, styles d'icône, `.dtd`… `td.sort-name/.sort-fixed` en flex, popup complète (colonne 520 px, sentinels, status), et **port du CSS `.page` du reader (≈ 5,7 Ko) scopé sous `.spell-viewer`** — évite les collisions de classes génériques (`.row`, `.stat`, `.stats`) avec la fiche ; `@media (max-width: 599px)` cartes `table.stackable`.

### Validation

- **Suite complète : `580/580 OK`** (`node tests\run.js`) — suite **`09-spell-reader`** (64 assertions : icônes sur les 3 classes, bascule à la saisie, popup ouverture/croix/Échap, modales, cas dossier absent…) + `02-css` +10 sélecteurs critiques. Les tests **ne dépendent jamais** du dossier frère (fixtures via patch de `head.appendChild`).
- **Smoke sur les vraies données** (hors suite) : détection = true, **144/144 noms de `data.js` résolus**, pages concordantes (3 « anomalies » = placeholders `(Sort de Patron)***` à `page: null`, sans impact) ; popup ouverte sur le contenu réel : ancre `#s203-bouledefeu`, `.stats`, `table.results-tbl`, titre, **pages 202 → 210 en défilement infini** (les deux sentinelles chargent), `.page-img-btn` masqué.
- **HTTP** (`php -S localhost:8000 -t D:\VS_Code_Workspaces`, en cours depuis `deploy\start.bat`) : `index.html`, `spell-reader.js`, `style.css`, `dcc-spells-reader/content/anchors.js` et `content/203.js` → **200** ; chemin relatif `../dcc-spells-reader/...` donc valide.
- **Reste à faire** : vérification manuelle navigateur (375 px, thème sombre, elfe avec/sans patron, lecture hors ligne du dossier frère) ; **rien n'a été commité** (attente d'instruction).

### Fichiers modifiés (28 septembre — définition des sorts)

| Fichier | Action |
|---------|--------|
| `spell-reader.js` | **Nouveau** — détection, résolution de nom, popup plein écran, scroll infini |
| `classes/bloc_commun.js` | `spellLookup()` : générateur d'icône partagé |
| `classes/mage.js`, `classes/elfe.js`, `classes/clerc.js` | Icônes dans les lignes de sorts + 2 lignes fixes de l'elfe |
| `index.html` | Chargement de `spell-reader.js` |
| `style.css` | Bloc 13 : `.spell-lookup`, popup `.spell-viewer`, CSS `.page` scopé |
| `tests/09-spell-reader.test.js`, `tests/run.js`, `tests/02-css.test.js` | Nouvelle suite (+64) + 10 sélecteurs CSS |
| `README.md`, `MANUAL.md` | § « Définition des sorts », structure, § 6.3 / 6.3b |
| `captures/sort1.png`, `captures/sort2.png` | **Nouveaux** — captures de la popup (texte + table de résultats) |
| `JOURNAL.md` | Cette entrée |


---

## Date : 28 septembre 2026 - Noms de sorts en anglais (traductions FR/EN)

### Objectif

Les sorts peuvent être saisis en anglais (pregens anglais, habitude du joueur). Utiliser `dcc-spells-reader/spell-translation.js` (130 paires `Français -> anglais`, déjà commité côté lecteur) pour retrouver le **nom français** du livre et afficher sa description.

### Contraintes

- Le fichier est un **module ES** (`export const spellTranslations`) : il ne peut pas être chargé en `<script classique>` -> **lu en texte** (`fetch` + extraction des paires par expression régulière), **une seule requête mémorisée** (`transPromise`).
- Présence facultative : `window.DCC_SPELL_TRANSLATIONS` (injection directe, tests) > `fetch` ; sans `fetch` ou si la requête échoue -> **comportement antérieur strictement conservé**.
- Chargé uniquement après la détection du dossier frère (`ensureReady`) : aucune requête inutile si le lecteur est absent.

### Implémentation (`spell-reader.js`)

- `parseTranslations` / `buildTranslations` -> table `transFrom` : `slug(EN) -> nom français`.
- `toFrench(q)` : exact puis **distance d'édition <= 2** (garde : saisie >= 6 caractères) -> faute de frappe anglaise.
- `lookup(raw)` remplace la résolution simple, ordre explicite :
  1. **nom exactement présent dans le livre** (aucune ambiguïté) ;
  2. **nom anglais connu** -> français canonique ;
  3. résolution directe (singulier/pluriel, préfixe, mots-clés, faute française) ;
  4. **faute de frappe sur un nom anglais**.
  `resolve(raw)` reste l'enveloppe publique retournant l'ancre (compatibilité).
- **Ordre volontaire** : l'étape 1 avant la traduction évite qu'un nom français court (« Force ») soit pris pour une faute de frappe de « Forget » -> « Oubli » (bug repéré en smoke : p.187 au lieu de p.175).
- Affichage : `viewerLabels()` -> titre = **nom français du livre** si traduction, sinon la saisie telle quelle ; sous-titre `.spell-viewer-sub` = nom anglais saisi (masqué si identique).
- Message « Sort introuvable » : mention « français ou anglais » **seulement si** le fichier de traductions est chargé.
- API : `lookup`, `translate`, `loadTranslations`, `setTranslations` ; `setAnchors` réinitialise aussi les traductions.

### Validation

- **Suite : `614/614 OK`** (`09-spell-reader` 64 -> **95** : résolution EN par injection directe, numéro de page, faute de frappe anglaise, popup titre/sous-titre FR/EN, chargement par `fetch` (URL + parsing du module ES), échec réseau toléré, sans traduction -> modale sans mention anglaise ; `02-css` +3 sélecteurs).
- **Smoke sur les vraies données** : **130/130** paires du fichier réel - chaque nom anglais résout **la même page** que son équivalent français (0 divergence), `Fireball 203`, `Firebal` (faute), `Teleport` (inconnu -> null) ; popup depuis « Fireball » : titre `Boule de feu`, sous-titre `Fireball`, ancre + `.stats`, 3 pages en défilement infini.
- HTTP : `http://localhost:8000/dcc-spells-reader/spell-translation.js` -> **200** (`application/javascript`).

### Fichiers modifiés (28 septembre - traductions FR/EN)

| Fichier | Action |
|---------|--------|
| `spell-reader.js` | Chargement/parsing des traductions, `lookup()`, sous-titre, API |
| `style.css` | `.spell-viewer-names`, `.spell-viewer-sub` |
| `tests/09-spell-reader.test.js` | 4 nouvelles fonctions de test (+31 assertions) |
| `tests/02-css.test.js` | +3 sélecteurs |
| `README.md`, `MANUAL.md` | Section « Définition des sorts », § 6.3b |
| `JOURNAL.md` | Cette entrée |

---

## Date : 28 septembre 2026 - Correctif : calage de l'ancre dans la popup (« Rayon brûlant »)

### Symptôme

Parfois, l'ouverture d'un sort ne se fait pas exactement sur son début (exemple : Mage / **Rayon brûlant**, ancre `rayonbrulant|197` — le `<h3>` est à ~284 octets du début de la page, donc scrollTop ≈ 40 px à l'ouverture).

### Causes (analyse du code, aucune donnée manquante)

1. **Décalage systématique de ~38 px dans `loadUp()`** : `var before = body.scrollHeight` était mesuré **après** `setStatus('Chargement…')` — le bloc `.sv-status` est dans le flux (padding 10+10, 12px × 1.5 ≈ 38 px) — puis le status était masqué **avant** `insert` et la mesure finale. La compensation `scrollTop +=` était donc trop courte d'environ la hauteur du status. Déclenchement : uniquement si le sentinel du haut est visible à l'ouverture (`visible()` : `r.bottom > -300`), c'est-à-dire quand l'ancre est **près du haut de la page** → insertion de la page précédente au-dessus → **« parfois »** ; cumulable (second `loadUp` via l'IntersectionObserver `rootMargin: 400px`).
2. **Swap typographique** : `.spell-viewer .page` utilise Inter/Barlow chargés par Google Fonts en `display=swap` (`index.html:8-9`). Si la substitution survient **après** le `scrollIntoView`, tout ce qui **précède** le titre change de hauteur et la position n'est jamais ré-alignée.
3. **Repli de mesure faux** : `body.scrollTop = target.offsetTop` — `offsetTop` est relatif à l'`offsetParent` (ici `.spell-viewer-overlay`, `position: fixed`) → erreur ≈ hauteur d'en-tête + marge colonne. Ne sert qu'en l'absence de `scrollIntoView` (jsdom), mais pèse sur la robustesse et les tests.

**Non-causes vérifiées** : `scroll-behavior: smooth` (`style.css:69`) n'est posé que sur `html` (non hérité) ; **176/176** ancres ont leur `id` réellement présent dans leur page ; pages texte pures (aucune image à charger).

### Correctif (`spell-reader.js`)

- **`loadUp()`** : capture de `before` **après** `setStatus('')`, juste avant `insert` → compensation exacte ; `anchorScroll` (position attendue) suit le même delta ; appel de `reAnchor()`.
- **`anchorScroll`** : position mémorisée à chaque `scrollToAnchor()` — c'est la référence « l'utilisateur n'a pas défilé ».
- **`reAnchor()`** : re-calibre l'ancre **uniquement** si `|scrollTop - anchorScroll| ≤ 2 px` (aucun scroll utilisateur entre-temps), appelé (a) après chaque insertion au-dessus, (b) après `document.fonts.ready` (si l'API existe).
- **`anchorGap()`** : `target.getBoundingClientRect().top - body.getBoundingClientRect().top` — indépendant de l'`offsetParent`, remplace le repli `offsetTop`.

### Validation

- **Suite : `622/622 OK`** (`09-spell-reader` 95 → **103**) — 3 nouveaux tests avec **simulation de mise en page** (`fakeLayout` : hauteur de page, offset du titre, `scrollHeight` avec/sans status, rects dépendants du `scrollTop`, `document.fonts` résoluble) :
  - *calage* : insertion de la page 202 au-dessus de la 203 → `scrollTop` **exactement** `1000 + 40` (drift nul) ;
  - *polices* : déplacement du titre après `fonts.ready` → recalage de `+260 px` ;
  - *scroll utilisateur* : `+500 px` avant `fonts.ready` → **aucun** recalage forcé.
- **Test de non-régression** : en réintégrant l'ancien code, **2 tests échouent** (`got 1002, attendu 1040` → dérive de 38 px mesurée ; `got 1300, attendu 1262`) — puis code restauré, **622/622 OK**.
- **Reste** : vérification manuelle sur `localhost:8000` (Mage « Rayon brûlant », sort milieu/bas de page, scroll manuel avant chargement, 375 px, thème sombre).

### Fichiers modifiés (28 septembre - calage de l'ancre)

| Fichier | Action |
|---------|--------|
| `spell-reader.js` | Mesure `loadUp` corrigée, `anchorScroll`/`anchorGap`/`reAnchor`, hook `document.fonts.ready` |
| `tests/09-spell-reader.test.js` | Fixtures 202/204/205, `fakeLayout`, 3 tests de calage (+8) |
| `JOURNAL.md` | Cette entrée |

---

## Date : 28 septembre 2026 - Correctif : décalage d'une page entière (double compensation du scroll)

### Symptôme (inchangé malgré le correctif précédent)

L'ouverture se fait parfois **en décalage d'une page entière** : la popup affiche la fin de la p.197 puis l'en-tête « PAGE 198 » au lieu du début de « Rayon brûlant ». Même comportement sur « Appel de familier » et « Runes des mortels ». Le correctif « 38 px » n'a rien changé.

### Cause racine (mesurée en navigateur réel : Chrome headless + CDP)

Instrumentation de la popup sur `http://localhost:8000/dcc-sheet/index.html` (MutationObserver sur les insertions + écoute `scroll` + échantillonnage de `scrollTop`/`scrollHeight`/`gap`/`document.fonts`) :

| t | événement | scrollTop | scrollH | pages |
|---|-----------|-----------|---------|-------|
| 26 ms | p.197 insérée + `scrollIntoView` → **calage correct** | **55** | 2670 | 197 |
| 35 ms | p.196 insérée au-dessus (`loadUp`) | **4301** | 4755 | 196+197 |
| 44 ms | p.198 insérée en bas | 4301 | 5572 | 196+197+198 |

`4301 = 55 + 2 × 2123` : le décalage a été compensé **deux fois**.

1. **Double compensation (cause racine)** — le navigateur pratique l'**ancrage de défilement** (`overflow-anchor: auto` par défaut) : quand une page est insérée au-dessus, Chrome/Edge/Firefox épingle **déjà** la vue (`scrollTop += 2123` automatiquement). `loadUp()` ajoute **sa propre** compensation (`scrollTop += delta`) → `+4246` au lieu de `+2123` → la vue pointe la fin de la p.197 et la p.198 (exactement la capture d'écran).
2. **`reAnchor()` ne rattrape pas** — `anchorScroll` n'est incrémenté que du `delta` manuel (2140) alors que `scrollTop` réel vaut 4301 → `|4301 − 2140| = 2161 > 2` → le garde-fou conclut à tort « l'utilisateur a défilé » et **refuse le recalage**. Le correctif précédent était donc non seulement insuffisant, mais **neutralisé** par sa propre cause.
3. Pourquoi **`dcc-spells-reader` n'a jamais le problème** : son lecteur ne touche **jamais** `scrollTop` — après chaque insertion il rappelle `scrollIntoView()` (`keepAnchorInPlace()`, `dcc-spells-reader/script.js:458`) → position absolue, insensible à l'ancrage.

**Cause « 38 px » (mesure du `before` faussée par `.sv-status`) confirmée mais non suffisante** : elle explique une erreur de ~38 px, pas une page entière. Swap des polices Google Fonts : **non causale** ici (`document.fonts` déjà résolues par la page principale, `scrollH` inchangé).

### Correctif

- **`style.css`** : `.spell-viewer-body { overflow-anchor: none; }` → le navigateur ne compense plus, la compensation manuelle de `loadUp()` redevient exacte et déterministe (Chrome/Firefox gèrent la propriété ; Safari n'a pas d'ancrage).
- **`spell-reader.js`** : commentaire de liaison dans `loadUp()` — le calcul du `delta` est **conditionné** à cette règle CSS.
- **`tests/02-css.test.js`** : 3 assertions de non-régression (bloc `.spell-viewer-body` trouvé, `overflow-anchor: none`, `overflow-y: auto`).

### Validation

- **Suite : `625/625 OK`, 7 skip** (+3 assertions CSS ; `02-css` 46 → 49).
- **Navigateur réel (Chrome headless, fichiers servis, sans injection)** :
  - « Rayon brûlant » (p.197) : `oa=none`, `scrollTop 55 → 2178 = 55 + 2123` (compensation **unique**), **`gap = 6 px` stable** sur 3 s ;
  - « Appel de familier » (p.131, p.130 insérée au-dessus) : **`gap = 6 px`** ;
  - « Runes des mortels » (p.157, p.156 insérée au-dessus) : **`gap = 6 px`** ;
  - **sans** la règle : `gap = -2117` (décalage d'une page) — reproduit sur les 3 sorts.
- **Test flaky éliminé** (`09-spell-reader`) : `testAnchorAfterFonts` et `testNoReanchorAfterUserScroll` mesuraient **avant** la fin du `loadUp` initial (la p.202 arrivait pendant `delay(30)` → `+1000 px`, échec 1 fois sur 5). Les deux tests attendent désormais **2 pages chargées** + 30 ms → **6/6 OK**.

### Fichiers modifiés (28 septembre - double compensation)

| Fichier | Action |
|---------|--------|
| `style.css` | `overflow-anchor: none` sur `.spell-viewer-body` |
| `spell-reader.js` | Commentaire de liaison dans `loadUp()` |
| `tests/02-css.test.js` | +3 assertions (`02-css` 46 → 49) |
| `tests/09-spell-reader.test.js` | Stabilisation de 2 tests (attente des 2 pages) |
| `JOURNAL.md` | Cette entrée |

---

## Date : 28 septembre 2026 - Ergonomie : la loupe des sorts de clerc hors du champ texte

### Symptôme

Sur la fiche **clerc**, la loupe de consultation était posée **à l'intérieur** du champ texte : `.sort-cell` portait elle-même le fond `--field-bg` et la bordure, l'`input` étant sans bordure (`border: none; background: transparent`) → l'icône partageait le même aplat que le texte saisi. Sur **mage**/**elfe**, le champ est l'`input` encadré et la loupe est **dehors**, dans la gouttière du `td`.

**Mesure (Chrome headless, `.sort-cell` vs `td.sort-name`)** : aucun chevauchement géométrique dans les deux cas (icône 20 px puis input) — l'écart est purement visuel : champ = cellule (clerc) vs champ = input encadré (mage/elfe).

### Correctif (`style.css` — CSS seul, structure HTML/JS inchangée)

- **`.sort-cell`** : devient un simple conteneur flex (fond et bordure supprimés, `gap: 5px`, `padding: 2px 0`) ; suppression de `.sort-cell:focus-within` → le retour de focus se fait sur le champ, comme en mage.
- **`.sort-cell input`** : **ajouté aux 3 règles partagées** de `.dtable td.sort-name input` (champ encadré `--input-border`/`--field-bg` + `font-weight: 700` + `flex: 1 1 auto; width: auto`) → une seule source de vérité : le futur item TODO « encadré gras du nom de sort » s'appliquera automatiquement au clerc.
- `.sort-cell .btn-spell-del` inchangé (`margin-left: auto`).

### Validation

- **Suite : `629/629 OK`, 7 skip** (`02-css` 49 → **53** : cellule sans fond, partage de la règle de champ, bordure du champ).
- **Mesure navigateur** : cellule clerc `bg: transparent, border: 0px` ; input `border: 1px, bg: --field-bg` (**identique au mage**) ; icône hors du champ (x 0→20, input à x 25) ; `overlap: null`.
- **Capture** : loupe à gauche sur le fond de la fiche, champ encadré, ✕ à droite → disposition identique mage/elfe.
- Aucun autre usage de `.sort-cell` (JS clerc et sélecteurs de tests inchangés).

### Fichiers modifiés (28 septembre - loupe clerc)

| Fichier | Action |
|---------|--------|
| `style.css` | `.sort-cell` conteneur neutre ; `.sort-cell input` partagé avec `td.sort-name input` |
| `tests/02-css.test.js` | +4 assertions (`02-css` 49 → 53) |
| `JOURNAL.md` | Cette entrée |

---

## Date : 28 septembre 2026 - Correctifs CSS : débordement des sorts (Clerc) et bordure des noms de sorts (Mage/Elfe)

### Sorts du Clerc : débordement de la colonne de droite

- **Symptôme** : les sorts de la colonne droite de la grille `.sorts-grid` débordaient de la page (champ texte et bouton ✕ hors cadre).
- **Cause** : `.sort-cell` (grid item) avait `min-width: auto` par défaut (CSS Grid) → la cellule ne rétrécissait pas en dessous de la largeur intrinsèque de son contenu.
- **Correctif** : ajout de `min-width: 0` sur `.sort-cell` (`style.css`).

### Noms de sorts Mage/Elfe : bordure noire en trop

- **Symptôme** : les `<td class="sort-name">` et `<td class="sort-fixed">` portaient la bordure `1.5px solid var(--ink)` de `.dtable td`, créant un encadré noir et gras autour du nom de sort, plus visible que les autres champs (niveau, test).
- **Correctif** : ajout de `border: none` sur `.dtable td.sort-name` et `.dtable td.sort-fixed` (`style.css`). Seule la bordure de l'input (`1px solid var(--input-border)`) reste visible.

### Merge branche `evol-spell-detail` dans `main`

- Fast-forward de `main` sur `evol-spell-detail` (8 commits : détail des sorts, traductions EN/FR, calage ancre, double compensation scroll, loupe clerc).

### Fichiers modifiés (28 septembre — correctifs CSS sorts + merge)

| Fichier | Action |
|---------|--------|
| `style.css` | `.sort-cell` + `min-width: 0` ; `.dtable td.sort-name` + `.dtable td.sort-fixed` → `border: none` |
| `JOURNAL.md` | Cette entrée |

---

## Date : 28 septembre 2026 - Correctif : scroll infini de la popup de sorts (performance + fiabilite)

### Symptome

L'ouverture d'un sort (ex. Clerc / Benediction) se centrait correctement sur le sort, mais seules les pages 253-255 s'affichaient. La suite (fin du sort + pages suivantes) manquait ou apparaissait tres longtemps apres. Le scroll infini facon parchemin ne se declenchait pas automatiquement.

### Causes racines (analyse comparative avec dcc-spells-reader)

| Aspect | dcc-spells-reader (fonctionne) | spell-reader.js (bugue) |
|---|---|---|
| Au demarrage | Pre-charge 8 pages en parallele (p-2 a p+5) | Charge 1 seule page |
| Detection scroll | Seuil position : scrollTop + clientHeight >= scrollHeight - 800 | Seuil visibilite getBoundingClientRect avec marge 300px |
| Chargement | 3 pages par batch (fire-and-forget) | 1 page sequentielle (attend la precedente) |
| Cache | Map avec dedup de promesses | Objet simple, pas de dedup |
| Garde | Seuil naturel (position) | guard > 6 artificiel |

1. visible() seuil trop faible : avec une page de ~2000px de haut, le sentinel bas est a r.top ~ 2060px (viewport). Verification 2060 < 800 + 300 = 1100 -> false. Ni maybeLoad() ni l'IntersectionObserver (rootMargin: 400px) ne se declenchent -> aucune page suivante chargee.
2. Chargement sequentiel : chaque loadDown() attend onload du <script> avant de lancer le suivant -> 3 pages = 3 round-trips sequentiels.
3. Pas de dedup de promesses : loadPage(n) appele 2x cree 2 <script> tags pour la meme page.
4. Aucun pre-chargement : 1 page seule au demarrage, contrairement aux 8 pages du lecteur.

### Correctif (spell-reader.js)

- pagePromises (remplace pageCache) : cache la promesse elle-meme -> 1 seul <script> par page, meme en cas d'appels concurrents.
- insert(n, html) ordonne : insertion par numero de page (pas append/prepend), anti-doublon (data-loaded-page), compensation scrollTop quand insertion au-dessus de la position courante, reAnchor() systematique.
- loadDown / loadUp simplifies : compensation deleguee a insert, first/last recalcules depuis le DOM, retour !!insert() pour gerer les doublons.
- maybeLoadMore() (remplace maybeLoad + visible) : seuil par position de scroll (800px du bas / 800px du haut, comme le lecteur), 3 pages par batch.
- preloadAround(pageNum) : pre-charge p-2 a p+5 en parallele au demarrage (comme scrollToPage() du lecteur).
- scroll listener remplace l'IntersectionObserver.
- Conserve : overflow-anchor: none (style.css), anchorScroll/reAnchor() (calage de l'ancre), scrollToAnchor(), compensation scrollTop dans insert.

### Validation

- Suite : 629/629 OK, 7 skip (inchangee - les tests ne dependent pas du dossier frere).
- node --check spell-reader.js OK.

### Fichiers modifies (28 septembre - scroll infini)

| Fichier | Action |
|---------|--------|
| spell-reader.js | pagePromises, insert ordonne, maybeLoadMore (seuil 800px), preloadAround, scroll listener |
| JOURNAL.md | Cette entree |

## Date : 29 septembre 2026 12:45 - Elfe : plusieurs patrons dans "Patron(s)" (popup de selection)

### Besoin

Le champ "Patron(s)" de la fiche Elfe peut contenir plusieurs patrons. L'etoile rouge de la ligne fixe "Invoquer un Patron" (`.spell-lookup-patron`) ouvrait directement le premier patron resolu : impossible de consulter le second. Attendu : si le champ contient plusieurs patrons et que le dossier frere `dcc-spells-reader` est present (etoile visible), un clic ouvre d'abord une **petite popup de selection** listant les patrons saisis, puis la description du patron choisi.

### Decisions

1. Mini-overlay dediee dans `spell-reader.js` + CSS (bloc lecteur) : aucun changement de `script.js` / `showModal`.
2. Separateurs de decoupage : `;` `/` `+` et le mot "et". **La virgule n'est jamais un separateur** : elle fait partie de certains noms de patrons ("YDDGRRL, LA RACINE DU MONDE", "ITHHA, PRINCE ELEMENTAIRE DU VENT").
3. Une entree inconnue du livre est affichee mais grisee (`.is-unresolved`) ; le clic dessus ouvre la modale "Patron introuvable".
4. Une seule entree apres decoupage : ouverture directe, comportement avant le changement strictement conserve.

### Correctif

- `spell-reader.js` :
  - `parsePatrons(raw)` (exporte dans `window.DCCSpellReader`) : normalise les espaces, decoupe sur `; / + et`, trim, ignore les vides, dedoublonne par `slugify(cleanName(...))` ;
  - `openPatron(btn)` : champ vide -> modale "Patron manquant" (inchange) ; `entries.length > 1` -> `ensureReady()` puis `openPatronPicker(entries)` ; sinon chemin d'avant (variante sans parenthese en secours, `lookup`, `openViewer`, modale "Patron introuvable") ;
  - `openPatronPicker(entries)` : overlay `.patron-pick-overlay` > `.patron-pick` (role dialog, aria-modal), entete avec titre + croix, liste `<ul>` d'un `<button>` par patron (libelle = texte saisi), `lookup()` a l'ouverture pour griser les introuvables ; clic resolu -> fermeture puis `viewerLabels()` + `openViewer()` ; clic non resolu -> fermeture puis modale "Patron introuvable" ; fermeture par croix, clic hors carte, touche Echap (listener retire a la fermeture) ; focus sur le premier item.
- `style.css` (bloc lecteur) : `.patron-pick-overlay` (fixe, z-index 3100 > 3000 du viewer), `.patron-pick` (carte `var(--paper)`, animation `modal-scale-in`), `.patron-pick-head/-title/-close`, `.patron-pick-list`, `.patron-pick-item` (bouton pleine largeur, hover/focus), `.patron-pick-item.is-unresolved` (gris, italique).
- Docs : `README.md` (bullets "Definition des sorts"), `MANUAL.md` § 6.3b, cette entree.

### Validation

- `node tests\run.js` : **679/679 OK, 7 skip** (base 629 + 40 assertions `testPatronPicker` + 10 `02-css`).
- `09-spell-reader` : decoupage unitaire (separateurs, virgule jamais separatrice, doublons, vides), 2 patrons -> selection -> page 330, entree inconnue grisee -> modale, Echap/croix sans choix, un seul patron -> ouverture directe sans selection ; les 3 scenarios du patron (vide / inconnu / resolu) restent verts.
- `02-css` : presence des selecteurs `.patron-pick*`, overlay fixe, z-index 3100, item cliquable et transparent ; equilibre des accolades conserve.
- `node --check spell-reader.js` OK ; commentaires ASCII preserves.

### Fichiers modifies (29 septembre - plusieurs patrons elfe)

| Fichier | Action |
|---------|--------|
| spell-reader.js | `parsePatrons()`, `openPatronPicker()`, routage de `openPatron()`, export |
| style.css | Styles `.patron-pick*` (bloc lecteur) |
| tests/09-spell-reader.test.js | `testPatronPicker()` (40 assertions) |
| tests/02-css.test.js | Selecteurs + blocs CSS du picker (10 assertions) |
| README.md, MANUAL.md | Documentation du cas multi-patrons (+ capture dans § 6.3b) |
| captures/popup-selection-patron.png | Capture de la popup de selection (ajoutee au MANUEL) |
| JOURNAL.md | Cette entree |

## Date : 6 octobre 2026 - Overlay "tete de mort" sur les portraits (PV <= 0)

### Besoin

Quand un personnage a <= 0 PV courants, un overlay "tete de mort rouge" doit s'afficher au dessus de son portrait : dans sa fiche de personnage et dans l'onglet Equipe (ordre de marche + personnages en expedition). Il disparait des que les PV redeviennent > 0. Extension demandee en cours de route : la meme pastille dans la liste des cartes de la classe, qu'il soit en expedition ou a l'auberge.

### Decisions

1. Helper autonome `dead-overlay.js`, charge par `index.html` avant `script.js` : `window.DCCDeadOverlay = { isDead(pv), apply(portrait, dead), applyIn(root, selector, dead) }`. Les deux consommateurs verifient la presence du helper -> aucun plantage sans lui (tests isoles, chargements partiels) : ni wrap, ni overlay.
2. Une seule technique pour les 4 contextes : `apply()` enveloppe le portrait dans un `.portrait-holder` (`position: relative`) puis pose/retire le `.dead-overlay` (idempotent). Fiche 280 px, carte 50 px, colonne Classe 50 px et case d'ordre de marche en % beneficient du meme calage.
3. `isDead(pv)` : numerique <= 0 -> mort ; `''` / null / non numerique -> vivant (aucun faux positif sur champ PV vide).
4. Overlay en `pointer-events: none` : le clic sur le portrait (popup de choix) et le drag & drop de l'ordre de marche restent intacts ; le fantome de drag clone le holder -> le crane reste visible pendant le deplacement.
5. Cote Equipe, le modele suit la saisie (`setModelPV`) : un re-render (drag, resynchronisation) ne repart jamais d'une ancienne valeur de PV.

### Correctif

- `dead-overlay.js` (nouveau) : `toPV/isDead` (trim + `Number`, `isFinite`), `holderOf` (enveloppe `span.portrait-holder` si le portrait n'est pas deja dedans), `apply` (pose/retrait du SVG cr crane, `aria-hidden="true"`), `applyIn`.
- `index.html` : `<script src="dead-overlay.js">` apres `marching-order.js`, avant `script.js`.
- `style.css` : `.portrait-holder` (ancre, `flex: none`), `.dead-overlay` (absolu, voile sombre 72 % + crane `var(--red)` avec `drop-shadow`, animation `dead-pop`), `.marching-slot/.marching-ghost .portrait-holder` (58 % + `aspect-ratio: 1`, portrait interne `100 %` pour conserver les anciennes dimensions).
- `classes/equipe.js` : helpers internes `deadOverlay()`, `applyDead()`, `refreshDeadOverlay(id, pv)` (grille + tableau en une passe), `setModelPV(id, pv)` ; pose au rendu de la grille d'ordre de marche et de la colonne Classe ; champ PV sur `input` **et** `change` (2 portraits synchronises + sauvegarde inchangee) ; `resync()` met a jour l'overlay ; le clone de drag part du `.portrait-holder`.
- `script.js` : `applySheetDeadOverlay(cls, pv)` appele (a) a l'ouverture de la fiche (`openSheet`), (b) a chaque saisie du champ `-points_de_vie` (`bindAutoSave`), (c) depuis `syncPVFromEquipe` (edition depuis l'onglet Equipe alors que la fiche est ouverte) ; `createCharCard()` pose l'overlay sur le portrait de la carte (expedition **et** auberge) -- la liste est re-fetchee a chaque affichage, donc toujours juste.
- Docs : `README.md` (arborescence), `MANUAL.md` (7.2, 8.1, 10), `TODO.md` (bug remis en N/A), cette entree.

### Validation

- `node tests\run.js` : **757/757 OK, 7 skip** (base 679 + 68 assertions `10-dead-overlay` + 10 `02-css`).
- `10-dead-overlay` : helper (regles de mort, pose/retrait idempotent, holder conserve) ; Equipe (grille + colonne Classe aux 4 cas, synchro `input`/`change`, re-render, resync, rendu **sans** le helper) ; fiche (overlay pose a l'ouverture, bascules 8 -> retire / -1 -> pose / 0 -> maintenu, holder unique) ; liste des cartes (expedition a 0 PV overlayee, auberge a 7 PV non, bascule 5 -> retire / 0 -> pose a l'auberge).
- `02-css` : selecteurs `.portrait-holder` / `.dead-overlay` / `.marching-slot .portrait-holder`, `position: relative` + `position: absolute`, `pointer-events: none` ; equilibre des accolades conserve.
- `01-syntax` : `node --check dead-overlay.js` OK ; `index.html` reference un script existant.

### Fichiers modifies (6 octobre - overlay tete de mort)

| Fichier | Action |
|---------|--------|
| dead-overlay.js | Nouveau - helper `isDead`/`apply` + crane SVG |
| index.html | Chargement de `dead-overlay.js` |
| style.css | `.portrait-holder`, `.dead-overlay`, holder de l'ordre de marche |
| classes/equipe.js | Overlay grille + colonne Classe, synchro PV, resync, fantome |
| script.js | Fiche (ouverture / saisie / sync PV) + cartes de la liste |
| tests/10-dead-overlay.test.js | Nouvelle suite (68 assertions) |
| tests/run.js, tests/02-css.test.js | Enregistrement de la suite + selecteurs CSS |
| README.md, MANUAL.md, TODO.md | Documentation |
| JOURNAL.md | Cette entree |

## Date : 6 octobre 2026 - Equipe : etat combat sauvegarde en base + export/import JSON

### Besoin

Dans l'onglet Equipe, la section expedition (INIT. COMBAT + TOUR de chaque perso) et la section Ennemis (nom, AC, ATT, PV, INIT., Tour par ligne) ne vivaient que dans le DOM : perdus a chaque rechargement de page, a chaque changement de composition (`location.reload()`), et absents de l'export JSON. Ils doivent etre **sauvegardes en base** (comme `team_notes` et `marching_order`) et **inclus dans l'export/import global**.

### Decisions (arbitrages valides avec l'utilisateur)

1. Persistance : nouvelle colonne `users.team_state TEXT NOT NULL DEFAULT '{}'` (CREATE + `ALTER TABLE` protege), motif identique a `team_notes` / `marching_order`.
2. **Ennemis** : seules les lignes **renseignees** sont ecrites (lignes entierement vides filtreees a l'ecriture, cote client **et** cote serveur) ; l'affichage garde un plancher de 3 lignes.
3. **Import ancien fichier sans `team_state`** (ou etat invalide) : remise a zero complete de l'etat combat — l'import remplace tout.
4. **Sauvegarde** : automatique, debounce 600 ms + toast disquette (meme rythme que les notes) ; aucune ecriture au simple affichage.
5. **Lecture du DOM au moment de la sauvegarde** (snapshot) plutot qu'un modele maintenu a jour : pas de bookkeeping d'index, donc un ajout/suppression de ligne, une RAZ ou une resync ne peuvent pas desynchroniser ce qui part en base.

### Realisation

- `team-state.js` (nouveau, logique pure, pattern `marching-order.js`) : `sanitize` (chaines tronquees, tours entiers > 0, lignes d'ennemis vides ignorees, cles numeriques seulement), `normalize(state, chars)` (purge des ids absents : perso supprime / bascule a l'auberge), `buildExport(state, entries)` (**cles = index dans `characters[]`**, les ids DB n'etant pas stables entre comptes), `remapImport(exportState, idByIndex)` (index du fichier -> nouveaux ids ; invalide -> `null` -> remise a zero), `isEmpty`.
- `api/db.php` : colonne `team_state` au CREATE + `ALTER TABLE` try/catch pour les bases existantes.
- `api/auth.php` : `get_team_state` (GET) / `save_team_state` (POST, `requireLogin`, nettoyage serveur — init <= 20 car., champs ennemis <= 120 car., tour entier 0..9999, 50 lignes max, 32 Ko max, lignes entierement vides ignorees ; entrees invalides **ignorees** au lieu de bloquer).
- `script.js` : `getTeamState`/`saveTeamState`, `onSaveTeamState` (save + `showToastSave`, erreur -> toast), `loadEquipe` (fetch -> `normalize` -> passage a `equipe.render(..., initialState, onSaveTeamState)`), export `team_state` (champ absent si rien a exporter, echec API non bloquant), import (remap index -> `createdIds` puis ecriture, apres l'ordre de marche ; absent/invalide -> etat vide).
- `classes/equipe.js` : signature `render(..., initialState, onSaveTeamState)` ; `createTurnCounter()` gagne `setTurn(n)` / `getTurn()` / `counter.onTurnChange` (notification sur action utilisateur seulement) ; `createEnemyRow(rowState)` pre-remplit et etiquette les champs (`aria-label`) ; saisie init., clic tour, ajout/suppression de ligne, **RAZ init./tours** et **RAZ ennemis** declenchent `scheduleTeamStateSave()` (debounce 600 ms ; module optionnel : sans `team-state.js` ou sans callback, aucune sauvegarde, comportement historique conserve) ; ids inconnus ignores a l'affichage et purges a la prochaine ecriture ; `resync` conserve l'affichage (etat deja en base, la prochaine saisie re-ecrit).
- `index.html` : `team-state.js` charge apres `marching-order.js`, avant `script.js`.

### Validation

- `node tests\run.js` : **846/846 OK, 7 skip** (base 759 + 73 `11-team-state` + 14 `07-restore`).
- `11-team-state` (nouvelle) : logique pure (`sanitize` idempotent, `normalize`, `buildExport` index -> ids, `remapImport` ids -> index, `isEmpty`) ; Equipe (pre-remplissage init/tours/ennemis, debounce = 1 ecriture apres 600 ms, payloads reels, filtre des lignes vides, ajout/suppression de ligne, les 2 RAZ, resync conservee, id inconnu ignore) ; rendu **sans** `team-state.js` (aucune ecriture, pas de plantage).
- `07-restore` : rechargement -> etat combat restaure depuis la base **sans ecriture parasite** ; import d'un fichier avec `team_state` -> remap sur les nouveaux ids (`60`/`61`/`62`) puis affiche dans le tableau ; import d'un fichier **sans** `team_state` -> remise a zero complete (`{}`).
- Vérification visuelle : aucun navigateur connecte a la session -> a faire sur `http://localhost:8000` (saisir une init., cliquer un tour, declarer un ennemi -> toast puis recharger : tout est la ; ajouter/supprimer/RAZ idem).

### Fichiers modifies (6 octobre - etat combat equipe)

| Fichier | Action |
|---------|--------|
| team-state.js | Nouveau - logique pure (sanitize, normalize, export par index, remap d'import) |
| api/db.php | Colonne `users.team_state` + ALTER protege |
| api/auth.php | Actions `get_team_state` / `save_team_state` (nettoyage serveur) |
| script.js | Helpers + `onSaveTeamState`, `loadEquipe`, export/import `team_state` |
| classes/equipe.js | Signature render, `setTurn`/`getTurn`, lignes d'ennemis pre-remplies, debounce |
| index.html | Chargement de `team-state.js` |
| tests/11-team-state.test.js | Nouvelle suite (73 assertions) |
| tests/07-restore.test.js | Rechargement + 2 parcours d'import (avec / sans `team_state`) |
| tests/run.js | Enregistrement de la suite |
| README.md, MANUAL.md, TODO.md | Documentation |
| JOURNAL.md | Cette entree |

## Date : 6 octobre 2026 — Release v2.6 (etat combat de l'equipe + overlay tete de mort)

### Effectue depuis la derniere release (v2.5)

- **`6d42959`** — `deploy/gen-spell-content.bat` + `deploy/_gen-spell-content.ps1` : generation du zip `dcc-spells-reader-minimal.zip` (pack minimal : `spell-translation.js`, `content/anchors.js`, pages `127..303` + `322..356`) pour recreer le voisinage `../dcc-spells-reader` attendu par `spell-reader.js`.
- **`482998f`** — `TODO.md` : roadmap « onglet Level 0 » (generation d'un niveau 0 avec retirage, edition, conversion en niveau 1).
- **`4f1074f`** — `TODO.md` : remontee en critique du bug « etat combat de l'Equipe non sauvegarde » (traite ci-dessus, remis en N/A).
- **`783af04`** — overlay **tete de mort** sur les portraits quand PV courants <= 0 (fiche, cartes de liste expedition/auberge, Equipe colonne Classe + ordre de marche) — entree du 6 octobre ci-dessus.
- **A cette release (non encore commis)** — etat combat de l'onglet Equipe sauvegarde en base + export/import `team_state` (entree du 6 octobre ci-dessus) ; libelle `Dés(s) d'action` corrigé en `Dé(s) d'action` (`classes/bloc_commun.js`).

### Documentation de release

- `README.md` : overlay tete de mort (section Portrait), etat combat + export/import (section Onglet Equipe), `team-state.js` dans l'arborescence, 2 endpoints (`get_team_state` / `save_team_state`), pack minimal des sorts (section Build), libelle `Dé(s) d'action`.
- `MANUAL.md` : § 4.6 (export/import + item `team_state`), § 8.1 (Init. combat / Tour / RAZ / resync), § 8.2 (compteurs enregistres), § 8.3 (ennemis sauvegardes, lignes renseignees seulement), tableau « Ce que le navigateur memorise », annexe A (`team_state`), glossaire.
- `TODO.md` : bug critique → N/A.

### Validation

- `node tests\run.js` : **846/846 OK, 7 skip** (11 suites : `11-team-state` 73 assertions nouvelle, `07-restore` +14).
- Vérification visuelle a faire sur `http://localhost:8000` (aucun navigateur connecte a la session de travail).

---

## Date : 6 octobre 2026 — Évolution « Niveau 0 » (branche `evol-level0`)

### Spec, plan et maquettes

- Spec source : `plan0/lvl0-spec.txt` (tirage niveau 0, onglet, fiche simplifiée, promotion).
- Reformulation, plan d'implémentation et réponses à la question « champs oubliés dans BLOC_COMMUN » : `plan0/PLAN-LVL0.md`.
- Maquettes HTML statiques validées par l'utilisateur : `plan0/maquettes/` (sommaire `index.html`, onglet, fiche, promotion) — ignorées par git (`.gitignore : maquettes/`), branchées sur le `style.css` réel.
- Décisions tranchées avec l'utilisateur : pseudo-classe **`lvl0`** en base, **onglet Niveau 0 visible en mobile** (libellé court « Niv 0 », onglets à largeur maximale sans défilement — la pastille prévue initialement a été abandonnée), champ **Attaque = +0**, **JS Ref/Vig/Vol = mods AGI/END/PRE**, détection d'arme de distance par **plage chiffrée `3/6/9`**, bouton **Promouvoir inactif** tant que aucune classe n'est choisie, promotion = **fiche intégrale sauf portrait** (*évolution : après analyse, plus aucun champ n'est vidé*), détection raciale par **« commence par »** elfe/nain/halfelin, niveaux 0 présents dans l'**onglet Équipe**.

### Données (générées)

- `tools/build-lvl0-data.js` : convertit `plan0/noms.txt`, `plan0/metiers.csv`, `plan0/chance.txt`, `plan0/equipement.txt` et `icons/funnel-tokens/funnel-tokens.json` en deux fichiers chargés par `index.html`.
  - `lvl0-data.js` → `window.DCCLvl0Data` : **862 noms, 100 métiers** (table d100 conservée avec ses doublons pondérés), **30 jets chanceux**, **24 équipements**.
  - `funnel-icons.js` → `window.FunnelIcons` : catalogue `funnel` (**75 tokens**) + `byMetier` (80 métiers cartographiés → index).
  - Encodage UTF-8 vérifié (fichiers sources déjà UTF-8, BOM retiré).

### Moteur de tirage (`lvl0-roll.js`, pur, RNG injectable)

- Barème de mods complet, `formatMod` (`+1` / `0` / `-2`).
- Race par **« commence par »** : mouvement 20 (nain/halfelin), langues (`commun`, `+ elfique/nain/halfelin`), notes (`Infravision`, `Sens très développés et sensibles au fer`), classes autorisées à la promotion.
- Arme : `ranged` = plage `x/y/z` (3 nombres), premier dé de dégâts, dégâts + mod côté CàC **ou** distance (un seul côté renseigné).
- `roll()` : CA = 10 + mod AGI, PV = 1d4 + mod END (**plancher 1**, écart documenté dans le plan), initiative `1d20` + mod AGI, attaque `+0`, JS = mods, trésor `5d12 pc = N pc`, portrait indexé par métier (ou tirage libre si métier absent du catalogue), équipement = 3 objets tirés + équipement du métier.
- `promote()` : recopie identité/caracs/mods/jet chanceux/langues/notes/armes/équipement/trésor/PV/CA/initiative ; **vides** : attaque, dés/table de critique, JS, titre, alignement, armure ; portrait réinitialisé (tiré pour la classe par l'appelant).

### Fiche, onglet et promotion

- `classes/lvl0.js` : `blocCommun.render(..., 'lvl0', ...)` + section **Notes**, **retrait du `.hit-die`** (pas de dé de vie au niveau 0).
- `index.html` : onglet **Niveau 0** après *Voleur* (libellé responsive **`Niveau 0`** / **`Niv 0`**), scripts `funnel-icons.js` (avant `portrait-icons.js`), `lvl0-data.js`, `lvl0-roll.js`.
- `style.css` : `.tab-lvl0` (masqué hors ≤ 600 px dans la media query — l'onglet garde le style commun des classes), `.btn-lvl0-mobile`, `.btn-reroll`, `.btn-promote`, `.promo-class-list/-row/-why`, `.promo-delete-row`.
- `script.js` : `CLASSES`/`CLASS_LABELS` += `lvl0` ; création = **tirage** ; carte = **métier** en sous-titre ; en-tête **Export / Autre tirage / Promouvoir** ; `rerollLvl0` (vide le debounce avant relance), `showPromoteModal` (radios, classes raciales interdites grises avec motif, classe raciale présélectionnée, bouton inactif tant qu'aucun choix), `promoteLvl0` (flush + relecture en base, création, suppression optionnelle, ouverture directe), `randomPortraitFor` (portrait tiré dans **toutes** les sources de la classe), **auto-ouverture désactivée** pour l'onglet Niveau 0 (garder « + Nouveau » accessible).
- `classes/equipe.js` : libellé `lvl0: 'Niv.0'` ; `api/characters.php` : `'lvl0'` ajouté aux classes valides ; `deploy/_build.ps1` : dossier `plan0` exclu du build.
- `portrait-icons.js` : **`window.FunnelIcons` ajouté à `PortraitSources`** — sans cela `getPortraitSrc('funnel', 'lvl0', …)` retombait sur le fallback DCC (image absente sur les cartes/fiches/Équipe) et le sélecteur de portraits ne proposait **aucune** image en niveau 0 (bug corrigé en cours de route, couvert par la suite `12-lvl0`).
- Correctifs de finition : pied de modale **Promouvoir** en `.modal-actions` (classe standard → mêmes styles que les autres boutons de modale, sinon la mise en forme de `.modal-actions button` ne s'appliquait pas) + état `:disabled` stylé pour le bouton, `.promo-class-row` autorise le retour à la ligne.
- Renommage et périmètre du bouton de re-tirage : **« Retire » → « Autre tirage »** (classe CSS `.btn-retire` → `.btn-reroll`), **actif uniquement pendant la session de tirage** : posé à la création (`+ Nouveau`), conservé après chaque re-tirage, puis **retiré dès qu'on quitte la fiche** (retour à la liste ◀, changement d'onglet, ouverture d'un autre personnage) ou au rechargement de la page — état en mémoire `rollSessionId` (`createCharacter` / `openSheet` / `showList` / `switchTab`). Couvert par 6 assertions dans `12-lvl0`.
- **En-tête de fiche sur deux lignes** (`createSheetHeader` + `style.css`) : ligne 1 = **◀ / Export / Autre tirage / Promouvoir / interrupteur**, ligne 2 = **le nom en pleine largeur** (`.sheet-title` en `flex: 1 1 100%`, `.sheet-header` en `flex-wrap: wrap`) — un nom long ne décale plus les boutons. Concerne toutes les fiches, pas seulement le niveau 0 ; assertions de non-régression dans `12-lvl0`.
- **Onglet « Niveau 0 » : style commun des onglets de classe** — suppression des règles `.tab-lvl0` à l'accent « Équipe » (l'onglet se contente d'hériter de `.tab`, comme *Voleur* / *Nain*) ; **aucune règle résiduelle** : l'onglet est visible sur tous les formats. 3 assertions interdisent le retour de l'accent.
- **Mobile : les 8 onglets prennent toute la largeur, sans défilement** (décisions : « tout caser », puis largeur maximale) — `.tab-bar` en `padding: 4px 4px; gap: 1px; overflow-x: hidden`, `.tab` en `flex: 1 1 0; min-width: 0; padding: 9px 2px; font-size: 11px; white-space: nowrap; text-overflow: ellipsis` : chaque onglet a sa part égale (hauteur de tap ≈ 30 px), un libellé trop long est tronqué par des points de suspension et la barre **ne défile plus horizontalement**. **Libellé court « Niv 0 »** sous 600 px via deux spans (`.tab-lbl-full` / `.tab-lbl-short`, le texte complet reste dans le DOM pour les lecteurs d'écran). La **pastille « Lvl 0 »** du topbar est **supprimée** (`index.html`, styles `.btn-lvl0-mobile`, branchement `script.js`) : redondante avec l'onglet visible ; la pastille ⚔ Équipe est conservée.
- **Trésor : total seul** — `roll()` écrit `« N pc »` (ex. `27 pc`) au lieu de `« 5d12 pc = N pc »` ; le format est vérifié (et l'absence du détail des dés) sur les 20 tirages de la suite.
- **Badge « puissance » sur la fiche de niveau 0** (demande utilisateur) — dans l'en-tête, **à droite du nom uniquement** : icône de **bras muscule en rouge** (SVG inline `fill="currentColor"`, `color: var(--red)`, `18-20 px`) + **somme des modificateurs des 6 caractéristiques** (`DCCLvl0Roll.powerOf(data)`, formaté `+3` / `0` / `-2`). Logique pure dans `lvl0-roll.js` (barème réutilisé), rendu via `buildLvl0Power()` appelé **si et seulement si** `cls === 'lvl0'` dans `createSheetHeader` — absent des cartes de liste et de l'onglet Équipe ; `.lvl0-power` / `.lvl0-power-value` en style.css (compact en mobile). Couvert par `testPower` (7 assertions dont barèmes extrêmes et tirage réel) + 6 assertions de câblage ; docs `MANUAL.md` § 4.9 / § 6.1 et `README.md`.
- **Dossier de portraits absent : placeholder au lieu de 404** (demande utilisateur, non redistribuable) — nouveau module **optionnel `portrait-guard.js`** (même philosophie que `dead-overlay.js`) :
  - **Source de vérité** : `api/icons.php` (le même `dirs` déjà utilisé par le sélecteur), lu **dès `init()`** et **attendu 3 s max** avant le premier affichage (`Promise.race`) → aucun 404 au premier rendu ; **inconnu** (échec de l'endpoint) → on affiche les images, comportement historique (décision 1).
  - **Placeholder** (décisions 2-4) : `<div>` reprenant les classes de taille (`portrait-img` / `char-card-portrait` / `team-portrait` / `marching-portrait`), silhouette **SVG inline**, `aria-label` + `title` = « Aucune image disponible » **partout**, libellé **visible** sous le portrait de la fiche, **jamais d'attribut `src`** → zéro requête. Appliqué à **toutes** les sources manquantes (uniformisation, décision 2).
  - **Emplacements** : `createCharCard`, `initPortraits` (rendu **piloté par le DOM**, clic **délégué sur la zone** pour survivre au remplacement), `applySheetDeadOverlay` (le crâne passe aussi sur le placeholder), `equipe.js` (colonne Classe, ordre de marche, resync limité aux `<img>`, overlay mort), + **`sweepPortraits()`** qui corrige les images déjà posées quand la liste des dossiers arrive (course au premier rendu).
  - **Sélecteur vide** : message explicite — générique (« Aucune image disponible. ») ou niveau 0 (« … non installés sur ce serveur (droits d'image) »).
  - **Choix conservé en base** (`portrait_source`/`portrait_index` intacts) : tout réapparaît si les images sont installées plus tard.
- **`icons/funnel-tokens/funnel-tokens.json` retiré du dépôt** : inutile à l'exécution (le mapping métier → images est déjà embarqué dans `funnel-icons.js`) — `tools/build-lvl0-data.js` devient **tolérant** : fichier absent → `byMetier` vide (portraits tirés au hasard parmi les 75 tokens) avec un avertissement, au lieu d'une exception.
- **Promotion : plus aucun champ vidé** (après demande et analyse des pertes) — `promote()` recopie désormais la fiche **intégralement** (copie superficielle de toutes les clés : titre, alignement, armure, **JS Ref/Vig/Vol**, attaque, dés/table de critique, plus toute clé hors liste) ; seuls `niveau → 1` et le **portrait** (tiré pour la classe) sont réécrits. La liste blanche `PROMOTE_COPY` est supprimée : rien ne peut plus être perdu en silence. Tests `12-lvl0` réécrits (copie de toutes les clés + clé expérimentale conservée).

### Tests

- Nouvelle suite `tests/12-lvl0.test.js` (**1014 assertions**) : données générées, barème, race (« commence par »), armes CàC/distance, 20 tirages complets (cohérence CA/PV/init/JS/**trésor `N pc`**/portrait/dégâts), **puissance (`powerOf`)**, promotion (**copie intégrale — aucune clé perdue, seul le portrait réécrit**), fiche (sans `.hit-die`, Notes, roundtrip), **registre des portraits** (8 sources, funnel résolu pour `lvl0`, absent des fiches de classe et inversement), **câblage** `index.html`/`style.css`/`script.js`/API (« Autre tirage » conditionné à la session, en-tête deux lignes, onglet sans accent, **onglet mobile sans pastille**, libellé **« Niv 0 »**, onglets à largeur maximale sans défilement, **badge de puissance**).
- `tests/helpers/env.js` : `CLASSES` += `lvl0` → `01-syntax`, `03-modules` et `05-export` couvrent automatiquement le nouveau module.
- Nouvelle suite `tests/13-portrait-guard.test.js` (**70 assertions**) : sémantique des dossiers (inconnu → on affiche, présent, absent, source inconnue), placeholder (`<div>` **sans `src`**, silhouette SVG inline, `role=img` + `aria-label` + `title` partout, libellé visible sur la fiche et absent des vignettes), messages du sélecteur vide (générique / niveau 0), **sécurité hors `icons/`** (lecteur de sorts, captures), câblage (`portrait-guard.js` avant `script.js`, `initPortraitGuard` + `Promise.race`, balayage prudent `data:`/`http`, clic délégué sur la zone, les 4 emplacements `equipe.js`, CSS `.portrait-missing`).
- `node tests\run.js` : **1953/1953 OK, 7 skip** (13 suites).

### Documentation

- `README.md` : 8 onglets, section « Niveau 0 (funnel) », 8 sources de portraits, onglet mobile (libellé « Niv 0 », largeur maximale), placeholder « aucune image disponible » (`portrait-guard.js` dans l'arborescence), **2 captures en tête de page** (`fiche0.png`, `onglet0.png`), arborescence (`lvl0-data.js`, `lvl0-roll.js`, `funnel-icons.js`, `classes/lvl0.js`, `icons/funnel-tokens/`).
- `MANUAL.md` : § 1 (8 sources + niveau 0), barre d'onglets (9 onglets, largeur maximale sans défilement + libellé « Niv 0 », sans pastille), § 4.2 (pas d'auto-ouverture Niveau 0), **nouveau § 4.9** (tirage, Autre tirage, Promouvoir, badge puissance), § 6.1 (en-tête deux lignes + puissance), § 6.2 (fiche Niveau 0), § 7 (8 sources, source Funnel exclusive, **dossier absent → placeholder sans 404**), § 8 (niveaux 0 dans l'Équipe), § 10 (nouveau signe visuel), mobile, dépannage, annexe A (`class: lvl0`), annexe B, glossaire — **+ 5 captures ajoutées** : `barremobile.png` (§ 3), `onglet0.png` / `fiche0.png` / `promo0.png` (§ 4.9), `selvide.png` (§ 7.1).
- `TODO.md` : évolution « onglet Level 0 » passée à ✅ livrée.

### Validation

- `node tests\run.js` : **1953/1953 OK, 7 skip**.
- Vérification visuelle à faire sur `http://localhost:8000` (aucun navigateur connecté à la session) : tirage, Autre tirage (disparaît en quittant la fiche), Promouvoir (4 classes / classe raciale imposée), portrait funnel, niveau 0 en Équipe, pastille mobile.

---

## Date : 6 octobre 2026 — Sorts : nom de sort en gras + fiche Clerc alignée sur Mage/Elfe

### Hiérarchie visuelle du nom de sort (Mage, Elfe) — commit `441f69a`

- **Problème** : nom et note partageaient le même cadre, la même couleur et la même graisse ; seul **1 px de corps** les séparait (12 px / 11 px).
- `style.css` : nouvelle règle `.dtable td.sort-name input { font-size: 14px; font-weight: 700 }`, posée **après** le bloc partagé `.dtable td.sort-notes textarea, .dtable td.sort-name input, .sort-cell input` — ce bloc est laissé intact **à dessein** : `tests/02-css.test.js` le repère par sa liste de sélecteurs et exige qu'il conserve `border: 1px solid var(--input-border)`.
- `style.css` : `.dtable td.sort-notes textarea` passe en `color: var(--muted)` (secondaire) — en thème clair le rapport tombe à ≈ 3,9:1 pour du 11 px (sous le seuil AA 4,5:1), comme ailleurs dans la fiche ; arbitrage assumé, revu si le strict AA est exigé.
- Effet de bord voulu : l'Elfe hérite du style (mêmes classes) ; le Clerc, encore en `.sort-cell`, hérite à son tour avec la refonte ci-dessous.
- `tests/02-css.test.js` : **+6 assertions** (gras, 14 px, note 11 px, note `--muted`) → 1953 → **1959**.

### Fiche Clerc : table identique à Mage/Elfe + Niveau et Test par sort

- **Demande** : même mise en page que Mage/Elfe mais **sans ligne de note** sous chaque sort → le Clerc gagne **2 champs sauvegardables par sort** (`sort_niveau_N`, `sort_test_N`) ; absents d'une base ancienne ou d'un import JSON → **champs vides**, aucune valeur par défaut imposée.
- `classes/clerc.js` (refonte de la section SORTS) :
  - table `#clerc-spells-{id}` en `.dtable`, en-têtes `# / Nom du sort / Niveau / Test / ✕`, **1 `<tr>` par sort** : aucun `textarea`, aucune `.sort-notes` — le champ nom hérite donc du gras 14 px via `td.sort-name`.
  - clé de nom **historique `sort_N` conservée** (zéro migration des données existantes) ; `sort_niveau_N` / `sort_test_N` portés par des `data-key` → auto-save (`collectSheetData`), `collectData` du module et export/import JSON **sans rien changer ailleurs** (`api/characters.php` stocke le JSON brut, sans liste blanche).
  - **indices stables** : les 3 clés partagent le même index ; supprimer un sort au milieu ne décale plus les suivants — l'ancien comportement **compactait** les noms, ce qui aurait fait décrocher Niveau/Test de leur sort. `renumber()` est appelé **au rendu** : la numérotation affichée reste continue (1, 2, 3) malgré le trou d'index, comme après une suppression en session.
  - migration de l'ancienne grille 3 × 7 (`sort_{colonne}_{ligne}`) conservée : noms compactés en `sort_1..n`, Niveau/Test vides.
  - `_spellRowHTML(charId, n, k)` appelé **sans `v`** : une ligne créée à la demande est toujours vide (`value=""` + loupe masquée) — voir le bug documenté plus bas.
- `tests/14-clerc-sorts.test.js` : **nouvelle suite, 51 assertions** — structure identique au Mage, compatibilité base ancienne / import JSON sans Niveau+Test, migration de la grille 3 × 7, non-décrochage des index, roundtrip auto-save + `collectData` + aller-retour JSON, ajout/suppression (avec confirmation, sans confirmation, annulation). Enregistrée dans `tests/run.js` (13 → **14 suites**).
- `tests/09-spell-reader.test.js` : bloc clerc `.sort-cell` → `td.sort-name` (la loupe passe au nouveau markup ; la regex `sort_(?:nom_)?\d+` de `spell-reader.js` couvrait déjà `sort_N`).

### Documentation

- `MANUAL.md` : § 6.2 (section Clerc), § 6.3 (intro : le Clerc passe sur « même table que le Mage, 1 ligne par sort », consigne d'ajout precisant « Effet/Notes : Mage et Elfe uniquement »), **« Côté Clerc » réécrit** (table identique, Niveau/Test sauvegardés et vides si absents, migration 3 × 7).
- `README.md` : bullet **Clerc** (table comme le Mage + niveau/test sauvegardés), **nouveau bullet transverse « Sorts (Mage, Elfe, Clerc) »**, `clerc.js` et `*.test.js` dans l'arborescence.
- `TODO.md` : **bug Mage/Elfe documenté en *Majeur*** (non corrigé) — voir ci-dessous.
- `captures/clerc.png` régénérée (nouveau rendu de la fiche).

### Bug documenté, non corrigé (`TODO.md` → *Majeur*)

- **Supprimer un sort peut le faire réapparaître, auto-save comprise** : `_spellRowHTML(charId, n, k, v)` préremplit la ligne créée avec `v`, or `v` lit `data` = snapshot **au chargement** (les saisies vont dans le DOM). `getNextIndex()` = `max(lignes) + 1` **réutilise l'index de la ligne supprimée** → supprimer le dernier sort (`mage.js` L215, `elfe.js` L228) ou supprimer puis ré-ajouter (`mage.js` L225, `elfe.js` L238) ressuscite l'ancien contenu ; comme la sauvegarde lit le DOM, **les clés repartent en base**.
- Correctif proposé (non appliqué) : ne plus passer `v` — déjà fait côté Clerc ; tests à ajouter listés dans le TODO.

### Points laissés ouverts

- `.sorts-grid` / `.sort-cell` ne sont plus utilisés par **aucun** JS : CSS mort + assertions `02-css` qui le décrivent — nettoyage non fait.
- Bug Mage/Elfe ci-dessus : documenté, non corrigé.

### Validation

- `node tests\run.js` : **2010/2010 OK, 7 skip** (14 suites : `14-clerc-sorts` 51 assertions nouvelle, `02-css` 77 au lieu de 71).
- Vérification visuelle à faire sur `http://localhost:8000` (aucun navigateur connecté à la session) : table du Clerc (nom en gras, colonnes Niveau/Test), migration d'une base avec ancienne grille, export/import d'un JSON sans `sort_niveau_*`.

---

## Date : 7 octobre 2026 - Evolution « Carte » : module de dessin de carte (branche `evol-draw-map`)

### Objectif

Module de **dessin de carte plein écran** ouvert par une icône « carte » de la topbar (à gauche de l'icône de thème), reprenant l'application `D:\VS Code\draw-on-map` (crayon, gomme, texte, déplacer, annuler, zoom/pincement, multi-cartes), avec **persistance en base**, **images de fond webp** et **export/import JSON/ZIP**. Spec : `TODO.md` § EVOLUTIONS — plan détaillé et maquettes validés : `plan1/PLAN-CARTE.md`, `plan1/maquettes/`.

### Backend (PHP/SQLite)

- `api/db.php` : table `maps` (`data` = `{v,w,h,ops}`, `ui` = `{zoom,left,top}`, `bg_uid`, `bg_name`), colonne `users.map_prefs` (outil/couleur/taille/gras/calque actif), `busyTimeout(5000)` (écritures concurrentes multi-onglets, WAL = jamais de corruption, au pire « dernier écrit gagne »).
- `api/maps.php` (**nouveau**) : `list/get/create/save/rename/delete`, `prefs_get/prefs_save`, `check_images`, `export_zip` (`ZipArchive` : json + `images/<uid>.webp` + `rapport.txt`), `import_all`/`import_map` (json ou zip). Limite **10 calques** (`create` → 409 + message). Suppression d'un calque = `unlink` de l'image orpheline (comptage de références).
- `api/map-image.php` (**nouveau**) : `upload` (conversion **webp** GD qualité 85, EXIF effacé, champ `name` = nom utilisateur conservé), `get` (session obligatoire, ETag, `Cache-Control: private`), `delete`. Stockage `data/maps/[UID].webp`, UID = `bin2hex(random_bytes(16))`, **jamais d'écrasement** (remplacement = nouvel UID + purge de l'ancien).

### Module carte (front)

- `map-draw.js` (**nouveau**) : port du moteur `draw-on-map`, ids DOM préfixés `md-` (zéro collision avec `script.js`), invariants `ARCHI.md` § 10 préservés (unités de scène, `w_scene = épaisseur/zoom`, `destination-out` remis en `source-over`, bitmap = vue × dpr, simplification RDP).
- Persistance : sauvegarde auto **debounce 400 ms** + `showToastSave()` 💾 ; zoom/position **par carte** (debounce 1,5 s) ; outil/couleur/taille/gras **par compte** — tout restauré à la réouverture (R13).
- Fond d'image : upload → `data/maps/[UID].webp`, conversion webp **côté navigateur** (`canvas.toBlob`) avec repli GD serveur ; image introuvable → **toast d'erreur + grille de repli**, référence UID conservée (R11).
- Feuilles Plus / Export / Import / Cartes / Options reprises du port + bouton « .zip (avec image) », « Remplacer/Supprimer l'image de fond », **croix de fermeture** + `Échap` (R3).
- `style.css` : section « Module Carte » (port de `draw-on-map/index.css` scopé sous `#map-module`, jetons liés à `data-theme` : le module hérite du thème clair/sombre) + `.map-toggle` (clone de `.theme-toggle`, cible tactile 44 px).
- `index.html` : icône `#btn-carte` **à gauche** de l'icône de thème (utilisateurs connectés), `viewport-fit=cover` (safe-areas iOS), `<script src="map-draw.js">`.
- `script.js` : `showToast(message, type, actionLabel?, action?)` **rétrocompatible** ; export/import « tout » enrichis (`maps`, `map_prefs`) avec **ZIP** (et repli `.json` + avertissement si `ZipArchive` absent) ; import `.json` **ou** `.zip` avec rapport des UID manquants et des calques écartés.

### Tests

- `tests/helpers/mapenv.js` (**nouveau**) : harnais du module (stubs canvas 2D / dialogues / Image / toBlob + serveur factice `maps.php` + `map-image.php` avec état en mémoire).
- `tests/15-map-draw.test.js` : **52 assertions** — règle d'épaisseur au zoom (6 px → 7,5 px à 80 %), gomme `destination-out` puis retour `source-over`, sérialisation `v:3` (UID + nom + `ui`), compat `v:2`, ops corrompues ignorées, image introuvable (toast + grille), limite de 10 cartes, suppression carte + image, fermeture (croix) avec sauvegarde.
- `tests/16-map-persist.test.js` : **34 assertions** — sauvegarde auto + toast 💾, prefs outil/couleur, reprise zoom/position/outils/gras, upload puis **remplacement** d'image (nouvel UID + purge de l'ancien), erreur de sauvegarde, UID conservé malgré image manquante.
- `tests/17-map-export.test.js` : **32 assertions** — export global (JSON `version: 2` + cartes + prefs ; **ZIP** dès qu'une image existe), import `.json`/`.zip` (remplacement des calques, toasts UID manquants, **limite de 10** = 10 importés + toast).

### Documentation

- `MANUAL.md` : **nouvelle § 9 « Dessiner une carte »** (§ 9/10 → 10/11, table des matières et renvois § mis à jour), § 10 = tableau des données stockées (cartes + images), § 11 = nouveaux toasts, **annexe A** : format `v:3` d'un calque + collection globale `version: 2` (`maps`, `map_prefs`, ZIP).
- `README.md` : section **Module Carte**, galerie (2 captures), arborescence (`map-draw.js`, `api/maps.php`, `api/map-image.php`), tableaux API.
- `plan1/PLAN-CARTE.md` : décision **D12** ajustée (bouton « Nouvelle carte » cliquable pour afficher le message de limite), § 18 = liste des captures attendues.

### Correctif : la croix de fermeture dessinait au lieu de fermer (bug réel)

- **Symptôme** : cliquer sur la ✕ du module traçait un point sur le canvas au lieu de fermer.
- **Cause** : `#md-top` est en `pointer-events:none` (comportement `draw-on-map` : le geste doit passer **sous** le chrome) et seuls les `.chip` réactivent `pointer-events:auto` — la croix, bouton nu, **laissait donc le clic filer vers le canvas** qui capture le pointeur (`setPointerCapture`) et trace.
- **Correctif** : `pointer-events: auto` explicite sur `#map-module #md-close` (`style.css`) ; le même contrat s'applique désormais à **toute commande ajoutée au chrome haut**.
- **Non-régression** : `tests/15-map-draw.test.js` **+5 assertions CSS** (contrat : `#md-close` en `pointer-events:auto`, `#md-top` en `pointer-events:none` + `z-index:30`, canvas en `z-index:5`). Le clic synthétique jsdom ne détecte pas ce genre de bug (pas de hit-test) : ce sont les assertions CSS qui le verrouillent.

### Correctif : `database is locked` en Fatal error au démarrage d'une requête (D14)

- **Symptôme** (log serveur) : `PHP Fatal error: Uncaught Exception: database is locked` levée sur `PRAGMA journal_mode=WAL` dans `getDB()` → la requête partait en 500.
- **Cause** : `busyTimeout(5000)` était posé **après** les `PRAGMA` — le timeout ne s'appliquait donc jamais au moment exact où il fallait attendre le verre (et `journal_mode=WAL` exige un accès bref exclusif, même pour constater que la base est déjà en WAL).
- **Correctif** (`api/db.php`) : `busyTimeout(5000)` posé **dès la création de la connexion**, avant tout pragma ; `PRAGMA journal_mode=WAL` passé en `try/catch` non bloquant (le mode est persistant dans le fichier : un échec = déjà en WAL ou autre connexion active).
- **Non-régression** : smoke test + **rafale de 40 requêtes concurrentes** (list/save/get/prefs) sans aucun 5xx ; deux passes complètes à la suite sans `database is locked` dans le log.

### Correctifs d'interface (retours de test en navigateur, 07/10)

1. **Les croix des feuilles ne fermaient rien** (Plus, Importer, Cartes, Options) : les
   attributs `data-close` portaient l'id **déjà préfixé** (`md-moreDlg`) alors que
   `closeDlg()` re-préfixe → `getElementById('md-md-moreDlg')` = `null`, clic sans effet.
   *Correctif* : `data-close` = id **logique** (sans préfixe), convention commentée dans
   `bindUI()`. *Non-régression* : `15-map-draw` — les 4 feuilles testées une par une
   (ouverture puis fermeture par leur croix) + contrat « aucun `data-close` préfixé ».
2. **Crayon / gomme / texte inertes, on restait en mode déplacement** : `setTool()` ne
   **ré-armait pas** `drawMode` (oubli de port — `draw-on-map` fait
   `setDrawMode(tool !== 'move')` : *choisir un outil = vouloir dessiner*). Le geste
   tombait donc toujours dans le pan après un chargement de fond (`setDrawMode(false)`).
   *Correctif* : port fidèle (avec fermeture du tiroir de couleurs hors outil texte,
   focus du champ texte, vibration légère). *Non-régression* : `15-map-draw` — séquence
   complète déplacement → crayon → gomme → texte avec vérification des opérations créées.
3. **Options de la carte simplifiées** : le nom de l'image de fond n'est **ni affiché ni
   renommable** (retour utilisateur : « aucun intérêt ») — champ et bouton « Renommer »
   supprimés, la ligne de synthèse affiche « image de fond ». Le nom reste **persisté en
   base et exporté** (R6/R10). *Non-régression* : `15-map-draw` — aucun champ/bouton de
   nom dans les options, mais `bg_name` toujours envoyé à la sauvegarde.
4. **Nom de l'image retiré de la liste des calques** + **« Carte N » rebaptisée au
   chargement d'un fond** (D15) : la carte prend le nom du fichier image **sans son
   extension** ; un nom déjà personnalisé n'est jamais écrasé (heuristique `/^Carte \d+$/i`).
   *Non-régression* : `15-map-draw` — rebaptisage `plan-du-donjon.png` → `plan-du-donjon`,
   non-écrasement par un second fond, nom absent de la liste et des options.
5. **Export / import = calque actif, titres explicites** : « Exporter le JSON » devient
   **« Exporter le JSON / ZIP »** ; les feuilles portent le **nom du calque actif**
   (« Donjon de la Reine », « Export — Donjon de la Reine », « Import — … ») — ces actions
   ne portent que sur lui et l'import **écrase son dessin** (aucun calque créé).
   *Non-régression* : `15-map-draw` — titres vérifiés + import sans création de calque.
6. **Entrée unique « image de fond »** (D16) : **« Choisir une image de fond »** (charge
   **ou** remplace) et **« Retirer l'image de fond »** (inactive sans image) dans la feuille
   du calque ; le bloc image est **retiré d'« Options de la carte »** (nom + suppression
   seulement) — fini le doublon « Charger » / « Remplacer ». « Retirer » écrit en base
   **immédiatement** (sans debounce). *Non-régression* : `15-map-draw` — entrées présentes
   dans la feuille du calque, absentes des options, état du bouton « Retirer », suppression
   effective du fichier + de la référence.
7. **Grille « infinie » sur carte sans image** (D17) : la scène **grandit** pour couvrir la
   zone visible + 1 écran de réserve + le dessin (origine fixe, croissance à droite/bas
   seulement — le défilement ne peut pas être négatif). La grille remplit l'écran à tout
   zoom, comme un **papier quadrillé**. **« Ajuster à l'écran »** cadré sur le **dessin**
   (bbox + marge), 100 % sur carte vide, l'image si fond présent ; les `w/h` d'un import
   deviennent un minimum. *Non-régression* : `15-map-draw` — croissance au zoom arrière,
   **stabilité d'« Ajuster »** (pas de boucle zoom/scène), scène = dimensions de l'image
   quand un fond existe, coordonnées d'import préservées.
8. **Réglette de zoom verticale permanente sur PC** (D18) : sous le chip de zoom, réglage à
   la souris (mapping log 5–800 %) sans passer par la feuille « … » ; **masquée sur
   tactile** (`@media (pointer: coarse)`) où pincement + chip suffisent ; réglette et
   curseur de la feuille « Plus » restent **synchronisés**. Deux retours console/rendu
   traités en route : la valeur d'`appearance` verticale **dépréciée** (warning Chrome)
   puis, le **curseur vertical natif ne se centrait pas** sur son rail (retour utilisateur,
   dépendant du navigateur) — remplacé par la méthode déterministe : un curseur
   **horizontal pivote à -90°** (max vers le haut), dont le centrage est déjà garanti par
   les règles `input[type=range]` du module. Ni `writing-mode`, ni `appearance` expérimental.
   *Non-régression* : `15-map-draw` — présence, synchronisation, pilotage du zoom, contrat
   CSS (pivot -90°, masquage tactile, ni valeur dépréciée ni slider vertical natif).

### Correctif : « Retirer l'image de fond » s'exécutait sans confirmation (08/10)

- **Retour utilisateur** : le bouton supprimait **immédiatement** l'image du serveur (et sa
  référence) — un simple clic mal placé perdait le fond de la carte.
- **Correctif** (`map-draw.js`) : **validation en 2 temps** dans la feuille « Plus », même
  motif que « Effacer tout le dessin » — le bouton cède la place au bloc `md-bgConfirm`
  (« Retirer l'image de fond de « X » ? » + rappel : l'image du serveur est supprimée si
  plus aucune carte ne l'utilise, le dessin est conservé), boutons **Oui, retirer** /
  **Annuler** ; fermer la feuille = annulation (réservation remise à plat sur `close`).
- *Non-régression* : `15-map-draw` **+5 assertions** : rien supprimé avant confirmation,
  « Annuler » revient au bouton sans toucher au serveur, suppression effective (fichier +
  référence + grille) uniquement après « Oui, retirer ».

### Extensions PHP activées (`D:\VS_Code_Workspaces\php\php.ini`)

- `extension=gd` et `extension=zip` décommentées (les DLL `php_gd.dll` / `php_zip.dll` étaient déjà présentes dans `ext/`) → **conversion png/jpg → webp côté serveur** et **export/import ZIP** opérationnels localement.
- `php -m` confirme : `gd`, `zip`, `sqlite3`.

### Points laissés ouverts

- **Captures d'écran** : 11 requises + 4 optionnelles listées dans `plan1/PLAN-CARTE.md` § 18 ; **9/11 fournies** le 07/10 — il manque `carte-limite-10.png` (D12) et `carte-import-erreur-uid.png` (R11), leurs `<img>` ont été **retirés de `MANUAL.md`** (§ 9) en attendant, et le reliquat est tracé dans `TODO.md`.
- Dimension maximale d'une image : aucun plafond retenu (option étudiable : redimensionnement au-delà de 4096 px de plus grand côté).
- À vérifier sur le PHP du NAS : `gd` et `zip` y sont-ils aussi disponibles (sinon les replis `.json` / navigateur prennent le relais, comme testé).

### Validation

- `node tests\run.js` : **2200/2200 OK, 9 skip** (17 suites : `15-map-draw` 122, `16-map-persist` 34, `17-map-export` 32 en plus des 2012 existantes).
- `php -l` : `api/db.php`, `api/maps.php`, `api/map-image.php` sans erreur de syntaxe.
- **Smoke test réel** (PHP 8.2 + SQLite, 22 vérifications × 2 passes) : session, CRUD calques, prefs, upload webp → UID, service d'image, **conversion PNG → webp (GD, RIFF/WEBP vérifié)**, `check_images`, limite 10 (409), **export ZIP réel (1,6 Mo)**, `import_map` JSON + rapport d'UID manquant, refus sans fichier (400), **rafale de 40 requêtes concurrentes sans 5xx**, suppression carte + image (404) — aucun `database is locked` dans le log serveur.
- Vérification visuelle à faire sur `http://localhost:8000` : ouverture/fermeture par la croix, dessin + toast 💾, fond webp (png/jpg converti), remplacement/suppression d'image, suppression de carte, export ZIP aller-retour, mobile (pincement, clavier virtuel, safe-areas).

---

## Date : 7 octobre 2026 — Release v2.9 (module Carte)

### Effectue depuis la derniere release (v2.8)

- **Evolution « Carte »** complete (branche `evol-draw-map`, entree du 7 octobre ci-dessus) : module de dessin plein ecran (`map-draw.js`), backend `api/maps.php` + `api/map-image.php`, table `maps` + `users.map_prefs`, images webp `data/maps/[UID].webp` (UID unique, jamais d'ecrasement), export/import JSON/ZIP (calque actif et global), limite de 10 cartes, sauvegarde auto (toast 💾) + reprise outil/couleur/zoom/position.
- **Retours de test en navigateur traites** : croix de fermeture qui dessinait, croix des feuilles inertes (`data-close`), outils crayon/gomme/texte inertes (`setTool` / `drawMode`), `database is locked` en Fatal error (**D14** : `busyTimeout(5000)` avant tout pragma), entrée unique « image de fond » (**D16**), **grille infinie** (**D17** : scène qui grandit, « Ajuster » cadré sur le dessin), **réglette de zoom verticale sur PC** (**D18** : sous le chip, masquée sur tactile, synchronisée) puis son **centrage** (curseur horizontal pivote à -90° — ni valeur d'`appearance` dépréciée, ni slider vertical natif non fiable), **confirmation avant « Retirer l'image de fond »** (08/10, entree ci-dessus).
- `plan1/` versionne : `PLAN-CARTE.md` (plan + décisions **D1-D18**, § 18 captures) et 5 maquettes HTML ; `plan0/` : spec + maquettes du niveau 0.
- Environnement : extensions PHP `gd` + `zip` activees dans `php.ini` local (conversion png/jpg → webp cote serveur, export ZIP).

### Documentation de release

- `README.md` : section **Module Carte** mise à jour (grille infinie, réglette PC, export/import limités au calque actif, compteurs de tests), galerie, arborescence, tableaux API.
- `MANUAL.md` : § 9 « Dessiner une carte » (zoom + réglette, sauvegarde, export/import, limite 10), § 10/11 renumérotés, annexe A (`v:3` / `version: 2`).
- `TODO.md` : évolution carte **implémentée** + les **2 captures restantes** à faire (`carte-limite-10.png`, `carte-import-erreur-uid.png`) ; leurs `<img>` retirés de `MANUAL.md` § 9 en attendant.
- `plan1/PLAN-CARTE.md` § 18 : état **9/11** des captures requises.

### Validation

- `node tests\run.js` avec `PHP_BIN` : **2214/2214 OK, 0 skip** (17 suites ; `15-map-draw` 127, `16-map-persist` 34, `17-map-export` 32) — `php -l` des scripts PHP compris (les 9 skips precedents).
- `php -l` : `api/db.php`, `api/maps.php`, `api/map-image.php` sans erreur de syntaxe.
- Smoke test reel (PHP 8.2 + SQLite, 22 verifications x 2 passes) : detail dans l'entree du 7 octobre ci-dessus.

---

## Date : 8 octobre 2026 — Application Windows (installeur + zip portable)

### Livrables (v3.0.0)

- `installeur/windows/` : application .NET 10 WinForms `DccSheet.Desktop` — exécutable **single-file auto-contenu** (47,2 Mo, WebView2 embarqué, `Microsoft.Web.WebView2` 1.0.4258.31 MIT) qui lance `php.exe -S 127.0.0.1:8089 -t public` au démarrage (working directory = racine de l'application, donc chemins relatifs), attend la réponse HTTP (poll 200 ms, timeout 20 s), ouvre `http://127.0.0.1:8089/dcc-sheet` dans WebView2, et tue PHP à la fermeture (arbre de processus, **idempotent** : `FormClosing` + `Application.ApplicationExit` + `AppDomain.ProcessExit`).
- `build.ps1` produit les **2 livrables** : `dist/dcc-sheet-setup-3.0.0.exe` (**74,5 Mo**, Inno Setup 6.7.3) et `dist/dcc-sheet-portable-3.0.0.zip` (**84,3 Mo**).
- Instance unique (mutex `Local\DccSheet.SingleInstance`), contrôle d'écriture `data\` au démarrage (message clair si le zip a été extrait en lecture seule), détection VC++ Redistributable, écran d'attente bleu foncé, `PHPRC` pointant sur `php\` (php.ini embarqué : **gd, zip, sqlite3, mbstring**), dossier latéral vide `public\dcc-spells-reader\` servi sur `http://127.0.0.1:8089/dcc-spells-reader`.
- Port 8089 : si `/dcc-sheet` répond déjà → on l'utilise ; si le port est pris par un autre programme → message clair et sortie.
- Installateur **per-user** : `{localappdata}\Programs\dcc-sheet` (aucune élévation, `data\` inscriptible), licence Apache-2.0 affichée (`LicenseFile`), détection du WebView2 Runtime (clé `EdgeUpdate\Clients\{F3017226-…}` machine/utilisateur + dossiers `EdgeWebView\Application`) avec **bootstrapper Evergreen** en secours, tâche « icône bureau » décochée par défaut.
- Icône `app.ico` (16→256 px) régénérable depuis les formes du `favicon.svg` via `make-icon.ps1` (GDI+).
- PHP 8.2.33 x64 copié depuis `D:\VS Code\servers\php` (allègement : phpdbg/cgi/*.lib/snapshot ; **`license.txt` conservé** — PHP License 3.01) ; `LICENSE` Apache-2.0 présent dans le payload.

### Vérifications bloquantes au build

- Aucun fichier/dossier `icons/dcc-pc-tokens` ni `icons/funnel-tokens` (~25 Mo, redistribution interdite — E9) : détection par nom n'importe où dans le payload, **test négatif validé** (le contrôle échoue bien quand un dossier factice est présent).
- Fichiers requis (`DccSheet.exe`, `php\php.exe`, `php\license.txt`, `php\php.ini`, `public\dcc-sheet\index.html`, `api\maps.php`, `api\map-image.php`), `public\dcc-spells-reader\` **vide**, `data\` inscriptible, `php -m` : **gd / zip / sqlite3 / mbstring**.

### Validation (recette étape 6)

- `npm test` : **2214/2214 OK** (inchangé — aucun code applicatif modifié).
- Recette automatisée `installeur/windows/recette.ps1` (5 contrôles : démarrage, HTTP 200 + contenu DCC, `dcc-spells-reader` servi, fermeture WM_CLOSE, php du port 8089 tué + port libre) : **5/5 OK sur × 4 scénarios** — `package\` du build, zip extrait, zip **déplacé** (dossier portable réellement déplaçable, y compris avec espace dans le chemin), application installée.
- Installation silencieuse (`/VERYSILENT`) : fichiers/raccourcis corrects, `dcc-spells-reader\` vide, **0 token interdit**, raccourci bureau absent (tâche décochée par défaut = conforme).
- Désinstallation silencieuse : exécutables, PHP, `index.html` et raccourcis supprimés, **`data\` conservé** (seul résidu : le dossier de données).
- Attention recette : un `php.exe` étranger (`D:\VS_Code_Workspaces\php -S localhost:8000`, serveur de dev) existe sur la machine — `recette.ps1` filtre sur le **port 8089** pour ne pas le confondre avec le nôtre (et ne pas le tuer).
- Non testé ici : exécution réelle du bootstrapper WebView2 (runtime déjà présent sur la machine) et comportement sur un poste sans VC++ Redistributable.

### Documentation

- `installeur/windows/README.md` (prérequis, build, architecture, cycle de vie, licences auditées : .NET/WebView2 MIT, Inno Setup permissif, PHP 3.01, VC++ redistribuable).
- `README.md` : section « Application Windows (installeur / portable) » dans « Installation ».
- `TODO.md` : bloc « Installer et app native windows » soldé ; `.gitignore` : artefacts `installeur/windows/{package,dist,bin,obj}` + bootstrapper.

### Correctif du jour — « URL sans slash » : page sans CSS/JS (installeur ET portable)

- **Symptome rapporté** : l'application s'ouvre mais `index.html` s'affiche **brut** (aucun style, boutons par défaut) ; console : `Failed to load resource: 404` pour `style.css`, tous les `*.js` et `favicon.svg`.
- **Cause** (tracée dans `%LocalAppData%\DCCSheet\php.log`) : la WebView2 naviguait sur `http://127.0.0.1:8089/dcc-sheet` **sans slash final** ; `php -S` répond **200 (index) sans redirection** sur un dossier sans slash → l'URL de base du document devenait `/` → toutes les **références relatives** résolvaient à la racine du docroot (`GET /style.css - No such file or directory`) alors que les fichiers existent bien sous `/dcc-sheet/`.
- **Correctifs** :
  - `PhpServer.AppUrl` = `http://127.0.0.1:8089/dcc-sheet/` (**slash final obligatoire**, commenté dans le code) ; les 3 sondes HTTP (attente démarrage, probe de port) utilisent désormais l'URL complète ;
  - `index.html` : **garde-fou** en tête de `<head>` → redirection vers `…/dcc-sheet/` si la page est ouverte sans slash (test manuel dans un navigateur, qui avait produit les mêmes 404) ;
  - vérification récursive : **toutes** les refs de l'app sont relatives (aucune `/api/…` absolue) ; `../dcc-spells-reader` résout correctement depuis `/dcc-sheet/` → le dossier latéral reste au bon endroit.
- **Recette renforcée** (le contrôle initial ne vérifiait que `GET /dcc-sheet/` = 200, donc l'index seul — d'où la fuite) : 4 **assets statiques** exigés en 200, attente 4 s pour que la page charge, puis lecture de `php.log` : **contrôle positif** « la WebView2 a chargé N assets sous `/dcc-sheet/` » + **0 × 404 js/css/svg** (les 404 de `/dcc-spells-reader` vide sont exclus).
- **Validation après rebuild** : `npm test` **2214/2214** ; recette **10/10** sur `package\` **et** sur le zip portable extrait (**23 assets chargés sous `/dcc-sheet/`, aucun 404**) ; artefacts reconstruits : setup 74,5 Mo + portable 84,3 Mo (11:57).
