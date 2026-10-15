# Plan — Évolution « Référence complète » (contenu optionnel `contentref`)

Branche : `evol-reference` — statut : **plan + maquettes à valider, aucun code applicatif écrit, rien committé.**

## 1. Contexte et objectif

`D:\VS Code\dcc-spells-reader\contentref\` existe (60 fichiers : `4.js…61.js` → `window.DCC_REF_PAGES`,
`anchors-ref.js` → `window.DCC_REF_ANCHORS`, `toc.js` → `window.DCC_REF_TOC`), mais son contenu et son
affichage côté lecteur sont **en cours de développement — rien n'est figé**.
L'évolution dcc-sheet doit donc **consommer ces 3 points d'entrée tels quels, sans les figer ni les
corriger** : si le format change côté lecteur, seule la couche de lecture (`ref-reader.js`) est retouchée.

Objectif : quand `contentref` est déployé à côté de l'app (webapp / Windows) ou embarqué dans
`dcc-content.apk`, proposer une **« Référence » complète** — visionneuse plein écran façon résumé des
classes (chrome `aide-classes.js`), sommaire cliquable en premier, pages en **parchemin infini**
(mécanisme + caches de `spell-reader.js`). Absent → **rien n'apparaît** (ni bouton, ni entrée).

## 2. Décisions validées par la demande (V)

| # | Décision |
|---|---|
| V1 | Détection **1 script** : `contentref/anchors-ref.js` (même pattern que `content/anchors.js` pour les sorts). `toc.js` chargé ensuite, **optionnel avec repli** (liste `Page N` si absent — le lecteur fait déjà ce repli). |
| V2 | Nouveau bouton topbar **« Référence complète » PC uniquement** (masqué ≤ 600 px, comme `.ref-toggle`), **à gauche** du bouton « Référence des classes ». Icône dédiée (propositions § 7, choix à valider R1). |
| V3 | Nouvelle entrée de menu **`data-action="full-ref"` libellée « Référence »**, visible sur **tous les écrans** dès que le contenu est détecté (le menu reste le point d'accès unique sur mobile). |
| V4 | Visionneuse = **chrome `aide-classes`** (`.help-overlay`, header titre/sous-titre/croix, `.help-toc`, Échap, clic fond) + **corps parchemin infini façon sorts** (insertion ordonnée, sentinelles, caches, raccord tableaux). Titre proposé : **« Référence complète »**, sous-titre « Document intégral — sommaire cliquable » (R4). |
| V5 | `content/` et `contentref/` **jamais dans les artefacts publics** (même règle que les tokens) ; déploiement bonus via `gen-spell-content` étendu + `dcc-content.apk` (détail § 6). |
| V6 | Zéro persistance (comme l'aide des classes et les sorts) : état volatil, pas de localStorage, pas de base. |
| V7 | Mobile : **même visionneuse** (responsive existant `@media(max-width:599px)` du viewer, aucune règle à ajouter sauf masquage du bouton topbar). |

## 3. Points validés par l'utilisateur le 15/10 (R)

| # | Décision validée |
|---|---|
| R1 | **Icône A — livre + lignes de texte** (maquette 04) |
| R2 | **« Référence » au-dessus de « Classes »** dans le menu (maquette 05) |
| R3 | Libellés repris tels quels : entrée **« Référence »**, bouton **« Référence complète »** (title/aria) |
| R4 | Titre viewer **« Référence complète »**, sous-titre « Document intégral — sommaire cliquable » (maquette 06) |
| R5 | Réutilisation technique : exposer `openViewer` d'`aide-classes.js` (`DCCClassHelp.openViewer`) |
| R6 | En-têtes de section du sommaire **cliquables** (saut à la 1re entrée de la section) |

## 4. Spécification détaillée (code — après validation, sans commit)

### D1. Nouveau module `ref-reader.js` (pattern `spell-reader.js:13-164`, ~200 lignes)
- `BASE = '../dcc-spells-reader'`, `REF_FIRST = 4`, `REF_LAST = 61` (contigu, **sans trou** — pas de `RANGES`).
- `loadScript(src)` identique (onload/onerror) ; `ensureReady()` : `contentref/anchors-ref.js` →
  `window.DCC_REF_ANCHORS` non vide → `enable()` (`documentElement.classList.add('has-ref-reader')`) puis
  `contentref/toc.js` (échec silencieux → repli) ; **mémorisé** (`readyPromise`, comme les sorts).
- `loadPage(n)` : 1 seul `<script>` par page (`pagePromises[n]`), lit `window.DCC_REF_PAGES[n]`.
- API : `window.DCCRefReader = { ensureReady, isAvailable, openReference, setAnchors }`
  (`setAnchors` = injection de test, miroir de `setAnchors`/`setTranslations` des sorts).
- Appel au démarrage (comme `spell-reader.js:783`) : `ensureReady()` silencieux, aucun fetch bruyant si absent.

### D2. Visionneuse `openReference()` (chrome aide + corps sorts)
- Garde : si indisponible → **rien** (pas de toast : le bouton/l'entrée n'existent pas visuellement).
- TOC depuis `window.DCC_REF_TOC` : `{s}` → en-tête (R6), `{t,d,p}` → `button[data-goto=p]` « titre (p. d) » ;
  repli sans toc : boutons `Page 4…Page 61`.
- `openViewer('Référence complète', 'Document intégral — sommaire cliquable', html, toc)` (R5) avec
  `.help-toc` **visible** (contrairement au résumé de classe) ; clic TOC → `scrollToPage(p)`.
- Corps : conteneur parchemin (sentinelles haut/bas, seuils **800 px**, batch **3**, précharge **p-2…p+5** —
  mêmes constantes que `spell-reader.js:504-541`), `insert(n, html)` ordonné par `data-page`,
  `fixTableContinuations` via `window.DCC_TABLE_CONT.tryFixPair` (déjà embarqué), `document.fonts.ready`
  → recalage. Pages 100 % HTML (`imgDir: null` — aucun fallback image à prévoir).
- Le conteneur des pages porte la classe **`spell-viewer`** (réutilise `.spell-viewer .page:3572-3644`
  + mobile `:4557` de `style.css`, sans le JS du lecteur de sorts — pur réemploi CSS).
- Fermetures : croix, Échap, clic fond (héritées du chrome) ; `body.overflow` restauré.

### D3. Câblage UI (`index.html`, `script.js`, `style.css`)
- Topbar : `<button class="ref-full-toggle" id="btn-ref-full" title="Référence complète" aria-label="Ouvrir la référence complète">` + SVG inline (R1), **à gauche de `#btn-aide`** ; `click → DCCRefReader.openReference()` (garde `window.DCCRefReader`, comme `#btn-aide:2505`).
- Menu : `<button data-action="full-ref">Référence</button>` **au-dessus de `class-ref`** (R2) ; dispatch
  `full-ref → openReference()` (comme `class-ref:2556-2558`).
