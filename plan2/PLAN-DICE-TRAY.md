# PLAN — Evolution « Dice Tray » (branche `evol-dice-tray`)

> Spec source : demande du 13/10/2026.
> Application de référence à porter : `D:\VS Code\dice-box-dcc`
> (`INTEGRATION.md` = guide d'intégration de l'auteur, `NOTICE.md` = licences).
> Maquette UI de l'auteur (référence IHM, non livrée) : `dice-box-dcc/maquette.html`.
> Arbitrages V1–V5 **validés par l'utilisateur le 13/10/2026** (§ 7).
> **MAJ 13/10/2026 (rev. son)** : le projet source a ajouté après la v1 du plan
> un module sonore (`js/sound.js`, bouton `#soundBtn`, commits `2625309`/`c03c3a2`,
> build `20261013d`). Le présent plan intègre ce delta (§§ R7, C4, C6, 4.5, 5, V6) :
> son **porté à l'identique, persistance `localStorage['dicebox.sound']` conservée** (validé le 13/10/2026 — même régime que `dcc-theme`, OK Windows WebView2 et APK WebView).
> **Aucune ligne applicative n'est écrite à ce stade** — la maquette HTML de la
> nouvelle interface sera créée après validation du présent plan.

---

## 1. Reformulation de la spec

