# PLAN — Évolution #1 « Bouton INIT » (onglet Équipe)

> **Spec source** : `TODO.md` § EVOLUTIONS — **1** (initiative de tous les PJ en expédition).
> **Arbitrages validés par l'utilisateur le 03/11/2026** :
> cible = colonne **« Init. combat »** (§ 2, A1) ; confirmation **seulement si valeurs existent** (§ 2, A2).
> **Statut** : **implémenté et testé** — **aucun commit** (le projet est sur `main` propre).
>
> **MAJ 03/11/2026 — refonte de l'emplacement des boutons** : après deux retours terrain sur mobile,
> INIT et RAZ sont **sortis du tableau** (suppression du pied de tableau) et posés sur **une même
> ligne `.table-actions` juste après le `<table>**, justifiée à droite (§ 2.2 A3, § 4.2, § 8).
> Le pied de tableau initial (`tfoot` + `.tfoot-actions`) est **abandonné** : sa cellule imposait sa
> largeur minimale à la table entière (`table-layout: auto`) → débordement à droite en mobile.

---

## 1. Reformulation de la spec

| # | Exigence (formulation retenue) |
|---|--------------------------------|
| **R1** | Onglet **Équipe**, section **« Personnages en expédition »** : ajouter un bouton **« INIT »**, **à gauche** du bouton **RAZ** existant (les deux cohabitent **sur une même ligne**). *Emplacement précisé plus loin : initialement dans le pied du tableau, puis — refonte après essais mobiles — **sur une ligne sous le tableau** (§ 2.2 A3).* |
| **R2** | Au clic, pour **chaque** personnage en expédition : le compteur **Tour** est remis à **0** et le champ **« Init. combat »** est rempli avec une valeur d'initiative tirée aléatoirement. |
| **R3** | La valeur tirée suit la **règle d'initiative du personnage**, lue dans **sa fiche** : `BLOC_COMMUN` → section **COMBAT** → champ **« Initiative »** (`classes/bloc_commun.js` L47, clé `…-initiative`, stockée dans `characters[].data.initiative`). |
| **R4** | Formats admis : `+x`, `-x`, `1d20+x`, `1dY+x`. **Dé absent → d20** ; le modificateur est **toujours appliqué**. Exemples : `1d20+2` = d20+2 ; `+3` = **d20 + 3** *(la spec TODO disait « ajoute 30 » : coquille, reformulée ici en **+3**)* ; `1d16-1` = d16−1. |
| **R5** | Tolérances de saisie : `d20+2` (compte omis = 1), `3` (nombre nu = modificateur), casse/espaces indifférents (`1D20 + 2`). Champ **vide** ou **illisible** → d20 + 0 (aucun blocage en combat). |
| **R6** | Le résultat est un **entier** (négatif ou > 20 accepté) écrit dans le champ **Init. combat** ; la colonne **« Init. »** (formule lue dans la fiche) **reste inchangée** — elle est resynchronisée depuis la fiche à chaque retour sur l'onglet. |
| **R7** | Confirmation **uniquement si** au moins une *Init. combat* est déjà renseignée **ou** un compteur de tour > 0 ; sinon tirage immédiat. **Annulation → rien ne change.** |
| **R8** | L'opération est **propagée en base** (debounce 600 ms existant) : les jets entrent dans `team_state.init_combat`, les tours remis à 0 sont retirés de `team_state.tours` → inclus dans l'export JSON, restaurés à l'import, conservés par la resync. |
| **R9** | **Hors périmètre** : ennemis (§ 8.3), notes, ordre de marche, statistiques, bouton **RAZ** existant, colonne *Init.* des PJ, ouverture du dice tray 3D, tri du tableau par initiative. |
| **R10** | **0 personnage en expédition** → pas de tableau, donc pas de pied, donc pas de bouton (comportement actuel conservé, aucun rendu conditionnel à ajouter). |

---

## 2. Arbitrages

### 2.1 Validés par l'utilisateur (03/11/2026)

| # | Sujet | Décision |
|---|-------|----------|
| **A1** | Champ cible du jet | **Colonne « Init. combat »** (`input.init-combat-input`, `type=number`) — seul champ de combat **persisté** (`team_state.init_combat`) et **préservé** par `resync` (`classes/equipe.js` L1453 ne rafraîchit que la colonne *Init.*). Écrire dans la colonne « Init. » écraserait la formule… jusqu'au prochain render/resync qui la recréerait depuis la fiche → jet perdu. La colonne « Init. » reste l'affichage **de la règle**, « Init. combat » l'affichage **du jet** (cohérent avec le RAZ, qui vide déjà cette colonne). |
| **A2** | Confirmation | **Conditionnelle** : déclenchée seulement s'il existe au moins une valeur non vide dans `.init-combat-input` **ou** un `.turn-counter > 0`. Sinon clic = tirage direct (usage répété en début de combat sans friction). Repli `window.confirm` si `window.showModal` absent (même motif que le RAZ, L1241-1253). |

### 2.2 Décidés par l'implémentation

| # | Sujet | Décision |
|---|-------|----------|
| **A3** | Emplacement DOM | **Ligne d'actions `.table-actions` posée juste APRÈS le `<table>`** (même conteneur, `<div>` frère du tableau), les boutons **INIT puis RAZ** côte à côte sur une même ligne, `display:flex; justify-content:flex-end; gap:6px`. **Refonte** (2 itérations mobiles, voir § 8) : le pied de tableau (`tfoot`, `td[colspan=5]` + `td[colspan=2]`, `.tfoot-actions`) a été abandonné — sa cellule imposait sa **largeur minimale** à la table entière → débordement à droite en écran étroit. Les suites `04-equipe` (« no tfoot » + ligne d'actions après le tableau) et `11-team-state` (`.table-actions .btn-raz`) ont été alignées sur ce nouveau balisage. |
| **A4** | Où vit la logique | **Dans `classes/equipe.js`**, exposée sur le module : `DCCModules.equipe.parseInitiative(formula)` et `DCCModules.equipe.rollInitiative(formula, rng)`. **Fichier racine rejeté** (`init-roll.js`) : il faudrait un `<script>` dans `index.html` + vérifier les syncs de build Android/webapp pour un gain nul. Les tests chargeant déjà `classes/equipe.js` (`env.loadEquipe()`), l'exposition suffit (précédent : `resync`, `_cleanupMarchDrag`). |
| **A5** | Générateur aléatoire | `rng` **injectable**, défaut `Math.random` — même convention que `lvl0-roll.js` (`defaultRng()`) : les tests purcs passent un RNG déterministe, les tests DOM patchent `env.window.Math.random`. |
| **A6** | Persistance | **Une seule** `scheduleTeamStateSave()` **après** la boucle : `snapshotTeamState()` (L31) relit le DOM, donc un appel suffit ; `setTurn(0)` ne notifie pas (`onTurnChange` n'est appelé que par `increment/reset` utilisateur) → **pas de N écritures**. Les tours à 0 ne sont jamais écrits (sanitize), ils disparaissent donc de l'état → exactement l'effet de la RAZ. |
| **A7** | Retour utilisateur | **Pas de toast propre** : le toast disquette vient du callback central de sauvegarde (comme le RAZ). **Pas d'animation de dé** ni de dice tray 3D : tirage instantané, en bloc, pour 1 à 9 PJ. |
| **A8** | Style | Nouvelle classe **`.btn-init`** = `.btn-sm` (déjà existant) + contour **encre** (`border:1px solid var(--ink); color:var(--ink)`, hover `--line`), `min-width:56px` comme le RAZ. Le RAZ reste muet (`--muted`) → les deux boutons se distinguent d'un coup d'œil sans introduce une 3ᵉ couleur dans la palette. Libellé texte **« INIT »** (pas d'emoji, langage icônes = SVG inline du projet — emoji refusé par convention). |
| **A9** | Accessibilité | `aria-label="Tirer l'initiative de tous les personnages"` + `title` identique, `type="button"`, focus visible hérité de `.btn-sm`. |

---

## 3. Architecture cible

```
dcc-sheet/
├── classes/equipe.js     ~ A. helpers purs (parseInitiative / rollInitiative) exposés sur le module
│                         ~ B. ligne d'actions SOUS le tableau : <div class="table-actions"> [INIT] [RAZ]
│                         ~ C. handler click : état existant ? → confirmation ; boucle de tirage ;
│                         │   tours à 0 ; UNE scheduleTeamStateSave()
│                         ~ D. (inchangé) RAZ, snapshot, resync, ennemis, notes
├── style.css             + bloc « Ligne d'actions sous le tableau » : .table-actions, .btn-init
│                         (règles de pied de tableau supprimées ; acolades équilibrées exigées par 02-css)
├── tests/25-init-expedition.test.js   ← NOUVEAU : helpers purs + clic/persistance/régressions
├── tests/run.js          + require('./25-init-expedition.test')   (25 est libre : 24 et 26 existent)
├── MANUAL.md             § 8.1 : paragraphe INIT (à côté du paragraphe RAZ, l. 541) + § 9 glossaire
├── TODO.md               évolution #1 → marquée « codée, non committée » (convention du fichier)
├── JOURNAL.md            entrée datée (convention projet)
└── README.md             uniquement si la fonction figure dans une liste de features

 Inchangés : index.html, team-state.js (schéma déjà adapté : init_combat = chaînes ≤ 20 car.),
 api/*, exports/imports JSON, dice/, ennemis, statistiques, ordre de marche.
```

---

## 4. Détail d'implémentation

### 4.1 Helpers purs (`classes/equipe.js`, exposés sur `DCCModules.equipe`)

```js
/* Normalise : trim + minuscules + espaces supprimés.
   Retourne { count, sides, mod } — JAMAIS null. */
