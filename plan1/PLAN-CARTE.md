# PLAN — Evolution « Carte » (branche `evol-draw-map`)

> Spec source : `TODO.md` § EVOLUTIONS (« Evolution Carte ») — Maquettes validées : `plan1/maquettes/`
> (sommaire `plan1/maquettes/index.html`, dossier `maquettes/` ignoré par git via `.gitignore`).
> Application de référence à porter : `D:\VS Code\draw-on-map` (`ARCHI.md` = bible du moteur de dessin).
> Décisions prises le 07/10/2026. **Aucune ligne applicative n'est écrite à ce stade.**

---

## 1. Reformulation de la spec

Ajouter à DCC Fiches de Personnage un **module de dessin de carte plein écran**, ouvert
par une icône « carte » placée à gauche de l'icône de thème, reprenant les fonctions de
`draw-on-map`, avec persistance en base et gestion de fonds d'image webp.

| # | Exigence (formulation retenue) |
|---|--------------------------------|
| **R1** | Icône « carte » dans la topbar, **à gauche** de l'icône de thème ; clic = ouverture d'une page de dessin occupant **la totalité de l'écran**. |
| **R2** | Fonctionnalités **identiques à `draw-on-map`** : crayon, gomme (destination-out), texte, déplacer, annuler, palette de 6 couleurs, zoom (−/curseur/+/100 %/ajuster/pincement), défilement, multi-cartes (calques), masquage du chrome, feuilles « Plus / Export / Import / Cartes / Options ». |
| **R3** | Fermeture de la page de dessin par une **croix** (clavier `Échap` en plus). |
| **R4** | Fonctionne **impérativement sur PC et mobile** (tactile, pincement, clavier/souris, redimensionnement, clavier virtuel). |
| **R5** | Import d'une image de fond → stockée dans **`data/maps/[UID].webp`**, `UID` = identifiant unique généré automatiquement. |
| **R6** | Le dessin est **sauvegardé automatiquement en base pendant le geste**, avec l'UID de l'image de fond et son **nom utilisateur** si définie. |
| **R7** | Le **toast de sauvegarde** existant (`showToastSave`, 💾) signale chaque sauvegarde effectuée pendant le dessin. |
| **R8** | Export / import JSON **par calque de carte** depuis l'application, et **pour tous les calques** via « Exporter tout (JSON) » / « Importer tout (JSON) ». |
| **R9** | Si un fond existe, l'export devient un **ZIP** = JSON + images de fond utilisées. « Importer tout » accepte **un JSON complet ou un ZIP** de ce format. |
| **R10** | L'**UID de chaque image** est stocké **en base** et présent dans les **exports/imports JSON**. |
| **R11** | À l'import, image introuvable par son UID → **toast d'erreur** + **aucune image de fond** (grille par défaut conservée). |
| **R12** | Suppression d'une carte → **suppression de l'image de fond associée** dans `data/maps/`. |
| **R13** | Fermeture puis réouverture du module → **retrouver outil / couleur sélectionnés, niveau de zoom et position dans la carte** ; le tout stocké **en base**. |

---

## 2. Arbitrages validés (07/10/2026)

| # | Sujet | Décision |
|---|-------|----------|
| **A1** | Stockage des images | **`data/maps/[UID].webp`** (sous-dossier de `data/`, séparé de `dcc.db`), servi **via PHP** (`api/map-image.php`) avec contrôle de session. Aucun accès direct HTTP : pas d'énumération possible, suppression centralisée. |
| **A2** | État de l'interface | **Mixte** : outil / couleur / taille de police / gras = préférences **globales du compte** ; zoom + position de défilement = **par carte** (chaque carte reprend exactement là où elle a été laissée). |
| **A3** | ZIP | **`ZipArchive` côté serveur** (PHP) : l'export est construit et streamé par le serveur (les images ne sont pas re-téléchargées côté client), l'import reçoit le ZIP en un POST et extrait côté serveur. **Aucune nouvelle dépendance JS.** |

Décisions complémentaires (imposées par la cohérence technique) :