| # | Exigence (formulation retenue) |
|---|--------------------------------|
| **R1** | En **mode mobile / Android** (≤ 600 px), les boutons topbar « Changer de thème » (`#btn-theme`) et « Référence des classes » (`#btn-aide`) **quittent la topbar** et deviennent des entrées du **menu utilisateur**, placées **au-dessus** de l'entrée existante « Changer de thème » (sélecteur de couple de couleurs). Le masquage vaut **pour tous, invités compris** (validé V3) : les invités n'ont donc aucun accès à ces deux fonctions sur mobile. |
| **R2** | Ajouter dans la topbar un bouton **« Dés »**, doté d'une **icône de dé** dans le style des icônes de la webapp (SVG inline, trait `currentColor`, cercle comme `.map-toggle`), placé **immédiatement à gauche** du bouton « Cartes & dessin ». |
| **R3** | Le bouton « Dés » ouvre un **dice tray plein écran**, selon **le même principe que les autres fenêtres plein écran** de la webapp (overlay `position:fixed`, **bouton fermer en haut à droite**, fermeture aussi par `Échap`). |
| **R4** | Le dice tray est un **portage à l'identique** de `D:\VS Code\dice-box-dcc` : **aucune dépendance** avec ce projet (pas de sous-module git, pas de lien), **tous les fichiers nécessaires sont intégrés** dans dcc-sheet. |
| **R5** | Le tapis est **vide par défaut** à l'ouverture (aucun dé, contrairement à la démo de démarrage du projet source). |
| **R6** | À la **fermeture**, le module est simplement **masqué** : en le rouvrant, on retrouve **exactement l'état avant fermeture** (dés sur le tapis, positions, valeurs affichées). |
| **R7** | **Aucune persistance** : rien en base, rien dans les exports JSON, rien dans le `localStorage` — **y compris la préférence son** (seule persistance locale autorisée : la préférence muet du `SoundBank` (`localStorage['dicebox.sound']`, régime identique à `dcc-theme`). L'état du tapis vit **en mémoire** tant que la page reste ouverte. |
| **R8** | Fonctionne sur **PC et mobile** (souris, tactile, glisser-déposer, lancer à l'élan, redimensionnement). |

---

## 2. Arbitrages

### 2.1 Parti 1 — Boutons topbar déplacés dans le menu utilisateur (R1)

| # | Sujet | Décision |
|---|-------|----------|
| **A1** | Mécanisme de masquage mobile | **CSS pur**, conformément à la convention de la webapp (aucune détection JS de mobile n'existe) : `@media (max-width: 600px)` masque `.theme-toggle` et `.ref-toggle`. |
| **A2** | Cas des invités | Le masquage mobile est **inconditionnel** : les deux boutons topbar sont retirés à ≤ 600 px **y compris pour les invités**, qui n'ont donc plus accès à la référence des classes ni à la bascule de thème sur mobile (choix validé V3). **Conséquence technique : aucun attribut `data-auth` n'est nécessaire — `renderAuthUI()` reste inchangé.** |
| **A3** | Nouvelles entrées du menu | Deux `<button data-action>` insérées **au-dessus** de l'entrée « Changer de thème » : **« Référence des classes »** (`data-action="class-ref"` → `DCCClassHelp.openFull()`) et **« Mode clair / sombre »** (`data-action="toggle-theme"` → `toggleTheme()`, libellé mis à jour dynamiquement ☾/☀ comme la pastille topbar). |
| **A4** | Icônes des entrées | Même technique que l'entrée existante : `::before` en CSS. « Référence des classes » = petit livre en SVG data-URI (reprise du tracé de `#btn-aide`) ; « Mode clair / sombre » = disque jour/nuit (moitié pleine, même esprit que le conic-gradient de l'entrée « Changer de thème »). |
| **A5** | Libellé de l'entrée bascule | Le bouton topbar déplacé s'appelle **« Mode clair / sombre »** pour ne pas le confondre avec l'entrée existante « Changer de thème » (sélecteur de couple), qui conserve son libellé. *(Validé V1.)* |

### 2.2 Parti 2 — Bouton « Dés » (R2)

| # | Sujet | Décision |
|---|-------|----------|
| **B1** | Nature du bouton | Pastille ronde **clonée de `.map-toggle`** (cercle 36 px → 32 px ≤ 600 px, fond `rgba(255,255,255,.1)`, cible tactile +4 px), **nouvelle classe `.dice-toggle`**, id `#btn-des`, `title="Dés"`. |
| **B2** | Icône | **SVG inline** dans `index.html`, dans le langage exact des icônes topbar existantes : `viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" round` — un dé cubique en perspective avec 3 points (pips). |
| **B3** | Position | Dans `index.html`, **immédiatement avant** `#btn-carte` (ordre desktop : `#btn-aide` · `#btn-des` · `#btn-carte` · `#btn-theme`). |
| **B4** | Visibilité | **Tous les utilisateurs, invités compris** : le dice tray n'a besoin d'aucune session (aucune écriture en base, voir R7), contrairement au module Carte. Pas de `style="display:none"` conditionnel. *(Validé V2.)* |

### 2.3 Parti 3 — Portage du dice tray (R3, R4, R6, R7)

| # | Sujet | Décision |
|---|-------|----------|
| **C1** | Mode d'intégration | **Intégration directe** (conteneur `#dice-module` injecté), **et non `<iframe>`**. Motifs : R3 exige le *même principe que les autres fenêtres plein écran* (croix dans le style de l'app, pile `z-index`, `Échap`, thème `data-theme`) ; l'iframe isolerait le CSS mais empêcherait ce chrome unifié. Le risque CSS est maîtrisé par C4. |
| **C2** | Emplacement des fichiers | Dossier **`dice/`** à la racine de dcc-sheet. ⚠ Le dossier source `vendor/` est **interdit par le build Android** (`installeur/android/_sync-assets.mjs` exclut tout segment `vendor`) : les 3 fichiers three.js partent dans **`dice/lib/`** et les imports `../vendor/...` des 3 modules sont adaptés. |
| **C3** | Préfixe d'ids | Tous les ids du dice tray sont **préfixés `dice-`** (`dice-tray`, `dice-picker`, `dice-stage`, `dice-total`, `dice-rollBtn`, …), sur le modèle du préfixe `md-` du module Carte (précédent D10, recommandé par `INTEGRATION.md`). Le `id="blayer"` de `tray.js` devient `dice-blayer`. |
| **C4** | CSS | Porté dans **`dice/dice.css`**, chargé par `<link>` dans `index.html` (le test `02-css` ne contrôle que `style.css` — pas de lien direct). **Tous les sélecteurs sont scopés sous `#dice-module`** ; les règles globales du source (`html,body{}`, `body{overflow:hidden; 100dvh; user-select:none}`, `[hidden]{display:none!important}`) sont **supprimées ou scopées** ; la classe `.row` du modal d'aide (conflit avec `.row` de `style.css:1181`) est renommée `.dice-row`. Les règles `#helpBtn,#soundBtn` sont scopées (`#dice-module …`) et leurs ids préfixés (`dice-helpBtn`, `dice-soundBtn`, positions gauche/droite conservées) ; `#toast` → `dice-toast`. Le tapis conserve la palette sombre d'origine (feutrine) : le module **n'hérite pas** des variables du thème, seul le chrome oui (voir C9). |
| **C5** | Chargement du moteur | **Lazy-loading** : le moteur 3D (three.js = 1,85 Mo) n'est chargé qu'**à la première ouverture** du dice tray, via `import('./dice/app.js')` (dynamic import, modules ES déjà servis en `text/javascript` par tous les serveurs de l'app). Aucun coût au démarrage de la webapp. |
| **C6** | Fermeture / état (R6, R7) | **Masquage seul** (`moduleEl.hidden = true`) + **pause de la boucle de rendu** (`renderer.setAnimationLoop(null)`) pour ne pas consommer CPU/batterie **+ suspension de l'`AudioContext` du `SoundBank`** (`ctx.suspend()`, reprise au `resume()`). Les dés, positions et valeurs restent **en mémoire JS**. Réouverture : `hidden = false` + reprise de la boucle + `resize()`. **Zéro persistance** : pas de `localStorage` hors préférence son `dicebox.sound` (voir R7), pas d'appel `api/*`, pas d'écriture dans les JSON d'export/import. |
| **C7** | Tapis vide (R5) | Suppression des 3 lignes de **démo de démarrage** de `app.js` (`addDie(D20/D6/D8)`) et du **bandeau `#fileHint`** (inutile : dcc-sheet est toujours servi en http(s)). |
| **C8** | Fallback | Si le `import()` échoue ou si WebGL est indisponible : **`showToast` d'erreur** (« Dés 3D indisponibles sur ce navigateur ») + fermeture propre du module. L'échec n'est pas mémorisé (l'utilisateur peut réessayer). |
| **C9** | Thème | Le chrome du module (header, croix, barre d'actions) réutilise les **variables CSS de l'app** (`--header-bg`, `--bg`, `--line`, …) comme `#map-module` : le dice tray suit donc le thème clair/sombre. La **feutrine et les dés gardent leur identité visuelle d'origine** (portage à l'identique). *(Validé V4.)* |
| **C10** | `Échap` | Comportement source conservé : `Échap` ferme d'abord la **modale d'aide des gestes**, puis le module (comme `#map-module` gère ses raccourcis). |
| **C11** | Licences (obligatoire) | Copiés dans `dice/lib/` : `THREE-LICENSE.txt` (MIT, three.js r186) ; en-tête de crédit **dicebox (SOND LecT, MIT)** conservé dans `dice/solids.js` ; mention des licences ajoutée à `README.md` et `MANUAL.md`. `LICENSE` du projet source (MIT, © 2026 Bruno) recopié en `dice/LICENSE`. `dice/sound.js` (synthèse Web Audio maison, zéro asset) est couvert par le même MIT applicatif, sans crédit tiers supplémentaire. |
| **C12** | Guides source | `INTEGRATION.md`, `PLAN.md`, `TODO.md`, `maquette.html`, `deploy/` du projet source **ne sont pas copiés**. |

---

## 3. Architecture cible

```
dcc-sheet/
├── index.html          + #btn-des (SVG dé) avant #btn-carte
│                       + 2 entrées menu utilisateur (au-dessus de « Changer de thème »)
│                       + <link href="dice/dice.css"> et <script src="dice-tray.js">
├── style.css           + section « Bouton Dés / entrées menu » (.dice-toggle, media queries,
│                       ::before des entrées )
├── script.js           ~ dispatch menu (class-ref, toggle-theme),
│                       init() : branchement #btn-des
├── dice-tray.js        ← NOUVEAU : module IIFE, window.DCCDiceTray, overlay #dice-module
├── dice/
│   ├── dice.css        ← porté de css/style.css, scopé sous #dice-module
│   ├── config.js       ← inchangé (table DICE, constantes)
│   ├── rng.js          ← inchangé (tirage crypto équitable)
│   ├── total.js        ← inchangé (total + règle percentile)
│   ├── sound.js        ← porté, persistance localStorage conservée (R7)
│   ├── solids.js       ← inchangé (géométrie des 14 dés) + crédit dicebox
│   ├── textures.js     ← inchangé (atlas canvas)
│   ├── dice3d.js       ← ~ import three : ../lib/ …
│   ├── thumbs.js       ← ~ import three : ../lib/ …
│   ├── tray.js         ← ~ import three : ../lib/ … , id blayer → dice-blayer,
│   │                       + pause()/resume() (C6), garde resize 0 (masqué)
│   ├── app.js          ← ~ export initDiceTray(root, opts) au lieu du boot auto,
│   │                       ids préfixés dice-, démo supprimée (C7), Échap remonté
│   ├── LICENSE         ← MIT (projet dice-box-dcc)
│   └── lib/
│       ├── three.module.min.js   (three.js r186, MIT)
│       ├── three.core.js         (noyau three.js r186, MIT)
│       └── THREE-LICENSE.txt
└── tests/23-dice-tray.test.js   ← NOUVEAU : coquille DOM, bouton, ouverture/fermeture,
                                    masquage (hidden), aucune persistance
```

```
      topbar ──── [ 🎲 btn-des ] [ 🗺 btn-carte ] [ ☾ thème ]     (desktop)
                  [ 🎲 btn-des ] [ 🗺 btn-carte ]     (mobile : thème/aide → menu si connecté, perdus si invité)
                      │ clic
                      ▼
      ┌────────── #dice-module (position:fixed; inset:0; z-index:3000; 100dvh) ──┐
      │  #dt-top : [🎲 Tapis de dés]  …………………………………………  [ X fermer ]   (thème app) │
      │  #dice-pickerBar > #dice-picker        (14 dés, miniatures 3D)            │
      │  #dice-stage > #dice-frame > #dice-tray (feutrine + canvas WebGL + badges)│
      │  #dice-actionbar : [🗑 Vider] [Total] [🎲 Lancer]                         │
      │  #dice-helpModal (gestes)                                                 │
      └───────────────────────────────────────────────────────────────────────────┘
                      │ fermeture (X / Échap) → hidden + pause boucle de rendu
                      ▼
                état conservé en mémoire → réouverture = même tapis
```

---

## 4. Détail des modifications par fichier

### 4.1 `index.html`

1. Dans `.topbar`, **avant** `#btn-carte` :
   ```html
   <button class="dice-toggle" id="btn-des" type="button" title="Dés"
           aria-label="Ouvrir le tapis de dés">
     <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
       <rect x="3.5" y="3.5" width="17" height="17" rx="4"/>
       <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" stroke="none"/>
       <circle cx="15.5" cy="15.5" r="1.2" fill="currentColor" stroke="none"/>
       <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/>
     </svg>
   </button>
   ```
2. Dans `#user-menu`, **au-dessus** de `<button data-action="change-theme">` :
   ```html
   <button data-action="class-ref">Référence des classes</button>
   <button data-action="toggle-theme">Mode clair / sombre</button>
   ```
3. `<head>` : `<link rel="stylesheet" href="dice/dice.css">` après `themes.css`.
4. Avant `<script src="script.js">` : `<script src="dice-tray.js"></script>` (après `map-draw.js`).

### 4.2 `style.css`

- Section nouvelle (après `.map-toggle`) : `.dice-toggle` = clone de `.map-toggle`
  (y compris `@media (pointer: coarse)` avec `::after { inset:-4px }`),
  `.dice-toggle svg { width:19px; height:19px }`.
- `@media (max-width: 600px)` : `.dice-toggle { width:32px; height:32px }` (avec `.theme-toggle`).
- `@media (max-width: 600px)` : `display:none` sur `.theme-toggle` et `.ref-toggle`,
  **inconditionnellement** (tous statuts d'authentification, validé V3).
- `::before` des deux nouvelles entrées du menu utilisateur (livre / disque jour-nuit),
  dans le style du `::before` existant de `[data-action="change-theme"]`.

### 4.3 `script.js`

- Dispatch du menu utilisateur : `class-ref` → `DCCClassHelp.openFull()` ;
  `toggle-theme` → `toggleTheme()` + rafraîchissement du libellé (☾/☀).
- `init()` : branchement `#btn-des` → `window.DCCDiceTray.open()` (garde `if (…)`).
- `renderAuthUI()` **inchangé** (le masquage mobile est un pur CSS, validé V3).

### 4.4 `dice-tray.js` (nouveau, IIFE classique)

- `buildDOM()` paresseux (pattern `map-draw.js`) : crée `#dice-module` (`hidden`),
  header `#dt-top` (titre + croix `#dt-close`, styles réutilisés de `#md-close`),
  et la coquille `dice-*` du markup source (§ 5).
- `open()` : construction si besoin, puis **`await import('./dice/app.js')`** une seule fois
  (promesse mémoïsée) → `initDiceTray(moduleEl, { toast: window.showToast })` ;
  ensuite `hidden=false` + `tray.resume()` (C6). En cas d'échec : toast + fermeture (C8).
- `close()` : `hidden=true` + `tray.pause()`, retrait du handler `Échap`.
- `Échap` : ferme d'abord `#dice-helpModal` si ouverte, sinon le module (C10).
- Anti-double ouverture, `window.DCCDiceTray = { open, close, isOpen }`.
- **Aucune persistance, aucun appel réseau** (R7).

### 4.5 Adaptations des fichiers portés dans `dice/`

| Fichier | Adaptations |
|---|---|
| `config.js`, `rng.js`, `total.js`, `solids.js`, `textures.js` | Copie **strictement à l'identique** (modules purs, sans DOM). |
| `sound.js` | Copié puis adapté : lecture/écriture `localStorage['dicebox.sound']` **conservées à l'identique** (voir R7) ; API `SoundBank` inchangée (`unlock/clack/bounce/settle/state/setEnabled`). |
| `dice3d.js`, `thumbs.js` | Uniquement l'import three : `../vendor/…` → `../lib/…`. |
| `tray.js` | Import three ; `blayer.id` → `dice-blayer` ; **`pause()` / `resume()`** (`setAnimationLoop(null)` / rappel **+ `sound.ctx.suspend()/resume()` si présent**) ; `resize()` : ignorer une taille nulle (module masqué). `hooks.sound` reste **optionnel** (`|| null`, comme la source). |
| `app.js` | **Pas de boot auto** : `export function initDiceTray(root, opts)` recevant le conteneur ; tous les `getElementById` deviennent des requêtes scopées `root.querySelector('#dice-…')` ; ids préfixés `dice-` (**y compris `dice-soundBtn`, `dice-helpBtn`, `dice-toast`**) ; son câblé comme la source (`new SoundBank()`, `unlock()` sur gestes **scopés au module**, bouton muet + toast diagnostic via `opts.toast`) ; démo de démarrage **supprimée** (C7) ; toasts redirigés vers `opts.toast` (`window.showToast` de l'app) ; handler `Échap` global **supprimé** (pris en charge par `dice-tray.js`, C10). |
| `css/style.css` → `dice/dice.css` | Scopage sous `#dice-module` ; suppression de `html,body{}` / `body{}` globales ; `[hidden]` scopé ; `.row` → `.dice-row` ; `z-index` du modal d'aide relevé dans l'échelle dcc-sheet ; `100dvh` + `env(safe-area-inset-*)` conservés. |

### 4.6 Tests — `tests/23-dice-tray.test.js` (nouveau)

jsdom ne dispose ni de WebGL ni d'`import()` dynamique : les tests portent sur la
**coquille** (le moteur est encapsulé derrière le try/catch de C8, sans effet de bord).

1. `#btn-des` présent dans `index.html`, **avant** `#btn-carte`, avec un `<svg>`.
2. Deux nouvelles entrées `data-action` dans `#user-menu`, **avant** `change-theme`.
3. `dice-tray.js` et `dice/dice.css` référencés dans `index.html`.
4. `DCCDiceTray.open()` crée `#dice-module` avec `#dt-close` ; `close()` → `hidden === true`.
5. Réouverture : le module **n'est pas reconstruit** (même nœud DOM, état conservé — R6).
6. Aucune écriture `localStorage` / aucun appel `api/` lors d'ouverture/fermeture, **hors bascule muet** (`dicebox.sound`, seule écriture autorisée par R7).
7. `#dice-soundBtn` présent dans la coquille (bascule 🔊/🔇 avec persistance `dicebox.sound`).
7. `node --check` passe sur `dice-tray.js` (les `dice/*.js` ESM ne sont pas scannés par
   `01-syntax` — ils sont dans un sous-dossier).

### 4.7 Documentation (livraison)

- `MANUAL.md` : § nouveau bouton « Dés », gestes, note « l'état du tapis n'est pas
  sauvegardé — il est conservé tant que la page reste ouverte ».
- `README.md` + `JOURNAL.md` : mention du module et des licences
  (three.js MIT r186 — `dice/lib/THREE-LICENSE.txt` ; géométries d'après **dicebox** de
  SOND LecT, MIT — crédit dans `dice/solids.js`).
- `TODO.md` : évolution « Dice Tray » cochée.

---

## 5. Portage — correspondance source → cible

| Source `dice-box-dcc/` | Cible `dcc-sheet/` | État |
|---|---|---|
| `js/config.js` | `dice/config.js` | identique |
| `js/rng.js` | `dice/rng.js` | identique |
| `js/total.js` | `dice/total.js` | identique |
| `js/solids.js` | `dice/solids.js` | identique (+ crédit dicebox conservé) |
| `js/textures.js` | `dice/textures.js` | identique |
| `js/sound.js` | `dice/sound.js` | identique (localStorage conservé, R7) |
| `js/dice3d.js` | `dice/dice3d.js` | import three adapté |
| `js/thumbs.js` | `dice/thumbs.js` | import three adapté |
| `js/tray.js` | `dice/tray.js` | import + `pause()/resume()` (+ suspension audio) + id + garde resize |
| `js/app.js` | `dice/app.js` | export `initDiceTray`, ids `dice-` (dont `dice-soundBtn`), son câblé, sans démo |
| `css/style.css` | `dice/dice.css` | scopé `#dice-module` (dont `#dice-helpBtn/#dice-soundBtn/#dice-toast`) |
| `vendor/three.module.min.js` | `dice/lib/three.module.min.js` | identique (renommé dossier, C2) |
| `vendor/three.core.js` | `dice/lib/three.core.js` | identique |
| `vendor/THREE-LICENSE.txt` | `dice/lib/THREE-LICENSE.txt` | identique |
| `LICENSE` | `dice/LICENSE` | identique |
| `index.html` (markup) | intégré dans `#dice-module` par `dice-tray.js` | découpé, ids `dice-` (**y compris `#dice-soundBtn` 🔊/🔇 à gauche, `#dice-helpBtn` ? à droite**) |
| `index.html` (démo, `#fileHint`) | — | **supprimés** (C7, R5) |
| `INTEGRATION.md`, `PLAN.md`, `TODO.md`, `maquette.html`, `deploy/`, `.git/` | — | **non copiés** (C12) |

Compatibilité outillage vérifiée :
- **Build Android** (`_sync-assets.mjs`) : `dice/` n'est dans aucune liste d'exclusion ;
  `lib/` remplace `vendor/` (exclu) ; `.txt`/`LICENSE` non packés (comportement actuel),
  l'attribution orale va dans README/MANUAL.
- **Tests** : `01-syntax` ne scanne que la racine (`dice-tray.js` y est vérifié) ;
  `02-css` ne lit que `style.css` (`dice/dice.css` est un fichier distinct) ;
  aucun id `dice-*` n'existe aujourd'hui dans l'app (pas de collision).
- **Serveur** : modules ES déjà servis partout (`text/javascript` : PHP, `AssetRouter`
  Android, serveur Windows). Dynamic import compatible.

---

## 6. Séquence de réalisation (branche `evol-dice-tray`)

Créée depuis `main` : `git checkout -b evol-dice-tray`.

| Étape | Contenu | Critère de passage |
|---|---|---|
| **0** | Maquette HTML de la nouvelle interface (`plan2/maquettes/`) : topbar (desktop + mobile connecté/invité), menu utilisateur enrichi, dice tray plein écran — **validée par l'utilisateur avant tout code** | Validation explicite |
| **1** | Branche + copie brute de `dice/` (fichiers source + `lib/`, imports three adaptés) | `node --check` sur les fichiers copiés |
| **2** | `dice/dice.css` scopé + préfixage `dice-` des ids (`app.js`, `tray.js`) | Aucun sélecteur global ; aucun id non préfixé |
| **3** | `dice-tray.js` (overlay, croix, `Échap`, lazy-import, pause/resume) + `#btn-des` + `style.css` | Test `23` vert ; tapis vide à l'ouverture |
| **4** | Parti 1 : entrées menu + media queries mobile (masquage inconditionnel) | Test `22-themes` + `23` verts ; vérif. manuelle 360 px |
| **5** | Vérifications croisées : `npm test` complet, builds Android/Windows, test manuel PC + mobile (lancer, drag, élan, appui long, redimensionnement, fermeture/réouverture = état identique) | Aucune régression |
| **6** | Docs (`MANUAL`, `README`, `JOURNAL`, `TODO`) + captures | Cohérence docs/code |
| **7** | Merge `evol-dice-tray` → `main` + push | — |

---

## 7. Décisions validées le 13/10/2026

| # | Point | Décision retenue |
|---|-------|------------------|
| **V1** | Libellé de l'entrée menu qui remplace le bouton topbar « Changer de theme » | **« Mode clair / sombre »** (l'entrée existante « Changer de thème » = sélecteur de couple, inchangée) |
| **V2** | Bouton « Dés » visible pour les invités ? | **Oui, visible pour tous** (le dice tray ne requiert aucune session) |
| **V3** | Sur mobile, les invités conservent-ils les boutons « thème » et « référence » dans la topbar ? | **Non : masqués aussi** — masquage inconditionnel à ≤ 600 px, aucun `data-auth` nécessaire ; les invités perdent ces deux fonctions sur mobile |
| **V4** | Identité visuelle du tapis | **Feutrine sombre d'origine conservée** ; seul le chrome (header, croix, barre d'actions) suit le thème clair/sombre de l'app |
| **V5** | Évolutions différées (hors périmètre, comme dans le projet source) : historique de lancers, notation `2d6+3` | **Exclues** du présent plan (le son, autrefois différé, est désormais **inclus** via V6) |
| **V6** | Son 3D ajouté par la source après la v1 du plan (`sound.js`, `#soundBtn`) : persistance `localStorage` | **Son porté à l'identique** (clacs/rebonds/tick, synthèse Web Audio, zéro asset, respect `prefers-reduced-motion` de la source), **persistance `dicebox.sound` conservée** ; `pause()` suspend l'audio, bouton muet conservé dans le tapis |