function parseInitiative(formula) {
  const s = String(formula == null ? '' : formula).trim().toLowerCase().replace(/\s+/g, '');
  if (s === '') return { count: 1, sides: 20, mod: 0 };              // champ vide → d20
  let m = s.match(/^(\d*)d(\d+)([+-]\d+)?$/);                         // 1d20+2 | 1d16-1 | d20+5 | 2d6+1
  if (m) {
    let count = m[1] === '' ? 1 : parseInt(m[1], 10);
    let sides = parseInt(m[2], 10);
    const mod = m[3] ? parseInt(m[3], 10) : 0;
    if (!(count >= 1 && count <= 50)) count = 1;                      // garde-fous
    if (!(sides >= 2 && sides <= 1000)) sides = 20;
    return { count, sides, mod };
  }
  m = s.match(/^([+-]?\d+)$/);                                       // +3 | -1 | 3  → d20 + mod
  if (m) return { count: 1, sides: 20, mod: parseInt(m[1], 10) };
  return { count: 1, sides: 20, mod: 0 };                             // illisible → d20 + 0
}

/* Tirage : somme de `count` dés à `sides` faces + modificateur.
   rng injectable (défaut Math.random) — entier, bornes incluses. */
function rollInitiative(formula, rng) {
  const f = parseInitiative(formula);
  const r = typeof rng === 'function' ? rng : Math.random;
  let total = 0;
  for (let i = 0; i < f.count; i++) total += 1 + Math.floor(r() * f.sides);
  return total + f.mod;
}
```

**Table de cas (référence des tests)**

| Saisie fiche | Lecture | Tirage (rng déterministe) |
|---|---|---|
| `1d20+2` | 1d20 + 2 | `rng=0` → **3**, `rng→1` → **22** |
| `+3` / `3` | **d20 + 3** (coquille « 30 » de la spec = +3) | `rng=0` → **4** |
| `-1` | d20 − 1 | `rng→1` → **19** |
| `1d16-1` | 1d16 − 1 | `rng=0` → **0** |
| `d20+5`, `1D20 + 5`, ` d20 +5 ` | 1d20 + 5 | identiques |
| `2d6+1` (hors spec, toléré) | 2d6 + 1 | somme de 2 tirages |
| `''`, `nawak`, `1d0`, `0d6`, `1d2000` | d20 + 0 (défauts bornés) | 1..20 |

### 4.2 Bouton (ligne d'actions sous le tableau, `classes/equipe.js`)

Avant (refonte #1, abandonnée) :

```
┌──────────── td[colspan=5] ─────────────┬──── td[colspan=2] ────────────────┐
│                                        │  <div class="tfoot-actions">     │
│                                        │    [ INIT ]  [ RAZ ]             │
│                                        │  </div>                          │
└────────────────────────────────────────┴──────────────────────────────────┘
```
*Problème* : la cellule du pied ne couvre que *Init. combat + Tour* (~22 % de la table) ; ses
boutons (`min-width: 56px` × 2 + gap) imposaient leur **largeur minimale à la table entière**
(`table-layout: auto`) → le tableau débordait vers la droite en écran étroit.

Après (retenu) :

```
< table class="team-table" > …lignes des PJ… </table>
┌─ <div class="table-actions"> ─────────────────────────────────┐
│                                          [ INIT ]  [ RAZ ]    │  ← flex-end
└───────────────────────────────────────────────────────────────┘
   frère du <table>, même conteneur → aucun rapport avec les colonnes,
   donc aucune contrainte de largeur, donc aucun débordement