| # | Sujet | Décision |
|---|-------|----------|
| **D1** | Nom du calque | « carte » = **calque** = une ligne de la table `maps`. Le tiroir « Cartes » de `draw-on-map` devient la liste des calques persistés. |
| **D2** | Format du dessin | JSON **`v:3`** (étendu : `bg.uid`, `bg.name`, `ui`). `parseModel` accepte aussi le `v:2` de `draw-on-map` (`bg` = nom de fichier) → import possible d'un ancien export, mais **sans UID = image introuvable → R11 s'applique**. |
| **D3** | Nom de l'image | `bg_name` = **nom de fichier d'origine** (`plan-du-donjon.webp`), conservé en base et dans les exports (R6/R10) mais **ni affiché ni modifiable** dans l'interface (arbitrage du 07/10 : « aucun intérêt d'afficher le nom, ni de pouvoir le renommer »). |
| **D4** | Format d'entrée | `accept="image/webp,image/*"` : **png / jpg / jpeg / webp acceptés**, tout est **converti en webp** côté serveur (GD : `imagecreatefrompng|jpeg` → `imagewebp`, qualité 85) ; un webp est stocké tel quel. La conversion **efface les métadonnées EXIF** (dont le GPS des photos). Replis si GD ou le support webp est absent : conversion **côté navigateur** (`canvas.toBlob('image/webp', 0.85)`) avant upload, sinon refus avec message explicite. |
| **D5** | Visibilité de l'icône | **Utilisateur connecté uniquement** (le module sauvegarde en base : `api/*` exige une session). Les invités ne voient ni l'icône ni le module (comme le menu utilisateur). |
| **D6** | Thème | Le module réutilise les **variables CSS de `style.css`** (`data-theme` clair/sombre) : pas de thème propre, la bascule existante s'applique. |
| **D7** | Toasts du module | Le snackbar interne de `draw-on-map` est **remplacé par `window.showToast` / `window.showToastSave`** (R7) ; `showToast` est étendu de façon **rétrocompatible** avec une action optionnelle (« Annuler » du « Effacer tout le dessin »). |
| **D8** | Import « tout » | Comportement existant conservé (**remplacement complet**) : personnages **et calques** remplacés, après confirmation modale. |
| **D9** | Image partagée | Un même `UID` ne peut être référencé que par **une seule carte** ; le fichier image n'est supprimé que si **plus aucune carte** ne référence cet UID (garde-fou par comptage). |
| **D10** | Pompage de `draw-on-map` | Le moteur est **repris quasi tel quel** (invariants `ARCHI.md` § 10), dans un IIFE `map-draw.js`, avec **préfixe `md-` sur tous les ids DOM** pour éviter toute collision avec `script.js` (`#toast`, `#app`, `#status`, `#bg`…). |
| **D11** | Remplacement d'un fond | **Nouvel UID à chaque import** : la nouvelle image est stockée dans `data/maps/[nouvel-UID].webp`, la carte bascule dessus, puis **l'ancien fichier est supprimé** (comptage de références, D9). On **n'écrase jamais** un fichier sous un UID existant : (a) l'`<img>` pointe sur `api/map-image.php?uid=…` — même URL = image périmée servie par le cache ; (b) un UID dont le contenu change casse R10 (exports/imports non reproductibles). Le dessin existant est **recalé proportionnellement** (`resizeScene`, comportement `draw-on-map`) et sauvegardé. |
| **D12** | Limite de calques | **10 cartes maximum par compte**. Au-delà, la création est refusée côté serveur (`create` → erreur 409) **et** le clic sur « Nouvelle carte » affiche : *« Limite de 10 cartes atteinte — supprimez-en une pour en créer une nouvelle. »* Le bouton reste **cliquable** (un bouton grisé ne pourrait pas afficher le message — arbitrage du 07/10 au vu des tests) et porte `aria-disabled` tant que la limite est atteinte. |
| **D13** | Import au-delà de 10 | Un import « tout » qui contient plus de 10 calques **importe les 10 premiers** et signale les autres dans un **toast d'erreur listant les calques écartés** (plutôt qu'un échec total : un fichier de sauvegarde doit rester restaurable). *À valider : alternative = refus intégral de la partie cartes.* |
| **D14** | Concurrence multi-onglets | **Le dernier écrit gagne**, sans verrou applicatif. **Aucun risque de corruption** : SQLite en mode WAL écrit par transactions atomiques (la base reste cohérente même en cas de crash). Le risque réel est une **perte d'écriture** si deux onglets modifient **la même** carte (le `save` écrit le tableau `ops` complet) ; deux cartes distinctes ne se gênent pas. Mesures : `busyTimeout(5000)` posé **avant tout pragma** dans `getDB()` (un `PRAGMA journal_mode=WAL` échoue sinon en Fatal error sur un verre — constaté et corrigé le 07/10), `journal_mode=WAL` non bloquant, `UPDATE` par calque uniquement, documenté dans `MANUAL.md`. |
| **D15** | Nom de la carte à l'import d'un fond | Si la carte porte encore son **nom généré** (« Carte N » ou vide), elle est **automatiquement rebaptisée** avec le nom du fichier image **sans son extension** (`plan-du-donjon.png` → `plan-du-donjon`). Un nom déjà personnalisé (par l'utilisateur ou par un fond précédent) n'est **jamais écrasé** (heuristique `/^Carte \d+$/i` — demande du 07/10). |
| **D16** | Entrée unique « image de fond » | **Une seule entrée**, dans la feuille du calque : « **Choisir une image de fond** » (charge **ou** remplace) et « **Retirer l'image de fond** » (inactive sans image). Le bloc image est **retiré d'« Options de la carte »** (qui garde nom + suppression du calque) — arbitrage ergonomique du 07/10 : « deux entrées pour la même fonction, c'est bizarre », et l'image appartient au flux de dessin (1 tap) plutôt qu'à la gestion de la carte (2 taps). |
| **D17** | Grille « infinie » (carte sans image) | La scène **grandit** pour toujours couvrir la zone visible **+ 1 écran de réserve** (sinon aucun défilement possible) et le dessin + marge — effet **papier quadrillé** : la grille remplit l'écran à tout zoom. Origine fixe en haut-gauche, croissance à droite/bas uniquement (le défilement ne peut pas être négatif : aucune coordonnée négative). `w/h` d'export = zone explorée. **« Ajuster à l'écran »** cadré sur le **dessin** (bbox + marge), 100 % si carte vide, l'image si fond présent — sans quoi zoom et croissance se nourriraient l'un l'autre (boucle). Les `w/h` d'un import deviennent un **minimum**. |
| **D18** | Réglage du zoom sur PC | **Réglette verticale permanente** sous le chip de zoom (mapping log 5–800 %, même échelle que le curseur du menu « Plus ») : la souris règle le zoom sans passer par la feuille « … ». Masquée sur les écrans tactiles (`@media (pointer: coarse)`) où **pincement + chip** suffisent. Les deux réglettes restent synchronisées. Rendu = curseur **horizontal pivote à -90°** (centrage du curseur garanti, aucune propriété expérimentale — le slider vertical natif ne se centre pas de façon fiable, et sa valeur d'`appearance` est dépréciée). |

---

## 3. Architecture cible

```
dcc-sheet/
├── index.html            + icône « carte » dans .topbar + <script src="map-draw.js">
├── style.css             + section « Module Carte » (chrome, dock, feuilles, grille)
├── script.js             ~ showToast(action), export/import « tout » (+ maps, zip), ouverture du module
├── map-draw.js           ← NOUVEAU : moteur de dessin (port de draw-on-map/index.js)
├── api/
│   ├── db.php            ~ tables maps + colonne users.map_prefs
│   ├── maps.php          ← NOUVEAU : CRUD calques, prefs UI, export_zip, import_all
│   └── map-image.php     ← NOUVEAU : upload / service / suppression des images
├── data/
│   ├── dcc.db
│   └── maps/             ← NOUVEAU : [UID].webp (ignoré par git)
└── tests/15-map-draw.test.js … (scénarios jsdom)
```

```
      topbar ──── [ 🗺 btn-carte ] [ ☾ thème ]
                      │ clic (utilisateur connecté)
                      ▼
      ┌────────── #map-module (position:fixed; inset:0; z-index:3000) ─────────┐
      │  #md-top : [mode+statut] ………… [calques] [zoom] [ X fermer ]            │
      │  #md-stage : #md-viewport > #md-scene > <img #md-bg> + <canvas #md-cv>  │
      │  #md-bottom : palette / composer / dock (7 actions)                     │
      │  <dialog> : moreDlg, exportDlg, importDlg, mapsDlg, mapDlg (préfixés)   │
      └────────────────────────────────────────────────────────────────────────┘
                      │ fermeture (X / Échap) → saveCur() + sauvegarde DB
                      ▼
                retour à l'application (aucun rechargement)
```

---

## 4. Modèle de données

### 4.1 SQLite (ajouts dans `api/db.php`)

```sql
CREATE TABLE IF NOT EXISTS maps (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id     INTEGER NOT NULL,
    name        TEXT    NOT NULL DEFAULT 'Carte',
    data        TEXT    NOT NULL DEFAULT '{"v":3,"w":0,"h":0,"ops":[]}', -- dessin
    ui          TEXT    NOT NULL DEFAULT '{}',   -- {zoom,left,top}  (A2 : par carte)
    bg_uid      TEXT    NOT NULL DEFAULT '',     -- UID de l'image (R10), '' = aucun fond
    bg_name     TEXT    NOT NULL DEFAULT '',     -- nom utilisateur (D3)
    created_at  TEXT    DEFAULT (datetime('now')),
    updated_at  TEXT    DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
-- + index : CREATE INDEX IF NOT EXISTS idx_maps_user ON maps(user_id);

-- users : nouvelle colonne (même pattern que team_notes / marching_order / team_state)
ALTER TABLE users ADD COLUMN map_prefs TEXT NOT NULL DEFAULT '{}';
-- map_prefs = {"tool":"pen","color":"#2563eb","size":24,"bold":false,"drawMode":true,
--              "active_map":12}
```

Migrations : `CREATE TABLE IF NOT EXISTS` + `try/catch ALTER` (pattern existant de `db.php`).
À ajouter dans `getDB()` : `$db->busyTimeout(5000)` (équiv. `PRAGMA busy_timeout`) — évite
les erreurs « database is locked » en cas d'écritures simultanées (D14).

### 4.2 Format `v:3` d'un calque (colonne `maps.data` + export unitaire)

```json
{
  "v": 3, "kind": "dcc-map",
  "w": 1600, "h": 900,
  "bg": { "uid": "3f2b7c1e9a044d5b8c6f2a1d7e5b4c3a", "name": "plan-du-donjon.webp" },
  "ops": [
    { "k": "s", "c": "#2563eb", "w": 7.5, "p": [[100,200],[300,400]] },
    { "k": "e", "w": 32, "p": [[50,50],[120,60]] },
    { "k": "t", "c": "#111827", "x": 30, "y": 400, "s": 32, "b": 1, "t": "Entrée" }
  ],
  "ui": { "zoom": 1.5, "left": 220, "top": 40 }
}
```

- `ops`, `w/h`, arrondis `r1`/`r2`, règle d'épaisseur `w_scene = épaisseur_écran / zoom` :
  **inchangés** (`ARCHI.md` § 2-3). Le JSON reste vectoriel et léger.
- `bg` : **obligatoire dans l'export** (uid + nom) — R10 ; absent d'un `v:2` → `bg.uid = ''`.
- `ui` : optionnel (R13) ; restauré à l'import s'il est présent, ignoré sinon.

### 4.3 Export global (« Exporter tout (JSON) », `version: 2`)

```json
{
  "version": 2, "exported_at": "2026-10-07T…",
  "team_notes": "…", "characters": [ … ], "marching_order": { … }, "team_state": { … },
  "maps": [
    { "name": "Donjon", "w": 1600, "h": 900,
      "bg": { "uid": "…", "name": "plan-du-donjon.webp" },
      "ops": [ … ], "ui": { "zoom": 1.5, "left": 220, "top": 40 } }
  ],
  "map_prefs": { "tool": "pen", "color": "#2563eb", "size": 24, "bold": false, "drawMode": true }
}
```

- Rétrocompatible : un export `version: 1` (sans `maps`) reste importable → `maps` = vide.
- `maps[].bg.uid` = **seule référence à l'image** : le binaire n'est jamais dans le JSON.

### 4.4 ZIP d'export (A3, R9)

```
dcc-export-2026-10-07.zip
├── dcc-export-2026-10-07.json      ← export global complet (§ 4.3)
└── images/
    ├── 3f2b7c1e….webp              ← un fichier par UID référencé et présent sur le serveur
    └── 9c1a44e2….webp
```

Export **par carte** avec fond : même logique (`carte-donjon.zip` = `carte-donjon.json`
`v:3` + `images/[uid].webp`). Un UID référencé mais absent du disque est **omis** et listé
dans `rapport.txt` à la racine du ZIP.

Import : le membre de ZIP doit s'appeler `images/[UID].webp` avec `UID` conforme à
`^[0-9a-f]{8,64}$` (sinon rejeté). Toute image non fournie = **R11**.

---

## 5. API

### 5.1 `api/maps.php` (JSON, `requireLogin`)

| action | entrée | sortie | rôle |
|--------|--------|--------|------|
| `list` | — | `{ok, maps:[{id,name,bg_uid,bg_name,updated_at,ui}]}` | liste des calques du compte |
| `get` | `id` | `{ok, map:{…, data, ui}}` | un calque complet |
| `create` | `name?` | `{ok, map}` | nouveau calque (scène vide) — **refusé au-delà de 10 cartes** (D12) |
| `save` | `id`, `data?`, `ui?`, `bg_uid?`, `bg_name?` | `{ok}` | **sauvegarde auto du dessin (R6)** + état UI (R13) |
| `rename` | `id`, `name` | `{ok}` | renommer un calque |
| `delete` | `id` | `{ok, image_deleted:bool}` | **supprime le calque + l'image orpheline (R12)** |
| `prefs_get` / `prefs_save` | `prefs` | `{ok, prefs}` | outil/couleur/taille/gras globaux (A2) |
| `export_zip` | POST = export JSON (§4.3) | flux `application/zip` | ZIP json + images (A3) |
| `import_all` | POST multipart `file` (.json ou .zip) | `{ok, maps:n, images:n, missing:[uid], skipped:[name]}` | import global (R9) ; **10 calques max** (D13, le reste est signalé dans `skipped`) |

Sécurité : `bg_uid` validé par `^[0-9a-f]{8,64}$`, chemin résolu par `realpath` et vérifié
**contenu dans `data/maps/`** (anti path-traversal), `finfo` sur l'image reçue,
`Content-Disposition: attachment` sur les exports.

### 5.2 `api/map-image.php`

| action | entrée | sortie | rôle |
|--------|--------|--------|------|
| `upload` | multipart `file`, `name?` | `{ok, uid, name}` | génère l'UID (`bin2hex(random_bytes(16))`), convertit en webp (D4), écrit `data/maps/[uid].webp` |
| `get` | GET `?uid=` | `image/webp` (ETag, `Cache-Control: private`) | affichage du fond (contrôle de session) |
| `delete` | `uid` | `{ok}` | suppression (remplacement de fond / carte) |

Erreurs normalisées : 400 (UID/format), 401 (non connecté), 404 (image absente),
409 (**limite de 10 cartes atteinte**, D12), 413 (image trop lourde : `upload_max_filesize`),
500 (data/maps non inscriptible — même garde-fou que `db.php` sur `data/`).

---

## 6. Cycle de vie d'une image de fond (R5, R10, R12)

```
Choisir une image (feuille Plus → « Charger une image de fond »)
  → upload map-image.php → data/maps/[UID].webp   (conversion webp si besoin)
  → state.bg = { uid, name } ; <img src="api/map-image.php?uid=[UID]">
  → resizeScene(dimensions de l'image) + save() → 💾
Remplacer un fond (D11)
  → upload du nouveau → NOUVEL UID → save(bg_uid, bg_name)
  → resizeScene() : le dessin existant est recalé proportionnellement et centré + toast
  → DELETE de l'ancien UID s'il est orphelin (D9) — aucun fichier n'est jamais écrasé
Supprimer une carte (feuille Options → « Supprimer cette carte »)
  → DELETE map row → si plus aucune carte ne cite bg_uid → unlink data/maps/[uid].webp (R12)
« Effacer tout le dessin »
  → ops = [] uniquement : ni l'image ni le fond ne sont touchés (comportement draw-on-map)
Import
  → image retrouvée par UID (ZIP) → ré-écrit dans data/maps/ ; sinon → toast d'erreur + grille (R11)
Compte supprimé (CASCADE)
  → les lignes maps partent ; les images orphelines sont purgées par un nettoyage à l'import
    et par `delete` (purge opportuniste — pas de cron)
```

---

## 7. Module front : port de `draw-on-map`

`map-draw.js` = IIFE `'use strict'` exposant `window.DCCMapDraw = { open, close, isOpen }`.
Reprise du moteur avec les transformations ci-dessous (invariants `ARCHI.md` § 10 **préservés**).

| Partie de `draw-on-map` | Traitement |
|---|---|
| Coordonnées (§2), règle d'épaisseur, `render/drawOp/strokeSetup/applyView` | **repris tel quel** |
| `simplify` (RDP), `r1`/`r2`, `parseModel` (défensif) | **repris tel quel** + lecture `v:3` |
| Machine à pointeurs, pincement, `panBy`, `zoomAt`, `fitToView` | **repris tel quel** |
| `docs[]` multi-cartes (`makeDoc/saveCur/loadDoc/switchTo/createMap/deleteMap/renameMap`) | **repris** mais branché sur l'API `maps.php` (une ligne DB = un `doc`) |
| `loadBackground(file)` | **modifié** : plus de `URL.createObjectURL` → upload serveur + `api/map-image.php?uid=` (R5) ; `state.bg = {uid, name}` |
| `serialize()/parseModel()/applyImport()` | **modifié** : `v:3` (`bg.uid`, `bg.name`, `ui`) + compat `v:2` |
| `toast()` snackbar interne | **remplacé** par `window.showToast` (D7) — le module référence la couche globale |
| `saveCur()` | **modifié** : au-delà du snapshot mémoire, **POST `maps.php?action=save`** (debounce 400 ms comme `AUTO_SAVE_DELAY`) + `showToastSave()` (R6/R7) |
| `state.tool/color/size/bold/drawMode` | **modifié** : lus/écrits dans `users.map_prefs` (A2) |
| `view.zoom`, `scrollLeft/Top` | **modifiés** : stockés dans `maps.ui` par carte (A2/R13) |
| ids DOM (`app, top, viewport, scene, bg, cv, toast, status…`) | **renommés** avec le préfixe `md-` (D10) |
| `<dialog>` `moreDlg/exportDlg/importDlg/mapsDlg/mapDlg` | **repris**, ids préfixés ; fermeture par `[data-close]` + `Échap` |
| Sprite d'icônes SVG (14 symboles) | **repris** (inline dans `map-draw.js`, injecté à l'ouverture) |
| CSS (`index.css`, 18 Ko) | **rapatrié** dans `style.css` (§ « Module Carte »), converti aux variables `dcc-sheet`, `prefers-color-scheme` remplacé par `data-theme` (D6) |
| `test.js` jsdom (74 scénarios) | **réutilisé comme base** des nouveaux tests `tests/15-map-draw.test.js` |

**Nouveautés propres à l'intégration** :
- **Croix de fermeture** (R3) : bouton `md-close` (44 px, en haut à droite du `#md-top`),
  + `Échap` (si aucun `<dialog>` ouvert) + `saveCur()` systématique à la fermeture.
- **Ouverture** : `DCCMapDraw.open()` → récupère `prefs_get` + `maps list` → charge le
  calque `active_map` (ou le premier, ou en crée un) → `layout(); render(); syncZoomUI()`
  avec `maps.ui` (zoom + scroll) → la position demandée par R13 est **immédiatement** visible.

---

## 8. Intégration dans `dcc-sheet`

| Fichier | Modification |
|---|---|
| `index.html` | `<button class="map-toggle" id="btn-carte" title="Cartes & dessin">` **juste avant** `.theme-toggle` ; `<script src="map-draw.js">` avant `script.js` ; meta viewport : ajouter `viewport-fit=cover` (safe-areas iOS) |
| `style.css` | `.map-toggle` (clone de `.theme-toggle`) + section « Module Carte » (chrome superposé, dock, feuilles, grille de repli `is-empty`, `md-close`) |
| `script.js` | `updateAuthUI` : afficher `#btn-carte` seulement connecté (D5) ; `openMapModule()` ; `showToast(message, type, actionLabel?, action?)` (D7, rétrocompatible) ; `exportAllCharacters()` : + `maps` + `map_prefs` puis **branchement ZIP** (POST `export_zip` si au moins un `bg_uid`) ; `importAllCharacters()` : accepte `.json` **et** `.zip` → `import_all`, affiche le rapport (R9/R11) |
| `api/db.php` | table `maps` + colonne `users.map_prefs` (§ 4.1) |

Comportement de la croix : fermer **sans confirmation** (tout est déjà en base grâce à la
sauvegarde auto), laisser l'application dans l'état où elle était (aucun rechargement).

---

## 9. Sauvegarde automatique (R6/R7)

```
mutation du dessin (pointerup, annuler, effacer, texte posé, fond chargé, renommage…)
  → saveCur() mémoire
  → debounce 400 ms → POST maps.php?action=save {id, data:{ops,scene,bg}, ui:{zoom,left,top}}
  → succès : window.showToastSave()   (💾 existant, anti-rebond 600 ms)
  → échec : window.showToast('Erreur de sauvegarde', 'error')

changement de zoom / défilement
  → saveCur() + debounce 1,5 s → POST save(ui)   (pas de toast : trop fréquent)

changement d'outil / couleur / taille / gras
  → debounce 400 ms → POST maps.php?action=prefs_save   (pas de toast)
```

L'API `save` accepte des champs partiels : une sauvegarde de zoom n'ré-envoie pas `ops`.

---

## 10. Export / Import

### Par calque (feuille « Plus » → Exporter / Importer)
- **Exporter** : modale `exportDlg` avec JSON `v:3` (fond = `bg.uid` + `bg.name`, jamais le
  binaire) + boutons *Copier* / *.json* / *Partager* / ** *.zip (avec image)* (visible si
  un fond existe, appelle `export_zip` pour un seul calque).
- **Importer** : `importDlg` accepte **.json et .zip** ; collage JSON possible.
  - image retrouvée (UID présent en base ou fourni dans le ZIP) → fond affiché ;
  - sinon → **toast d'erreur** « Image de fond introuvable (UID …) » + **grille conservée** (R11),
    le dessin est quand même importé ;
  - fond déjà présent + UID différent → remplacement (l'ancienne image est purgée si orpheline).

### Global (menu utilisateur)
- **Exporter tout (JSON)** : construit l'export `version: 2` (§ 4.3). Si **aucun** `bg_uid`
  → téléchargement `.json` (comportement actuel). Sinon → POST `export_zip` → téléchargement
  `.zip` + toast « Export réussi (… persos, … cartes) ».
- **Importer tout (JSON)** : `accept=".json,.zip,application/zip"`.
  - `.json` → chemin actuel + `maps` + `map_prefs` ;
  - `.zip` → POST `import_all` (multipart) : le serveur lit le JSON, extrait `images/*.webp`
    vers `data/maps/`, insère les calques, répond `{maps, images, missing[]}`.
  - Confirmation modale existante (« remplace tous vos personnages » → **et vos cartes**),
    puis rapport : « Import réussi (4 persos, 3 cartes) » + **toast d'erreur par UID manquant**
    (R11) — le calque est importé, sans fond.

---

## 11. Contraintes PC & mobile (R4)

| Point | Traitement |
|---|---|
| Plein écran | `#map-module { position:fixed; inset:0; z-index:3000; height:100dvh }`, `env(safe-area-inset-*)` sur le chrome haut/bas |
| Tactile | `touch-action:none` sur le canvas, `overscroll-behavior:contain` sur le viewport, `setPointerCapture`, cibles ≥ 44 px (dock 46–48 px en bas = pouce) |
| Pincement | 2 doigts = zoom ancré + translation ; `gesturestart` neutralisé (Safari) ; tracé en cours abandonné |
| Clavier virtuel | `interactive-widget=resizes-content` + `visualViewport.resize` → `layout()` + `render()` (reprise du code `onResize`) |
| Desktop | curseurs (`crosshair` / `move` / `cell`), hover sur les chips, `<dialog>` centrés plutôt qu'en feuille basse (media query existante de `index.css`) |
| Repli | `viewport` meta **sans** `user-scalable` (WCAG 1.4.4) : seul le canvas est non zoomable |
| Perf | bitmap canvas = fenêtre de vue × dpr (jamais scène × zoom) — invariant n° 7 d'`ARCHI.md` |

---

## 12. Accessibilité

`aria-label` sur tous les boutons d'icônes, `role="status"` sur les chips d'état,
`aria-pressed` sur les outils, `:focus-visible` partout, `aria-modal` + piège de focus sur
les `<dialog>`, `Échap` = fermeture (croix toujours visible en tactile), contrastes issus
des variables `dcc-sheet`.

---

## 13. Tests (suite `npm test`, jsdom)

| Fichier | Scénarios |
|---|---|
| `tests/15-map-draw.test.js` | port des 74 scénarios de `draw-on-map/test.js` (épaisseur constante, gomme/composite, zoom ancré, RDP, import `v:2`/`v:3`, multi-cartes) + ids préfixés `md-` |
| `tests/16-map-persist.test.js` | sauvegarde auto (debounce + `showToastSave`), reprise d'état à la réouverture (outil/couleur/zoom/position), `prefs_save`, **limite de 10 cartes** (11ᵉ création refusée + message, D12) |
| `tests/17-map-media.test.js` | upload → `bg.uid`/`bg_name`, **conversion png/jpg → webp** (D4), remplacement (purge de l'ancienne image, nouvel UID), suppression de carte → image supprimée, image introuvable à l'import → toast d'erreur + grille |
| `tests/18-map-export.test.js` | export carte `v:3`, export global `version: 2` + `maps`, branchement ZIP, import `.json`/`.zip`, rapport `missing[]`, rétrocompat `version: 1` |
| manuel | `deploy/start.bat` : PC (Chrome/Firefox) + mobile réel (iOS/Android) : pincement, clavier virtuel, upload, ZIP complet aller-retour |

---

## 14. Lots d'implémentation

| Lot | Contenu | Validation |
|---|---|---|
| **0** | Branche `evol-draw-map`, ce plan, maquettes | maquettes validées |
| **1** | `api/db.php` (maps + map_prefs), `api/maps.php` (CRUD + prefs), `api/map-image.php` (upload/get/delete) | test curl / Postman + `tests/16` (partie API mockée) |
| **2** | `map-draw.js` (moteur), `style.css` § Module Carte, `index.html` (icône + script), ouverture/fermeture par la croix | `tests/15`, rendu identique à `draw-on-map` |
| **3** | Fond d'image : upload → `data/maps/`, affichage, remplacement, suppression à la carte | `tests/17` |
| **4** | Sauvegarde auto + toasts + reprise d'état (outil/couleur/zoom/position) | `tests/16` |
| **5** | Export/import par carte + global (JSON puis ZIP) | `tests/18` + aller-retour manuel |
| **6** | Doc : `MANUAL.md` (§ 9 Dessiner une carte), `JOURNAL.md`, `README.md`, `TODO.md` (bascule en BUGS/TODO), captures (§ 18) | `npm test` vert |

---

## 15. Risques & points de vigilance

1. **Collisions d'ids DOM** entre `draw-on-map` et `dcc-sheet` (`#toast`, `#status`, `#app`,
   `#bg`) → préfixe `md-` systématique (D10) + test `03-modules` qui vérifie l'unicité des ids.
2. **Invariants du moteur** (`ARCHI.md` § 10) : coordonnées en unités de scène, `w_scene =
   épaisseur/zoom`, `source-over` après gomme, un seul pointeur actif, bitmap = vue × dpr.
   Tout écart casse R2.
3. **Tailles d'upload** PHP (`upload_max_filesize`, `post_max_size`) : prévoir le toast 413
   et documenter la valeur conseillée (≥ 16 Mo) dans `MANUAL.md` / `deploy`.
4. **`ZipArchive`** : à vérifier sur l'hébergement cible (`php -m`) ; absence = export JSON
   seul + message explicite (dégradation gracieuse, jamais de blocage).
5. **Conversion webp (GD)** : même dégradation gracieuse (upload refusé avec message clair).
6. **Concurrence multi-onglets** (D14) : « dernier écrit gagne », **aucun risque de
   corruption** (SQLite WAL, transactions atomiques), uniquement une possible perte
   d'écriture entre deux onglets sur la **même** carte — `busyTimeout(5000)` obligatoire,
   comportement documenté dans `MANUAL.md`.
7. **Poids des ops** : la simplification RDP + les arrondis sont la seule protection ;
   ne jamais stocker de pixels (`toDataURL` interdit).
8. **Sécurité des fichiers** : UID impréguessable + service PHP avec session + `realpath`
   dans `data/maps/` + `finfo` = pas d'exécution de code déposé, pas d'énumération.

---

## 16. Traceabilité spec → conception

| Spec | Plan |
|---|---|
| R1 icône à gauche du thème | § 8 `index.html` + maquette 01 |
| R2 fonctions de draw-on-map | § 7 (tableau de port) + maquette 02/03 |
| R3 croix de fermeture | § 7 « Nouveautés » + maquette 02 |
| R4 PC et mobile | § 11 |
| R5 image → `data/…[UID].webp` | § 5.2, § 6 (A1 : `data/maps/`) |
| R6 sauvegarde auto + UID + nom | § 4.2, § 9 |
| R7 toast de sauvegarde | § 9 (D7) |
| R8 export/import par carte et global | § 10 |
| R9 ZIP json + images | § 4.4, § 10 (A3) |
| R10 UID en base et dans les exports | § 4.1–4.4 |
| R11 image introuvable → toast + grille | § 10, § 6 |
| R12 suppression carte → image supprimée | § 6 (D9) |
| R13 reprise outil/couleur/zoom/position en DB | § 4.1 (`map_prefs` + `maps.ui`), § 9 (A2) |

---

## 17. Questions initiales — arbitrées le 07/10/2026

| Question | Arbitrage |
|---|---|
| Nombre de calques | **10 maximum par compte** (D12) : création refusée avec le message *« Limite de 10 cartes atteinte — supprimez-en une pour en créer une nouvelle »*. |
| Import « tout » au-delà de 10 | **10 premiers importés**, les autres listés dans un toast d'erreur (D13) — *alternative refus intégral : à valider*. |
| Concurrence multi-onglets | **Dernier écrit gagne, sans risque de corruption** (SQLite WAL + transactions atomiques) ; seule une perte d'écriture est possible entre deux onglets sur la même carte (D14, `busyTimeout(5000)` + doc). |
| Partage d'une image entre deux cartes | **Interdit** (D9) — chaque image appartient à un seul calque, ce qui simplifie la suppression (R12). |
| Import png / jpg / jpeg | **Converti en webp** à l'upload (GD, qualité 85, EXIF effacé), repli côté navigateur puis refus explicite (D4). |

Reste ouvert (mineur) :

- **Dimension maximale d'une image** : aucun plafond retenu pour l'instant (une image
  très large reste lourde à rasteriser sur mobile). Option à étudier si besoin :
  redimensionnement à l'upload au-delà de 4096 px de plus grand côté.

Précisions tenues pour acquises :

- Ordre des calques : pas de réordonnancement (liste par `updated_at DESC`).
- `active_map` est global au compte : deux appareils = le dernier calque ouvert gagne.
- Import « tout » **remplace** les cartes existantes (D8) : aucun mode fusion.

---

## 18. Captures d'écran attendues (Lot 6)

Convention existante : `captures/*.png`, nom **kebab-case** descriptif, préfixe de
fonctionnalité, référencé dans `MANUAL.md` par
`<img src="captures/…" alt="…" width="380|420">`. Cadrage : mobile = viewport 390 px de
large, desktop = ≥ 1280 px. Fonds de test : `map1.webp` / `map2.webp` de `draw-on-map`.
États UI reproductibles d'une capture à l'autre (outil crayon, couleur bleue, zoom 100 %).

**Requises (11)**

| Fichier | Contenu | Cadrage |
|---|---|---|
| `captures/topbar-icone-carte.png` | Topbar : icône carte **à gauche de l'icône thème**, onglets dessous | mobile |
| `captures/carte-module-mobile.png` | Module plein écran : fond webp + tracés, chrome haut (statut, cartes, zoom, ✕), dock | mobile |
| `captures/carte-module-desktop.png` | Même module en desktop | desktop |
| `captures/carte-grille-vide.png` | Module sans fond : grille de repli + dessin | mobile |
| `captures/carte-feuille-plus.png` | Feuille « Plus » (Vue / Fichier / Affichage / Dessin) | mobile |
| `captures/carte-liste-calques.png` | Tiroir « Cartes » : calques, **UID visibles**, compteur **x/10** | mobile |
| `captures/carte-options.png` | Options : nom, image (nom utilisateur + UID), remplacer/retirer, supprimer | mobile |
| `captures/carte-toast-sauvegarde.png` | Toast 💾 juste après un tracé (R7) | mobile |
| `captures/carte-export-json.png` | Export `v:3` + boutons `.json` / `.zip (avec image)` | mobile |
| `captures/carte-import-erreur-uid.png` | Toast « Image de fond introuvable (UID …) » + grille (R11) | mobile |
| `captures/carte-limite-10.png` | « Limite de 10 cartes atteinte — supprimez-en une… » (D12) | mobile |

**Optionnelles** : `carte-palette-couleurs.png` (tiroir ouvert),
`carte-import-image.png` (fond chargé + toast), `carte-export-zip.png` (contenu du ZIP),
`carte-theme-sombre.png` (module en thème sombre).

**Intégration** : `MANUAL.md` nouvelle § 9 « Dessiner une carte » (§ 9 et 10 actuels → 10 et
11), galerie `README.md` (2–3 images), entrée `JOURNAL.md`. Les `alt` détaillés sont
rédigés à l'intégration.