- CSS : `.ref-full-toggle` (clone `.ref-toggle:248-273`, 36 px → 32 px mobile) ; visibilité conditionnelle
  `html:not(.has-ref-reader) .ref-full-toggle, html:not(.has-ref-reader) #user-menu [data-action="full-ref"]{display:none}`
  (miroir de `html:not(.has-spell-reader) .spell-lookup:3410`) ; `@media ≤600px` : `.ref-full-toggle{display:none}`
  (entrée menu = accès unique, miroir V3) ; `::before` menu (masque SVG data-URI du tracé retenu, 16 px,
  miroir `class-ref:4127-4135`). **Aucune règle viewer** (classes `.help-*` réutilisées telles quelles).

### D4. Cas limites et compatibilité ascendante (ajout du 15/10)
- **Contenu ancien** (`content/` déployé mais `contentref/` absent — ancien zip ou ancien `dcc-content.apk`) :
  l'entrée « Référence » et son bouton **n'apparaissent pas**, **sans erreur console ni toast**.
  Les deux détections sont **indépendantes** (`has-spell-reader` / `has-ref-reader`, deux `readyPromise`
  séparés) : les sorts continuent de fonctionner seuls, comme aujourd'hui.
- `contentref` absent / `anchors-ref.js` 404 → pas de classe `has-ref-reader` → bouton + entrée invisibles,
  **zéro requête supplémentaire** (1 seul `loadScript` en échec, comme les sorts) ; le chemin d'échec ne
  contient **ni `console.error` ni toast** (échec silencieux + `removeChild`, miroir de `spell-reader.js:25-33`).
- `toc.js` absent → sommaire repli `Page 4…Page 61` (même repli que le lecteur).
- Page `N.js` absente ou vide → sautée silencieusement (`nextExistingPage`, jamais de trou visible).
- Android sans APK conteneur **ou conteneur ancien (sans `contentref/`)** : `AssetRouter` répond 404 sur
  `/dcc-spells-reader/contentref/*` → `loadScript.onerror` → invisible (repli déjà codé côté
  `AssetRouter.java:209,269-275` pour les sorts, **aucun changement Java**).

### D5. Tests — nouvelle suite `tests/24-ref-reader.test.js` (~40 contrôles) + `tests/run.js`
- Câblage : bouton `#btn-ref-full` **avant** `#btn-aide` dans la topbar ; entrée `full-ref` avant `class-ref` ;
  sans classe `has-ref-reader` → sélecteurs CSS de masquage présents ; `script.js` contient le dispatch.