```

```js
const btnInit = document.createElement('button');
btnInit.type = 'button';
btnInit.className = 'btn-sm btn-init';
btnInit.textContent = 'INIT';
btnInit.setAttribute('aria-label', "Tirer l'initiative de tous les personnages");
btnInit.addEventListener('click', onInitClick);          // voir 4.3

const btnRazInit = /* inchangé */ ;

const actionsRow = document.createElement('div');
actionsRow.className = 'table-actions';
actionsRow.appendChild(btnInit);        // ← INIT à gauche du RAZ (R1)
actionsRow.appendChild(btnRazInit);

container.appendChild(tableChars);      // le tableau d'abord…
container.appendChild(actionsRow);      // …puis la ligne, juste après lui
```

CSS (`style.css`, bloc après `.btn-raz:hover`) :

```css
/* Ligne d'actions SOUS le tableau expédition (évol. #1) : INIT + RAZ,
   sur une MÊME ligne, alignés à droite (sous les colonnes Init. combat /
   Tour qu'ils pilotent) — sortis du tableau : une cellule à cheval sous ces
   2 colonnes imposait sa largeur minimale à la table entière. */
.table-actions {
  display: flex;
  justify-content: flex-end;
  gap: 6px;
  margin-top: 8px;
}

.table-actions .btn-init,
.table-actions .btn-raz { min-width: 56px; }