- Viewer (jsdom + `DCC_REF_TOC`/`DCC_REF_PAGES` stubés, `openViewer` réel exposé) : titre/sous-titre,
  TOC (sections + boutons `data-goto`), insertion ordonnée, page manquante sautée, Échap/croix/fond ferment,
  `body.overflow` restauré, sans données → rien (garde).
- **Compatibilité (ajout du 15/10)** : cas « sorts présents + `contentref` absent » → `ensureReady()` résout
  indisponible, classe `has-ref-reader` jamais posée, **`console.error` espionné = 0 appel**, aucun toast ;
  cas « les deux présents » → les deux classes coexistent, sorts et référence fonctionnent ensemble.
- `02-css` : ajouter les 3 sélecteurs (bouton, masquage `has-ref-reader`, `::before full-ref`).
- Maquettes : étendre `plan2/maquettes/_check-maquettes.cjs` (04/05/06 + index).

### D6. Builds et déploiement bonus
- `deploy/_gen-spell-content.ps1` : ajouter `contentref/anchors-ref.js` + `contentref/toc.js` +
  `contentref/4…61.js` (58 pages) à la liste explicite ; attente **274 fichiers** (214 + 60), message de sortie
  mis à jour. `gen-spell-content.bat` **inchangé** (simple lanceur).
- `installeur/android-content/_sync-content.mjs` : synchroniser les mêmes 60 fichiers + assertions
  (`anchors-ref` + `toc` présents, `contentref/*.js == 60`, `DCC_REF_PAGES` non vide) ; le préfixe
  `/dcc-spells-reader/` est **déjà** dans l'allowlist (`DccContentProvider.java:40-44`, `AssetRouter.java:182-210`)
  → **aucun changement Java/Kotlin**.
- Webapp / Windows : **aucun changement** (`_build.ps1` ne copie jamais le frère ; `build.ps1` exige le
  latéral `public\dcc-spells-reader` **vide** — le bonus s'y dézippe au déploiement, comme le zip sorts actuel).
- `recette.ps1` : inchangée (le GET `/dcc-spells-reader` tolère déjà 200-ou-404).

### D7. Docs (avec le code, sans commit)
- MANUAL : nouveau **§ 9c « Référence complète »** (adossé au § 9b, même logique que 9b/§ 9 — pas de renumérotation),
  + TOC, + mention disponibilité optionnelle ; README : entrée fonctionnalités + (si capture retake) galerie ;
  JOURNAL : entrée `evol-reference` ; TODO : cocher l'évolution.

## 5. Fichiers (état final visé, tous non committés jusqu'au feu vert)

| Fichier | Action |
|---|---|
| `plan2/PLAN-REFERENCE.md` | **ce plan** (à valider) |
| `plan2/maquettes/04-topbar-bouton-ref.html` | maquette bouton + 2 icônes candidates (à valider R1) |
| `plan2/maquettes/05-menu-reference.html` | maquette entrée « Référence » (ordre à valider R2) |
| `plan2/maquettes/06-viewer-reference.html` | maquette viewer (TOC + parchemin, libellés R3/R4/R6) |
| `plan2/maquettes/index.html`, `_check-maquettes.cjs` | 3 cartes + contrôles |
| `ref-reader.js` (new), `index.html`, `script.js`, `style.css` | code après validation |
| `aide-classes.js` | +1 ligne : exposer `openViewer` (R5) |
| `tests/24-ref-reader.test.js`, `tests/run.js`, `tests/02-css.test.js` | tests après validation |
| `deploy/_gen-spell-content.ps1`, `installeur/android-content/_sync-content.mjs` | contenu bonus après validation |
| `MANUAL.md`, `README.md`, `JOURNAL.md`, `TODO.md` | docs après validation |

## 6. Ordre d'exécution (après validation R1–R6)
1. Code `ref-reader.js` + câblage + CSS (sans commit).
2. Tests 24 + run complet (avec `PHP_BIN`, comme v3.4).
3. `gen-spell-content` + sync conteneur (vérification locale des 60 fichiers, **sans rebuild d'APK** sauf demande).
4. Docs. 5. Relecture + présentation pour feu vert (commit/push/release = étapes séparées, hors périmètre).

## 7. Icônes candidates (détail pour R1, visibles en maquette 04)

- **A (recommandée) — livre + lignes de texte** : même tracé livre que `#btn-aide`, + 2 traits intérieurs
  (`M7.5 8.5h3 M13.5 8.5h3` style) = « le même livre, en bien plus complet ». Topbar : SVG inline stroke 1.8 ;
  menu : masque data-URI du même tracé (16 px).
- **B (alternative) — bibliothèque** : 3 dos de livres + 2 étagères
  (`M4 20h16 M4 4h16 M7 4v16 M12 5v15 M17 6v14` style) = « collection ». Même technique.