.btn-init { background: transparent; border: 1px solid var(--ink); color: var(--ink); }
.btn-init:hover { background: var(--line); }

/* @media (max-width: 600px) : ligne resserrée, toujours sur une seule ligne */
.table-actions { gap: 4px; margin-top: 6px; }
.table-actions .btn-init, .table-actions .btn-raz { min-width: 64px; }
```

### 4.3 Clic sur INIT (algorithme)

```js
async function onInitClick() {
  const rows = [].slice.call(tableChars.querySelectorAll('tr[data-char-id]'));
  if (!rows.length) return;                                   // R10

  /* R7 : confirmation seulement si état existant */
  const hasState = rows.some(function (tr) {
    const inp = tr.querySelector('.init-combat-input');
    if (inp && String(inp.value).trim() !== '') return true;
    const c = tr.querySelector('.turn-counter');
    return !!(c && typeof c.getTurn === 'function' && c.getTurn() > 0);
  });
  if (hasState) {
    const msg = "Écraser les Init. combat actuelles et remettre les tours à 0 pour tous les personnages ?";
    let ok = false;
    if (typeof window.showModal === 'function') {
      ok = await window.showModal({ title: "Tirer l'initiative", message: msg,
                                    type: 'confirm', okText: 'INIT' });
    } else {
      ok = window.confirm(msg);
    }
    if (!ok) return;                                          // annulation → rien ne change
  }

  rows.forEach(function (tr) {
    const cd = tr._charData || {};                            // resync tient _charData à jour
    const formula = parsedDataOf(cd).initiative;              // R3 : BLOC_COMMUN / COMBAT / Initiative
    const input = tr.querySelector('.init-combat-input');
    if (input) input.value = String(rollInitiative(formula)); // R6 : entier dans « Init. combat »
    const counter = tr.querySelector('.turn-counter');
    if (counter && typeof counter.setTurn === 'function') counter.setTurn(0);  // R2 : tour → 0
  });

  scheduleTeamStateSave();   // A6 : UNE écriture (debounce 600 ms) — snapshot relit le DOM
}
```

**Pourquoi une écriture unique** : `input.value = …` programmé ne déclenche pas d'événement
`input` (donc pas de sauvegarde par ligne) et `setTurn(0)` ne notifie pas → sans cet appel final,
**le jet ne partirait jamais en base**. C'est le seul point de vigilance du Correctif.

### 4.4 Interactions avec le cycle de vie existant

| Événement | Comportement après INIT |
|---|---|
| **Resync** (retour sur l'onglet Équipe) | Colonnes Nom/Classe/Init./AC/PV rafraîchies, **jets et tours conservés** (`resync` L1418 ne touche que `children[0..2]` et PV) — vérifié par les tests. |
| **Re-render** (composition changée → rechargement page) | Les jets sont relus en base (`teamStateInitial.init_combat`) → restaurés à l'identique. |
| **Export / import JSON** | `team_state.init_combat` existant → `buildExport` / `remapImport` inchangés (les clés sont des index, les valeurs des chaînes ≤ 20 car.). |
| **RAZ** (inchangé) | Efface les mêmes champs ; les deux boutons cohabitent, séparés par 6 px. |
| **Annulation de la confirmation** | Aucune écriture, aucun schedule → zéro appel serveur. |
| **`team-state.js` absent / sans callback** | `teamStateEnabled = false` → `scheduleTeamStateSave` est no-op (L73) : les valeurs s'affichent quand même, aucun plantage (module optionnel, comme `dead-overlay.js`). |
| **Ennemis / notes / stats / ordre de marche** | Intouchés (sélecteurs confinés à `tableChars`, `tr[data-char-id]`). |

---

## 5. Tests

**Nouvelle suite** `tests/25-init-expedition.test.js` (numéro **25 libre** : 24 et 26 existent),
inscrite dans `tests/run.js` — `env.loadEquipe()` + `env.load('team-state.js')`,
`mod.render(container, chars, …, initialState, onSaveTeamState)` comme dans `11-team-state`.

**A. Helpers purs (rng déterministe, ~16 contrôles)**
1. `parseInitiative` : `1d20+2` → `{1,20,2}` · `1d16-1` → `{1,16,-1}` · `+3` → `{1,20,3}` · `-1` → `{1,20,-1}` · `3` → `{1,20,3}` · `d20+5` → `{1,20,5}` · `1D20 + 5` → `{1,20,5}` · `2d6+1` → `{2,6,1}` · `''` → `{1,20,0}` · `nawak` → `{1,20,0}` · garde-fous `1d0` / `0d6` / `1d2000` / `999d6` bornés.
2. `rollInitiative` : extrêmes du rng (`0` → min, `0.999999` → max), modificateur appliqué, somme pluridé, `rng` omis = `Math.random` (patché sur `env.window`).

**B. DOM / bouton (~18 contrôles)**
3. Bouton **présent**, classe `.btn-init`, libellé `INIT`, `aria-label` renseigné, **avant** le `.btn-raz`
   dans la ligne `.table-actions` (`compareDocumentPosition`) ; **aucun pied de tableau** (`tfoot`
   absent, aucun bouton dans la table) ; la ligne est le **frère immédiat du `<table>`** (régression
   `04-equipe`).
4. **Sans état** : clic → **aucune** ouverture de modale (`modalCalls` inchangé), chaque `.init-combat-input`
   reçoit le tirage attendu pour sa formule (`+2`, `1d16-1`, `''` → d20), chaque `.turn-counter` affiche `0`
   (après incrémentation préalable).
5. **Avec état** : clic → modale **demandée** ; `modalResult=false` → valeurs **et** tours inchangés ;
   `modalResult=true` → jets remplacés et tours à 0.
6. **Persistance** : après 750 ms → **une** écriture dont `init_combat` = `{ids: jets}` et `tours` = `{}`
   (les tours à 0 ne sont jamais persistés) ; `init_combat` survit à `mod.resync(fresh)`.
7. **Régressions** : ennemis non touchés (`.init-combat-input` absent du tableau ennemi), RAZ toujours
   opérationnel après INIT, rendu **sans** `team-state.js` sans erreur, `characters = []` → ni tableau,
   ni ligne d'actions, ni bouton.

**Suite globale** : `npm test` (`node tests/run.js`) → **0 échec** ; `02-css` (acolades équilibrées,
sélecteurs `critical` — `.table-actions`, `.table-actions .btn-init`, `.btn-init`, plus contrôle
« plus aucune règle liée à un `tfoot` » et le `gap: 4px` mobile) et `01-syntax` (liste
automatique des `.js` racine + `classes/`) passent.

---

## 6. Documentation

| Fichier | Changement |
|---|---|
| `MANUAL.md` § 8.1 (l. 541) | Nouveau paragraphe **INIT** avant celui du RAZ : déclenche le tirage pour tous les PJ, formule lue dans la fiche (§ Combat → Initiative), formats admis, remise à zéro des tours, confirmation conditionnelle, propagation en base/export. |
| `MANUAL.md` § 9 (glossaire) | Ligne **`INIT`** (à côté de `RAZ`, l. 1164). |
| `TODO.md` | Évolution #1 → **« codée (non committée) »** selon la convention du fichier. |
| `JOURNAL.md` | Entrée datée : plan + implémentation + compteurs de tests. |
| `README.md` | Si (et seulement si) les features de l'onglet Équipe y sont listées. |

---

## 7. Étapes d'exécution (dans l'ordre, `npm test` entre chaque)

1. **Helpers purs** dans `classes/equipe.js` + exposition sur le module → suite 25 (partie A) rédigée et verte.
2. **Bouton INIT** dans la ligne d'actions `.table-actions` placée juste après le `<table>`
   (structure + `onInitClick`) + CSS `.table-actions` / `.btn-init` → suite 25 (partie B) verte.
3. **Persistance** : appel unique `scheduleTeamStateSave()` ; vérifier les suites **04** et **11** (régression stricte : compteurs d'écritures intacts) + **03** (modules) + **02** (CSS).
4. **Batterie complète** `npm test` → 0 échec (compteur actuel : 3451+ contrôles, +~34 pour la suite 25).
5. **Docs** : MANUAL, TODO, JOURNAL (+ README si pertinent).
6. **Revue** : `git status` pour lister les fichiers touchés — **aucun `git add` / `git commit`**
   (demande explicite : le changement reste non committé, sur `main` propre).

---

## 8. Risques, points de vigilance, hors périmètre

- **Point de vigilance n° 1** : sans l'appel final `scheduleTeamStateSave()`, le jet s'affiche mais
  **ne part jamais en base** (aucun événement natif déclenché) — c'est exactement la classe de bug
  du ticket « Mage & Elfe » du § BUGS (état lu dans le DOM au save, jamais bookkeepé).

- **Historique des mises en page (2 retours terrain, 03/11/2026)** — mouture finale retenue :
  1. **Mouture 1 — pied de tableau** (`tfoot`, cellule `colspan=5 | 2`, `.tfoot-actions` centrée) :
   refusée **en mobile** — « en mobile c'est pire », le tableau débordait vers la droite.
  2. **Mouture 2 — pied de tableau, boutons empilés** (la cellule ne faisait que ~50 px de large) :
   refusée — « on perd de la place ».
  3. **Mouture 3 (finale) — boutons SORTIS du tableau** : suppression totale du `tfoot`, ligne
   `<div class="table-actions">` posée **juste après le `<table>`**, `display:flex`,
   `justify-content:flex-end` (les boutons se terminent au bord droit de la table, donc **plus ou
   moins sous les colonnes Init. combat / Tour**), `gap: 6px` (desktop) / `4px` (mobile),
   `min-width: 56px` / `64px`. La ligne ne dépend d'aucune colonne → **plus aucun débordement**,
   sur aucune largeur d'écran.
   Verrouillé par **`02-css`** : sélecteurs `critical` `.table-actions*`, « plus aucune règle liée
   à un `tfoot` », `display:flex` + `justify-content:flex-end` (jamais `flex-direction: column`),
   et le `gap: 4px` du bloc `@media (max-width: 600px)`.
   Suites alignées : `04-equipe` (« no tfoot », ligne après le tableau), `11-team-state`
   (`.table-actions .btn-raz`), `25-init-expedition` (helpers `actionsRowOf` / `btnInitOf` /
   `btnRazOf`).
- **Colonne « Init. »** : volontairement inchangée (affiche la règle, resync la réécrit).
  Si l'utilisateur souhaite finalement y voir le jet → ré-arbitrage A1 (schéma `team-state` à étendre).
- **Non demandé** (hors périmètre explicite) : tri des PJ par initiative décroissante, jet des ennemis
  (cf. évolution #2), animation 3D des dés, maquette HTML (bouton unique : maquette facultative,
  à créer dans `plan3/maquettes/` seulement si demandée).
- **Aucun impact build** : pas de nouveau fichier, pas de `<script>` ajouté, pas de modification
  `api/*` ni des artefacts (setup/portable/webapp/APK).
